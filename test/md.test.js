// Run with: node --test test/
const test = require('node:test');
const assert = require('node:assert/strict');
const { renderMarkdown } = require('../md.js');

const html = (md) => renderMarkdown(md).html;

test('headings get ids, anchors and a contents entry', () => {
  const r = renderMarkdown('# Title\n\n## Part one\n\n### Detail\n\n#### Deep');
  assert.equal(r.title, 'Title');
  assert.match(r.html, /<h2 id="part-one">Part one<a class="anchor" href="#part-one"/);
  assert.deepEqual(r.toc.map((t) => t.level), [1, 2, 3]);
});

test('repeated headings get unique ids', () => {
  const r = renderMarkdown('## Notes\n\n## Notes');
  assert.deepEqual(r.toc.map((t) => t.id), ['notes', 'notes-1']);
});

test('tables keep alignment, inline code and escaped pipes', () => {
  const out = html('| A | B | C |\n|:--|:-:|--:|\n| `x` | a \\| b | 3 |');
  assert.match(out, /<th style="text-align:left">A<\/th>/);
  assert.match(out, /<th style="text-align:center">B<\/th>/);
  assert.match(out, /<td style="text-align:right">3<\/td>/);
  assert.match(out, /<code>x<\/code>/);
  assert.match(out, /a \| b/);
});

test('table rows shorter than the header get empty cells', () => {
  const out = html('| A | B |\n|---|---|\n| 1 |');
  assert.match(out, /<td>1<\/td><td><\/td>/);
});

test('nested, ordered and task lists', () => {
  const out = html('- one\n  - inner\n- [x] done\n- [ ] open\n\n3. three\n4. four');
  assert.match(out, /<ul><li>one<ul><li>inner<\/li><\/ul><\/li>/);
  assert.match(out, /<li class="task done"><input type="checkbox" disabled checked> done/);
  assert.match(out, /<li class="task"><input type="checkbox" disabled> open/);
  assert.match(out, /<ol start="3"><li>three<\/li><li>four<\/li><\/ol>/);
});

test('fenced code is escaped and labelled', () => {
  const out = html('```js\nif (a < b) { alert("<b>") }\n```');
  assert.match(out, /<pre class="code" data-lang="js"><code>if \(a &lt; b\)/);
  assert.doesNotMatch(out, /<b>/);
});

test('emphasis, strike, inline code and line breaks', () => {
  const out = html('**bold** *it* _also_ ~~gone~~ `a*b*c` snake_case_name');
  assert.match(out, /<strong>bold<\/strong> <em>it<\/em> <em>also<\/em> <del>gone<\/del>/);
  assert.match(out, /<code>a\*b\*c<\/code>/);
  assert.match(out, /snake_case_name/);
});

test('links, autolinks and images', () => {
  const out = html('[docs](https://boarapp.com/docs/ "Docs") see https://boarapp.com. ![boar](./boar.png)');
  assert.match(out, /<a href="https:\/\/boarapp.com\/docs\/" title="Docs">docs<\/a>/);
  assert.match(out, /<a href="https:\/\/boarapp.com">https:\/\/boarapp.com<\/a>\./);
  assert.match(out, /<img src=".\/boar.png" alt="boar" loading="lazy">/);
});

test('relative and anchor links are kept', () => {
  const out = html('[next](other.md) [top](#title) [up](../README.md)');
  assert.match(out, /href="other.md"/);
  assert.match(out, /href="#title"/);
  assert.match(out, /href="..\/README.md"/);
});

test('raw HTML is shown as text, never run', () => {
  const out = html('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
  assert.doesNotMatch(out, /<script>|<img src=x/);
  assert.match(out, /&lt;script&gt;/);
});

test('dangerous link schemes become plain text', () => {
  for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)',
    'vbscript:msgbox(1)', 'data:text/html,<script>alert(1)</script>']) {
    const out = html(`[click](${href})`);
    assert.doesNotMatch(out, /<a /, href);
  }
});

test('dangerous image sources are dropped, safe data images kept', () => {
  assert.doesNotMatch(html('![x](javascript:alert(1))'), /<img/);
  assert.match(html('![dot](data:image/png;base64,iVBORw0KGgo=)'), /<img src="data:image\/png;base64,/);
});

test('attribute quotes cannot break out of a link', () => {
  const out = html('[x](https://a.com/"onmouseover="alert(1))');
  assert.doesNotMatch(out, /" onmouseover=|"onmouseover="alert/);
});

test('GitHub alerts', () => {
  const out = html('> [!WARNING]\n> Back up your keys.');
  assert.match(out, /<div class="alert alert-warning"><p class="alert-title">Warning<\/p><p>Back up your keys.<\/p><\/div>/);
});

test('plain quotes keep inner Markdown', () => {
  assert.match(html('> **said** it'), /<blockquote><p><strong>said<\/strong> it<\/p><\/blockquote>/);
});

test('footnotes link both ways', () => {
  const out = html('Claim.[^1]\n\n[^1]: Source.');
  assert.match(out, /<sup class="fn-ref"><a href="#fn-1" id="fnref-1">1<\/a><\/sup>/);
  assert.match(out, /<li id="fn-1">Source. <a class="fn-back" href="#fnref-1"/);
});

test('a paragraph stops at the next block', () => {
  const out = html('Intro line\n- item\n\nText\n| a | b |\n|---|---|\n| 1 | 2 |');
  assert.match(out, /<p>Intro line<\/p><ul>|<p>Intro line<\/p>\n<ul>/);
  assert.match(out, /<p>Text<\/p>\n<div class="table-wrap">/);
});

test('word count for reading time', () => {
  assert.equal(renderMarkdown('# Two words\n\n| a b | c |\n|---|---|\n| d | e |\n\n```\nskip me\n```').words, 7);
});
