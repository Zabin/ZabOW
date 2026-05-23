import React from 'react';
import { MISSIONS } from '../game/missions.js';

export default function Scenarios({ persistent, onBack, onSelect }) {
  const campaign = persistent.campaign || {};
  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Scenarios</div>
        <button className="back-btn" onClick={onBack}>◂ Back</button>
      </div>
      <p style={{ color: '#6e8aaa', fontSize: 12, marginBottom: 12 }}>
        Replay any mission you have unlocked. Campaign progress is not affected by replays.
      </p>
      <div className="mission-grid">
        {MISSIONS.map(m => {
          const data = campaign[m.id] || {};
          const isUnlocked = m.id === 1 || campaign[m.id - 1]?.completed || data.completed;
          return (
            <button
              key={m.id}
              className={`mission-card ${!isUnlocked ? 'locked' : ''}`}
              onClick={() => isUnlocked && onSelect(m)}
              disabled={!isUnlocked}
            >
              {!isUnlocked && <div className="locked-badge">LOCKED</div>}
              <div className="mission-num">MISSION {String(m.id).padStart(2, '0')}</div>
              <div className="mission-title">{m.title}</div>
              <div className="mission-doctrine">{m.doctrine}</div>
              <div className="mission-stars">
                {[1, 2, 3].map(n => (
                  <span key={n} className={`star ${(data.stars || 0) >= n ? 'earned' : 'unearned'}`}>★</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
