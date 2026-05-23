import React from 'react';
import { SAT_TYPES, THREAT_TYPES } from '../game/missions.js';

export default function MissionBriefing({ mission, onBack, onBegin }) {
  // Tally expected threats
  const threatTypes = {};
  for (const wave of mission.waves || []) {
    for (const t of wave) {
      threatTypes[t.type] = (threatTypes[t.type] || 0) + 1;
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Mission Briefing</div>
        <button className="back-btn" onClick={onBack}>◂ Back</button>
      </div>

      <div className="briefing">
        <div className="briefing-section">
          <h3>Mission {mission.id ? String(mission.id).padStart(2, '0') : '—'}</h3>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#6ed3ff', marginBottom: 4, fontFamily: 'Courier New, monospace' }}>
            {mission.title.toUpperCase()}
          </p>
          <p style={{ fontSize: 11, color: '#d4af37', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Doctrine: {mission.doctrine}
          </p>
        </div>

        <div className="briefing-section">
          <h3>Situation</h3>
          <p>{mission.briefing}</p>
        </div>

        <div className="briefing-section">
          <h3>Your Constellation ({mission.friendlies.length})</h3>
          <ul>
            {mission.friendlies.map((f, i) => {
              const type = SAT_TYPES[f.type];
              return (
                <li key={i}>
                  <strong style={{ color: type.color }}>{f.name}</strong> — {type.name} ({type.desc})
                </li>
              );
            })}
          </ul>
        </div>

        <div className="briefing-section">
          <h3>Threat Assessment</h3>
          {Object.keys(threatTypes).length === 0 ? (
            <p>No active threats detected — surveillance posture</p>
          ) : (
            <ul>
              {Object.entries(threatTypes).map(([type, count]) => {
                const t = THREAT_TYPES[type];
                return (
                  <li key={type}>
                    <strong style={{ color: t.color }}>{count}× {t.name}</strong> — {t.desc}
                  </li>
                );
              })}
            </ul>
          )}
          {mission.waves && (
            <p style={{ marginTop: 6, fontSize: 12, color: '#6e8aaa' }}>
              {mission.waves.length} wave{mission.waves.length !== 1 ? 's' : ''} expected
            </p>
          )}
        </div>

        <div className="briefing-section">
          <h3>Objectives</h3>
          <p><strong style={{ color: '#6eff9e' }}>Primary:</strong> {mission.objectives.primary}</p>
          {mission.objectives.secondary && (
            <>
              <p style={{ marginTop: 8 }}><strong style={{ color: '#ffe066' }}>Secondary (Bonus Stars):</strong></p>
              <ul>
                {mission.objectives.secondary.map((obj, i) => <li key={i}>{obj}</li>)}
              </ul>
            </>
          )}
        </div>

        <div className="briefing-section">
          <h3>Tactical Advice</h3>
          <p style={{ fontStyle: 'italic', color: '#c8d8e8' }}>{mission.advice}</p>
        </div>

        <button className="cta-btn" onClick={onBegin}>BEGIN MISSION</button>
      </div>
    </div>
  );
}
