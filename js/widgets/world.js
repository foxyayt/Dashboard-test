/**
 * NEXUS OS — World Time, Seismology & Space Radar Widget
 * Real-time USGS earthquakes, WhereTheISS tracker, Moon ephemeris & SpaceFlight news
 */

(function (window) {
  'use strict';

  class NexusWorldWidget {
    constructor() {
      this.earthquakes = [];
      this.quakeFilter = 'all';
      this.issData = null;
      this.spaceNews = [];

      this.worldCities = [
        { name: 'Glasgow / London', tz: 'Europe/London', label: 'Europe/London' },
        { name: 'New York', tz: 'America/New_York', label: 'America/New_York' },
        { name: 'Tokyo', tz: 'Asia/Tokyo', label: 'JST / UTC+9' },
        { name: 'Dubai', tz: 'Asia/Dubai', label: 'GST / UTC+4' },
        { name: 'Sydney', tz: 'Australia/Sydney', label: 'Australia/Sydney' },
        { name: 'San Francisco', tz: 'America/Los_Angeles', label: 'America/Los_Angeles' }
      ];

      this.initEvents();
      this.initWorldClocks();
      this.initQuakeFilters();
      this.initAstronomy();
    }

    initEvents() {
      NexusDataEngine.on('manual_refresh', () => {
        this.fetchEarthquakes();
        this.fetchISS();
        this.fetchSpaceNews();
      });
      NexusDataEngine.on('resume_polling', () => {
        this.fetchEarthquakes();
        this.fetchISS();
      });
      NexusDataEngine.on('demo_mode_changed', () => {
        this.fetchEarthquakes();
        this.fetchISS();
      });

      // Poll ISS every 10 seconds
      NexusDataEngine.registerPoller('iss', () => this.fetchISS(), 10000);
      // Poll Earthquakes every 10 minutes
      NexusDataEngine.registerPoller('earthquakes', () => this.fetchEarthquakes(), 600000);
      // Poll Space news every 30 minutes
      NexusDataEngine.registerPoller('spacenews', () => this.fetchSpaceNews(), 1800000);
    }

    initWorldClocks() {
      this.renderWorldClocks();
      setInterval(() => { if (!document.hidden && document.body.getAttribute('data-active-view') === 'world') this.renderWorldClocks(); }, 60000);
    }

    renderWorldClocks() {
      const container = document.getElementById('world-clocks-full-grid');
      if (!container) return;

      const now = new Date();
      const is12Hour = NexusStorage.get('clock.format', '24') === '12';

      const html = this.worldCities.map(city => {
        try {
          const timeStr = now.toLocaleTimeString('en-GB', {
            timeZone: city.tz,
            hour12: is12Hour,
            hour: '2-digit',
            minute: '2-digit'
          });

          return `
            <div class="wc-city-card">
              <div class="wcc-name">${city.name}</div>
              <div class="wcc-time">${timeStr}</div>
              <div class="wcc-offset">${city.label}</div>
            </div>
          `;
        } catch (e) {
          return '';
        }
      });

      container.innerHTML = html.join('');
    }

    initQuakeFilters() {
      const btns = document.querySelectorAll('.quake-filter-btns .q-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          btns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.quakeFilter = btn.getAttribute('data-qfilter') || 'all';
          this.renderEarthquakes();
        });
      });
    }

    async fetchEarthquakes() {
      if (NexusDataEngine.isDemoMode) {
        this.renderDemoEarthquakes();
        return;
      }

      const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

      try {
        const data = await NexusDataEngine.fetchWithCache(url, {}, 300000);
        if (data && data.features) {
          this.earthquakes = data.features;
          this.renderEarthquakes();
        }
      } catch (err) {
        console.warn('[Earthquakes] USGS fetch failed:', err.message);
        ['eqk-overview-list','quake-full-list'].forEach(id => {
          const el = document.getElementById(id); if (el) el.textContent = 'USGS data unavailable. Please try later.';
        });
      }
    }

    renderEarthquakes() {
      if (!this.earthquakes) return;

      const overviewList = document.getElementById('eqk-overview-list');
      const fullList = document.getElementById('quake-full-list');
      const countEl = document.getElementById('eqk-count');

      // Filter by magnitude
      let filtered = this.earthquakes;
      if (this.quakeFilter === '2.5') {
        filtered = this.earthquakes.filter(f => f.properties.mag >= 2.5);
      } else if (this.quakeFilter === '4.5') {
        filtered = this.earthquakes.filter(f => f.properties.mag >= 4.5);
      }

      if (countEl) countEl.textContent = `${filtered.length} Events (24h)`;

      // Overview top 4
      if (overviewList) {
        const top4 = filtered.slice(0, 4);
        overviewList.innerHTML = top4.map(f => {
          const p = f.properties;
          const mag = p.mag ? p.mag.toFixed(1) : '1.0';
          const place = p.place || 'Unknown Location';
          const time = NexusUtils.timeAgo(p.time);

          return `
            <div class="eqk-row" title="${place}">
              <span class="eqk-mag">M${mag}</span>
              <span class="eqk-place">${place}</span>
              <span class="eqk-time">${time}</span>
            </div>
          `;
        }).join('');
      }

      // Full View list
      if (fullList) {
        fullList.innerHTML = filtered.slice(0, 20).map(f => {
          const p = f.properties;
          const mag = p.mag ? p.mag.toFixed(1) : '1.0';
          const place = p.place || 'Seismic event';
          const depth = f.geometry && f.geometry.coordinates ? f.geometry.coordinates[2] : 10;
          const time = new Date(p.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

          return `
            <div class="eqk-row" style="padding: 8px 12px; margin-bottom: 6px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <span class="eqk-mag">M${mag}</span>
                <div>
                  <div style="font-weight:700; color:var(--text-highlight); font-size:0.8rem;">${place}</div>
                  <div style="font-family:var(--font-mono); font-size:0.68rem; color:var(--text-dim);">Depth: ${depth.toFixed(1)} km • USGS Verified</div>
                </div>
              </div>
              <span class="eqk-time" style="font-size:0.75rem;">${time}</span>
            </div>
          `;
        }).join('');
      }
    }

    async fetchISS() {
      if (NexusDataEngine.isDemoMode) {
        this.renderDemoISS();
        return;
      }

      const url = 'https://api.wheretheiss.at/v1/satellites/25544';

      try {
        const data = await NexusDataEngine.fetchWithCache(url, {}, 8000);
        this.issData = data;
        this.renderISS(data);
      } catch (err) {
        console.warn('[ISS] Fetch failed:', err.message);
      }
    }

    renderISS(data) {
      if (!data) return;

      const velEl = document.getElementById('iss-velocity');
      const altEl = document.getElementById('iss-alt');
      const latEl = document.getElementById('iss-lat');
      const lonEl = document.getElementById('iss-lon');
      const visEl = document.getElementById('iss-vis');

      const velocityKmH = Math.round(data.velocity);
      const altitudeKm = Math.round(data.altitude);

      if (velEl) velEl.textContent = `${NexusUtils.formatNumber(velocityKmH, 0)} km/h`;
      if (altEl) altEl.textContent = `Alt: ${altitudeKm} km`;
      if (latEl) latEl.textContent = `${data.latitude.toFixed(2)}°`;
      if (lonEl) lonEl.textContent = `${data.longitude.toFixed(2)}°`;
      if (visEl) visEl.textContent = data.visibility ? data.visibility.toUpperCase() : 'DAYLIGHT';
    }

    initAstronomy() {
      const moon = NexusUtils.calculateMoonPhase();
      const nameEl = document.getElementById('lunar-phase-name');
      const illumEl = document.getElementById('lunar-illum-val');
      const fullEl = document.getElementById('lunar-days-full');
      const newEl = document.getElementById('lunar-days-new');
      const ageEl = document.getElementById('lunar-age');
      const shadowEl = document.getElementById('moon-phase-shadow');

      if (nameEl) nameEl.textContent = `${moon.phaseName} ${moon.icon}`;
      if (illumEl) illumEl.textContent = `${moon.illumination}%`;
      if (fullEl) fullEl.textContent = `${moon.daysToFull} Days`;
      if (newEl) newEl.textContent = `${moon.daysToNew} Days`;
      if (ageEl) ageEl.textContent = `${moon.age} Days`;

      // Render shadow offset according to phaseCycle (0 to 1)
      if (shadowEl) {
        const offsetPercent = (1 - moon.illumination / 100) * 100;
        shadowEl.style.transform = `translateX(${moon.phaseCycle < 0.5 ? -offsetPercent : offsetPercent}%)`;
      }
    }

    async fetchSpaceNews() {
      if (NexusDataEngine.isDemoMode) {
        this.renderDemoSpaceNews();
        return;
      }

      const url = 'https://api.spaceflightnewsapi.net/v4/articles/?limit=4';

      try {
        const data = await NexusDataEngine.fetchWithCache(url, {}, 1800000);
        if (data && data.results) {
          this.spaceNews = data.results;
          this.renderSpaceNews();
        }
      } catch (e) {
        console.warn('[SpaceNews] Fetch failed:', e.message);
        this.renderDemoSpaceNews();
      }
    }

    renderSpaceNews() {
      const container = document.getElementById('space-news-list');
      if (!container || !this.spaceNews) return;

      container.innerHTML = this.spaceNews.map(item => {
        return `
          <div class="news-item" style="margin-bottom:8px;" onclick="window.open('${NexusUtils.escapeHTML(item.url)}', '_blank')">
            <div class="ni-title">${NexusUtils.escapeHTML(item.title)}</div>
            <div class="ni-meta">
              <span>${NexusUtils.escapeHTML(item.news_site || 'SpaceFlight')}</span>
              <span>${NexusUtils.timeAgo(item.published_at)}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    renderDemoEarthquakes() {
      this.earthquakes = [
        { properties: { mag: 4.8, place: '72 km SW of Ovalle, Chile', time: Date.now() - 1200000 }, geometry: { coordinates: [-71.8, -31.1, 45.2] } },
        { properties: { mag: 5.2, place: 'Off the coast of Miyagi, Japan', time: Date.now() - 3600000 }, geometry: { coordinates: [142.1, 38.4, 52.0] } },
        { properties: { mag: 2.9, place: '12 km ENE of Ridgecrest, California', time: Date.now() - 5400000 }, geometry: { coordinates: [-117.5, 35.7, 8.4] } },
        { properties: { mag: 3.4, place: '4 km S of Reykjanesbaer, Iceland', time: Date.now() - 8900000 }, geometry: { coordinates: [-22.5, 63.9, 5.1] } }
      ];
      this.renderEarthquakes();
    }

    renderDemoISS() {
      this.renderISS({
        velocity: 27580,
        altitude: 418.5,
        latitude: 28.54,
        longitude: -80.60,
        visibility: 'daylight'
      });
    }

    renderDemoSpaceNews() {
      this.spaceNews = [
        { title: 'NASA Europa Clipper Commences Trajectory towards Jupiter Moon', news_site: 'NASA Jet Propulsion Lab', published_at: new Date(Date.now() - 3600000).toISOString(), url: 'https://nasa.gov' },
        { title: 'SpaceX Falcon Heavy Completes Mission to Geostationary Orbit', news_site: 'Spaceflight Now', published_at: new Date(Date.now() - 10800000).toISOString(), url: 'https://spaceflightnow.com' },
        { title: 'James Webb Space Telescope Identifies Atmospheric Compounds on Exoplanet', news_site: 'ESA Portal', published_at: new Date(Date.now() - 18000000).toISOString(), url: 'https://esa.int' }
      ];
      this.renderSpaceNews();
    }
  }

  window.NexusWorldWidget = new NexusWorldWidget();
})(window);
