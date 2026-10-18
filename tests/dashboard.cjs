/* Run with Playwright installed, or set NODE_PATH to an existing Playwright installation. */
const assert = require('assert/strict'), http = require('http'), fs = require('fs');
const { chromium } = require('playwright');
const server = http.createServer(require('../scripts/serve.cjs'));
const weather = {
 timezone:'Asia/Tokyo', utc_offset_seconds:32400,
 current:{time:'2026-10-18T12:00',temperature_2m:21,apparent_temperature:20,weather_code:2,is_day:1,wind_speed_10m:6,wind_gusts_10m:10,relative_humidity_2m:60,precipitation:0,surface_pressure:1012},
 current_units:{temperature_2m:'°C',wind_speed_10m:'mph'},
 hourly:{time:[],temperature_2m:[],precipitation_probability:[],weather_code:[]},
 daily:{time:['2026-10-18'],temperature_2m_max:[23],temperature_2m_min:[17],weather_code:[2],sunrise:['2026-10-18T06:00'],sunset:['2026-10-18T17:30'],uv_index_max:[3]}
};
for(let i=0;i<24;i++) { weather.hourly.time.push('2026-10-18T'+String(i).padStart(2,'0')+':00');weather.hourly.temperature_2m.push(20+i%4);weather.hourly.precipitation_probability.push(i%3===0?10:40);weather.hourly.weather_code.push(2); }
(async()=>{
 await new Promise(resolve=>server.listen(8766,'127.0.0.1',resolve));
 const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 try {
 const page = await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,timezoneId:'America/Los_Angeles'});
 const errors=[], external=[], aiBodies=[];
 let price='0', aiStatus=200;
 page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-18T03:00:00Z')});
 await page.addInitScript(()=>{
   delete NodeList.prototype.forEach; delete String.prototype.padStart; window.AbortController=undefined;
   localStorage.setItem('NEXUS_OS_CONFIG_V2',JSON.stringify({location:{name:'Tokyo',latitude:35.68,longitude:139.69,timezone:'Asia/Tokyo'},clock:{format:'24',showSeconds:false}}));
 });
 await page.route('https://**/*',async route=>{
   const url=route.request().url();external.push(url);
   const respond=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   if(url.includes('/api/v1/models'))return respond({data:[{id:'openrouter/free',pricing:{prompt:price,completion:'0',request:'0'}}]});
   if(url.includes('/api/v1/chat/completions')) { aiBodies.push(route.request().postDataJSON()); return route.fulfill({status:aiStatus,contentType:'application/json',body:JSON.stringify({model:'test:free',choices:[{message:{content:'A calm afternoon. Take a short break around 15:00.'}}]})}); }
   if(url.includes('geocoding-api'))return respond({results:[{name:'Tokyo',latitude:35.68,longitude:139.69,timezone:'Asia/Tokyo'}]});
   if(url.includes('air-quality-api'))return respond({current:{european_aqi:18,pm2_5:4.1}});
   if(url.includes('api.open-meteo.com'))return respond(weather);
   return route.abort();
 });
 await page.goto('http://127.0.0.1:8766');
 await page.waitForFunction(()=>document.getElementById('home-temperature').textContent==='21°C');
 assert.equal(await page.locator('#home-clock').textContent(),'12:00');
 assert.equal(await page.locator('#clock-hrs').textContent(),'12');
 assert.equal(external.length,2,'Home should request only weather and AQI');
 const zones=await page.evaluate(()=>({
   summer:NexusTime.parts(new Date('2026-07-01T12:00:00Z'),'Europe/London').hour,
   winter:NexusTime.parts(new Date('2026-01-01T12:00:00Z'),'Europe/London').hour,
   midnight:NexusTime.parts(new Date('2026-10-18T16:00:00Z'),'Asia/Tokyo').dateKey
 }));
 assert.deepEqual(zones,{summer:'13',winter:'12',midnight:'2026-10-19'});
 await page.locator('#home-calm').click(); assert(await page.locator('body').evaluate(el=>el.classList.contains('calm-mode'))); await page.locator('#home-calm').click();
 await page.locator('[data-ai-prompt]').first().click();
 assert.equal(await page.locator('body').getAttribute('data-active-view'),'settings');
 await page.locator('#ai-key').fill('sk-or-test-key'); await page.locator('#ai-connect').click();
 assert(!(await page.evaluate(()=>NexusStorage.exportConfig())).includes('sk-or-'));
 await page.locator('[data-target-view="overview"].dock-item').click();
 await page.locator('[data-ai-prompt]').first().click();
 await page.waitForFunction(()=>document.getElementById('assistant-answer').textContent.includes('calm afternoon'));
 assert.equal(aiBodies.length,1);assert.equal(aiBodies[0].model,'openrouter/free');
 assert.deepEqual(aiBodies[0].provider.max_price,{prompt:0,completion:0,request:0,image:0});
 await page.locator('[data-ai-prompt]').first().click();assert.equal(aiBodies.length,1,'Repeat should use memory cache');
 await page.clock.runFor(11000); price='0.001'; await page.locator('[data-ai-prompt]').nth(1).click();
 await page.waitForFunction(()=>document.getElementById('assistant-status').textContent.includes('No verified zero-cost'));
 assert.equal(aiBodies.length,1,'Paid pricing must block generation');
 price='0'; aiStatus=429; await page.clock.runFor(11000); await page.locator('[data-ai-prompt]').nth(2).click();
 await page.waitForFunction(()=>document.getElementById('assistant-status').textContent.includes('allowance'));
 assert.equal(aiBodies.length,2,'Rate-limit handling must not retry or use paid fallback');
 const poll=await page.evaluate(()=>{NexusDataEngine.pauseIntervals();let stopped=NexusDataEngine.pollTimer===null;NexusDataEngine.resumeIntervals();return {stopped,resumed:NexusDataEngine.pollTimer!==null,iss:NexusDataEngine.pollerVisible('iss')};});
 assert.deepEqual(poll,{stopped:true,resumed:true,iss:false});
 fs.mkdirSync('.test-artifacts',{recursive:true});
 for(const size of [{width:1280,height:800},{width:1024,height:600},{width:800,height:1280}]){
   await page.setViewportSize(size);
   await page.screenshot({path:'.test-artifacts/home-'+size.width+'.png'});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.locator('#home-focus').click();assert(await page.locator('#pane-timers').isVisible());
 await page.locator('[data-tool="calc"]').click();
 for(const key of ['2','+','3','='])await page.locator('[data-calc="'+key+'"]').click();
 assert.equal(await page.locator('#calc-display').textContent(),'5');
 await page.locator('[data-tool="notes"]').click();await page.locator('#todo-input').fill('Tablet test');await page.locator('#todo-add-btn').click();
 assert((await page.locator('#todo-items-list').textContent()).includes('Tablet test'));
 for(const route of ['markets','weather','world','home','settings','overview']){
   await page.locator('.dock-item[data-target-view="'+route+'"]').click();
   assert.equal(await page.locator('body').getAttribute('data-active-view'),route);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: location time + DST + date rollover, free-only pricing, key exclusion, AI cache/429, poll resume, 3 tablet layouts, navigation and tools.');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
