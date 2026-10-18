/* A lightweight daily dashboard: no framework, animations or automatic AI requests. */
(function (window) {
  'use strict';
  function text(id, value) { var el = document.getElementById(id); if (el && el.textContent !== String(value)) el.textContent = value; }
  var home = {
    weather: null,
    init: function () {
      document.querySelectorAll('[data-home-view]').forEach(function (button) {
        button.addEventListener('click', function () { NexusApp.switchView(button.getAttribute('data-home-view')); });
      });
      document.getElementById('home-more').addEventListener('click', function () {
        var expanded = document.body.classList.toggle('show-all-widgets');
        this.setAttribute('aria-expanded', String(expanded));
        this.textContent = expanded ? 'Hide extra widgets' : 'More widgets';
        NexusDataEngine.runPollers();
      });
      document.getElementById('home-calm').addEventListener('click', function () {
        var active = document.body.classList.toggle('calm-mode');
        this.textContent = active ? 'Exit clock mode' : 'Clock mode';
        this.setAttribute('aria-pressed', String(active));
      });
      document.getElementById('home-focus').addEventListener('click', function () {
        NexusApp.switchView('tools');
        document.querySelector('[data-tool="timers"]').click();
      });
      document.getElementById('home-notes').addEventListener('click', function () {
        NexusApp.switchView('tools');
        document.querySelector('[data-tool="notes"]').click();
      });
      NexusDataEngine.on('weather_updated', function (payload) { home.weather = payload; home.renderWeather(); });
      NexusDataEngine.on('weather_unavailable', function () { text('home-weather-status', 'Weather unavailable · tap Weather to retry'); });
      NexusDataEngine.on('location_changed', function () {
        home.weather = null;
        text('home-temperature', '—'); text('home-condition', 'Updating weather…');
        text('home-outdoor', 'Finding the next dry spell…'); text('home-aqi', '—');
        text('home-sunset', '—'); document.getElementById('home-hours').textContent = '';
        home.tick();
      });
      this.tick();
      if (window.NexusWeatherWidget && NexusWeatherWidget.currentData) {
        this.weather = { weather: NexusWeatherWidget.currentData, aqi: NexusWeatherWidget.airQualityData, stale: false };
        this.renderWeather();
      }
      // Header clock drives the home clock; no second ticking interval.
    },
    tick: function () {
      var now = NexusTime.current();
      text('home-location', NexusStorage.get('location.name', 'Glasgow'));
      if (!now) { text('home-clock', '—:—'); text('home-date', 'Resolving location timezone…'); return; }
      var hour = Number(now.hour), twelve = NexusStorage.get('clock.format', '24') === '12';
      text('home-clock', (twelve ? String(hour % 12 || 12) : now.hour) + ':' + now.minute);
      text('home-period', twelve ? (hour >= 12 ? 'PM' : 'AM') : '');
      text('home-greeting', hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
      text('home-date', now.weekday + ', ' + Number(now.day) + ' ' + ['January','February','March','April','May','June','July','August','September','October','November','December'][Number(now.month)-1]);
      text('home-timezone', NexusTime.zone().replace(/_/g, ' '));
      var count = NexusStorage.get('todos', []).filter(function (task) { return !task.done; }).length;
      text('home-task-count', count ? count + ' tasks remaining' : 'A clear list. A fresh start.');
      if (this.minute !== now.localISO) { this.minute = now.localISO; this.renderWeather(); }
    },
    renderWeather: function () {
      var payload = this.weather;
      if (!payload || !payload.weather || !payload.weather.current) return;
      var w = payload.weather, current = w.current, hourly = w.hourly || {}, daily = w.daily || {};
      var now = NexusTime.current(), unit = NexusStorage.get('units.temperature', 'celsius') === 'fahrenheit' ? '°F' : '°C';
      var info = NexusUtils.translateWeatherCode(current.weather_code, current.is_day);
      text('home-temperature', Math.round(current.temperature_2m) + unit);
      text('home-condition', info.name); text('home-weather-icon', info.icon);
      text('home-weather-detail', 'Feels like ' + Math.round(current.apparent_temperature) + unit + ' · Wind ' + Math.round(current.wind_speed_10m) + ' ' + NexusStorage.get('units.windSpeed', 'mph'));
      text('home-weather-status', (payload.stale ? 'Cached forecast' : 'Updated') + ' · ' + String(current.time || '').slice(11,16) + ' local');
      text('home-sunset', daily.sunset && daily.sunset[0] ? daily.sunset[0].slice(11,16) : '—');
      var aqi = payload.aqi && payload.aqi.current ? payload.aqi.current.european_aqi : null;
      text('home-aqi', aqi == null ? 'Unavailable' : NexusUtils.describeAQI(aqi).label);
      var future = [];
      (hourly.time || []).forEach(function (time, index) { if (now && time >= now.localISO && future.length < 12) future.push(index); });
      var strip = document.getElementById('home-hours'); strip.textContent = '';
      future.slice(0,5).forEach(function (i) {
        var cell = document.createElement('div'); cell.className = 'home-hour';
        var time = document.createElement('span'); time.textContent = hourly.time[i].slice(11,16);
        var temp = document.createElement('strong'); temp.textContent = Math.round(hourly.temperature_2m[i]) + '°';
        var rain = document.createElement('small'); rain.textContent = hourly.precipitation_probability[i] == null ? 'Rain —' : hourly.precipitation_probability[i] + '% rain';
        cell.appendChild(time); cell.appendChild(temp); cell.appendChild(rain); strip.appendChild(cell);
      });
      var dry = future.filter(function (i) { return hourly.precipitation_probability[i] != null && hourly.precipitation_probability[i] < 25; });
      text('home-outdoor', dry.length ? 'Lower rain chance around ' + hourly.time[dry[0]].slice(11,16) : 'No dry spell in the next 12 hours');
      text('home-outdoor-detail', 'Based on hourly rain probability. Check the forecast before heading out.');
    },
    context: function () {
      var w = this.weather;
      return {
        location: NexusStorage.get('location.name', 'Glasgow'), timezone: NexusTime.zone(),
        localTime: NexusTime.current(),
        weather: w ? { current: w.weather.current, units: w.weather.current_units, stale: w.stale,
          drySpell: document.getElementById('home-outdoor').textContent } : 'Unavailable',
        source: 'Open-Meteo', note: 'Forecast only, not a guarantee. No live web search available.'
      };
    }
  };
  window.NexusHome = home;
  document.addEventListener('DOMContentLoaded', function () { home.init(); });
})(window);
