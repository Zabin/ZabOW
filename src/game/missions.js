// Mission definitions for "Operation Contested Orbit"
// Each mission defines: starting friendlies, threat waves, win/lose conditions, briefing

// Orbital altitude bands (normalized 0-1 from earth surface to outer ring)
export const ORBITS = {
  LEO: 0.30,
  MEO: 0.55,
  GEO: 0.85,
};

// Satellite types and their stats
export const SAT_TYPES = {
  isr: {
    name: 'ISR',
    color: '#6ed3ff',
    icon: '◇',
    sensorRange: 0.55,
    weaponRange: 0,
    weaponDmg: 0,
    fireRate: 0,
    maxHealth: 60,
    maxFuel: 100,
    abilities: ['scan'],
    desc: 'Surveillance / no weapons',
  },
  comm: {
    name: 'COMM',
    color: '#6eff9e',
    icon: '◈',
    sensorRange: 0.35,
    weaponRange: 0,
    weaponDmg: 0,
    fireRate: 0,
    maxHealth: 50,
    maxFuel: 100,
    abilities: ['relay'],
    desc: 'Communication relay',
  },
  interceptor: {
    name: 'INTC',
    color: '#ffe066',
    icon: '◆',
    sensorRange: 0.40,
    weaponRange: 0.30,
    weaponDmg: 60,
    fireRate: 2.0,
    maxHealth: 80,
    maxFuel: 120,
    abilities: ['kinetic'],
    desc: 'Kinetic interceptor',
  },
  strike: {
    name: 'STRK',
    color: '#ff8888',
    icon: '▲',
    sensorRange: 0.45,
    weaponRange: 0.50,
    weaponDmg: 80,
    fireRate: 3.5,
    maxHealth: 70,
    maxFuel: 100,
    abilities: ['kinetic', 'directed-energy'],
    desc: 'Strike platform',
  },
  jammer: {
    name: 'EWAR',
    color: '#c98aff',
    icon: '◉',
    sensorRange: 0.35,
    weaponRange: 0.30,
    weaponDmg: 0,
    fireRate: 0.5,
    maxHealth: 60,
    maxFuel: 100,
    abilities: ['jam'],
    desc: 'Electronic warfare',
  },
  defense: {
    name: 'DEF',
    color: '#88d8ff',
    icon: '◊',
    sensorRange: 0.42,
    weaponRange: 0.25,
    weaponDmg: 50,
    fireRate: 1.5,
    maxHealth: 100,
    maxFuel: 100,
    abilities: ['kinetic', 'point-defense'],
    desc: 'Point-defense platform',
  },
};

// Threat types
export const THREAT_TYPES = {
  asat: {
    name: 'ASAT',
    color: '#ff4444',
    icon: '✦',
    sensorRange: 0.30,
    weaponRange: 0.15,
    weaponDmg: 100,
    fireRate: 1.0,
    maxHealth: 30,
    speed: 0.018,
    aggressive: true,
    desc: 'Anti-satellite missile',
  },
  coorbital: {
    name: 'COSAT',
    color: '#ff7744',
    icon: '✧',
    sensorRange: 0.40,
    weaponRange: 0.25,
    weaponDmg: 50,
    fireRate: 2.0,
    maxHealth: 60,
    speed: 0.008,
    aggressive: true,
    desc: 'Co-orbital weapon',
  },
  recon: {
    name: 'RECON',
    color: '#ffaa66',
    icon: '◌',
    sensorRange: 0.45,
    weaponRange: 0,
    weaponDmg: 0,
    fireRate: 0,
    maxHealth: 40,
    speed: 0.005,
    aggressive: false,
    desc: 'Reconnaissance asset',
  },
  jammer: {
    name: 'EJAM',
    color: '#ff66cc',
    icon: '◉',
    sensorRange: 0.35,
    weaponRange: 0.30,
    weaponDmg: 5,
    fireRate: 1.0,
    maxHealth: 50,
    speed: 0.006,
    aggressive: false,
    desc: 'Enemy jammer',
  },
  command: {
    name: 'CMD',
    color: '#ff2244',
    icon: '◆',
    sensorRange: 0.50,
    weaponRange: 0.20,
    weaponDmg: 40,
    fireRate: 2.5,
    maxHealth: 120,
    speed: 0.003,
    aggressive: true,
    desc: 'Command satellite',
  },
};

