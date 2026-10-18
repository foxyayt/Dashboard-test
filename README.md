# NEXUS — a quieter daily dashboard

A static, dependency-free dashboard for a 10-inch Android 8 / Fully Kiosk tablet. Deploy the repository directly to GitHub Pages. No build or server is needed for the dashboard.

## Daily home screen

- A large clock and date in the selected city's IANA timezone, including daylight-saving changes. The clock uses the device's current instant, so Android's automatic date/time should be enabled.
- Current weather, the next five forecast hours, air quality and local sunset from Open-Meteo.
- A lower-rain window derived locally from the next 12 hours of forecast probabilities. This is a forecast suggestion, not a weather guarantee.
- A distraction-free clock mode, plus shortcuts to the focus timer, notes and tasks.
- Optional AI briefings, outdoor-break suggestions, creative ideas and short custom questions.
- Extra financial, news and world widgets are behind **More widgets** or the navigation dock.

## Free AI and private credentials

Open **Settings → Your free AI assistant**, paste your OpenRouter key, and press **Connect**. The key is kept separately in browser session storage: it survives a page reload but must be re-entered after the browser session ends. It is never part of the repository, URL, configuration export, or application logs. Disconnect removes it from the session.

The assistant verifies `openrouter/free` against the current model catalog before every new generation. Prompt and completion prices must be present and every reported price must be zero. Requests also set `provider.max_price` to zero for prompt, completion, request and image pricing. There are no paid fallback models, paid plugins or automatic retries. Missing or nonzero pricing blocks generation.

Free inference is subject to OpenRouter/provider availability and account rate limits; unlimited availability cannot be guaranteed. The UI explains busy, quota, authentication, offline and timeout failures. Requests are manual, limited to one at a time, bounded to 600 output tokens and a 45-second timeout. Repeated identical questions with the same weather context reuse an in-memory answer for 15 minutes (up to eight cached answers).

Only the question, selected city/timezone and forecast context are sent to OpenRouter and its model provider. Notes and tasks are excluded. Responses are rendered as plain text and cannot execute code or actions. The assistant has no live web-search access.

**Read aloud** uses an English voice explicitly reported by the browser as local (`localService`). No paid speech service is called. If Fully Kiosk does not expose an installed offline voice, the control is disabled and Settings explains why. Installing a voice does not guarantee that an older WebView exposes the speech API.

## Data sources and honest availability

| Source | Use | Conditions |
| --- | --- | --- |
| [Open-Meteo](https://open-meteo.com/) | Weather, air quality, city search and timezone | Open-source service; free API for non-commercial use within its limits. Weather data attribution: CC BY 4.0. |
| [Frankfurter](https://frankfurter.dev/) | Currency reference rates | Open-source, public reference-rate API. |
| [USGS](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) | Earthquake observations | Public data feed. |
| [Hacker News](https://github.com/HackerNews/API) | Technology headlines | Public API. |
| [Spaceflight News](https://api.spaceflightnewsapi.net/v4/docs/) | Space headlines | Public API; third-party articles retain their own rights. |
| [Where the ISS at?](https://wheretheiss.at/w/developer) | ISS position | Public API, polled no faster than once per minute while visible. |
| CoinGecko / Kraken | Crypto prices | Public endpoints, subject to provider limits. Not described as open-source datasets. |

The legacy stock index/equity catalog is **sample data**, explicitly labelled as such. It is not a live or delayed market feed. Artificial stock-price drift has been removed. Crypto sparklines contain prices observed during the current session, not invented historical trends. Smart-home controls are a local demo, not connected devices. News, FX and earthquake failures no longer silently substitute demo readings.

## Hardware considerations

- Plain HTML, CSS and JavaScript: no framework, remote fonts, embedded AI runtime or downloaded model weights.
- Android WebView 60+ syntax, explicit DOM guards, small compatibility shims and legacy grid-gap declarations. Actual vendor WebView builds can vary; test on the physical tablet.
- Large touch controls, a high-contrast palette, no scrolling ticker, ambient blur, or decorative continuous animations on Home.
- Home starts only weather and air-quality requests. Other feed pollers run when their relevant view is visible. The memory cache is capped at 40 URLs.
- One 30-second scheduler checks due feeds. It pauses while the document is hidden and correctly restarts after resuming. Weather refreshes every 15 minutes; hidden feeds do not poll.
- The main clock aligns updates to minute boundaries unless seconds are explicitly enabled. World clocks refresh once per minute. Hidden charts are not continually redrawn.
- XHR timeouts work on WebViews without AbortController. AI runs remotely; reading the result requires minimal tablet CPU.
- Existing calculations, notes and timers work locally without AI. Network data requires connectivity; in-memory cached readings can be reused while the page remains open.

## Preview and verification

Run `node scripts/serve.cjs` and open `http://127.0.0.1:8765`.

The regression suite requires Playwright for development only:

```
node tests/dashboard.cjs
```

Set `NODE_PATH` to an existing Playwright installation if needed, and `BROWSER_PATH` to an installed Chromium-based browser executable. Otherwise the suite uses Playwright's installed Chromium. Screenshots go into ignored `.test-artifacts/`.

The tests cover selected-location time across a different device timezone, summer/winter DST, date rollover, free-pricing rejection, AI request configuration, response caching, quota failures, credential exclusion from exports, pause/resume polling, touch navigation and local tools at 1280×800, 1024×600 and 800×1280. External services are mocked in this suite; this does not emulate the actual Android 8 WebView engine.

## Fully Kiosk and deployment

1. Enable JavaScript and load your GitHub Pages URL in Fully Kiosk.
2. Use Android's automatic date/time. Choose a city from **Change location**; its timezone is obtained from Open-Meteo.
3. If old files remain after deployment, clear Fully Kiosk's web cache and reload. Asset URLs are versioned.
4. Connect OpenRouter privately on the tablet if AI features are wanted. Core dashboard features do not require a key.
5. For continuous use, configure Fully Kiosk's screen/power settings to suit the device. No browser setting is changed automatically.

Research references checked during this update:
- [OpenRouter free router](https://openrouter.ai/docs/cookbook/get-started/free-models-router-playground)
- [Free model variants](https://openrouter.ai/docs/guides/routing/model-variants/free)
- [Provider maximum-price constraints](https://openrouter.ai/docs/guides/routing/provider-selection#max-price)
- [OpenRouter rate limits](https://openrouter.ai/docs/api_reference/limits)
- [Open-Meteo geocoding/timezones](https://open-meteo.com/en/docs/geocoding-api)
- [Browser local speech voices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService)
