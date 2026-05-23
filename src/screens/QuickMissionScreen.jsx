import React, { useState } from 'react';
import { QUICK_SCENARIOS, DIFFICULTIES } from '../game/missions.js';

export default function QuickMissionScreen({ onBack, onStart }) {
  const [scenario, setScenario] = useState('defense');
  const [difficulty, setDifficulty] = useState('normal');

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Quick Mission</div>
        <button className="back-btn" onClick={onBack}>◂ Back</button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div className="briefing-section">
          <h3>Scenario</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {QUICK_SCENARIOS.map(s => (
              <button
                key={s.id}
                className="mission-card"
                style={{ borderColor: scenario === s.id ? '#6ed3ff' : 'rgba(110,211,255,0.25)' }}
                onClick={() => setScenario(s.id)}
              >
                <div className="mission-title">{s.name}</div>
                <div style={{ fontSize: 12, color: '#c8d8e8' }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="briefing-section">
          <h3>Difficulty</h3>
          <div className="difficulty-select">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                className={difficulty === d ? 'active' : ''}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#6e8aaa', marginTop: 8 }}>
            {difficulty === 'easy' && 'Reduced enemy strength. Recommended for first-timers.'}
            {difficulty === 'normal' && 'Standard challenge.'}
            {difficulty === 'hard' && 'Aggressive enemies, faster waves.'}
            {difficulty === 'expert' && 'Sustained pressure across all bands.'}
            {difficulty === 'extreme' && 'Brutal. Every move counts.'}
          </p>
        </div>

        <button className="cta-btn" onClick={() => onStart(scenario, difficulty)}>LAUNCH</button>
      </div>
    </div>
  );
}
