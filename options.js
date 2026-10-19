// Settings page: theme, text size, page tools, live reload, file access and always-preview sites.
// Every change saves at once; open previews pick it up on their next load.
const DEFAULT_TOOLS = { contents: true, theme: true, textSize: true, raw: true, print: false, readingTime: true };
const PRESETS = {
  full: { contents: true, theme: true, textSize: true, raw: true, print: true, readingTime: true },
  minimal: { contents: true, theme: false, textSize: false, raw: false, print: false, readingTime: false },
  none: { contents: false, theme: false, textSize: false, raw: false, print: false, readingTime: false },
};
const DEFAULTS = { theme: 'auto', fontSize: 16, liveReload: true, alwaysPreview: {}, tools: DEFAULT_TOOLS };

const $ = (id) => document.getElementById(id);
let tools = { ...DEFAULT_TOOLS };

let toastTimer;
const saved = () => {
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 900);
};
const save = (patch) => chrome.storage.local.set(patch, saved);

// ---- theme and text size ----------------------------------------------------------
document.querySelectorAll('input[name="theme"]').forEach((radio) =>
  radio.addEventListener('change', () => save({ theme: radio.value })));

const showSize = (size) => {
  $('fontSizeValue').textContent = `${size} px`;
  $('sample').style.fontSize = `${size}px`;
};
$('fontSize').addEventListener('input', (e) => showSize(e.target.value));
$('fontSize').addEventListener('change', (e) => save({ fontSize: Number(e.target.value) }));

// ---- page tools -------------------------------------------------------------------
const sameAs = (a, b) => Object.keys(b).every((k) => Boolean(a[k]) === b[k]);
function showTools() {
  document.querySelectorAll('[data-tool]').forEach((box) => { box.checked = Boolean(tools[box.dataset.tool]); });
  let matched = '';
  for (const [name, set] of Object.entries(PRESETS)) if (sameAs(tools, set)) matched = name;
  document.querySelectorAll('[data-preset]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.preset === matched)));
  $('presetCustom').classList.toggle('show', !matched);
}
document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
  tools = { ...PRESETS[b.dataset.preset] };
  showTools();
  save({ tools });
}));
document.querySelectorAll('[data-tool]').forEach((box) => box.addEventListener('change', () => {
  tools = { ...tools, [box.dataset.tool]: box.checked };
  showTools();
  save({ tools });
}));

// ---- files on this computer -------------------------------------------------------
function showFileAccess() {
  chrome.extension.isAllowedFileSchemeAccess((allowed) => {
    $('fileStatus').className = `status ${allowed ? 'on' : 'off'}`;
    $('fileStatusText').textContent = allowed
      ? 'File access is on: .md files on this computer open as a preview.'
      : 'File access is off: .md files on this computer stay as plain text.';
    $('openDetails').hidden = allowed;
  });
}
$('openDetails').addEventListener('click', () =>
  chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) showFileAccess(); });
$('liveReload').addEventListener('change', (e) => save({ liveReload: e.target.checked }));

// ---- websites ---------------------------------------------------------------------
function showSites(sites) {
  const list = $('sites');
  list.textContent = '';
  const hosts = Object.keys(sites).filter((h) => sites[h]).sort();
  $('noSites').hidden = hosts.length > 0;
  for (const host of hosts) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = host;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      delete sites[host];
      save({ alwaysPreview: sites });
      showSites(sites);
    });
    li.append(name, remove);
    list.append(li);
  }
}

// ---- load -------------------------------------------------------------------------
$('version').textContent = `v${chrome.runtime.getManifest().version}`;
chrome.storage.local.get(DEFAULTS, (s) => {
  const radio = document.querySelector(`input[name="theme"][value="${s.theme}"]`);
  if (radio) radio.checked = true;
  $('fontSize').value = s.fontSize;
  showSize(s.fontSize);
  tools = { ...DEFAULT_TOOLS, ...s.tools };
  showTools();
  $('liveReload').checked = s.liveReload;
  showSites({ ...s.alwaysPreview });
  showFileAccess();
});
