// Settings page: theme, text size, live reload, and the sites that always preview.
const DEFAULTS = { theme: 'auto', fontSize: 16, liveReload: true, alwaysPreview: {} };
const $ = (id) => document.getElementById(id);

const flash = () => {
  $('saved').classList.add('show');
  setTimeout(() => $('saved').classList.remove('show'), 900);
};
const save = (patch) => chrome.storage.local.set(patch, flash);

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

chrome.storage.local.get(DEFAULTS, (s) => {
  $('theme').value = s.theme;
  $('fontSize').value = s.fontSize;
  $('liveReload').checked = s.liveReload;
  showSites({ ...s.alwaysPreview });
});

$('theme').addEventListener('change', (e) => save({ theme: e.target.value }));
$('fontSize').addEventListener('change', (e) => {
  const size = Math.min(24, Math.max(12, Number(e.target.value) || 16));
  e.target.value = size;
  save({ fontSize: size });
});
$('liveReload').addEventListener('change', (e) => save({ liveReload: e.target.checked }));