// Helper to create a satellite spec
const sat = (type, angle, orbit, name) => ({ type, angle, orbit, name });
const threat = (type, angle, orbit, delay = 0) => ({ type, angle, orbit, delay });

// Define 12 missions
export const MISSIONS = [
  {
    id: 1,
    title: 'Initial Contact',
    phase: 'PHASE 1: DEFENSIVE OPS',
    doctrine: 'Space Awareness',
    briefing: 'Enemy has deployed unknown surveillance asset in LEO. Establish and maintain tracking. Do not engage — intelligence priority.',
    advice: 'Position ISR sensors so their detection rings cover the enemy track. Drag a satellite to maneuver into coverage.',
    friendlies: [
      sat('isr', 0, ORBITS.LEO, 'SIERRA-1'),
      sat('isr', 2.1, ORBITS.MEO, 'SIERRA-2'),
      sat('isr', 4.2, ORBITS.LEO, 'SIERRA-3'),
    ],
    waves: [[threat('recon', 1.5, ORBITS.LEO, 0)]],
    victory: { type: 'track', duration: 60, target: 'recon' },
    defeat: { type: 'losses', threshold: 3 },
    objectives: {
      primary: 'Maintain sensor lock on enemy recon for 60 seconds',
      secondary: ['No friendly losses', 'Achieve track in under 20 seconds'],
    },
    timeLimit: 180,
  },
  {
    id: 2,
    title: 'First Interception',
    phase: 'PHASE 1: DEFENSIVE OPS',
    doctrine: 'Space Defense',
    briefing: 'Enemy has launched anti-satellite weapon at Sierra-1. Immediate defensive action required. Use Interceptor-North for kinetic intercept.',
    advice: 'Select your interceptor, then tap the incoming ASAT to engage. Hold off until it enters weapon range for a clean shot.',
    friendlies: [
      sat('isr', 0.5, ORBITS.LEO, 'SIERRA-1'),
      sat('isr', 3.5, ORBITS.MEO, 'SIERRA-2'),
      sat('interceptor', 1.0, ORBITS.LEO, 'INTC-N'),
    ],
    waves: [[threat('asat', 2.0, ORBITS.LEO, 2)]],
    victory: { type: 'destroyAll', target: 'asat' },
    defeat: { type: 'losses', threshold: 1 },
    objectives: {
      primary: 'Destroy ASAT before impact',
      secondary: ['Zero friendly losses', 'Intercept beyond 0.4 range'],
    },
    timeLimit: 120,
  },
  {
    id: 3,
    title: 'Contested Zone',
    phase: 'PHASE 1: DEFENSIVE OPS',
    doctrine: 'Space Control',
    briefing: 'Intelligence reports enemy maneuvering toward critical communication relay orbit. Establish space control by positioning assets to deny enemy freedom of action.',
    advice: 'Drag your defense and interceptor satellites into the MEO band to deny the enemy a foothold.',
    friendlies: [
      sat('defense', 0, ORBITS.LEO, 'GUARDIAN-1'),
      sat('defense', 3.14, ORBITS.LEO, 'GUARDIAN-2'),
      sat('interceptor', 1.5, ORBITS.MEO, 'INTC-N'),
      sat('isr', 4.5, ORBITS.GEO, 'EAGLE-1'),
    ],
    waves: [
      [threat('coorbital', 0.5, ORBITS.MEO, 3), threat('coorbital', 2.5, ORBITS.MEO, 6)],
      [threat('asat', 4.0, ORBITS.LEO, 4), threat('coorbital', 5.5, ORBITS.MEO, 8)],
    ],
    victory: { type: 'controlZone', orbit: ORBITS.MEO, duration: 30 },
    defeat: { type: 'losses', threshold: 3 },
    objectives: {
      primary: 'Maintain majority of MEO sector for 30s after final wave',
      secondary: ['Keep all 4 satellites alive', 'Destroy 3+ threats'],
    },
    timeLimit: 240,
  },
  {
    id: 4,
    title: 'Network Under Attack',
    phase: 'PHASE 1: DEFENSIVE OPS',
    doctrine: 'Integrated Defense',
    briefing: 'Enemy conducting coordinated ASAT campaign. All satellite systems report increased threat. Coordinate your constellation for maximum mutual defense. This is not a drill.',
    advice: 'Cluster your defense platforms near comm assets. Comm satellites are fragile — they must survive.',
    friendlies: [
      sat('comm', 0, ORBITS.GEO, 'COMM-1'),
      sat('comm', 2.1, ORBITS.GEO, 'COMM-2'),
      sat('comm', 4.2, ORBITS.GEO, 'COMM-3'),
      sat('defense', 1.0, ORBITS.MEO, 'GUARDIAN-1'),
      sat('defense', 3.5, ORBITS.MEO, 'GUARDIAN-2'),
      sat('isr', 5.0, ORBITS.LEO, 'SIERRA-1'),
    ],
    waves: [
      [threat('asat', 0.5, ORBITS.MEO, 3), threat('asat', 3.0, ORBITS.MEO, 6)],
      [threat('coorbital', 1.5, ORBITS.GEO, 4), threat('asat', 4.5, ORBITS.GEO, 7)],
      [threat('asat', 2.0, ORBITS.MEO, 3), threat('coorbital', 5.0, ORBITS.MEO, 5), threat('asat', 0.8, ORBITS.GEO, 8)],
      [threat('asat', 1.0, ORBITS.GEO, 3), threat('coorbital', 4.0, ORBITS.GEO, 5), threat('asat', 3.0, ORBITS.MEO, 7)],
      [threat('coorbital', 0.5, ORBITS.LEO, 2), threat('asat', 2.5, ORBITS.GEO, 4), threat('coorbital', 5.5, ORBITS.MEO, 6)],
    ],
    victory: { type: 'commSurvival', minComm: 2, allWaves: true },
    defeat: { type: 'commLoss', minComm: 2 },
    objectives: {
      primary: 'Keep at least 2 comm satellites operational through all 5 waves',
      secondary: ['All 3 comm satellites survive', 'Destroy 10+ threats'],
    },
    timeLimit: 360,
  },
  {
    id: 5,
    title: 'Counterattack Authorization',
    phase: 'PHASE 2: OFFENSIVE OPS',
    doctrine: 'Power Projection from Space',
    briefing: 'Analysis indicates enemy command satellite directing ASAT launches. Authorization granted to conduct strike. Eliminate the target and withdraw.',
    advice: 'Strike platforms have long range — engage the command sat without entering enemy fire zones.',
    friendlies: [
      sat('strike', 0, ORBITS.MEO, 'HAMMER-1'),
      sat('strike', 3.14, ORBITS.MEO, 'HAMMER-2'),
      sat('defense', 1.5, ORBITS.LEO, 'GUARDIAN-1'),
      sat('isr', 4.7, ORBITS.GEO, 'EAGLE-1'),
      sat('interceptor', 2.5, ORBITS.LEO, 'INTC-N'),
    ],
    waves: [[
      threat('command', 1.0, ORBITS.GEO, 1),
      threat('coorbital', 0.5, ORBITS.GEO, 5),
      threat('coorbital', 1.5, ORBITS.GEO, 5),
    ]],
    victory: { type: 'destroyType', target: 'command' },
    defeat: { type: 'strikeLoss' },
    objectives: {
      primary: 'Destroy the enemy command satellite',
      secondary: ['Lose no strike platforms', 'Mission under 90 seconds'],
    },
    timeLimit: 240,
  },
  {
    id: 6,
    title: 'Jamming Campaign',
    phase: 'PHASE 2: OFFENSIVE OPS',
    doctrine: 'Electronic Warfare',
    briefing: 'Coordinate your EW satellites to deny enemy command and control. Without comms, their forces are blind.',
    advice: 'Jammers disable enemy relays in radius. Tap a jammer, then activate JAM. Keep jamming pressure constant.',
    friendlies: [
      sat('jammer', 0, ORBITS.MEO, 'EWAR-1'),
      sat('jammer', 2.1, ORBITS.MEO, 'EWAR-2'),
      sat('jammer', 4.2, ORBITS.MEO, 'EWAR-3'),
      sat('defense', 3.14, ORBITS.LEO, 'GUARDIAN-1'),
    ],
    waves: [
      [threat('jammer', 0.5, ORBITS.GEO, 2), threat('jammer', 1.8, ORBITS.GEO, 4)],
      [threat('jammer', 3.5, ORBITS.GEO, 3), threat('coorbital', 4.5, ORBITS.MEO, 5)],
      [threat('jammer', 5.5, ORBITS.GEO, 3), threat('jammer', 0.8, ORBITS.MEO, 5)],
    ],
    victory: { type: 'jamRelays', minDisabled: 3 },
    defeat: { type: 'enemyRelays', maxAlive: 4 },
    objectives: {
      primary: 'Suppress enemy relay network (disable 3+ jammers)',
      secondary: ['Lose no friendlies', 'Disable all 5 relays'],
    },
    timeLimit: 300,
  },
  {
    id: 7,
    title: 'Debris Minefield',
    phase: 'PHASE 2: OFFENSIVE OPS',
    doctrine: 'Environmental Tactics',
    briefing: 'The battlefield is littered with debris from earlier engagements. Use this to your advantage — position your assets to turn the debris into a defensive barrier.',
    advice: 'Debris clouds damage anything passing through. Funnel enemies into them rather than engaging head-on.',
    friendlies: [
      sat('interceptor', 0, ORBITS.LEO, 'INTC-N'),
      sat('interceptor', 3.14, ORBITS.LEO, 'INTC-S'),
      sat('defense', 1.5, ORBITS.MEO, 'GUARDIAN-1'),
      sat('isr', 4.5, ORBITS.GEO, 'EAGLE-1'),
    ],
    debrisFields: [
      { angle: 1.0, orbit: ORBITS.LEO, radius: 0.08 },
      { angle: 3.5, orbit: ORBITS.MEO, radius: 0.1 },
      { angle: 5.0, orbit: ORBITS.LEO, radius: 0.07 },
    ],
    waves: [
      [threat('coorbital', 0.5, ORBITS.LEO, 2), threat('coorbital', 2.5, ORBITS.MEO, 4)],
      [threat('asat', 4.0, ORBITS.LEO, 3), threat('coorbital', 5.5, ORBITS.MEO, 6)],
      [threat('coorbital', 1.5, ORBITS.LEO, 2), threat('asat', 3.0, ORBITS.MEO, 4), threat('coorbital', 4.5, ORBITS.LEO, 6)],
    ],
    victory: { type: 'destroyCount', count: 5 },
    defeat: { type: 'losses', threshold: 3 },
    objectives: {
      primary: 'Destroy 5+ threats (kinetic or via debris)',
      secondary: ['Lose 0-1 friendlies', 'Force 3+ enemies into debris'],
    },
    timeLimit: 300,
  },
  {
    id: 8,
    title: 'Constellation Supremacy',
    phase: 'PHASE 2: OFFENSIVE OPS',
    doctrine: 'Space Superiority',
    briefing: 'All-out space war. The enemy has deployed their full constellation. You must achieve and maintain superiority across all orbital regimes.',
    advice: 'You face equal numbers. Use coordinated fires — multiple satellites focusing one target win local battles.',
    friendlies: [
      sat('strike', 0, ORBITS.MEO, 'HAMMER-1'),
      sat('strike', 3.14, ORBITS.MEO, 'HAMMER-2'),
      sat('interceptor', 1.0, ORBITS.LEO, 'INTC-N'),
      sat('interceptor', 4.0, ORBITS.LEO, 'INTC-S'),
      sat('defense', 0.5, ORBITS.GEO, 'GUARDIAN-1'),
      sat('defense', 3.5, ORBITS.GEO, 'GUARDIAN-2'),
      sat('isr', 5.5, ORBITS.GEO, 'EAGLE-1'),
      sat('jammer', 2.5, ORBITS.MEO, 'EWAR-1'),
    ],
    waves: [
      [threat('coorbital', 0.3, ORBITS.LEO, 1), threat('coorbital', 2.0, ORBITS.MEO, 2),
       threat('asat', 4.0, ORBITS.LEO, 3), threat('command', 5.5, ORBITS.GEO, 4)],
      [threat('coorbital', 1.0, ORBITS.GEO, 5), threat('asat', 3.5, ORBITS.MEO, 6),
       threat('coorbital', 5.0, ORBITS.MEO, 8), threat('asat', 0.5, ORBITS.MEO, 10)],
    ],
    victory: { type: 'enemyAttrition', maxAlive: 2, minFriendly: 5 },
    defeat: { type: 'friendlyAttrition', maxAlive: 3 },
    objectives: {
      primary: 'Reduce enemy to 2 or fewer while keeping 5+ friendly',
      secondary: ['Lose 0 strike platforms', 'Destroy all enemies'],
    },
    timeLimit: 360,
  },
  {
    id: 9,
    title: 'Protect the Ground Station',
    phase: 'PHASE 3: STRATEGIC OPS',
    doctrine: 'Space-to-Ground Integration',
    briefing: 'The ground station is our nerve center. Your satellites must maintain constant contact. One loss of signal means blindness. Defend the link at all costs.',
    advice: 'At least one comm satellite must have line-of-sight to the ground station at all times. Stagger their orbits.',
    groundStation: { angle: 0, label: 'TERRA-1' },
    friendlies: [
      sat('comm', 0, ORBITS.MEO, 'COMM-1'),
      sat('comm', 2.1, ORBITS.MEO, 'COMM-2'),
      sat('comm', 4.2, ORBITS.MEO, 'COMM-3'),
      sat('defense', 1.0, ORBITS.LEO, 'GUARDIAN-1'),
      sat('interceptor', 3.5, ORBITS.LEO, 'INTC-N'),
    ],
    waves: [
      [threat('asat', 0.5, ORBITS.MEO, 3), threat('coorbital', 3.5, ORBITS.MEO, 6)],
      [threat('asat', 2.5, ORBITS.MEO, 4), threat('coorbital', 5.0, ORBITS.LEO, 7)],
      [threat('asat', 1.5, ORBITS.MEO, 3), threat('asat', 4.5, ORBITS.MEO, 5), threat('coorbital', 0.5, ORBITS.GEO, 7)],
    ],
    victory: { type: 'maintainLink', duration: 180, maxBreak: 30 },
    defeat: { type: 'linkBroken', threshold: 30 },
    objectives: {
      primary: 'Maintain ground link for 3 minutes',
      secondary: ['Zero link breaks', 'All comm satellites survive'],
    },
    timeLimit: 240,
  },
  {
    id: 10,
    title: 'Orbital Relay Race',
    phase: 'PHASE 3: STRATEGIC OPS',
    doctrine: 'Resilience & Redundancy',
    briefing: 'We need a redundant communication network spanning three orbital planes. Position your assets in sequence — each must hand off coverage to the next.',
    advice: 'Spread comm satellites evenly across all three orbital bands. The chain breaks if any band is uncovered.',
    friendlies: [
      sat('comm', 0, ORBITS.LEO, 'RELAY-1'),
      sat('comm', 2.0, ORBITS.LEO, 'RELAY-2'),
      sat('comm', 1.0, ORBITS.MEO, 'RELAY-3'),
      sat('comm', 3.5, ORBITS.MEO, 'RELAY-4'),
      sat('comm', 5.0, ORBITS.GEO, 'RELAY-5'),
      sat('defense', 4.0, ORBITS.LEO, 'GUARDIAN-1'),
      sat('interceptor', 2.5, ORBITS.GEO, 'INTC-N'),
    ],
    waves: [
      [threat('asat', 0.5, ORBITS.LEO, 3), threat('coorbital', 2.5, ORBITS.MEO, 5)],
      [threat('coorbital', 4.5, ORBITS.GEO, 3), threat('asat', 1.5, ORBITS.MEO, 5)],
      [threat('asat', 3.0, ORBITS.LEO, 3), threat('coorbital', 5.5, ORBITS.MEO, 5), threat('asat', 0.8, ORBITS.GEO, 7)],
    ],
    victory: { type: 'maintainChain', duration: 120, allOrbits: true },
    defeat: { type: 'chainBreak' },
    objectives: {
      primary: 'Maintain comm presence in all 3 orbital bands for 2 minutes',
      secondary: ['No relay losses', 'Complete chain in under 30s'],
    },
    timeLimit: 300,
  },
  {
    id: 11,
    title: 'The Siege',
    phase: 'PHASE 3: STRATEGIC OPS',
    doctrine: 'Endurance & Resource Management',
    briefing: 'Enemy is going all-in. Waves of ASAT and kinetic strikes coming continuously. You have limited resources. Manage fuel and weapons carefully.',
    advice: 'Not every threat requires immediate engagement. Conserve fuel — let some pass if your network is safe.',
    fuelScarce: true,
    friendlies: [
      sat('defense', 0, ORBITS.MEO, 'GUARDIAN-1'),
      sat('defense', 2.1, ORBITS.MEO, 'GUARDIAN-2'),
      sat('defense', 4.2, ORBITS.MEO, 'GUARDIAN-3'),
      sat('interceptor', 1.0, ORBITS.LEO, 'INTC-N'),
      sat('interceptor', 3.5, ORBITS.LEO, 'INTC-S'),
      sat('strike', 5.0, ORBITS.GEO, 'HAMMER-1'),
    ],
    waves: [
      [threat('asat', 0.5, ORBITS.MEO, 2)],
      [threat('asat', 2.0, ORBITS.MEO, 2), threat('coorbital', 4.0, ORBITS.MEO, 4)],
      [threat('asat', 1.0, ORBITS.LEO, 2), threat('asat', 3.5, ORBITS.MEO, 4)],
      [threat('asat', 0.8, ORBITS.MEO, 2), threat('coorbital', 3.0, ORBITS.MEO, 3), threat('asat', 5.0, ORBITS.GEO, 5)],
      [threat('coorbital', 1.5, ORBITS.LEO, 2), threat('asat', 4.0, ORBITS.MEO, 3), threat('asat', 2.5, ORBITS.GEO, 5)],
      [threat('asat', 0.3, ORBITS.MEO, 1), threat('asat', 2.8, ORBITS.LEO, 3), threat('coorbital', 5.5, ORBITS.MEO, 5)],
      [threat('asat', 1.2, ORBITS.GEO, 2), threat('coorbital', 3.8, ORBITS.LEO, 3), threat('asat', 4.7, ORBITS.MEO, 5), threat('asat', 0.5, ORBITS.LEO, 7)],
      [threat('coorbital', 2.0, ORBITS.MEO, 1), threat('asat', 4.5, ORBITS.LEO, 2), threat('asat', 5.5, ORBITS.MEO, 4), threat('coorbital', 1.0, ORBITS.GEO, 6), threat('asat', 3.0, ORBITS.MEO, 8)],
    ],
    victory: { type: 'surviveWaves', waves: 8, minFriendly: 3 },
    defeat: { type: 'friendlyAttrition', maxAlive: 3 },
    objectives: {
      primary: 'Survive 8 waves with 3+ satellites',
      secondary: ['5+ satellites at end', 'Lose less than 2 satellites'],
    },
    timeLimit: 480,
  },
  {
    id: 12,
    title: 'Operation Orbital Dominance',
    phase: 'PHASE 3: STRATEGIC OPS',
    doctrine: 'Complete Space Superiority',
    briefing: 'This is it. Everything we have trained for. The enemy has committed their entire force to seizing orbital dominance. We must meet them with strength, skill, and tactical precision.',
    advice: 'Use everything you have learned. Strike at command, jam their EW, intercept ASAT, hold the orbits. Victory in space determines victory on Earth.',
    finalMission: true,
    friendlies: [
      sat('strike', 0, ORBITS.MEO, 'HAMMER-1'),
      sat('strike', 3.14, ORBITS.MEO, 'HAMMER-2'),
      sat('interceptor', 0.7, ORBITS.LEO, 'INTC-N'),
      sat('interceptor', 2.5, ORBITS.LEO, 'INTC-S'),
      sat('interceptor', 4.5, ORBITS.LEO, 'INTC-E'),
      sat('defense', 1.0, ORBITS.GEO, 'GUARDIAN-1'),
      sat('defense', 4.0, ORBITS.GEO, 'GUARDIAN-2'),
      sat('jammer', 1.8, ORBITS.MEO, 'EWAR-1'),
      sat('jammer', 4.8, ORBITS.MEO, 'EWAR-2'),
      sat('isr', 5.5, ORBITS.GEO, 'EAGLE-1'),
    ],
    waves: [
      [threat('coorbital', 0.3, ORBITS.LEO, 1), threat('coorbital', 2.0, ORBITS.MEO, 2),
       threat('asat', 4.0, ORBITS.LEO, 3), threat('jammer', 5.5, ORBITS.GEO, 4)],
      [threat('command', 1.0, ORBITS.GEO, 5), threat('asat', 3.5, ORBITS.MEO, 6),
       threat('coorbital', 5.0, ORBITS.MEO, 8), threat('asat', 0.5, ORBITS.MEO, 10)],
      [threat('coorbital', 2.0, ORBITS.LEO, 3), threat('asat', 4.5, ORBITS.LEO, 5),
       threat('coorbital', 1.5, ORBITS.GEO, 7), threat('jammer', 3.5, ORBITS.MEO, 9),
       threat('command', 0.8, ORBITS.MEO, 12)],
    ],
    victory: { type: 'enemyAttrition', maxAlive: 0, minFriendly: 3 },
    defeat: { type: 'friendlyAttrition', maxAlive: 2 },
    objectives: {
      primary: 'Eliminate all 12 enemy satellites',
      secondary: ['5+ friendlies survive', 'Destroy command sats in under 90s'],
    },
    timeLimit: 480,
  },
];

