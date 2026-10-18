/**
 * NEXUS OS — Storage & State Management
 * Robust local persistence with export/import and fallback support
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'NEXUS_OS_CONFIG_V2';

  const DEFAULT_CONFIG = {
    version: '2.4',
    theme: 'obsidian',
    accentColor: '#00f0ff',
    density: 'kiosk',
    demoMode: false,
    clock: {
      format: '24', // '12' or '24'
      showSeconds: true,
      showDate: true
    },
    units: {
      temperature: 'celsius', // 'celsius' or 'fahrenheit'
      windSpeed: 'mph', // 'mph', 'kmh', 'ms'
      baseCurrency: 'gbp' // 'gbp', 'usd', 'eur'
    },
    location: {
      name: 'Glasgow',
      country: 'United Kingdom',
      region: 'Scotland',
      latitude: 55.8642,
      longitude: -4.2518,
      timezone: 'auto'
    },
    widgets: [
      { id: 'weather', name: 'Glasgow Weather Centre', enabled: true, order: 0 },
      { id: 'crypto', name: 'Crypto Command Centre', enabled: true, order: 1 },
      { id: 'markets', name: 'Global Stock Indices & Equities', enabled: true, order: 2 },
      { id: 'fx', name: 'Currency & Central Bank FX', enabled: true, order: 3 },
      { id: 'world', name: 'Seismic & ISS Orbital Radar', enabled: true, order: 4 },
      { id: 'news', name: 'Live News Wire', enabled: true, order: 5 },
      { id: 'tools', name: 'Productivity & Focus Tools', enabled: true, order: 6 }
    ],
    watchlist: ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'],
    cryptoWatchlist: ['bitcoin', 'ethereum', 'solana', 'ripple', 'dogecoin', 'cardano'],
    notes: '',
    todos: [
      { id: 1, text: 'Check Glasgow weather forecast for evening commute', done: false },
      { id: 2, text: 'Review FTSE 100 & S&P 500 weekly market closing levels', done: true },
      { id: 3, text: 'Observe ISS flyover coordinates & seismic activity', done: false }
    ],
    refreshIntervals: {
      weather: 900000,    // 15 minutes
      crypto: 60000,      // 60 seconds
      markets: 300000,    // 5 minutes
      fx: 21600000,       // 6 hours
      earthquakes: 600000,// 10 minutes
      iss: 10000,         // 10 seconds
      news: 1200000       // 20 minutes
    }
  };

  class NexusStorage {
    constructor() {
      this.state = this.load();
    }

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Deep merge with defaults to ensure missing keys exist
          return Object.assign({}, DEFAULT_CONFIG, parsed);
        }
      } catch (e) {
        console.warn('[NexusStorage] Local storage unavailable or corrupted:', e);
      }
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        return true;
      } catch (e) {
        console.error('[NexusStorage] Failed to save state to localStorage:', e);
        return false;
      }
    }

    get(path, defaultVal) {
      if (!path) return this.state;
      const parts = path.split('.');
      let curr = this.state;
      for (let i = 0; i < parts.length; i++) {
        if (curr === undefined || curr === null) return defaultVal;
        curr = curr[parts[i]];
      }
      return curr !== undefined ? curr : defaultVal;
    }

    set(path, value) {
      const parts = path.split('.');
      let curr = this.state;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!curr[parts[i]] || typeof curr[parts[i]] !== 'object') {
          curr[parts[i]] = {};
        }
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = value;
      this.save();
    }

    exportConfig() {
      return JSON.stringify(this.state, null, 2);
    }

    importConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed && typeof parsed === 'object') {
          this.state = Object.assign({}, DEFAULT_CONFIG, parsed);
          this.save();
          return true;
        }
      } catch (e) {
        console.error('[NexusStorage] Import failed:', e);
      }
      return false;
    }

    resetDefaults() {
      this.state = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      this.save();
      return this.state;
    }
  }

  window.NexusStorage = new NexusStorage();
})(window);
