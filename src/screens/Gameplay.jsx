import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SAT_TYPES, THREAT_TYPES, ORBITS } from '../game/missions.js';
import {
  createSatellite, createThreat, createProjectile,
  tickEntity, tickProjectile, tickDebris,
  threatAI, friendlyAutoFire, applyJamming,
  canDetect, canEngage, polarDist, polarToScreen,
} from '../game/engine.js';

const DIFFICULTY_MULT = { easy: 0.7, normal: 1.0, hard: 1.3, expert: 1.6, extreme: 2.0 };

export default function Gameplay({ mission, settings, onComplete, onAbort }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(0);
  const [tick, setTick] = useState(0); // forces re-render of HUD
  const [paused, setPaused] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [actionMode, setActionMode] = useState(null); // 'maneuver', 'engage', 'jam', null
  const [hint, setHint] = useState(null);

  // Initialize game state
  useEffect(() => {
    const diffMult = mission.quickMission
      ? (mission.difficultyMult || 1)
      : (DIFFICULTY_MULT[settings.difficulty] || 1);

    const satellites = mission.friendlies.map(s => createSatellite(s));
    const threats = [];
    if (mission.waves) {
      mission.waves.forEach((wave, wIdx) => {
        wave.forEach(t => {
          const threat = createThreat(t, diffMult);
          threat.waveIndex = wIdx;
          threats.push(threat);
        });
      });
    }

    stateRef.current = {
      satellites,
      threats,
      projectiles: [],
      debris: (mission.debrisFields || []).map(d => ({ ...d, life: undefined })),
      groundStation: mission.groundStation,
      kills: [],
      missionStartTime: performance.now(),
      currentTime: 0,
      waveIndex: 0,
      lastWaveAt: 0,
      allWavesSpawned: false,
      allWavesCleared: false,
      shotsFired: 0,
      shotsHit: 0,
      outcome: null,
      progress: { trackTime: 0, controlTime: 0, linkTime: 0, linkBreakTotal: 0, chainTime: 0 },
    };

    if (settings.tutorialHints && mission.id === 1) {
      setHint('TAP a satellite to select it, then DRAG to maneuver. Position ISR to track the enemy.');
      setTimeout(() => setHint(null), 6000);
    } else if (settings.tutorialHints && mission.id === 2) {
      setHint('SELECT interceptor → tap ENGAGE → tap the incoming ASAT to fire.');
      setTimeout(() => setHint(null), 6000);
    }
  }, [mission, settings.difficulty]);

  // Canvas setup and game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let dpr = window.devicePixelRatio || 1;

    function resize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let lastT = performance.now();
    let hudTick = 0;

    function loop(now) {
      animRef.current = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      if (!paused) update(dt);
      render(ctx, canvas.clientWidth, canvas.clientHeight);
      hudTick++;
      if (hudTick % 6 === 0) setTick(t => t + 1);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [paused]);

  function update(dt) {
    const s = stateRef.current;
    if (!s || s.outcome) return;
    s.currentTime += dt;

    // Spawn threats whose delay has elapsed in current wave
    const aliveThreats = s.threats.filter(t => t.alive && t.spawned);
    const allInWaveSpawned = s.threats.filter(t => t.waveIndex === s.waveIndex).every(t => t.spawned);
    const allInWaveDead = s.threats.filter(t => t.waveIndex === s.waveIndex && t.spawned).every(t => !t.alive);

    for (const t of s.threats) {
      if (t.waveIndex !== s.waveIndex) continue;
      if (!t.spawned && s.currentTime - s.lastWaveAt >= t.spawnDelay) {
        t.spawned = true;
      }
    }

    // Advance wave when all in current wave are dead and wave was started
    if (allInWaveSpawned && allInWaveDead && s.waveIndex < (mission.waves?.length || 0) - 1) {
      s.waveIndex++;
      s.lastWaveAt = s.currentTime;
    }

    // Mark all waves spawned/cleared
    if (s.waveIndex >= (mission.waves?.length || 0) - 1 && allInWaveSpawned) {
      s.allWavesSpawned = true;
      if (allInWaveDead) s.allWavesCleared = true;
    }

    // Reset jam flags
    for (const t of s.threats) t.jammed = false;

    // Tick all entities
    for (const sat of s.satellites) tickEntity(sat, dt);
    for (const t of s.threats) {
      if (t.spawned) tickEntity(t, dt);
    }

    // Threat AI - engage friendlies
    const aliveSats = s.satellites.filter(x => x.alive);
    for (const t of s.threats) {
      if (t.spawned && t.alive && !t.jammed) threatAI(t, aliveSats, dt, s);
    }

    // Apply jamming from friendly EW
    for (const sat of s.satellites) {
      if (sat.alive && sat.type === 'jammer' && sat.jamming) {
        applyJamming(sat, s.threats);
      }
    }

    // Friendly auto-fire (cool, controlled)
    for (const sat of s.satellites) {
      if (sat.alive) friendlyAutoFire(sat, s.threats, s);
    }

    // Projectiles
    const allEntities = [...s.satellites, ...s.threats];
    for (const p of s.projectiles) tickProjectile(p, allEntities, dt, s, s.debris);
    s.projectiles = s.projectiles.filter(p => p.alive);

    // Debris tick
    s.debris = tickDebris(s.debris, s.satellites, s.threats, dt, s);

    // Check conditions
    const outcome = checkConditions(mission, s, dt);
    if (outcome) {
      s.outcome = outcome;
      finalize(outcome);
    }

    // Timeout
    if (mission.timeLimit && s.currentTime > mission.timeLimit && !outcome) {
      // Tally up if survival-ish; otherwise it's a defeat
      const survived = s.satellites.filter(x => x.alive).length;
      finalize(survived >= 2 ? 'victory' : 'defeat');
    }
  }

  function finalize(outcome) {
    const s = stateRef.current;
    if (s.outcome && s.outcome !== outcome) return;
    s.outcome = outcome;

    const friendlies = s.satellites.filter(x => x.alive);
    const enemyKilled = s.kills.filter(k => k.team === 'friendly' || k.team === 'debris').length;
    const satellitesLost = mission.friendlies.length - friendlies.length;
    const accuracy = s.shotsFired > 0 ? Math.round((s.shotsHit / s.shotsFired) * 100) : 100;

    // Star calculation
    let stars = 0;
    if (outcome === 'victory') {
      stars = 1;
      // Secondary objectives
      const sec = mission.objectives.secondary || [];
      let bonus = 0;
      // Generic secondary checks based on metrics
      if (satellitesLost === 0) bonus++;
      if (s.currentTime < (mission.timeLimit || 300) * 0.6) bonus++;
      stars = Math.min(3, 1 + bonus);
    }

    setTimeout(() => {
      onComplete({
        outcome,
        stars,
        metrics: {
          time: Math.round(s.currentTime),
          enemiesDestroyed: enemyKilled,
          satellitesLost,
          satellitesRemaining: friendlies.length,
          accuracy,
          waves: s.waveIndex + 1,
        },
      });
    }, 800);
  }

  function checkConditions(mission, state, dt) {
    // Inline a simplified version to avoid stale imports
    const friendlies = state.satellites.filter(s => s.alive);
    const enemies = state.threats.filter(t => t.alive && t.spawned);
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
        const gs = { angle: mission.groundStation?.angle ?? 0, orbit: 0 };
        const linked = friendlies.some(s => s.type === 'comm' && polarDist(s, gs) < 0.7);
        if (linked) p.linkTime += dt;
        else p.linkBreakTotal += dt;
        if (p.linkBreakTotal > mission.victory.maxBreak) outcome = 'defeat';
        else if (p.linkTime >= mission.victory.duration) outcome = 'victory';
        break;
      }
      case 'maintainChain': {
        const leo = friendlies.some(s => s.type === 'comm' && Math.abs(s.orbit - ORBITS.LEO) < 0.08);
        const meo = friendlies.some(s => s.type === 'comm' && Math.abs(s.orbit - ORBITS.MEO) < 0.08);
        const geo = friendlies.some(s => s.type === 'comm' && Math.abs(s.orbit - ORBITS.GEO) < 0.08);
        if (leo && meo && geo) p.chainTime += dt;
        else p.chainTime = Math.max(0, p.chainTime - dt * 0.2);
        if (p.chainTime >= mission.victory.duration) outcome = 'victory';
        break;
      }
      case 'surviveWaves': {
        if (state.waveIndex >= mission.victory.waves - 1 && state.allWavesSpawned && enemies.length === 0 && friendlies.length >= mission.victory.minFriendly) {
          outcome = 'victory';
        }
        break;
      }
    }

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
        case 'chainBreak': {
          // Lose if no comm in any band
          const anyComm = friendlies.filter(s => s.type === 'comm').length;
          if (anyComm === 0) outcome = 'defeat';
          break;
        }
        case 'linkBroken': {
          if (p.linkBreakTotal > mission.defeat.threshold) outcome = 'defeat';
          break;
        }
      }
    }

    return outcome;
  }

  // Render the game on canvas
  function render(ctx, w, h) {
    const s = stateRef.current;
    if (!s) return;
    const center = { x: w / 2, y: h / 2 };
    const baseScale = Math.min(w, h) * 0.42;

    // Background
    ctx.fillStyle = 'rgba(0, 5, 15, 0.4)';
    ctx.fillRect(0, 0, w, h);

    // Draw earth
    const earthR = baseScale * 0.18;
    const grd = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, earthR);
    grd.addColorStop(0, '#1a4878');
    grd.addColorStop(0.7, '#0a2848');
    grd.addColorStop(1, '#051428');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(center.x, center.y, earthR, 0, Math.PI * 2);
    ctx.fill();

    // Continents hint
    ctx.fillStyle = 'rgba(60, 120, 80, 0.4)';
    ctx.beginPath();
    ctx.arc(center.x + earthR * 0.3, center.y - earthR * 0.2, earthR * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(center.x - earthR * 0.35, center.y + earthR * 0.15, earthR * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Atmosphere glow
    const atmGrd = ctx.createRadialGradient(center.x, center.y, earthR * 0.95, center.x, center.y, earthR * 1.3);
    atmGrd.addColorStop(0, 'rgba(110, 180, 255, 0.3)');
    atmGrd.addColorStop(1, 'rgba(110, 180, 255, 0)');
    ctx.fillStyle = atmGrd;
    ctx.beginPath();
    ctx.arc(center.x, center.y, earthR * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Orbital paths
    for (const orbit of [ORBITS.LEO, ORBITS.MEO, ORBITS.GEO]) {
      ctx.strokeStyle = 'rgba(110, 211, 255, 0.13)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, orbit * baseScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Orbit labels
    ctx.font = '9px Courier New, monospace';
    ctx.fillStyle = 'rgba(110, 211, 255, 0.4)';
    ctx.textAlign = 'left';
    ctx.fillText('LEO', center.x + ORBITS.LEO * baseScale + 4, center.y - 4);
    ctx.fillText('MEO', center.x + ORBITS.MEO * baseScale + 4, center.y - 4);
    ctx.fillText('GEO', center.x + ORBITS.GEO * baseScale + 4, center.y - 4);

    // Ground station
    if (s.groundStation) {
      const gsAngle = s.groundStation.angle || 0;
      const gx = center.x + Math.cos(gsAngle) * earthR * 0.95;
      const gy = center.y + Math.sin(gsAngle) * earthR * 0.95;
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx - 4, gy + 8);
      ctx.lineTo(gx + 4, gy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 9px Courier New, monospace';
      ctx.fillStyle = '#d4af37';
      ctx.textAlign = 'center';
      ctx.fillText(s.groundStation.label || 'GS', gx, gy + 18);
    }

    // Debris fields
    for (const d of s.debris) {
      const pos = polarToScreen(d.angle, d.orbit, center, baseScale);
      const r = d.radius * baseScale;
      const lifeFrac = d.life !== undefined ? Math.min(1, d.life / (d.maxLife || 30)) : 1;
      ctx.strokeStyle = `rgba(160, 100, 80, ${0.6 * lifeFrac})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.stroke();
      // Dots within
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + (d.angle * 3);
        const dr = (i % 3 + 1) * r / 4;
        const dx = pos.x + Math.cos(ang) * dr;
        const dy = pos.y + Math.sin(ang) * dr;
        ctx.fillStyle = `rgba(180, 120, 100, ${0.5 * lifeFrac})`;
        ctx.fillRect(dx - 1, dy - 1, 2, 2);
      }
    }

    // Sensor / weapon range for selected
    const selected = s.satellites.find(sat => sat.id === selectedId && sat.alive);
    if (selected) {
      const pos = polarToScreen(selected.angle, selected.orbit, center, baseScale);
      const st = SAT_TYPES[selected.type];
      // Sensor range
      ctx.strokeStyle = 'rgba(110, 211, 255, 0.25)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, st.sensorRange * baseScale, 0, Math.PI * 2);
      ctx.stroke();
      // Weapon range
      if (st.weaponRange > 0) {
        ctx.strokeStyle = 'rgba(255, 224, 102, 0.3)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, st.weaponRange * baseScale, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Threats
    for (const t of s.threats) {
      if (!t.alive || !t.spawned) continue;
      const tt = THREAT_TYPES[t.type];
      const pos = polarToScreen(t.angle, t.orbit, center, baseScale);

      // Detected check
      const detected = s.satellites.some(sat => sat.alive && canDetect(sat, t));

      if (!detected) {
        // Unknown contact ghost
        ctx.fillStyle = 'rgba(180, 50, 50, 0.4)';
        ctx.font = '12px Courier New, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', pos.x, pos.y + 4);
        continue;
      }

      // Jammed indicator
      if (t.jammed) {
        ctx.strokeStyle = 'rgba(201, 138, 255, 0.6)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Health bar
      const hpFrac = t.health / t.maxHealth;
      ctx.fillStyle = 'rgba(100, 30, 30, 0.7)';
      ctx.fillRect(pos.x - 10, pos.y - 14, 20, 2);
      ctx.fillStyle = hpFrac > 0.5 ? '#ff8888' : '#ff4444';
      ctx.fillRect(pos.x - 10, pos.y - 14, 20 * hpFrac, 2);

      // Icon
      ctx.fillStyle = tt.color;
      ctx.shadowColor = tt.color;
      ctx.shadowBlur = 8;
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(tt.icon, pos.x, pos.y + 5);
      ctx.shadowBlur = 0;

      // Label
      ctx.font = '8px Courier New, monospace';
      ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
      ctx.fillText(tt.name, pos.x, pos.y + 22);
    }

    // Satellites
    for (const sat of s.satellites) {
      if (!sat.alive) continue;
      const st = SAT_TYPES[sat.type];
      const pos = polarToScreen(sat.angle, sat.orbit, center, baseScale);

      // Selection ring
      if (sat.id === selectedId) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Jamming pulse
      if (sat.jamming && sat.type === 'jammer') {
        const pulseR = ((performance.now() / 100) % 30) + 10;
        ctx.strokeStyle = `rgba(201, 138, 255, ${1 - pulseR / 40})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Health bar
      const hpFrac = sat.health / sat.maxHealth;
      ctx.fillStyle = 'rgba(30, 60, 100, 0.7)';
      ctx.fillRect(pos.x - 10, pos.y - 14, 20, 2);
      ctx.fillStyle = hpFrac > 0.5 ? '#6eff9e' : hpFrac > 0.25 ? '#ffaa44' : '#ff6e6e';
      ctx.fillRect(pos.x - 10, pos.y - 14, 20 * hpFrac, 2);

      // Icon
      ctx.fillStyle = st.color;
      ctx.shadowColor = st.color;
      ctx.shadowBlur = 8;
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(st.icon, pos.x, pos.y + 5);
      ctx.shadowBlur = 0;

      // Label
      ctx.font = '8px Courier New, monospace';
      ctx.fillStyle = 'rgba(200, 216, 232, 0.7)';
      ctx.fillText(sat.name, pos.x, pos.y + 22);

      // Target line
      if (sat.target) {
        const t = s.threats.find(x => x.id === sat.target);
        if (t && t.alive) {
          const tpos = polarToScreen(t.angle, t.orbit, center, baseScale);
          ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(tpos.x, tpos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Projectiles
    for (const p of s.projectiles) {
      if (!p.alive) continue;
      const from = [...s.satellites, ...s.threats].find(e => e.id === p.fromId);
      const to = [...s.satellites, ...s.threats].find(e => e.id === p.targetId);
      if (!from || !to) continue;
      const fp = polarToScreen(from.angle, from.orbit, center, baseScale);
      const tp = polarToScreen(to.angle, to.orbit, center, baseScale);
      const x = fp.x + (tp.x - fp.x) * p.progress;
      const y = fp.y + (tp.y - fp.y) * p.progress;
      if (p.weaponKind === 'directed-energy') {
        ctx.strokeStyle = p.fromTeam === 'friendly' ? 'rgba(255, 100, 100, 0.6)' : 'rgba(255, 200, 80, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fp.x, fp.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.fromTeam === 'friendly' ? '#ffe066' : '#ff8866';
        ctx.shadowColor = p.fromTeam === 'friendly' ? '#ffe066' : '#ff8866';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Ground station link visual
    if (s.groundStation) {
      const gsAngle = s.groundStation.angle || 0;
      const gx = center.x + Math.cos(gsAngle) * earthR * 0.95;
      const gy = center.y + Math.sin(gsAngle) * earthR * 0.95;
      const gs = { angle: gsAngle, orbit: 0 };
      const commSats = s.satellites.filter(sat => sat.alive && sat.type === 'comm' && polarDist(sat, gs) < 0.7);
      for (const c of commSats) {
        const cp = polarToScreen(c.angle, c.orbit, center, baseScale);
        ctx.strokeStyle = 'rgba(110, 255, 158, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(cp.x, cp.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // Touch / pointer handling
  const pointerStart = useRef(null);
  const handlePointerDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const center = { x: w / 2, y: h / 2 };
    const baseScale = Math.min(w, h) * 0.42;

    const s = stateRef.current;
    if (!s) return;

    // Find closest entity within tap radius
    let closest = null;
    let closestDist = 40;
    for (const sat of s.satellites) {
      if (!sat.alive) continue;
      const pos = polarToScreen(sat.angle, sat.orbit, center, baseScale);
      const d = Math.hypot(cx - pos.x, cy - pos.y);
      if (d < closestDist) {
        closestDist = d;
        closest = { kind: 'satellite', entity: sat };
      }
    }
    for (const t of s.threats) {
      if (!t.alive || !t.spawned) continue;
      const detected = s.satellites.some(sat => sat.alive && canDetect(sat, t));
      if (!detected) continue;
      const pos = polarToScreen(t.angle, t.orbit, center, baseScale);
      const d = Math.hypot(cx - pos.x, cy - pos.y);
      if (d < closestDist) {
        closestDist = d;
        closest = { kind: 'threat', entity: t };
      }
    }

    pointerStart.current = { cx, cy, time: performance.now(), closest };
  }, []);

  const handlePointerUp = useCallback((e) => {
    const start = pointerStart.current;
    if (!start) return;
    pointerStart.current = null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const dragDist = Math.hypot(cx - start.cx, cy - start.cy);
    const elapsed = performance.now() - start.time;

    const s = stateRef.current;
    if (!s) return;
    const w = rect.width;
    const h = rect.height;
    const center = { x: w / 2, y: h / 2 };
    const baseScale = Math.min(w, h) * 0.42;

    // Tap (small movement)
    if (dragDist < 12 && elapsed < 500) {
      if (start.closest) {
        if (start.closest.kind === 'satellite') {
          // Select this satellite
          const sat = start.closest.entity;
          if (actionMode === 'engage' && selected && selected.id !== sat.id) {
            // Can't engage friendly
          } else {
            setSelectedId(sat.id);
            setActionMode(null);
          }
        } else if (start.closest.kind === 'threat') {
          // Designate target
          const selected = s.satellites.find(sat => sat.id === selectedId && sat.alive);
          if (selected) {
            selected.target = start.closest.entity.id;
            if (canEngage(selected, start.closest.entity)) {
              setHint('Target designated. Firing.');
              setTimeout(() => setHint(null), 1500);
            } else {
              setHint('Target out of range — maneuver to engage.');
              setTimeout(() => setHint(null), 2000);
            }
          } else {
            setHint('Select a satellite first.');
            setTimeout(() => setHint(null), 1500);
          }
        }
      } else {
        // Deselect on empty tap
        setSelectedId(null);
        setActionMode(null);
      }
    } else if (dragDist >= 12) {
      // Drag: maneuver selected satellite to drop point
      const selected = s.satellites.find(sat => sat.id === selectedId && sat.alive);
      if (selected) {
        // Convert drop position to (angle, orbit)
        const dx = cx - center.x;
        const dy = cy - center.y;
        const r = Math.hypot(dx, dy);
        const orbit = Math.max(ORBITS.LEO - 0.1, Math.min(0.98, r / baseScale));
        const angle = Math.atan2(dy, dx);
        if (selected.fuel > 5) {
          selected.targetOrbit = orbit;
          selected.targetAngle = angle;
        } else {
          setHint('Fuel critical — cannot maneuver.');
          setTimeout(() => setHint(null), 2000);
        }
      }
    }
  }, [selectedId, actionMode]);

  // Action button handlers
  const selected = stateRef.current?.satellites.find(sat => sat.id === selectedId && sat.alive);

  const onAction = useCallback((action) => {
    const sat = stateRef.current?.satellites.find(s => s.id === selectedId && s.alive);
    if (!sat) {
      setHint('Select a satellite first.');
      setTimeout(() => setHint(null), 1500);
      return;
    }
    const st = SAT_TYPES[sat.type];
    switch (action) {
      case 'scan':
        setHint(`${sat.name}: sensor range ${(st.sensorRange * 100).toFixed(0)}%, ${st.desc}`);
        setTimeout(() => setHint(null), 2500);
        break;
      case 'maneuver':
        setActionMode('maneuver');
        setHint('Drag the selected satellite to a new orbital position.');
        setTimeout(() => setHint(null), 2500);
        break;
      case 'engage':
        if (st.weaponDmg === 0) {
          setHint(`${st.name} has no weapons.`);
          setTimeout(() => setHint(null), 2000);
          return;
        }
        setActionMode('engage');
        setHint('Tap an enemy contact to designate target.');
        setTimeout(() => setHint(null), 2500);
        break;
      case 'jam':
        if (sat.type !== 'jammer') {
          setHint(`${st.name} cannot jam.`);
          setTimeout(() => setHint(null), 2000);
          return;
        }
        sat.jamming = !sat.jamming;
        setHint(sat.jamming ? 'Jammer active.' : 'Jammer offline.');
        setTimeout(() => setHint(null), 1500);
        break;
      case 'launch':
        setHint('All interceptors auto-engage threats in weapon range.');
        setTimeout(() => setHint(null), 2500);
        break;
    }
  }, [selectedId]);

  const s = stateRef.current;
  const friendlies = s ? s.satellites.filter(x => x.alive) : [];
  const enemies = s ? s.threats.filter(x => x.alive && x.spawned) : [];
  const totalEnemies = mission.waves ? mission.waves.flat().length : 0;
  const totalFriendly = mission.friendlies.length;

  return (
    <div className="game-container" ref={containerRef}>
      <canvas
        className="game-canvas"
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />

      {/* Top HUD */}
      <div className="hud-top">
        <div className="hud-panel">
          <div className="label">{mission.title.toUpperCase()}</div>
          <div className="value">WAVE {s ? Math.min(s.waveIndex + 1, mission.waves?.length || 1) : 1} / {mission.waves?.length || 1}</div>
          <div className="label" style={{ marginTop: 4 }}>TIME</div>
          <div className="value">{s ? formatTime(s.currentTime) : '0:00'}{mission.timeLimit ? ` / ${formatTime(mission.timeLimit)}` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div className="hud-panel" style={{ textAlign: 'center' }}>
            <div className="label">Friendly</div>
            <div className={`value ${friendlies.length / totalFriendly < 0.4 ? 'crit' : friendlies.length / totalFriendly < 0.7 ? 'warn' : 'good'}`}>{friendlies.length} / {totalFriendly}</div>
            <div className="label" style={{ marginTop: 4 }}>Threats</div>
            <div className="value">{enemies.length}</div>
          </div>
          <button className="action-btn" onClick={() => setPaused(p => !p)} style={{ minWidth: 50 }}>
            <span className="icon">{paused ? '▶' : '❚❚'}</span>
            {paused ? 'PLAY' : 'PAUSE'}
          </button>
        </div>
      </div>

      {/* Side satellite list */}
      <div className="hud-side">
        <div className="sat-list">
          <div className="sat-list-title">Constellation</div>
          {s?.satellites.map(sat => {
            const hpFrac = sat.health / sat.maxHealth;
            const cls = !sat.alive ? 'crit' : hpFrac > 0.5 ? 'good' : hpFrac > 0.25 ? 'warn' : 'crit';
            return (
              <div
                key={sat.id}
                className={`sat-row ${sat.id === selectedId ? 'selected' : ''}`}
                onClick={() => sat.alive && setSelectedId(sat.id)}
              >
                <span className="name" style={{ color: sat.alive ? SAT_TYPES[sat.type].color : '#666' }}>{sat.name}</span>
                <span className={`health ${cls}`}>{sat.alive ? Math.ceil(sat.health) : 'DOWN'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Threat warning banner */}
      {enemies.length > 0 && (
        <div className="threat-banner">⚠ {enemies.length} HOSTILE{enemies.length > 1 ? 'S' : ''} TRACKED</div>
      )}

      {/* Tutorial hint */}
      {hint && <div className="tutorial-hint">{hint}</div>}

      {/* Bottom HUD action bar */}
      <div className="hud-bottom">
        <button className="action-btn" onClick={() => onAction('scan')} disabled={!selected}>
          <span className="icon">⟲</span>
          SCAN
        </button>
        <button className={`action-btn ${actionMode === 'maneuver' ? 'active' : ''}`} onClick={() => onAction('maneuver')} disabled={!selected}>
          <span className="icon">⇄</span>
          MOVE
        </button>
        <button className={`action-btn ${actionMode === 'engage' ? 'active' : ''}`} onClick={() => onAction('engage')} disabled={!selected || (selected && SAT_TYPES[selected.type].weaponDmg === 0)}>
          <span className="icon">⚡</span>
          ENGAGE
        </button>
        <button className={`action-btn ${selected?.jamming ? 'active' : ''}`} onClick={() => onAction('jam')} disabled={!selected || selected?.type !== 'jammer'}>
          <span className="icon">≋</span>
          JAM
        </button>
        <button className="action-btn" onClick={onAbort}>
          <span className="icon">✕</span>
          ABORT
        </button>
      </div>

      {selected && (
        <div className="hud-panel" style={{ position: 'absolute', left: 12, bottom: 90, zIndex: 10, pointerEvents: 'none' }}>
          <div className="label">SELECTED</div>
          <div className="value" style={{ color: SAT_TYPES[selected.type].color }}>{selected.name}</div>
          <div className="label" style={{ marginTop: 4 }}>TYPE</div>
          <div style={{ fontSize: 11 }}>{SAT_TYPES[selected.type].desc}</div>
          <div className="label" style={{ marginTop: 4 }}>FUEL</div>
          <div className={`value ${selected.fuel < 20 ? 'crit' : selected.fuel < 40 ? 'warn' : ''}`}>{Math.ceil(selected.fuel)}%</div>
        </div>
      )}

      {paused && (
        <div className="pause-overlay">
          <div className="modal-content">
            <div className="modal-title">PAUSED</div>
            <div style={{ textAlign: 'center', color: '#c8d8e8', fontSize: 14, lineHeight: 1.6 }}>
              Mission in progress.<br />
              <span style={{ color: '#6e8aaa', fontSize: 11 }}>Use this time to plan your next move.</span>
            </div>
            <div className="modal-actions">
              <button className="cta-btn" onClick={() => setPaused(false)}>RESUME</button>
              <button className="cta-btn danger" onClick={onAbort}>ABORT MISSION</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
