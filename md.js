// BOAR MD Preview: the Markdown renderer. A pure function, no DOM and no dependencies, so it
// runs the same in the browser and in the Node tests (test/run.js).
//
// renderMarkdown(source) -> { html, toc: [{ level, id, text }], title, words }
//
// Covers the GitHub-flavoured Markdown people write: headings, paragraphs, nested ordered,
// unordered and task lists, tables with alignment, fenced code, quotes, GitHub alerts
// (> [!NOTE]), footnotes, rules, bold, italic, strikethrough, inline code, links, autolinks and
// images. Raw HTML is shown as text, never run, and only safe link and image addresses are kept.
(function (root) {
  'use strict';

  const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Addresses a Markdown file may link to. Anything else (javascript:, vbscript:, data:text/html…)
  // becomes plain text, so a .md file from a website can't run code in the page.
  const SAFE_LINK = /^(https?:|mailto:|#|\/|\.{0,2}\/|[^:]*$)/i;
  const SAFE_IMAGE = /^(https?:|\/|\.{0,2}\/|data:image\/(png|gif|jpe?g|webp|avif);|[^:]*$)/i;
  const unescapeAttr = (s) => s.replace(/&amp;/g, '&');
  const safeUrl = (url, pattern) => {
    const plain = unescapeAttr(url).trim();
    // Browsers ignore control characters and whitespace inside a scheme ("java\tscript:").
    const squeezed = plain.replace(/[\u0000- ]/g, '');
    return pattern.test(squeezed) ? plain.replace(/"/g, '%22') : null;
  };

  const ALERTS = {
    NOTE: 'Note',
    TIP: 'Tip',
    IMPORTANT: 'Important',
    WARNING: 'Warning',
    CAUTION: 'Caution',
  };

  function renderMarkdown(source) {
    const footnotes = {};
    const footnoteOrder = [];
    const slugs = {};
    const toc = [];

    const slug = (text) => {
      let base = text.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '')
        .replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
      if (!base) base = 'section';
      slugs[base] = (slugs[base] || 0) + 1;
      return slugs[base] > 1 ? `${base}-${slugs[base] - 1}` : base;
    };

    // ---- inline ---------------------------------------------------------------
    const inline = (text) => {
      const held = [];
      const hold = (html) => {
        held.push(html);
        return `\u0000${held.length - 1}\u0000`;
      };
      // Code spans first, kept out of every other rule.
      let s = text.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, _t, code) =>
        hold(`<code>${escapeHtml(code.trim())}</code>`));
      s = escapeHtml(s);
      s = s
        .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (all, alt, src, title) => {
          const url = safeUrl(src, SAFE_IMAGE);
          if (!url) return alt;
          return hold(`<img src="${url}" alt="${alt}" loading="lazy"${title ? ` title="${title}"` : ''}>`);
        })
        .replace(/\[\^([^\]]+)\]/g, (all, id) => {
          if (!footnotes[id]) return all;
          if (!footnoteOrder.includes(id)) footnoteOrder.push(id);
          const n = footnoteOrder.indexOf(id) + 1;
          return hold(`<sup class="fn-ref"><a href="#fn-${n}" id="fnref-${n}">${n}</a></sup>`);
        })
        .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (all, label, href, title) => {
          const url = safeUrl(href, SAFE_LINK);
          if (!url) return label;
          return hold(`<a href="${url}"${title ? ` title="${title}"` : ''}>${label}</a>`);
        })
        .replace(/(^|[\s(])(https?:\/\/[^\s<)\u0000]+[^\s<).,;:!?\u0000])/g, (_, pre, url) =>
          pre + hold(`<a href="${url}">${url}</a>`))
        .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/(^|[^\w_])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>')
        .replace(/~~([^~]+)~~/g, '<del>$1</del>')
        .replace(/ {2,}$/gm, '<br>');
      // Held pieces may hold others (a link around inline code): restore until none are left.
      while (/\u0000\d+\u0000/.test(s)) s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => held[Number(i)]);
      return s;
    };

    // ---- blocks ---------------------------------------------------------------
    const lines = source.replace(/\r\n?/g, '\n').split('\n');

    // Footnote definitions are collected first, so references anywhere can find them.
    for (let k = lines.length - 1; k >= 0; k--) {
      const def = lines[k].match(/^\[\^([^\]]+)\]:\s*(.*)$/);
      if (def) {
        footnotes[def[1]] = def[2];
        lines.splice(k, 1);
      }
    }

    const isTableSep = (l) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l) && l.includes('-');
    const splitRow = (l) => {
      let row = l.trim();
      if (row.startsWith('|')) row = row.slice(1);
      if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
      return row.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
    };
    const listRe = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

    const renderList = (start) => {
      const items = [];
      let i = start;
      const first = lines[i].match(listRe);
      const baseIndent = first[1].length;
      const ordered = /\d/.test(first[2]);
      const startNumber = ordered ? parseInt(first[2], 10) : 1;
      while (i < lines.length) {
        const m = lines[i].match(listRe);
        if (!m || m[1].length < baseIndent) {
          if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length && !m) {
            items[items.length - 1].text += ' ' + lines[i].trim();
            i++;
            continue;
          }
          break;
        }
        if (m[1].length > baseIndent) {
          const [sub, next] = renderList(i);
          items[items.length - 1].children += sub;
          i = next;
          continue;
        }
        items.push({ text: m[3], children: '' });
        i++;
      }
      const body = items.map(({ text, children }) => {
        const task = text.match(/^\[([ xX])\]\s+(.*)$/);
        if (task) {
          const done = task[1] !== ' ';
          return `<li class="task${done ? ' done' : ''}"><input type="checkbox" disabled${done ? ' checked' : ''}> ${inline(task[2])}${children}</li>`;
        }
        return `<li>${inline(text)}${children}</li>`;
      }).join('');
      const tag = ordered ? 'ol' : 'ul';
      const startAttr = ordered && startNumber !== 1 ? ` start="${startNumber}"` : '';
      return [`<${tag}${startAttr}>${body}</${tag}>`, i];
    };

    const startsBlock = (k) => {
      const l = lines[k];
      return /^(#{1,6}\s|\s*(```|~~~)|\s*>)/.test(l) || listRe.test(l) ||
        /^\s*([-*_])(\s*\1){2,}\s*$/.test(l) ||
        (l.includes('|') && k + 1 < lines.length && isTableSep(lines[k + 1]));
    };

    const out = [];
    let words = 0;
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }

      const fence = line.match(/^\s*(```+|~~~+)\s*([\w+#.-]*)/);
      if (fence) {
        const code = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence[1])) code.push(lines[i++]);
        i++;
        const lang = fence[2] ? ` data-lang="${escapeHtml(fence[2])}"` : '';
        out.push(`<pre class="code"${lang}><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        continue;
      }

      const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (h) {
        const level = h[1].length;
        const html = inline(h[2]);
        const id = slug(html);
        const text = html.replace(/<[^>]+>/g, '');
        if (level <= 3) toc.push({ level, id, text });
        words += text.split(/\s+/).filter(Boolean).length;
        out.push(`<h${level} id="${id}">${html}<a class="anchor" href="#${id}" title="Link to this section" aria-label="Link to this section">#</a></h${level}>`);
        i++;
        continue;
      }

      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        const head = splitRow(line);
        const aligns = splitRow(lines[i + 1]).map((c) =>
          c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : '');
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(splitRow(lines[i++]));
        const cell = (tag, c, n) =>
          `<${tag}${aligns[n] ? ` style="text-align:${aligns[n]}"` : ''}>${inline(c)}</${tag}>`;
        out.push(
          '<div class="table-wrap"><table><thead><tr>' + head.map((c, n) => cell('th', c, n)).join('') +
          '</tr></thead><tbody>' +
          rows.map((r) => '<tr>' + head.map((_, n) => cell('td', r[n] ?? '', n)).join('') + '</tr>').join('') +
          '</tbody></table></div>');
        continue;
      }

      if (/^\s*>/.test(line)) {
        const quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
        const alert = (quote[0] || '').match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
        const body = (alert ? quote.slice(1) : quote).join('\n');
        const inner = renderMarkdown(body).html;
        if (alert) {
          const kind = alert[1].toUpperCase();
          out.push(`<div class="alert alert-${kind.toLowerCase()}"><p class="alert-title">${ALERTS[kind]}</p>${inner}</div>`);
        } else {
          out.push(`<blockquote>${inner}</blockquote>`);
        }
        continue;
      }

      if (listRe.test(line)) {
        const [html, next] = renderList(i);
        out.push(html);
        i = next;
        continue;
      }

      const para = [];
      while (i < lines.length && lines[i].trim() && (para.length === 0 || !startsBlock(i))) para.push(lines[i++]);
      const text = para.join('\n');
      words += text.split(/\s+/).filter(Boolean).length;
      out.push(`<p>${inline(text).replace(/\n/g, ' ')}</p>`);
    }

    if (footnoteOrder.length) {
      out.push('<section class="footnotes"><hr><ol>' + footnoteOrder.map((id, n) =>
        `<li id="fn-${n + 1}">${inline(footnotes[id])} <a class="fn-back" href="#fnref-${n + 1}" aria-label="Back to the text">↩</a></li>`).join('') +
        '</ol></section>');
    }

    // Reading time counts every word of prose, tables and lists; code blocks are left out.
    words = source.replace(/^\s*(```|~~~)[\s\S]*?^\s*\1.*$/gm, ' ')
      .replace(/[#>|*_`~\-[\]()!:]/g, ' ').split(/\s+/).filter((w) => /\w/.test(w)).length;

    const titleMatch = source.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].replace(/[`*_]/g, '').trim() : '';
    return { html: out.join('\n'), toc, title, words };
  }

  root.BoarMd = { renderMarkdown, escapeHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BoarMd;
})(typeof globalThis !== 'undefined' ? globalThis : this);
