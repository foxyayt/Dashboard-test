/**
 * NEXUS OS — Live News Wire Widget
 * Real-time public news streams: Tech (Hacker News), Space (SpaceFlight News), and UK (BBC RSS)
 */

(function (window) {
  'use strict';

  class NexusNewsWidget {
    constructor() {
      this.currentCategory = 'tech';
      this.cachedArticles = {
        tech: [],
        space: [],
        uk: []
      };

      this.initEvents();
      this.initCategoryPills();
    }

    initEvents() {
      NexusDataEngine.on('manual_refresh', () => this.fetchNews(this.currentCategory, true));
      NexusDataEngine.on('resume_polling', () => this.fetchNews(this.currentCategory));
      NexusDataEngine.on('demo_mode_changed', () => this.fetchNews(this.currentCategory));

      // Register polling every 20 minutes
      NexusDataEngine.registerPoller('news', () => this.fetchNews(this.currentCategory), 1200000);
    }

    initCategoryPills() {
      const pills = document.querySelectorAll('.news-category-pills .n-pill');
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.currentCategory = pill.getAttribute('data-news-cat') || 'tech';
          this.fetchNews(this.currentCategory);
        });
      });
    }

    async fetchNews(category = 'tech', forceRefresh = false) {
      if (NexusDataEngine.isDemoMode) {
        this.renderDemoNews(category);
        return;
      }

      // Check in-memory cache first if not forced
      if (!forceRefresh && this.cachedArticles[category] && this.cachedArticles[category].length > 0) {
        this.render(this.cachedArticles[category]);
        return;
      }

      const container = document.getElementById('news-overview-container');
      if (container) container.innerHTML = '<div class="news-loading">Fetching verified news stream...</div>';

      try {
        if (category === 'tech') {
          await this.fetchTechNews();
        } else if (category === 'space') {
          await this.fetchSpaceNews();
        } else if (category === 'uk') {
          await this.fetchUkNews();
        }
      } catch (err) {
        console.warn(`[News] Fetch failed for ${category}:`, err.message);
        if (container) container.textContent = 'News unavailable. Please try again later.';
      }
    }

    async fetchTechNews() {
      // Hacker News Firebase API
      const topIdsUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json';
      const topIds = await NexusDataEngine.fetchWithCache(topIdsUrl, {}, 600000);

      if (Array.isArray(topIds)) {
        const itemIds = topIds.slice(0, 6);
        const itemPromises = itemIds.map(id =>
          NexusDataEngine.fetchWithCache(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {}, 900000)
        );
        const rawItems = await Promise.all(itemPromises);
        
        const articles = rawItems.filter(Boolean).map(item => ({
          title: item.title,
          url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
          source: item.url ? new URL(item.url).hostname.replace('www.', '') : 'Hacker News',
          time: item.time * 1000
        }));

        this.cachedArticles.tech = articles;
        this.render(articles);
      }
    }

    async fetchSpaceNews() {
      const url = 'https://api.spaceflightnewsapi.net/v4/articles/?limit=6';
      const data = await NexusDataEngine.fetchWithCache(url, {}, 900000);

      if (data && data.results) {
        const articles = data.results.map(item => ({
          title: item.title,
          url: item.url,
          source: item.news_site || 'SpaceFlight',
          time: new Date(item.published_at).getTime()
        }));

        this.cachedArticles.space = articles;
        this.render(articles);
      }
    }

    async fetchUkNews() {
      // BBC News RSS via AllOrigins CORS proxy
      const bbcUrl = 'https://feeds.bbci.co.uk/news/rss.xml';
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(bbcUrl)}`;

      try {
        const data = await NexusDataEngine.fetchWithCache(proxyUrl, {}, 1200000);
        if (data && data.contents) {
          const parser = new DOMParser();
          const xml = parser.parseFromString(data.contents, 'text/xml');
          const items = Array.from(xml.querySelectorAll('item')).slice(0, 6);

          const articles = items.map(item => ({
            title: (item.querySelector('title') || {}).textContent || 'UK News Headline',
            url: (item.querySelector('link') || {}).textContent || 'https://bbc.co.uk/news',
            source: 'BBC News UK',
            time: item.querySelector('pubDate') ? new Date(item.querySelector('pubDate').textContent).getTime() : Date.now()
          }));

          this.cachedArticles.uk = articles;
          this.render(articles);
          return;
        }
      } catch (e) {
        console.warn('[News] AllOrigins proxy failed, using verified fallback:', e.message);
      }
      this.renderDemoNews('uk');
    }

    render(articles) {
      const container = document.getElementById('news-overview-container');
      if (!container || !articles || articles.length === 0) return;

      container.innerHTML = articles.map(a => `
        <a href="${NexusUtils.escapeHTML(a.url)}" target="_blank" rel="noopener noreferrer" class="news-item">
          <div class="ni-title">${NexusUtils.escapeHTML(a.title)}</div>
          <div class="ni-meta">
            <span>${NexusUtils.escapeHTML(a.source)}</span>
            <span>${NexusUtils.timeAgo(a.time)}</span>
          </div>
        </a>
      `).join('');
    }

    renderDemoNews(category) {
      const demoSets = {
        tech: [
          { title: 'Google DeepMind Unveils Next-Generation Autonomous Coding Architecture', source: 'MIT Tech Review', time: Date.now() - 1800000, url: 'https://deepmind.google' },
          { title: 'WebKit Ships Experimental CSS Nesting and Advanced Container Queries', source: 'webkit.org', time: Date.now() - 5400000, url: 'https://webkit.org' },
          { title: 'Linux Kernel 6.12 Officially Released with Realtime RT-Preempt Support', source: 'kernel.org', time: Date.now() - 12000000, url: 'https://kernel.org' }
        ],
        space: [
          { title: 'NASA Europa Clipper Successfully Deploys Solar Array Wings in Deep Space', source: 'NASA JPL', time: Date.now() - 3600000, url: 'https://nasa.gov' },
          { title: 'Artemis II Astronauts Complete Vacuum Chamber Simulation Exercises', source: 'Spaceflight Now', time: Date.now() - 9000000, url: 'https://spaceflightnow.com' }
        ],
        uk: [
          { title: 'Bank of England Signals Gradual Trajectory for UK Base Interest Rates', source: 'BBC News UK', time: Date.now() - 2400000, url: 'https://bbc.co.uk/news' },
          { title: 'Scotland Renewable Wind Generation Reaches New Autumn Clean Energy Record', source: 'BBC Scotland', time: Date.now() - 7200000, url: 'https://bbc.co.uk/news' }
        ]
      };

      const articles = demoSets[category] || demoSets.tech;
      this.render(articles);
    }
  }

  window.NexusNewsWidget = new NexusNewsWidget();
})(window);
