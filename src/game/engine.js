import { SAT_TYPES, THREAT_TYPES, ORBITS } from './missions.js';

let entityId = 0;
export const nextId = () => ++entityId;

// Convert (angle, orbit) polar coordinates to screen pixel coords
export function polarToScreen(angle, orbit, center, scale) {
  const r = orbit * scale;
  return {
    x: center.x + Math.cos(angle) * r,
    y: center.y + Math.sin(angle) * r,
  };
}

// Distance between two polar points (approximate cartesian)
export function polarDist(a, b, scale = 1) {
  const ax = Math.cos(a.angle) * a.orbit * scale;
  const ay = Math.sin(a.angle) * a.orbit * scale;
  const bx = Math.cos(b.angle) * b.orbit * scale;
  const by = Math.sin(b.angle) * b.orbit * scale;
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// Create a satellite entity from spec
export function createSatellite(spec) {
  const type = SAT_TYPES[spec.type];
  return {
    id: nextId(),
    kind: 'satellite',
    type: spec.type,
    name: spec.name || type.name,
    angle: spec.angle,
    orbit: spec.orbit,
    targetOrbit: spec.orbit,
    targetAngle: null,
    health: type.maxHealth,
    maxHealth: type.maxHealth,
    fuel: type.maxFuel,
    maxFuel: type.maxFuel,
    cooldown: 0,
    jamming: false,
    jamCooldown: 0,
    alive: true,
    angularVel: orbitVelocity(spec.orbit),
    selected: false,
    target: null,
    lastShot: 0,
  };
}

export function createThreat(spec, scaleMult = 1) {
  const type = THREAT_TYPES[spec.type];
  return {
    id: nextId(),
    kind: 'threat',
    type: spec.type,
    name: type.name,
    angle: spec.angle,
    orbit: spec.orbit,
    targetOrbit: spec.orbit,
    health: type.maxHealth * scaleMult,
    maxHealth: type.maxHealth * scaleMult,
    weaponDmg: type.weaponDmg * scaleMult,
    cooldown: 0,
    alive: true,
    angularVel: orbitVelocity(spec.orbit) + (Math.random() - 0.5) * 0.0005,
    target: null,
    lastShot: 0,
    spawned: false,
    spawnDelay: spec.delay || 0,
  };
}

// Lower orbits move faster (Kepler-ish, simplified)
function orbitVelocity(orbit) {
  return 0.003 / Math.sqrt(orbit / ORBITS.LEO);
}

// Projectile fired from one entity at another
export function createProjectile(from, to, dmg, kind = 'kinetic') {
  return {
    id: nextId(),
    kind: 'projectile',
    weaponKind: kind,
    fromId: from.id,
    targetId: to.id,
    x: 0,
    y: 0,
    sx: 0,
    sy: 0,
    progress: 0,
    speed: kind === 'directed-energy' ? 2.5 : 0.8,
    dmg,
    alive: true,
    fromTeam: from.kind === 'satellite' ? 'friendly' : 'enemy',
  };
}

// Update orbital position (forward integration)
export function tickEntity(e, dt) {
  if (!e.alive) return;
  e.angle += e.angularVel * dt * 60;
  if (e.angle > Math.PI * 2) e.angle -= Math.PI * 2;
  if (e.angle < 0) e.angle += Math.PI * 2;

  // Smooth altitude transitions toward targetOrbit
  if (e.targetOrbit !== undefined && Math.abs(e.orbit - e.targetOrbit) > 0.001) {
    const delta = e.targetOrbit - e.orbit;
    const step = Math.sign(delta) * Math.min(Math.abs(delta), 0.04 * dt);
    e.orbit += step;
    // Burn fuel during maneuver
    if (e.fuel !== undefined) e.fuel = Math.max(0, e.fuel - 4 * dt);
  }

  // Smooth angular nudge toward target angle if set
  if (e.targetAngle !== null && e.targetAngle !== undefined) {
    let delta = e.targetAngle - e.angle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) < 0.02) {
      e.targetAngle = null;
    } else {
      // Boost angular velocity in direction of target
      e.angularVel = orbitVelocity(e.orbit) * (delta > 0 ? 2.5 : -0.5);
      if (e.fuel !== undefined) e.fuel = Math.max(0, e.fuel - 2 * dt);
    }
  } else {
    // Drift back to normal velocity for the orbit
    const normal = orbitVelocity(e.orbit);
    e.angularVel = e.angularVel * 0.95 + normal * 0.05;
  }

  if (e.cooldown > 0) e.cooldown = Math.max(0, e.cooldown - dt);
  if (e.jamCooldown > 0) e.jamCooldown = Math.max(0, e.jamCooldown - dt);

  // Orbital decay for low orbits (slow degradation, applied to threats too lightly)
  if (e.orbit < ORBITS.LEO - 0.05 && e.kind === 'satellite') {
    e.health = Math.max(0, e.health - 0.5 * dt);
  }
}

