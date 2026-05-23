import React, { useState } from 'react';
import { DIFFICULTIES } from '../game/missions.js';

export default function Settings({ settings, onChange, onReset, onBack }) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Settings</div>
        <button className="back-btn" onClick={onBack}>◂ Back</button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div className="briefing-section">
          <h3>Difficulty</h3>
          <div className="difficulty-select">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                className={settings.difficulty === d ? 'active' : ''}
                onClick={() => onChange({ difficulty: d })}
              >
                {d}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#6e8aaa', marginTop: 8 }}>
            Adjusts enemy strength and aggression for campaign and quick missions.
          </p>
        </div>

        <div className="briefing-section">
          <h3>Audio</h3>
          <div className="settings-row">
            <span className="label">SFX</span>
            <div className={`toggle ${settings.sfx ? 'on' : ''}`} onClick={() => onChange({ sfx: !settings.sfx })} />
          </div>
          <div className="settings-row">
            <span className="label">Music</span>
            <div className={`toggle ${settings.music ? 'on' : ''}`} onClick={() => onChange({ music: !settings.music })} />
          </div>
          <div className="settings-row">
            <span className="label">Haptics</span>
            <div className={`toggle ${settings.haptics ? 'on' : ''}`} onClick={() => onChange({ haptics: !settings.haptics })} />
          </div>
        </div>

        <div className="briefing-section">
          <h3>Gameplay</h3>
          <div className="settings-row">
            <span className="label">Tutorial Hints</span>
            <div className={`toggle ${settings.tutorialHints ? 'on' : ''}`} onClick={() => onChange({ tutorialHints: !settings.tutorialHints })} />
          </div>
          <div className="settings-row">
            <span className="label">Particle Effects</span>
            <div className={`toggle ${settings.particles ? 'on' : ''}`} onClick={() => onChange({ particles: !settings.particles })} />
          </div>
          <div className="settings-row">
            <span className="label">Pause Allowed</span>
            <div className={`toggle ${settings.pauseAllowed ? 'on' : ''}`} onClick={() => onChange({ pauseAllowed: !settings.pauseAllowed })} />
          </div>
        </div>

        <div className="briefing-section">
          <h3>Data</h3>
          {!confirmReset ? (
            <button className="cta-btn danger" onClick={() => setConfirmReset(true)}>RESET CAMPAIGN PROGRESS</button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <p style={{ color: '#ff8888' }}>This will erase all campaign progress and statistics. This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="cta-btn danger" onClick={() => { onReset(); setConfirmReset(false); }}>CONFIRM RESET</button>
                <button className="cta-btn" onClick={() => setConfirmReset(false)} style={{ background: 'rgba(20,40,70,0.6)' }}>CANCEL</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
