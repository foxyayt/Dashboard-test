/* Selected-location time. Intl uses the IANA zone's daylight-saving rules. */
(function (window) {
  'use strict';
  var formatters = {};
  function parts(date, zone) {
    if (!formatters[zone]) formatters[zone] = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    var result = {};
    formatters[zone].formatToParts(date).forEach(function (part) { result[part.type] = part.value; });
    result.hour = String(Number(result.hour) % 24).padStart(2, '0');
    result.dateKey = result.year + '-' + result.month + '-' + result.day;
    result.localISO = result.dateKey + 'T' + result.hour + ':' + result.minute;
    return result;
  }
  window.NexusTime = {
    parts: parts,
    zone: function () {
      var loc = NexusStorage.get('location', {});
      if (loc.timezone && loc.timezone !== 'auto') return loc.timezone;
      // The only built-in location is Glasgow. Other legacy locations resolve via weather.
      return loc.name === 'Glasgow' ? 'Europe/London' : null;
    },
    current: function (date) {
      var zone = this.zone();
      if (!zone) return null;
      try { return parts(date || new Date(), zone); } catch (e) { return null; }
    }
  };
})(window);