// Check if entity can detect target (in sensor range)
export function canDetect(observer, target) {
  if (!observer.alive || !target.alive) return false;
  const obsType = observer.kind === 'satellite' ? SAT_TYPES[observer.type] : THREAT_TYPES[observer.type];
  const d = polarDist(observer, target);
  return d <= obsType.sensorRange;
}

// Check if entity can shoot target
export function canEngage(shooter, target) {
  if (!shooter.alive || !target.alive) return false;
  if (shooter.cooldown > 0) return false;
  const shooterType = shooter.kind === 'satellite' ? SAT_TYPES[shooter.type] : THREAT_TYPES[shooter.type];
  if (shooterType.weaponDmg === 0) return false;
  const d = polarDist(shooter, target);
  return d <= shooterType.weaponRange;
}

// AI for threats
export function threatAI(threat, satellites, dt, gameState) {
  if (!threat.alive) return;
  const tt = THREAT_TYPES[threat.type];

  // Find target if none or current is dead
  if (!threat.target || !satellites.find(s => s.id === threat.target && s.alive)) {
    // Find closest visible satellite
    const visible = satellites.filter(s => s.alive && canDetect(threat, s));
    if (visible.length) {
      // Prioritize comm satellites for ASAT, command-like behavior
      const prio = visible.sort((a, b) => {
        const aw = a.type === 'comm' ? 2 : a.type === 'isr' ? 1.5 : 1;
        const bw = b.type === 'comm' ? 2 : b.type === 'isr' ? 1.5 : 1;
        return (polarDist(threat, b) * -bw) - (polarDist(threat, a) * -aw);
      });
      threat.target = prio[0].id;
    }
  }

  if (threat.target) {
    const target = satellites.find(s => s.id === threat.target);
    if (target && target.alive) {
      // Move toward target's orbit if aggressive
      if (tt.aggressive) {
        threat.targetOrbit = target.orbit;
        // Steer angle toward target
        let delta = target.angle - threat.angle;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const baseVel = (tt.speed || 0.008) * Math.sign(delta || 1);
        threat.angularVel = threat.angularVel * 0.9 + baseVel * 0.1;
      }
      // Try to fire
      if (canEngage(threat, target)) {
        const proj = createProjectile(threat, target, threat.weaponDmg, 'kinetic');
        threat.cooldown = tt.fireRate;
        gameState.projectiles.push(proj);
      }
    }
  }
}

// Project projectile path & apply damage on hit
export function tickProjectile(p, entities, dt, gameState, debrisFields) {
  if (!p.alive) return;
  const target = entities.find(e => e.id === p.targetId);
  if (!target || !target.alive) {
    p.alive = false;
    return;
  }
  const from = entities.find(e => e.id === p.fromId);
  if (!from) {
    // Source destroyed - track from last position
    p.alive = false;
    return;
  }
  p.progress = Math.min(1, p.progress + p.speed * dt);
  if (p.progress >= 1) {
    target.health -= p.dmg;
    if (target.health <= 0) {
      target.alive = false;
      gameState.kills.push({ team: p.fromTeam, type: target.type, angle: target.angle, orbit: target.orbit });
      // Generate debris on destruction
      if (debrisFields && (target.kind === 'satellite' || target.kind === 'threat')) {
        debrisFields.push({
          angle: target.angle,
          orbit: target.orbit,
          radius: 0.05,
          life: 30,
          maxLife: 30,
        });
      }
    }
    p.alive = false;
  }
}

