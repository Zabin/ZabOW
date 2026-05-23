import React from 'react';

export default function MainMenu({ persistent, onCampaign, onQuick, onScenarios, onSettings, onDoctrine }) {
  const completed = Object.values(persistent.campaign || {}).filter(m => m.completed).length;
  const hasProgress = completed > 0;

  return (
    <div className="title-screen">
      <div className="title-logo">
        <div className="ussf">United States Space Force</div>
        <h1 style={{ marginTop: 8 }}>ORBITAL<br />COMMAND</h1>
        <div className="subtitle">Operation Contested Orbit</div>
      </div>
      <div className="menu">
        <button className="menu-btn" onClick={onCampaign}>
          {hasProgress ? `Resume Campaign (${completed}/12)` : 'Begin Campaign'}
        </button>
        <button className="menu-btn" onClick={onQuick}>Quick Mission</button>
        <button className="menu-btn" onClick={onScenarios}>Scenarios</button>
        <button className="menu-btn" onClick={onDoctrine}>Briefing &amp; Doctrine</button>
        <button className="menu-btn" onClick={onSettings}>Settings</button>
      </div>
      <div style={{ marginTop: 32, fontSize: 10, color: '#4a6080', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Courier New, monospace' }}>
        Stars Earned: {persistent.globalStats?.totalStars || 0} / 36
      </div>
    </div>
  );
}
