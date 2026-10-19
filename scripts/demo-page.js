// Builds a static HTML page that looks like the extension's preview, for README screenshots.
//   node scripts/demo-page.js docs/sample.md moonlight > /tmp/demo.html
const fs = require('fs');
const path = require('path');
const { renderMarkdown, escapeHtml } = require('../md.js');

const [file, theme = 'moonlight'] = process.argv.slice(2);
const root = path.join(__dirname, '..');
const r = renderMarkdown(fs.readFileSync(file, 'utf8'));
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const font = `file://${path.join(root, 'fonts/Archivo-Variable.ttf')}`;
const toc = r.toc.map((t) => `<a class="l${t.level}" href="#${t.id}">${escapeHtml(t.text)}</a>`).join('');

process.stdout.write(`<!doctype html><html class="bmp" data-bmp-theme="${theme}"><head><meta charset="utf-8">
<style>@font-face{font-family:'BMP Archivo';src:url('${font}');font-weight:100 900;font-stretch:62% 125%}${css}</style>
</head><body class="bmp-body bmp-has-toc">
<div class="bmp-tools"><button>${theme[0].toUpperCase() + theme.slice(1)}</button><button>A−</button><button>A+</button><button>Raw</button></div>
<nav class="bmp-sidebar"><p class="bmp-sidebar-title">Contents</p>${toc}</nav>
<main class="bmp-main"><p class="bmp-meta">${r.words} words · ${Math.max(1, Math.round(r.words / 220))} min read</p>
<article class="bmp-article">${r.html}</article></main></body></html>`);
