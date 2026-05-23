import React from 'react';

export default function Briefing({ onBack }) {
  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Doctrine &amp; Tutorial</div>
        <button className="back-btn" onClick={onBack}>◂ Back</button>
      </div>

      <div className="doctrine-content">
        <div className="briefing-section">
          <h3>USSF Doctrine Overview</h3>
          <p>
            The U.S. Space Force exists to defend U.S. and allied interests in, from, and to space.
            ORBITAL COMMAND models five core mission areas: <strong>Space Awareness</strong>,
            <strong> Space Defense</strong>, <strong> Space Control</strong>, <strong> Space Superiority</strong>,
            and <strong> Power Projection from Space</strong>.
          </p>
        </div>

        <div className="briefing-section">
          <h3>Detect • Track • Engage</h3>
          <p>
            All combat operations follow the standard targeting sequence. ISR satellites detect contacts
            within their sensor range, friendly platforms track them along orbital paths, and weapons
            engage at appropriate range. Without detection, there is no engagement.
          </p>
        </div>

        <div className="briefing-section">
          <h3>Orbital Mechanics</h3>
          <p>
            Three orbital bands: <strong>LEO</strong> (Low Earth Orbit) — fast, vulnerable, high-detail coverage;
            <strong> MEO</strong> (Medium) — balanced; <strong>GEO</strong> (Geosynchronous) — slow but persistent
            coverage. Lower orbits move faster but suffer atmospheric drag.
          </p>
        </div>

        <div className="briefing-section">
          <h3>Satellite Types</h3>
          <ul>
            <li><strong style={{ color: '#6ed3ff' }}>ISR</strong> — Wide-area sensor coverage. No weapons.</li>
            <li><strong style={{ color: '#6eff9e' }}>COMM</strong> — Communications relay. Needed for ground link missions.</li>
            <li><strong style={{ color: '#ffe066' }}>INTC</strong> — Kinetic interceptor. Mid-range engagement.</li>
            <li><strong style={{ color: '#ff8888' }}>STRK</strong> — Strike platform. Long range, hits hard.</li>
            <li><strong style={{ color: '#c98aff' }}>EWAR</strong> — Jammer. Suppresses enemy comms in radius.</li>
            <li><strong style={{ color: '#88d8ff' }}>DEF</strong> — Defense platform. Point-defense, durable.</li>
          </ul>
        </div>

        <div className="briefing-section">
          <h3>Controls</h3>
          <ul>
            <li><strong>Tap satellite</strong> — Select. Shows sensor + weapon range.</li>
            <li><strong>Drag from selected</strong> — Maneuver to new orbital position (consumes fuel).</li>
            <li><strong>Tap enemy</strong> — Designate target for selected satellite to engage.</li>
            <li><strong>ENGAGE button</strong> — Arm weapons mode (tap enemy to fire).</li>
            <li><strong>JAM button</strong> — Toggle jammer on EW satellites.</li>
            <li><strong>PAUSE</strong> — Stop time to plan.</li>
          </ul>
        </div>

        <div className="briefing-section">
          <h3>Resource Management</h3>
          <p>
            Every maneuver consumes fuel. Weapons have cooldowns — not ammunition. Destroyed
            satellites generate debris clouds that damage any entity passing through.
            Use this. Force enemies into debris when you can.
          </p>
        </div>

        <div className="briefing-section">
          <h3>Star Ratings</h3>
          <p>
            Earn up to 3 stars per mission. Stars are awarded based on speed of completion and
            preservation of friendly assets. Aim for zero losses on a fast clock.
          </p>
        </div>
      </div>
    </div>
  );
}
