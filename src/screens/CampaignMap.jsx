import React from 'react';
import { MISSIONS } from '../game/missions.js';

export default function CampaignMap({ persistent, onBack, onSelect }) {
  const campaign = persistent.campaign || {};
  const stats = persistent.globalStats || {};

  // Determine which mission is "current" (lowest uncompleted)
  const currentId = (() => {
    for (const m of MISSIONS) {
      if (!campaign[m.id]?.completed) return m.id;
    }
    return MISSIONS.length;
  })();

  // Group by phase
  const phases = {};
  for (const m of MISSIONS) {
    if (!phases[m.phase]) phases[m.phase] = [];
    phases[m.phase].push(m);
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Campaign Map</div>
        <button className="back-btn" onClick={onBack}>◂ Back</button>
      </div>

      <div className="global-stats">
        <div className="stat">
          <div className="label">Missions</div>
          <div className="value">{stats.missionsCompleted || 0} / 12</div>
        </div>
        <div className="stat">
          <div className="label">Stars</div>
          <div className="value">{stats.totalStars || 0} / 36</div>
        </div>
        <div className="stat">
          <div className="label">Kills</div>
          <div className="value">{stats.enemiesDestroyed || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Lost</div>
          <div className="value">{stats.satellitesLost || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Playtime</div>
          <div className="value">{formatTime(stats.playTimeSec || 0)}</div>
        </div>
      </div>

      <div className="campaign-map">
        {Object.entries(phases).map(([phase, missions]) => (
          <div key={phase}>
            <div className="phase-header">{phase}</div>
            <div className="mission-grid">
              {missions.map(m => {
                const data = campaign[m.id] || {};
                const isLocked = m.id > currentId;
                const isCurrent = m.id === currentId;
                return (
                  <button
                    key={m.id}
                    className={`mission-card ${isLocked ? 'locked' : ''} ${isCurrent ? 'current' : ''}`}
                    onClick={() => !isLocked && onSelect(m)}
                    disabled={isLocked}
                  >
                    {isLocked && <div className="locked-badge">LOCKED</div>}
                    {isCurrent && <div className="locked-badge" style={{ color: '#d4af37' }}>▶ NEXT</div>}
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
        ))}
      </div>
    </div>
  );
}

function formatTime(sec) {
  if (sec < 60) return `${Math.floor(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
