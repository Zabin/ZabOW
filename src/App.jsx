import React, { useState, useEffect, useCallback } from 'react';
import { MISSIONS, QUICK_SCENARIOS, DIFFICULTIES, generateQuickMission } from './game/missions.js';
import MainMenu from './screens/MainMenu.jsx';
import CampaignMap from './screens/CampaignMap.jsx';
import MissionBriefing from './screens/MissionBriefing.jsx';
import Gameplay from './screens/Gameplay.jsx';
import Results from './screens/Results.jsx';
import Settings from './screens/Settings.jsx';
import QuickMissionScreen from './screens/QuickMissionScreen.jsx';
import Scenarios from './screens/Scenarios.jsx';
import Briefing from './screens/Briefing.jsx';

const STORAGE_KEY = 'orbital-command-v1';

const defaultState = {
  campaign: {
    // {1: {stars: 2, completed: true, bestTime: 120}}
  },
  globalStats: {
    enemiesDestroyed: 0,
    satellitesLost: 0,
    missionsCompleted: 0,
    totalStars: 0,
    playTimeSec: 0,
  },
  settings: {
    sfx: true,
    music: true,
    haptics: true,
    difficulty: 'normal',
    tutorialHints: true,
    particles: true,
    pauseAllowed: true,
  },
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      settings: { ...defaultState.settings, ...(parsed.settings || {}) },
      globalStats: { ...defaultState.globalStats, ...(parsed.globalStats || {}) },
      campaign: parsed.campaign || {},
    };
  } catch {
    return defaultState;
  }
}

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export default function App() {
  const [screen, setScreen] = useState('menu'); // menu, campaign, briefing, gameplay, results, settings, quick, scenarios, doctrine
  const [persistent, setPersistent] = useState(loadState);
  const [currentMission, setCurrentMission] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => { saveState(persistent); }, [persistent]);

  const updateSettings = useCallback((patch) => {
    setPersistent(p => ({ ...p, settings: { ...p.settings, ...patch } }));
  }, []);

  const resetCampaign = useCallback(() => {
    setPersistent(p => ({ ...p, campaign: {}, globalStats: defaultState.globalStats }));
  }, []);

  const startMission = useCallback((mission) => {
    setCurrentMission(mission);
    setScreen('briefing');
  }, []);

  const beginGameplay = useCallback(() => {
    setScreen('gameplay');
  }, []);

  const finishMission = useCallback((result) => {
    // result: { outcome: 'victory'|'defeat', stars, metrics }
    setLastResult(result);
    setScreen('results');
    if (result.outcome === 'victory' && currentMission && !currentMission.quickMission) {
      setPersistent(p => {
        const prev = p.campaign[currentMission.id] || {};
        const stars = Math.max(prev.stars || 0, result.stars);
        const newCampaign = {
          ...p.campaign,
          [currentMission.id]: {
            ...prev,
            completed: true,
            stars,
            bestTime: prev.bestTime ? Math.min(prev.bestTime, result.metrics.time) : result.metrics.time,
          },
        };
        const totalStars = Object.values(newCampaign).reduce((sum, m) => sum + (m.stars || 0), 0);
        const newCompleted = Object.values(newCampaign).filter(m => m.completed).length;
        return {
          ...p,
          campaign: newCampaign,
          globalStats: {
            ...p.globalStats,
            enemiesDestroyed: p.globalStats.enemiesDestroyed + (result.metrics.enemiesDestroyed || 0),
            satellitesLost: p.globalStats.satellitesLost + (result.metrics.satellitesLost || 0),
            missionsCompleted: newCompleted,
            totalStars,
            playTimeSec: p.globalStats.playTimeSec + (result.metrics.time || 0),
          },
        };
      });
    } else if (currentMission) {
      setPersistent(p => ({
        ...p,
        globalStats: {
          ...p.globalStats,
          enemiesDestroyed: p.globalStats.enemiesDestroyed + (result.metrics.enemiesDestroyed || 0),
          satellitesLost: p.globalStats.satellitesLost + (result.metrics.satellitesLost || 0),
          playTimeSec: p.globalStats.playTimeSec + (result.metrics.time || 0),
        },
      }));
    }
  }, [currentMission]);

  const retry = useCallback(() => {
    setScreen('gameplay');
  }, []);

  const nextMission = useCallback(() => {
    if (!currentMission) return setScreen('menu');
    const next = MISSIONS.find(m => m.id === currentMission.id + 1);
    if (next) {
      setCurrentMission(next);
      setScreen('briefing');
    } else {
      setScreen('campaign');
    }
  }, [currentMission]);

  return (
    <div className="app">
      <div className="stars" />
      {screen === 'menu' && (
        <MainMenu
          persistent={persistent}
          onCampaign={() => setScreen('campaign')}
          onQuick={() => setScreen('quick')}
          onScenarios={() => setScreen('scenarios')}
          onSettings={() => setScreen('settings')}
          onDoctrine={() => setScreen('doctrine')}
        />
      )}
      {screen === 'campaign' && (
        <CampaignMap
          persistent={persistent}
          onBack={() => setScreen('menu')}
          onSelect={startMission}
        />
      )}
      {screen === 'briefing' && currentMission && (
        <MissionBriefing
          mission={currentMission}
          onBack={() => setScreen(currentMission.quickMission ? 'quick' : 'campaign')}
          onBegin={beginGameplay}
        />
      )}
      {screen === 'gameplay' && currentMission && (
        <Gameplay
          mission={currentMission}
          settings={persistent.settings}
          onComplete={finishMission}
          onAbort={() => setScreen(currentMission.quickMission ? 'quick' : 'campaign')}
        />
      )}
      {screen === 'results' && lastResult && currentMission && (
        <Results
          mission={currentMission}
          result={lastResult}
          onRetry={retry}
          onNext={nextMission}
          onMenu={() => setScreen('menu')}
        />
      )}
      {screen === 'settings' && (
        <Settings
          settings={persistent.settings}
          onChange={updateSettings}
          onReset={resetCampaign}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'quick' && (
        <QuickMissionScreen
          onBack={() => setScreen('menu')}
          onStart={(scenario, difficulty) => {
            const m = generateQuickMission(scenario, difficulty);
            startMission(m);
          }}
        />
      )}
      {screen === 'scenarios' && (
        <Scenarios
          persistent={persistent}
          onBack={() => setScreen('menu')}
          onSelect={(mission) => startMission(mission)}
        />
      )}
      {screen === 'doctrine' && (
        <Briefing onBack={() => setScreen('menu')} />
      )}
    </div>
  );
}
