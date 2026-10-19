# Chrome Web Store listing

Text to paste into the developer dashboard. Upload `dist/boar-md-preview-<version>.zip` (`npm run pack`).

## Store listing

**Name:** BOAR MD Preview

**Summary** (132 characters max):
Read Markdown files as clean pages: headings, tables, code, lists and alerts. Local files and raw .md on the web.

**Description:**

Open a Markdown file in your browser and read it like a document instead of a wall of text.

BOAR MD Preview renders .md files from your disk (file:///…) and raw .md files on the web:
• Headings with a contents sidebar and links to each section
• Tables with alignment and striped rows
• Code blocks with a language label and a Copy button
• Nested, numbered and task lists
• GitHub alerts (Note, Tip, Important, Warning, Caution) and footnotes
• Three themes: Moonlight, Campfire and Day, or Auto with your system
• Text size, reading time, Print or save as PDF, and a Raw button
• Live reload: a local file refreshes when you save it

On websites it asks first (Preview or Keep raw), and you can choose to always preview a site. A website's own page whose address ends in .md is left alone.

No network requests, no tracking, no analytics. Raw HTML in a Markdown file is shown as text and never run.

To preview files on your disk, turn on "Allow access to file URLs" in the extension's details.

Open source (MIT): https://github.com/rferrari/boar-md-preview

**Category:** Productivity (or Developer Tools)
**Language:** English

**Images:** icon `icons/icon-128.png`; screenshots 1280×800 from `docs/screenshots/` (crop or pad to that size).

## Privacy practices

**Single purpose:** Renders Markdown files that the browser shows as plain text into a readable page.

**Permission justification:**
- *Host access to \*.md / \*.markdown addresses:* needed to render those pages; the script only runs on Markdown addresses and only when the page is plain text.
- *storage:* remembers the theme, text size, live reload setting and the sites the user chose to always preview.

**Remote code:** No. All code ships in the package.

**Data usage:** The extension does not collect or transmit any user data. Tick none of the data categories.

**Privacy policy URL:** https://github.com/rferrari/boar-md-preview/blob/main/PRIVACY.md