// Friendly auto-engage (selected satellite manually engages designated target)
export function friendlyAutoFire(sat, threats, gameState) {
  if (!sat.alive || sat.cooldown > 0) return;
  const st = SAT_TYPES[sat.type];
  if (st.weaponDmg === 0) return;

  // If sat has explicit target, prioritize it
  if (sat.target) {
    const t = threats.find(x => x.id === sat.target && x.alive);
    if (t && canEngage(sat, t)) {
      gameState.projectiles.push(createProjectile(sat, t, st.weaponDmg, st.abilities.includes('directed-energy') ? 'directed-energy' : 'kinetic'));
      sat.cooldown = st.fireRate;
      sat.lastShot = performance.now();
      return;
    }
  }

  // Otherwise auto-engage nearest visible threat in weapon range
  const inRange = threats.filter(t => t.alive && canEngage(sat, t));
  if (inRange.length) {
    inRange.sort((a, b) => polarDist(sat, a) - polarDist(sat, b));
    const t = inRange[0];
    gameState.projectiles.push(createProjectile(sat, t, st.weaponDmg, st.abilities.includes('directed-energy') ? 'directed-energy' : 'kinetic'));
    sat.cooldown = st.fireRate;
    sat.lastShot = performance.now();
  }
}

// Jammer effect: disables threats within radius (sets jammed flag, reduces fire rate)
export function applyJamming(sat, threats) {
  if (!sat.alive || sat.type !== 'jammer' || !sat.jamming) return;
  const st = SAT_TYPES[sat.type];
  for (const t of threats) {
    if (!t.alive) continue;
    if (polarDist(sat, t) <= st.weaponRange) {
      t.jammed = true;
      t.cooldown = Math.max(t.cooldown, 0.5);
    }
  }
}

// Tick debris fields - they expand and decay
export function tickDebris(debris, satellites, threats, dt, gameState) {
  for (const d of debris) {
    if (d.life !== undefined) d.life = Math.max(0, d.life - dt);
    // Damage entities passing through
    for (const e of [...satellites, ...threats]) {
      if (!e.alive) continue;
      const dist = polarDist(d, e);
      if (dist < d.radius) {
        e.health -= 8 * dt;
        if (e.health <= 0) {
          e.alive = false;
          gameState.kills.push({ team: 'debris', type: e.type, angle: e.angle, orbit: e.orbit });
        }
      }
    }
  }
  return debris.filter(d => d.life === undefined || d.life > 0);
}

