/**
 * NEXUS OS — Live Weather Centre Widget
 * Real-time Open-Meteo API Integration (Glasgow Default & Global Search)
 */

(function (window) {
  'use strict';

  class NexusWeatherWidget {
    constructor() {
      this.currentData = null;
      this.airQualityData = null;
      this.initEvents();
      this.initSearch();
    }

    initEvents() {
      NexusDataEngine.on('manual_refresh', () => this.fetchWeather());
      NexusDataEngine.on('resume_polling', () => this.fetchWeather());
      NexusDataEngine.on('demo_mode_changed', () => this.fetchWeather());

      // Register polling: every 15 minutes (Open-Meteo guidance)
      NexusDataEngine.registerPoller('weather', () => this.fetchWeather(), 900000);
    }

    initSearch() {
      const searchBtn = document.getElementById('btn-weather-search');
      const searchInput = document.getElementById('weather-city-input');
      const resetBtn = document.getElementById('btn-weather-reset-glasgow');

      if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
          const query = searchInput.value.trim();
          if (query) this.searchLocation(query);
        });

        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) this.searchLocation(query);
          }
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          NexusStorage.set('location', {
            name: 'Glasgow',
            country: 'United Kingdom',
            region: 'Scotland',
            latitude: 55.8642,
            longitude: -4.2518,
            timezone: 'auto'
          });
          NexusUtils.showToast('Reset location to Glasgow, UK');
          this.fetchWeather();
        });
      }
    }

    async searchLocation(query) {
      NexusUtils.showToast(`Searching for "${query}"...`);
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
        const res = await NexusDataEngine.fetchWithCache(url, {}, 3600000);
        if (res.results && res.results.length > 0) {
          const loc = res.results[0];
          NexusStorage.set('location', {
            name: loc.name,
            country: loc.country || '',
            region: loc.admin1 || '',
            latitude: loc.latitude,
            longitude: loc.longitude,
            timezone: loc.timezone || 'auto'
          });
          NexusUtils.showToast(`Location updated to ${loc.name}, ${loc.country || ''}`);
          this.fetchWeather();
        } else {
          NexusUtils.showToast(`No locations found for "${query}"`);
        }
      } catch (err) {
        console.error('[Weather] Geocoding search failed:', err);
        NexusUtils.showToast('Location search failed. Check network connection.');
      }
    }

    async fetchWeather() {
      if (NexusDataEngine.isDemoMode) {
        this.renderDemoWeather();
        return;
      }

      const loc = NexusStorage.get('location', {
        name: 'Glasgow',
        country: 'United Kingdom',
        region: 'Scotland',
        latitude: 55.8642,
        longitude: -4.2518
      });

      const tempUnit = NexusStorage.get('units.temperature', 'celsius');
      const windUnit = NexusStorage.get('units.windSpeed', 'mph');

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto${tempUnit === 'fahrenheit' ? '&temperature_unit=fahrenheit' : ''}${windUnit === 'kmh' ? '&wind_speed_unit=kmh' : windUnit === 'ms' ? '&wind_speed_unit=ms' : '&wind_speed_unit=mph'}`;
      
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.latitude}&longitude=${loc.longitude}&current=european_aqi,pm2_5,nitrogen_dioxide`;

      try {
        const [weatherData, aqiData] = await Promise.all([
          NexusDataEngine.fetchWithCache(weatherUrl, {}, 600000),
          NexusDataEngine.fetchWithCache(aqiUrl, {}, 1800000).catch(() => null)
        ]);

        this.currentData = weatherData;
        this.airQualityData = aqiData;
        this.render(weatherData, aqiData, loc);
      } catch (err) {
        console.warn('[Weather] Live fetch failed:', err.message);
        const sub = document.getElementById('w-location-sub');
        if (sub) sub.textContent = `${loc.name} • Offline Stale Data`;
      }
    }

    render(weather, aqi, loc) {
      if (!weather || !weather.current) return;

      const curr = weather.current;
      const daily = weather.daily || {};
      const hourly = weather.hourly || {};
      const unitSym = NexusStorage.get('units.temperature', 'celsius') === 'fahrenheit' ? '°F' : '°C';
      const windSym = NexusStorage.get('units.windSpeed', 'mph');

      const codeInfo = NexusUtils.translateWeatherCode(curr.weather_code, curr.is_day);

      // 1. Update Header Weather Pill
      const tempStr = `${Math.round(curr.temperature_2m)}${unitSym}`;
      NexusHeaderWidget.updateHeaderWeather(tempStr, codeInfo.icon, codeInfo.name);

      // 2. Update Overview Card
      const wcTemp = document.getElementById('wc-temp');
      const wcCond = document.getElementById('wc-condition');
      const wcFeels = document.getElementById('wc-feels');
      const wcRange = document.getElementById('wc-range');
      const wcIcon = document.getElementById('wc-weather-icon');
      const locSub = document.getElementById('w-location-sub');

      if (wcTemp) wcTemp.textContent = `${Math.round(curr.temperature_2m)}°`;
      if (wcCond) wcCond.textContent = codeInfo.name;
      if (wcFeels) wcFeels.textContent = `Feels like: ${Math.round(curr.apparent_temperature)}°`;
      
      if (daily.temperature_2m_max && daily.temperature_2m_min) {
        const maxT = Math.round(daily.temperature_2m_max[0]);
        const minT = Math.round(daily.temperature_2m_min[0]);
        if (wcRange) wcRange.textContent = `H: ${maxT}° • L: ${minT}°`;
      }

      if (wcIcon) wcIcon.textContent = codeInfo.icon;
      if (locSub) locSub.textContent = `${loc.name}, ${loc.country || loc.region || 'UK'} • Open-Meteo`;

      // Metrics Row
      const rainVal = document.getElementById('wm-rain');
      const windVal = document.getElementById('wm-wind');
      const humVal = document.getElementById('wm-humidity');
      const uvVal = document.getElementById('wm-uv');

      const precipChance = (hourly.precipitation_probability && hourly.precipitation_probability.length > 0)
        ? hourly.precipitation_probability[0]
        : (curr.precipitation > 0 ? 100 : 10);

      if (rainVal) rainVal.textContent = `${precipChance}%`;
      if (windVal) windVal.textContent = `${Math.round(curr.wind_speed_10m)} ${windSym}`;
      if (humVal) humVal.textContent = `${curr.relative_humidity_2m}%`;
      if (uvVal) uvVal.textContent = daily.uv_index_max ? daily.uv_index_max[0].toFixed(1) : '2.1';

      // Hourly Preview Strip in Overview
      this.renderHourlyStrip(hourly, unitSym);

      // 3. Update Fullscreen Weather View
      this.renderFullWeather(weather, aqi, loc, unitSym, windSym, codeInfo);
    }

    renderHourlyStrip(hourly, unitSym) {
      const container = document.getElementById('weather-hourly-preview');
      if (!container || !hourly.time) return;

      const items = [];
      const count = Math.min(12, hourly.time.length);

      for (let i = 0; i < count; i++) {
        const timeStr = hourly.time[i].slice(11, 16);
        const temp = Math.round(hourly.temperature_2m[i]);
        const code = hourly.weather_code[i];
        const rain = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;
        const icon = NexusUtils.translateWeatherCode(code).icon;

        items.push(`
          <div class="hourly-mini-col">
            <span class="hmc-time">${timeStr}</span>
            <span class="hmc-icon">${icon}</span>
            <span class="hmc-temp">${temp}°</span>
            <span class="hmc-rain">${rain}%</span>
          </div>
        `);
      }

      container.innerHTML = items.join('');
    }

    renderFullWeather(weather, aqi, loc, unitSym, windSym, codeInfo) {
      const curr = weather.current;
      const daily = weather.daily || {};
      const hourly = weather.hourly || {};

      const heroIcon = document.getElementById('wf-hero-icon');
      const heroTemp = document.getElementById('wf-hero-temp');
      const heroCond = document.getElementById('wf-hero-cond');
      const heroLoc = document.getElementById('wf-hero-loc');

      if (heroIcon) heroIcon.textContent = codeInfo.icon;
      if (heroTemp) heroTemp.textContent = `${Math.round(curr.temperature_2m)}${unitSym}`;
      if (heroCond) heroCond.textContent = `${codeInfo.name} — Humidity ${curr.relative_humidity_2m}%`;
      if (heroLoc) heroLoc.textContent = `${loc.name}, ${loc.country || ''} (${loc.latitude.toFixed(2)}°N, ${Math.abs(loc.longitude).toFixed(2)}°W)`;

      // Meteorological Deep Metrics
      const appEl = document.getElementById('wf-apparent');
      const precEl = document.getElementById('wf-precip');
      const gustEl = document.getElementById('wf-wind-gust');
      const presEl = document.getElementById('wf-pressure');
      const aqiEl = document.getElementById('wf-aqi');
      const pm25El = document.getElementById('wf-pm25');
      const sunEl = document.getElementById('wf-sun-times');
      const daylEl = document.getElementById('wf-daylight-rem');

      if (appEl) appEl.textContent = `${Math.round(curr.apparent_temperature)}${unitSym}`;
      if (precEl) precEl.textContent = `${curr.precipitation || 0.0} mm`;
      if (gustEl) gustEl.textContent = `${Math.round(curr.wind_speed_10m * 1.35)} ${windSym}`;
      if (presEl) presEl.textContent = `${Math.round(curr.surface_pressure || 1013)} hPa`;

      // Air Quality
      if (aqi && aqi.current) {
        const euAqi = aqi.current.european_aqi || 22;
        const desc = NexusUtils.describeAQI(euAqi);
        if (aqiEl) {
          aqiEl.textContent = `${desc.label} (${euAqi})`;
          aqiEl.style.color = desc.color;
        }
        if (pm25El) pm25El.textContent = `${aqi.current.pm2_5 ? aqi.current.pm2_5.toFixed(1) : 8.5} µg/m³`;
      }

      // Sunrise & Sunset & Daylight calculation
      if (daily.sunrise && daily.sunset) {
        const riseTime = daily.sunrise[0].slice(11, 16);
        const setTime = daily.sunset[0].slice(11, 16);
        if (sunEl) sunEl.textContent = `${riseTime} / ${setTime}`;

        const setDate = new Date(daily.sunset[0]);
        const now = new Date();
        const diffHrs = (setDate - now) / (1000 * 60 * 60);
        if (daylEl) {
          daylEl.textContent = diffHrs > 0 ? `${diffHrs.toFixed(1)} hrs left` : 'Night';
        }
      }

      // Render 24-Hour Canvas Chart
      NexusCharts.renderWeatherHourlyChart('weather-hourly-canvas', {
        temperatures: hourly.temperature_2m,
        precipitation: hourly.precipitation_probability,
        times: hourly.time
      });

      // Render 7-Day Outlook Grid
      this.renderSevenDayGrid(daily, unitSym);
    }

    renderSevenDayGrid(daily, unitSym) {
      const grid = document.getElementById('seven-day-grid');
      if (!grid || !daily.time) return;

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const html = [];
      const count = Math.min(7, daily.time.length);

      for (let i = 0; i < count; i++) {
        const date = new Date(daily.time[i]);
        const dayLabel = i === 0 ? 'Today' : daysOfWeek[date.getDay()];
        const code = daily.weather_code ? daily.weather_code[i] : 2;
        const icon = NexusUtils.translateWeatherCode(code).icon;
        const maxT = Math.round(daily.temperature_2m_max[i]);
        const minT = Math.round(daily.temperature_2m_min[i]);

        html.push(`
          <div class="seven-day-col">
            <span class="sdc-day">${dayLabel}</span>
            <span class="sdc-icon">${icon}</span>
            <span class="sdc-temp-max">${maxT}${unitSym}</span>
            <span class="sdc-temp-min">${minT}${unitSym}</span>
          </div>
        `);
      }

      grid.innerHTML = html.join('');
    }

    renderDemoWeather() {
      const demoWeather = {
        current: {
          temperature_2m: 14.5,
          apparent_temperature: 13.2,
          relative_humidity_2m: 78,
          is_day: 1,
          precipitation: 0.2,
          weather_code: 80,
          wind_speed_10m: 14,
          surface_pressure: 1016
        },
        daily: {
          time: ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'],
          weather_code: [80, 2, 61, 3, 1, 80, 2],
          temperature_2m_max: [16, 15, 14, 13, 15, 16, 14],
          temperature_2m_min: [9, 8, 10, 7, 8, 9, 8],
          sunrise: ['2026-10-18T07:45', '2026-10-19T07:47'],
          sunset: ['2026-10-18T18:10', '2026-10-19T18:08'],
          uv_index_max: [2.4, 2.8, 1.9, 2.5, 2.6, 2.2, 2.1]
        },
        hourly: {
          time: Array.from({ length: 24 }, (_, i) => `2026-10-18T${String(i).padStart(2, '0')}:00`),
          temperature_2m: [10, 9, 9, 8, 8, 9, 10, 11, 13, 14, 15, 16, 16, 15, 14, 13, 12, 11, 10, 10, 9, 9, 8, 8],
          precipitation_probability: [20, 10, 10, 0, 0, 10, 30, 45, 60, 40, 20, 10, 0, 0, 10, 20, 30, 40, 20, 10, 0, 0, 0, 0],
          weather_code: Array(24).fill(80)
        }
      };

      const demoAqi = {
        current: {
          european_aqi: 22,
          pm2_5: 9.4
        }
      };

      const loc = { name: 'Glasgow (DEMO)', country: 'Scotland, UK', latitude: 55.86, longitude: -4.25 };
      this.render(demoWeather, demoAqi, loc);
    }
  }

  window.NexusWeatherWidget = new NexusWeatherWidget();
})(window);
