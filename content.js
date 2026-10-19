// BOAR MD Preview: the page script. Runs only on addresses ending in .md / .markdown (see
// manifest.json) and only when the browser shows the file as plain text, so a site's own HTML
// page (github.com/…/README.md) is left alone. Local files render straight away; on a website
// it asks first (Preview / Keep raw), unless "Always preview" was ticked for that site.
(() => {
  'use strict';

  if (!/^text\/(plain|markdown|x-markdown)$/.test(document.contentType)) return;
  const pre = document.querySelector('body > pre');
  let source = pre ? pre.textContent : document.body.innerText;
  if (!source) return;

  // What the page shows around the document. The user picks it in the settings page.
  const DEFAULT_TOOLS = { contents: true, theme: true, textSize: true, raw: true, print: false, readingTime: true };
  const DEFAULTS = { theme: 'auto', fontSize: 16, liveReload: true, alwaysPreview: {}, tools: DEFAULT_TOOLS };
  const THEMES = ['auto', 'moonlight', 'campfire', 'day'];
  const THEME_NAMES = { auto: 'Auto', moonlight: 'Moonlight', campfire: 'Campfire', day: 'Day' };
  const isLocal = location.protocol === 'file:';
  const host = location.host;
  let settings = { ...DEFAULTS };

  const save = (patch) => {
    settings = { ...settings, ...patch };
    chrome.storage.local.set(patch);
  };

  chrome.storage.local.get(DEFAULTS, (stored) => {
    settings = { ...stored, tools: { ...DEFAULT_TOOLS, ...stored.tools } };
    if (isLocal || settings.alwaysPreview[host]) render();
    else ask();
  });

  // ---- the question on websites ---------------------------------------------
  function ask() {
    const bar = document.createElement('div');
    bar.className = 'bmp-ask';
    bar.innerHTML =
      '<span class="bmp-ask-label">Markdown file</span>' +
      '<button type="button" data-act="preview">Preview</button>' +
      '<button type="button" data-act="raw">Keep raw</button>' +
      `<label><input type="checkbox"> Always preview on ${BoarMd.escapeHtml(host)}</label>`;
    document.body.prepend(bar);
    bar.addEventListener('click', (e) => {
      const act = e.target.dataset && e.target.dataset.act;
      if (!act) return;
      const always = bar.querySelector('input').checked;
      bar.remove();
      if (act !== 'preview') return;
      if (always) save({ alwaysPreview: { ...settings.alwaysPreview, [host]: true } });
      render();
    });
  }

  // ---- fonts ------------------------------------------------------------------
  // Archivo ships inside the extension (SIL OFL). Loaded from the extension, never the web.
  function loadFont() {
    try {
      const face = new FontFace('BMP Archivo', `url(${chrome.runtime.getURL('fonts/Archivo-Variable.ttf')})`,
        { weight: '100 900', stretch: '62% 125%' });
      face.load().then((f) => document.fonts.add(f)).catch(() => {});
    } catch (_) { /* the system font stays */ }
  }

  // ---- theme ------------------------------------------------------------------
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const chosen = settings.theme === 'auto' ? (darkQuery.matches ? 'moonlight' : 'day') : settings.theme;
    document.documentElement.dataset.bmpTheme = chosen;
    const button = document.querySelector('.bmp-theme');
    if (button) button.textContent = THEME_NAMES[settings.theme];
  }
  darkQuery.addEventListener('change', applyTheme);

  function applyFontSize() {
    document.documentElement.style.setProperty('--bmp-font-size', `${settings.fontSize}px`);
  }

  // ---- render -----------------------------------------------------------------
  let article;
  let sidebar;
  let meta;
  let raw;

  function render() {
    loadFont();
    document.documentElement.classList.add('bmp');
    applyTheme();
    applyFontSize();

    document.body.textContent = '';
    document.body.className = 'bmp-body';

    const show = settings.tools;
    const tools = document.createElement('div');
    tools.className = 'bmp-tools';
    tools.innerHTML =
      (show.contents ? '<button type="button" class="bmp-toc-toggle" title="Contents">Contents</button>' : '') +
      (show.theme ? '<button type="button" class="bmp-theme" title="Theme"></button>' : '') +
      (show.textSize
        ? '<button type="button" data-font="-1" title="Smaller text">A−</button>' +
          '<button type="button" data-font="1" title="Larger text">A+</button>'
        : '') +
      (show.print ? '<button type="button" class="bmp-print" title="Print or save as PDF">Print</button>' : '') +
      (show.raw ? '<button type="button" class="bmp-raw-toggle" title="Show the Markdown source">Raw</button>' : '');

    sidebar = document.createElement('nav');
    sidebar.className = 'bmp-sidebar';
    sidebar.setAttribute('aria-label', 'Contents');

    article = document.createElement('article');
    article.className = 'bmp-article';

    meta = document.createElement('p');
    meta.className = 'bmp-meta';

    raw = document.createElement('pre');
    raw.className = 'bmp-raw';
    raw.hidden = true;

    const main = document.createElement('main');
    main.className = 'bmp-main';
    main.append(meta, article, raw);
    if (show.contents) document.body.append(sidebar);
    if (tools.children.length) document.body.append(tools);
    document.body.append(main);
    meta.hidden = !show.readingTime;

    fill();
    wireTools(tools);
    applyTheme();
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
    if (isLocal && settings.liveReload) watch();
  }

  function fill() {
    const r = BoarMd.renderMarkdown(source);
    if (r.title) document.title = r.title;
    article.innerHTML = r.html;
    raw.textContent = source;

    const minutes = Math.max(1, Math.round(r.words / 220));
    meta.textContent = `${r.words.toLocaleString()} words · ${minutes} min read`;

    sidebar.innerHTML = r.toc.length >= 3
      ? '<p class="bmp-sidebar-title">Contents</p>' + r.toc.map((t) =>
        `<a class="l${t.level}" href="#${t.id}">${BoarMd.escapeHtml(t.text)}</a>`).join('')
      : '';
    document.body.classList.toggle('bmp-has-toc', settings.tools.contents && r.toc.length >= 3);

    // Copy buttons on code blocks.
    article.querySelectorAll('pre.code').forEach((block) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'bmp-copy';
      button.textContent = 'Copy';
      button.addEventListener('click', () => {
        navigator.clipboard.writeText(block.querySelector('code').textContent).then(() => {
          button.textContent = 'Copied';
          setTimeout(() => { button.textContent = 'Copy'; }, 1200);
        });
      });
      block.append(button);
    });

    // A heading's # copies a link to that section.
    article.querySelectorAll('.anchor').forEach((a) => {
      a.addEventListener('click', () => {
        const url = location.href.split('#')[0] + a.getAttribute('href');
        navigator.clipboard?.writeText(url).catch(() => {});
      });
    });
  }

  function wireTools(tools) {
    tools.querySelector('.bmp-theme')?.addEventListener('click', () => {
      save({ theme: THEMES[(THEMES.indexOf(settings.theme) + 1) % THEMES.length] });
      applyTheme();
    });
    tools.querySelectorAll('[data-font]').forEach((b) => b.addEventListener('click', () => {
      save({ fontSize: Math.min(24, Math.max(12, settings.fontSize + Number(b.dataset.font))) });
      applyFontSize();
    }));
    tools.querySelector('.bmp-print')?.addEventListener('click', () => window.print());
    tools.querySelector('.bmp-toc-toggle')?.addEventListener('click', () =>
      document.body.classList.toggle('bmp-toc-open'));
    sidebar.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') document.body.classList.remove('bmp-toc-open');
    });
    const rawToggle = tools.querySelector('.bmp-raw-toggle');
    rawToggle?.addEventListener('click', () => {
      const showRaw = raw.hidden;
      raw.hidden = !showRaw;
      article.hidden = showRaw;
      rawToggle.textContent = showRaw ? 'Preview' : 'Raw';
    });
  }

  // ---- live reload (local files) ---------------------------------------------
  // Re-reads the file every 1.5 s while the tab is visible and re-renders when it changed,
  // keeping the scroll position. If the browser refuses to read it, it stops quietly.
  function watch() {
    let busy = false;
    const timer = setInterval(() => {
      if (document.hidden || busy) return;
      busy = true;
      const xhr = new XMLHttpRequest();
      xhr.open('GET', location.href.split('#')[0]);
      xhr.onload = () => {
        busy = false;
        const next = xhr.responseText;
        if (!next || next === source) return;
        const y = window.scrollY;
        source = next;
        fill();
        window.scrollTo(0, y);
      };
      xhr.onerror = () => clearInterval(timer);
      try { xhr.send(); } catch (_) { clearInterval(timer); }
    }, 1500);
  }
})();
