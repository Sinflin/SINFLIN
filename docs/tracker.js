    'use strict';
    (() => {
      const USERNAME = 'Sinflin';
      const API = `https://api.github.com/users/${encodeURIComponent(USERNAME)}`;
      const REFRESH_MS = 5 * 60 * 1000;
      const memoryCache = new Map();
      let lastSuccessfulRefresh = 0;
      let isRefreshing = false;
      let latestEvents = [];
      let latestRepos = [];

      const $ = (id) => document.getElementById(id);
      const number = (value) => new Intl.NumberFormat().format(Number(value || 0));
      const dateTime = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'No public event found';
      const since = (value) => {
        if (!value) return 'Date unavailable';
        const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
      };

      async function getJson(url) {
        const cached = memoryCache.get(url);
        const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
        if (cached?.etag) headers['If-None-Match'] = cached.etag;
        const response = await fetch(url, { headers, cache: 'no-store' });
        if (response.status === 304 && cached) return cached.data;
        if (!response.ok) {
          const reset = response.headers.get('X-RateLimit-Reset');
          const resetText = reset ? ` Try again after ${new Date(Number(reset) * 1000).toLocaleTimeString()}.` : '';
          if (response.status === 403 || response.status === 429) throw new Error(`GitHub API rate limit or access restriction (${response.status}).${resetText}`);
          throw new Error(`GitHub API returned ${response.status} for ${new URL(url).pathname}.`);
        }
        const data = await response.json();
        memoryCache.set(url, { data, etag: response.headers.get('ETag') });
        return data;
      }

      function setStatus(message, isError = false) {
        const el = $('apiStatus');
        el.textContent = message;
        el.classList.toggle('error', isError);
      }

      function renderUser(user) {
        $('repoCount').textContent = number(user.public_repos);
        $('followers').textContent = number(user.followers);
        $('following').textContent = number(user.following);
        $('bio').textContent = user.bio || 'Curious mind, continuous learner. Exploring cybersecurity, software, and practical problem-solving.';
        $('profileStatus').textContent = `Public profile loaded · ${user.login || USERNAME}`;
      }

      function renderFeaturedProjects(repos) {
        const featured = [
          { title: 'SkillGap AI', description: 'Bridge the skill gap with AI.', match: /skill.?gap/i, icon: '✦' },
          { title: 'TraceX', description: 'Cyber tracing made simple.', match: /tracex/i, icon: '◎' },
          { title: 'WAF Project', description: 'Web Application Firewall.', match: /waf/i, icon: '⬡' }
        ];
        const grid = $('featuredGrid'); grid.replaceChildren();
        featured.forEach((item) => {
          const repo = repos.find((candidate) => item.match.test(candidate.name || ''));
          const card = document.createElement(repo ? 'a' : 'article');
          card.className = 'panel repo-card featured-card';
          if (repo) { card.href = repo.html_url; card.target = '_blank'; card.rel = 'noopener noreferrer'; }
          const icon = document.createElement('div'); icon.className = 'featured-icon'; icon.textContent = item.icon;
          const name = document.createElement('div'); name.className = 'repo-name'; name.textContent = item.title;
          const desc = document.createElement('div'); desc.className = 'repo-desc'; desc.textContent = item.description;
          const state = document.createElement('div'); state.className = 'featured-state';
          state.textContent = repo ? `↗ ${repo.full_name} · ★ ${number(repo.stargazers_count)}` : 'No matching public repository found yet';
          card.append(icon, name, desc, state); grid.append(card);
        });
      }

      function renderRepos(repos) {
        latestRepos = Array.isArray(repos) ? repos : [];
        renderFeaturedProjects(latestRepos);
        const starTotal = latestRepos.reduce((sum, repo) => sum + Number(repo.stargazers_count || 0), 0);
        $('stars').textContent = number(starTotal);
        const grid = $('repoGrid');
        grid.replaceChildren();
        const top = [...latestRepos].sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0) || new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 6);
        if (!top.length) {
          grid.innerHTML = '<div class="empty">No public repositories were returned for this account.</div>';
        } else {
          top.forEach((repo) => {
            const card = document.createElement('a');
            card.className = 'panel repo-card';
            card.href = repo.html_url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            const name = document.createElement('div'); name.className = 'repo-name'; name.textContent = repo.name;
            const desc = document.createElement('div'); desc.className = 'repo-desc'; desc.textContent = repo.description || 'No description added yet.';
            const meta = document.createElement('div'); meta.className = 'repo-meta';
            const stars = document.createElement('span'); stars.textContent = `★ ${number(repo.stargazers_count)}`;
            const lang = document.createElement('span'); lang.textContent = repo.language || 'Language n/a';
            const updated = document.createElement('span'); updated.textContent = `Updated ${since(repo.updated_at)}`;
            meta.append(stars, lang, updated); card.append(name, desc, meta); grid.append(card);
          });
        }
        const counts = new Map();
        latestRepos.forEach((repo) => { if (repo.language) counts.set(repo.language, (counts.get(repo.language) || 0) + 1); });
        const languageStack = $('languageStack'); languageStack.replaceChildren();
        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
        if (!sorted.length) {
          const chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = 'No language data returned'; languageStack.append(chip);
        } else {
          sorted.forEach(([language, count]) => {
            const chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = `${language} · ${count}`; languageStack.append(chip);
          });
        }
      }

      const eventNames = {
        PushEvent: 'Pushed commits', CreateEvent: 'Created a branch or repository',
        PullRequestEvent: 'Updated a pull request', IssuesEvent: 'Worked on an issue',
        IssueCommentEvent: 'Commented on an issue', WatchEvent: 'Starred a repository',
        ForkEvent: 'Forked a repository', ReleaseEvent: 'Published a release',
        DeleteEvent: 'Deleted a branch or tag', PublicEvent: 'Made a repository public',
        CommitCommentEvent: 'Commented on a commit', DiscussionEvent: 'Updated a discussion'
      };

      function renderEvents(events) {
        latestEvents = Array.isArray(events) ? events : [];
        const counts = new Map();
        latestEvents.forEach((event) => {
          const day = (event.created_at || '').slice(0, 10);
          if (day) counts.set(day, (counts.get(day) || 0) + 1);
        });
        const grid = $('activityGrid'); grid.replaceChildren();
        const today = new Date();
        const base = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
        for (let i = 27; i >= 0; i--) {
          const d = new Date(base - i * 86400000);
          const key = d.toISOString().slice(0, 10);
          const count = counts.get(key) || 0;
          const cell = document.createElement('span');
          cell.className = 'cell';
          const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
          cell.dataset.level = String(level);
          cell.title = `${key}: ${count} public event${count === 1 ? '' : 's'} observed`;
          grid.append(cell);
        }
        $('activityGrid').setAttribute('aria-label', `Last 28 days: ${[...counts.values()].reduce((a, b) => a + b, 0)} public events observed in the latest events response`);

        const feed = $('eventFeed'); feed.replaceChildren();
        if (!latestEvents.length) {
          feed.innerHTML = '<div class="empty">No recent public events were returned. This can be normal for a quiet account.</div>';
          return;
        }
        latestEvents.slice(0, 6).forEach((event) => {
          const wrap = document.createElement('div'); wrap.className = 'event';
          const title = document.createElement('div'); title.className = 'event-title';
          const action = eventNames[event.type] || `${String(event.type || 'Activity').replace(/Event$/, '')} activity`;
          title.textContent = action;
          const meta = document.createElement('div'); meta.className = 'event-meta';
          meta.textContent = `${event.repo?.name || 'Repository'} · ${since(event.created_at)} · ${dateTime(event.created_at)}`;
          wrap.append(title, meta); feed.append(wrap);
        });
      }

      async function refresh() {
        if (isRefreshing) return;
        isRefreshing = true;
        $('refreshButton').disabled = true;
        $('refreshButton').textContent = '↻ Updating…';
        setStatus('Fetching public GitHub data…');
        const urls = [API, `${API}/repos?per_page=100&sort=updated&type=owner`, `${API}/events/public?per_page=100`];
        try {
          const results = await Promise.allSettled(urls.map(getJson));
          const errors = [];
          if (results[0].status === 'fulfilled') renderUser(results[0].value);
          else errors.push(`profile: ${results[0].reason.message}`);
          if (results[1].status === 'fulfilled') renderRepos(results[1].value);
          else errors.push(`repositories: ${results[1].reason.message}`);
          if (results[2].status === 'fulfilled') renderEvents(results[2].value);
          else errors.push(`events: ${results[2].reason.message}`);
          if (results.some((r) => r.status === 'fulfilled')) {
            lastSuccessfulRefresh = Date.now();
            $('lastUpdated').textContent = `Last updated: ${dateTime(new Date(lastSuccessfulRefresh).toISOString())} · next automatic check in 5 minutes`;
          }
          if (errors.length === 3) setStatus(errors[0], true);
          else if (errors.length) setStatus(`Partially updated · ${errors.join(' | ')}`, true);
          else setStatus('Live · all public data updated');
        } catch (error) {
          setStatus(error.message || 'Unable to reach the GitHub API.', true);
        } finally {
          isRefreshing = false;
          $('refreshButton').disabled = false;
          $('refreshButton').textContent = '↻ Refresh now';
        }
      }

      $('refreshButton').addEventListener('click', refresh);
      setInterval(() => { if (!document.hidden && Date.now() - lastSuccessfulRefresh >= REFRESH_MS) refresh(); }, 30 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Date.now() - lastSuccessfulRefresh >= REFRESH_MS) refresh();
      });
      refresh();
    })();
