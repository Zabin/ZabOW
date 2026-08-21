import React from 'react';
import { MISSIONS } from '../game/missions.js';

const AAR_TEMPLATES = {
  victory: [
    'Excellent execution. Your tactical decisions were sound and your constellation responded with precision.',
    'Mission objective achieved. Continue to refine fuel discipline and engagement timing in future operations.',
    'Decisive victory. Consider integrating EW and kinetic effects more aggressively in future scenarios.',
    'Operation a success. Your understanding of orbital geometry shows in the results.',
  ],
  defeat: [
    'The mission did not achieve its objectives. Review threat priority and weapon range before retrying.',
    'A setback. Position your high-value assets behind defense platforms and conserve fuel.',
    'Operation aborted. Consider tighter constellation spacing to enable mutual support.',
    'Reassess. Detection comes before engagement — keep ISR assets alive.',
  ],
};

export default function Results({ mission, result, onRetry, onNext, onMenu }) {
  const { outcome, stars, metrics } = result;
  const isVictory = outcome === 'victory';
  const nextExists = MISSIONS.find(m => m.id === mission.id + 1);
  const aar = AAR_TEMPLATES[outcome][mission.id % AAR_TEMPLATES[outcome].length];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className={`modal-title ${isVictory ? 'victory' : 'defeat'}`}>
          {isVictory ? 'MISSION COMPLETE' : 'MISSION FAILED'}
        </div>

        <div style={{ textAlign: 'center', color: '#6e8aaa', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          {mission.title}
        </div>

        {isVictory && (
          <div className="results-stars">
            {[1, 2, 3].map(n => (
              <span key={n} className={`star ${stars >= n ? 'earned' : 'unearned'}`} style={{ fontSize: 36 }}>★</span>
            ))}
          </div>
        )}

        <div className="results-metrics">
          <div className="label">Status</div>
          <div className="value">{isVictory ? 'SUCCESS' : 'FAILURE'}</div>
          <div className="label">Time</div>
          <div className="value">{formatTime(metrics.time)}</div>
          <div className="label">Waves Survived</div>
          <div className="value">{metrics.waves}</div>
          <div className="label">Enemies Destroyed</div>
          <div className="value">{metrics.enemiesDestroyed}</div>
          <div className="label">Satellites Lost</div>
          <div className="value">{metrics.satellitesLost}</div>
          <div className="label">Remaining</div>
          <div className="value">{metrics.satellitesRemaining}</div>
          <div className="label">Accuracy</div>
          <div className="value">{metrics.accuracy}%</div>
        </div>

        <div className="aar-text">
          <strong style={{ color: '#6ed3ff', fontFamily: 'Courier New, monospace', letterSpacing: '0.1em' }}>AAR:</strong> {aar}
        </div>

        {mission.id === 12 && isVictory && (
          <div style={{ border: '1px solid #d4af37', padding: 12, textAlign: 'center', background: 'rgba(212, 175, 55, 0.1)' }}>
            <div style={{ color: '#d4af37', fontSize: 16, fontWeight: 800, letterSpacing: '0.2em', fontFamily: 'Courier New, monospace' }}>
              CAMPAIGN COMPLETE
            </div>
            <div style={{ color: '#c8d8e8', fontSize: 12, marginTop: 4 }}>
              Operation Contested Orbit concluded. Orbital dominance achieved.
            </div>
          </div>
        )}

        <div className="modal-actions">
          {isVictory && nextExists && !mission.quickMission && (
            <button className="cta-btn" onClick={onNext}>NEXT MISSION</button>
          )}
          {!isVictory && <button className="cta-btn warning" onClick={onRetry}>RETRY</button>}
          {isVictory && <button className="cta-btn" onClick={onRetry}>REPLAY</button>}
          <button className="cta-btn" onClick={onMenu} style={{ background: 'rgba(20,40,70,0.6)' }}>MAIN MENU</button>
        </div>
      </div>
    </div>
  );
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