export const QUICK_SCENARIOS = [
  { id: 'defense', name: 'Defense', desc: 'Protect your assets from waves of attackers' },
  { id: 'offense', name: 'Offense', desc: 'Destroy enemy targets while minimizing losses' },
  { id: 'control', name: 'Control', desc: 'Dominate an orbital sector' },
  { id: 'survival', name: 'Survival', desc: 'Endure escalating attack waves' },
  { id: 'mixed', name: 'Mixed', desc: 'Combination challenge with varied objectives' },
];

export const DIFFICULTIES = ['easy', 'normal', 'hard', 'expert', 'extreme'];

export function generateQuickMission(scenario, difficulty) {
  const diffIdx = DIFFICULTIES.indexOf(difficulty);
  const diffMult = 0.6 + diffIdx * 0.35; // 0.6, 0.95, 1.3, 1.65, 2.0
  const friendCount = Math.max(3, 6 - diffIdx);
  const enemyCount = Math.floor(2 + diffIdx * 1.5);

  const types = {
    defense: { friend: ['defense', 'defense', 'interceptor', 'comm', 'comm', 'isr'], enemy: 'asat' },
    offense: { friend: ['strike', 'strike', 'interceptor', 'isr', 'jammer', 'defense'], enemy: 'command' },
    control: { friend: ['interceptor', 'defense', 'interceptor', 'defense', 'isr', 'strike'], enemy: 'coorbital' },
    survival: { friend: ['defense', 'defense', 'interceptor', 'interceptor', 'isr', 'strike'], enemy: 'asat' },
    mixed: { friend: ['strike', 'defense', 'interceptor', 'jammer', 'isr', 'comm'], enemy: 'coorbital' },
  };
  const cfg = types[scenario] || types.mixed;
  const friendlies = [];
  for (let i = 0; i < friendCount; i++) {
    const orbits = [ORBITS.LEO, ORBITS.MEO, ORBITS.GEO];
    friendlies.push({
      type: cfg.friend[i % cfg.friend.length],
      angle: (i / friendCount) * Math.PI * 2,
      orbit: orbits[i % 3],
      name: `${cfg.friend[i % cfg.friend.length].toUpperCase()}-${i + 1}`,
    });
  }
  const waves = [];
  const numWaves = Math.min(5, 2 + diffIdx);
  for (let w = 0; w < numWaves; w++) {
    const wave = [];
    const waveSize = Math.floor(enemyCount * (0.6 + w * 0.2));
    for (let i = 0; i < waveSize; i++) {
      const orbits = [ORBITS.LEO, ORBITS.MEO, ORBITS.GEO];
      const types = ['asat', 'coorbital'];
      wave.push({
        type: types[i % types.length],
        angle: Math.random() * Math.PI * 2,
        orbit: orbits[i % 3],
        delay: i * 3 + 2,
      });
    }
    waves.push(wave);
  }
  return {
    id: 'quick',
    title: `Quick: ${scenario.charAt(0).toUpperCase() + scenario.slice(1)}`,
    phase: `Quick Mission - ${difficulty.toUpperCase()}`,
    doctrine: scenario.charAt(0).toUpperCase() + scenario.slice(1),
    briefing: `Quick mission: ${scenario} scenario on ${difficulty} difficulty. ${cfg.enemy.toUpperCase()} threats incoming.`,
    advice: 'Use everything you know. Position, time, fire.',
    friendlies,
    waves,
    victory: scenario === 'survival'
      ? { type: 'surviveWaves', waves: numWaves, minFriendly: 2 }
      : { type: 'destroyCount', count: Math.floor(enemyCount * numWaves * 0.7) },
    defeat: { type: 'friendlyAttrition', maxAlive: 1 },
    objectives: {
      primary: `Survive and complete ${scenario} objective`,
      secondary: ['Lose minimal satellites', 'Achieve high accuracy'],
    },
    timeLimit: 240,
    quickMission: true,
    difficultyMult: diffMult,
  };
}