// Check victory/defeat conditions
export function checkConditions(mission, state, dt) {
  const friendlies = state.satellites.filter(s => s.alive);
  const enemies = state.threats.filter(t => t.alive && t.spawned);

  // Track timers/progress
  if (!state.progress) state.progress = { trackTime: 0, controlTime: 0, linkTime: 0, linkBreakTotal: 0, chainTime: 0, waveCount: 0 };
  const p = state.progress;

  let outcome = null;

  switch (mission.victory.type) {
    case 'track': {
      const tracked = enemies.find(e => e.type === mission.victory.target);
      if (tracked) {
        const tracking = friendlies.some(s => canDetect(s, tracked));
        if (tracking) p.trackTime += dt;
        else p.trackTime = Math.max(0, p.trackTime - dt * 0.5);
        if (p.trackTime >= mission.victory.duration) outcome = 'victory';
      }
      break;
    }
    case 'destroyAll': {
      const remaining = enemies.filter(e => e.type === mission.victory.target);
      if (state.allWavesSpawned && remaining.length === 0) outcome = 'victory';
      break;
    }
    case 'destroyType': {
      const found = enemies.find(e => e.type === mission.victory.target);
      const everSpawned = state.threats.find(t => t.type === mission.victory.target && t.spawned);
      if (everSpawned && !found) outcome = 'victory';
      break;
    }
    case 'controlZone': {
      const friendInZone = friendlies.filter(s => Math.abs(s.orbit - mission.victory.orbit) < 0.1).length;
      const enemyInZone = enemies.filter(e => Math.abs(e.orbit - mission.victory.orbit) < 0.1).length;
      if (state.allWavesSpawned && friendInZone > enemyInZone) p.controlTime += dt;
      else if (state.allWavesSpawned) p.controlTime = Math.max(0, p.controlTime - dt * 0.3);
      if (p.controlTime >= mission.victory.duration) outcome = 'victory';
      break;
    }
    case 'commSurvival': {
      const commAlive = friendlies.filter(s => s.type === 'comm').length;
      if (state.allWavesCleared && commAlive >= mission.victory.minComm) outcome = 'victory';
      break;
    }
    case 'jamRelays': {
      const disabled = state.kills.filter(k => k.type === 'jammer').length;
      if (disabled >= mission.victory.minDisabled && state.allWavesSpawned) outcome = 'victory';
      break;
    }
    case 'destroyCount': {
      const killCount = state.kills.filter(k => k.team !== 'enemy').length;
      if (killCount >= mission.victory.count) outcome = 'victory';
      break;
    }
    case 'enemyAttrition': {
      if (state.allWavesSpawned && enemies.length <= mission.victory.maxAlive && friendlies.length >= mission.victory.minFriendly) outcome = 'victory';
      break;
    }
    case 'maintainLink': {
      // Ground station at angle 0, orbit 0 (surface). Need at least one comm sat in line-of-sight.
      const gs = { angle: mission.groundStation?.angle ?? 0, orbit: 0 };
      const linked = friendlies.some(s => s.type === 'comm' && polarDist(s, gs) < 0.7);
      if (linked) {
        p.linkTime += dt;
      } else {
        p.linkBreakTotal += dt;
      }
      if (p.linkBreakTotal > mission.victory.maxBreak) outcome = 'defeat';
      else if (p.linkTime >= mission.victory.duration) outcome = 'victory';
      break;
    }
    case 'maintainChain': {
      // Need comm presence in all 3 orbital bands
      const leo = friendlies.some(s => s.type === 'comm' && Math.abs(s.orbit - ORBITS.LEO) < 0.08);
      const meo = friendlies.some(s => s.type === 'comm' && Math.abs(s.orbit - ORBITS.MEO) < 0.08);
      const geo = friendlies.some(s => s.type === 'comm' && Math.abs(s.orbit - ORBITS.GEO) < 0.08);
      if (leo && meo && geo) p.chainTime += dt;
      else p.chainTime = Math.max(0, p.chainTime - dt * 0.2);
      if (p.chainTime >= mission.victory.duration) outcome = 'victory';
      break;
    }
    case 'surviveWaves': {
      if (state.waveIndex >= mission.victory.waves && enemies.length === 0 && friendlies.length >= mission.victory.minFriendly) {
        outcome = 'victory';
      }
      break;
    }
  }

  // Defeat conditions
  if (!outcome) {
    switch (mission.defeat.type) {
      case 'losses': {
        const lost = mission.friendlies.length - friendlies.length;
        if (lost >= mission.defeat.threshold) outcome = 'defeat';
        break;
      }
      case 'commLoss': {
        const commAlive = friendlies.filter(s => s.type === 'comm').length;
        if (commAlive < mission.defeat.minComm) outcome = 'defeat';
        break;
      }
      case 'enemyRelays': {
        const aliveRelays = enemies.filter(e => e.type === 'jammer').length;
        if (aliveRelays >= mission.defeat.maxAlive) outcome = 'defeat';
        break;
      }
      case 'strikeLoss': {
        const strikeAlive = friendlies.filter(s => s.type === 'strike').length;
        if (strikeAlive === 0) outcome = 'defeat';
        break;
      }
      case 'friendlyAttrition': {
        if (friendlies.length <= mission.defeat.maxAlive) outcome = 'defeat';
        break;
      }
    }
  }

  return outcome;
}
