/* Runtime fallbacks for the original Android 8 WebView. Keep ES5 syntax here. */
(function () {
  'use strict';
  if (!NodeList.prototype.forEach) NodeList.prototype.forEach = Array.prototype.forEach;
  if (!Element.prototype.matches) Element.prototype.matches = Element.prototype.webkitMatchesSelector;
  if (!Element.prototype.closest) Element.prototype.closest = function (selector) {
    var element = this;
    while (element) {
      if (element.matches(selector)) return element;
      element = element.parentElement;
    }
    return null;
  };
  if (!String.prototype.padStart) String.prototype.padStart = function (length, padding) {
    var result = String(this), pad = padding === undefined ? ' ' : String(padding);
    if (!pad) return result;
    while (result.length < length) result = pad.slice(0, length - result.length) + result;
    return result;
  };
  // Flex gap arrived much later than grid gap. Detect actual layout support.
  var probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;display:flex;flex-direction:column;row-gap:1px';
  probe.appendChild(document.createElement('div'));
  probe.appendChild(document.createElement('div'));
  document.body.appendChild(probe);
  if (probe.scrollHeight !== 1) document.documentElement.classList.add('no-flex-gap');
  document.body.removeChild(probe);
})();
