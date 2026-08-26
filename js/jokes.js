// - JOKE MANAGER -
var jokeGridSortable = null;
var _currentSearchQuery = '';
var jokeViewMode = 'all'; // 'all' | 'packs'
var activePackName = null;
var modalPacks = [];
var jokeSelectMode = false;
var selectedJokeIds = {};
var _mergeSourceIds = [];
var _mergeDraftMeta = null;

var DEFAULT_JOKE_SORT_MODE = 'updated-desc';

function normalizeJokeSortMode(mode) {
  if (mode === 'newest') return 'created-desc';
  if (mode === 'oldest') return 'created-asc';
  if (mode === 'edited-newest' || mode === 'last-worked') return 'updated-desc';
  if (mode === 'edited-oldest') return 'updated-asc';
  var valid = ['custom', 'score', 'alpha', 'created-desc', 'created-asc', 'updated-desc', 'updated-asc', 'manual'];
  return valid.indexOf(mode) !== -1 ? mode : DEFAULT_JOKE_SORT_MODE;
}

function jokeDateMs(j, kind) {
  if (!j) return 0;
  var raw = kind === 'updated'
    ? (j.updated_at || j.created_at || 0)
    : (j.created_at || j.updated_at || 0);
  var ms = 0;
  if (raw) {
    if (typeof raw === 'number') ms = raw;
    else {
      var s = String(raw).trim();
      // Some drivers return "YYYY-MM-DD HH:MM:SS+00" — normalize for Date.parse
      if (/^\d{4}-\d{2}-\d{2} /.test(s)) s = s.replace(' ', 'T');
      ms = new Date(s).getTime();
    }
  }
  if (!isNaN(ms) && ms > 0) return ms;
  var id = String(j.id == null ? '' : j.id);
  var localMatch = id.match(/local-(\d+)/);
  if (localMatch) return Number(localMatch[1]) || 0;
  return 0;
}

function compareJokeTitles(a, b) {
  return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });
}

function formatJokeDate(raw) {
  if (!raw) return '';
  var ms = new Date(raw).getTime();
  if (isNaN(ms) || ms <= 0) return '';
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function jokeDateLine(j) {
  if (!j) return '';
  var created = formatJokeDate(j.created_at);
  var updated = formatJokeDate(j.updated_at);
  if (!created && !updated) return '';
  if (created && updated && created === updated) return 'Created ' + created;
  var parts = [];
  if (created) parts.push('Created ' + created);
  if (updated) parts.push('Edited ' + updated);
  return parts.join(' · ');
}

function applyJokeSort(list, mode) {
  var sorted = (list || []).slice();
  mode = normalizeJokeSortMode(mode);
  if (mode === 'score') sorted.sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
  else if (mode === 'alpha') sorted.sort(compareJokeTitles);
  else if (mode === 'created-desc') sorted.sort(function(a, b) { return jokeDateMs(b, 'created') - jokeDateMs(a, 'created'); });
  else if (mode === 'created-asc') sorted.sort(function(a, b) { return jokeDateMs(a, 'created') - jokeDateMs(b, 'created'); });
  else if (mode === 'updated-desc') sorted.sort(function(a, b) { return jokeDateMs(b, 'updated') - jokeDateMs(a, 'updated'); });
  else if (mode === 'updated-asc') sorted.sort(function(a, b) { return jokeDateMs(a, 'updated') - jokeDateMs(b, 'updated'); });
  return sorted;
}

function getJokeManagerSortMode() {
  try {
    var saved = localStorage.getItem('c4a_joke_mgr_sort');
    if (saved) return normalizeJokeSortMode(saved);
  } catch (e) {}
  var sortSelect = document.getElementById('sort-select');
  if (sortSelect && sortSelect.value) return normalizeJokeSortMode(sortSelect.value);
  return DEFAULT_JOKE_SORT_MODE;
}

function applyActiveJokeManagerSort(list) {
  var mode = getJokeManagerSortMode();
  return mode === 'custom' ? (list || []).slice() : applyJokeSort(list, mode);
}

function persistJokeManagerSortMode(mode) {
  mode = normalizeJokeSortMode(mode);
  try { localStorage.setItem('c4a_joke_mgr_sort', mode); } catch (e) {}
  var sortSelect = document.getElementById('sort-select');
  if (sortSelect && sortSelect.value !== mode) sortSelect.value = mode;
}

function tagColor(t) {
  if (t==='Travel') return 'gold';
  if (t==='Tech') return 'blue';
  if (t==='Dating') return 'purple';
  if (t==='Family') return 'green';
  if (t==='Work') return 'yellow';
  if (t==='Current Events') return 'teal';
  
  // Assign a consistent color based on string hash for custom tags
  var hash = 0;
  for (var i = 0; i < t.length; i++) {
    hash = t.charCodeAt(i) + ((hash << 5) - hash);
  }
  var colors = ['red', 'pink', 'teal', 'blue', 'purple', 'green', 'gold'];
  var index = Math.abs(hash) % colors.length;
  return colors[index];
}

function escapePackHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeJokePacks(j) {
  if (!j) return [];
  if (!Array.isArray(j.packs)) j.packs = [];
  j.packs = j.packs.map(function(p) { return String(p || '').trim(); }).filter(Boolean);
  return j.packs;
}

function normalizeAllJokePacks() {
  var all = jokes.concat(archivedJokes);
  var fromJokes = [];
  for (var i = 0; i < all.length; i++) {
    var packs = normalizeJokePacks(all[i]);
    for (var k = 0; k < packs.length; k++) {
      if (fromJokes.indexOf(packs[k]) === -1) fromJokes.push(packs[k]);
    }
  }
  savePackCatalog(loadPackCatalog().concat(fromJokes));
}

function loadPackCatalog() {
  try {
    var raw = JSON.parse(localStorage.getItem('c4a_pack_catalog') || '[]');
    return Array.isArray(raw) ? raw.map(function(p) { return String(p || '').trim(); }).filter(Boolean) : [];
  } catch (e) { return []; }
}

function savePackCatalog(names) {
  var uniq = [];
  for (var i = 0; i < names.length; i++) {
    var n = String(names[i] || '').trim();
    if (n && uniq.indexOf(n) === -1) uniq.push(n);
  }
  uniq.sort(function(a, b) { return a.localeCompare(b, undefined, { sensitivity: 'base' }); });
  try { localStorage.setItem('c4a_pack_catalog', JSON.stringify(uniq)); } catch (e) {}
  return uniq;
}

function rememberPackName(name) {
  name = String(name || '').trim();
  if (!name) return;
  var cat = loadPackCatalog();
  if (cat.indexOf(name) === -1) {
    cat.push(name);
    savePackCatalog(cat);
  }
}

function getAllPackNames() {
  var names = loadPackCatalog().slice();
  var all = jokes.concat(archivedJokes);
  for (var i = 0; i < all.length; i++) {
    var packs = normalizeJokePacks(all[i]);
    for (var k = 0; k < packs.length; k++) {
      if (names.indexOf(packs[k]) === -1) names.push(packs[k]);
    }
  }
  names.sort(function(a, b) { return a.localeCompare(b, undefined, { sensitivity: 'base' }); });
  return names;
}

function countJokesInPack(name) {
  var n = 0;
  for (var i = 0; i < jokes.length; i++) {
    if (normalizeJokePacks(jokes[i]).indexOf(name) !== -1) n++;
  }
  return n;
}

function jokesInPack(name) {
  return jokes.filter(function(j) { return normalizeJokePacks(j).indexOf(name) !== -1; });
}

function jokesWithoutPack() {
  return jokes.filter(function(j) { return normalizeJokePacks(j).length === 0; });
}

function setJokeViewMode(mode) {
  jokeViewMode = mode === 'packs' ? 'packs' : 'all';
  if (jokeViewMode === 'all') activePackName = null;
  if (jokeViewMode === 'packs' && !activePackName) clearJokeSelection();
  try { localStorage.setItem('c4a_joke_view_mode', jokeViewMode); } catch (e) {}
  updateJokeViewToggle();
  updatePackBreadcrumb();
  updateJokeSelectUi();
  if (jokeViewMode === 'packs' && !activePackName) {
    renderPackTiles();
  } else if (activePackName) {
    displayJokes = applyActiveJokeManagerSort(jokesInPack(activePackName));
    renderJokes(displayJokes);
  } else {
    displayJokes = applyActiveJokeManagerSort(jokes.slice());
    renderJokes(displayJokes);
  }
}

function updateJokeViewToggle() {
  var allBtn = document.getElementById('view-all-btn');
  var packsBtn = document.getElementById('view-packs-btn');
  var topPacks = document.getElementById('topbar-packs-btn');
  if (allBtn) allBtn.classList.toggle('active', jokeViewMode === 'all');
  if (packsBtn) packsBtn.classList.toggle('active', jokeViewMode === 'packs');
  if (topPacks) {
    topPacks.classList.toggle('btn-primary', jokeViewMode === 'packs');
    topPacks.textContent = jokeViewMode === 'packs' ? 'Packs ✓' : 'Packs';
  }
}

function updatePackBreadcrumb() {
  var bar = document.getElementById('pack-breadcrumb');
  var label = document.getElementById('pack-breadcrumb-label');
  if (!bar) return;
  if (jokeViewMode === 'packs' && activePackName) {
    bar.style.display = 'flex';
    if (label) label.textContent = activePackName + ' · ' + countJokesInPack(activePackName) + ' jokes';
  } else {
    bar.style.display = 'none';
  }
}

function openPack(name) {
  activePackName = name;
  jokeViewMode = 'packs';
  updateJokeViewToggle();
  updatePackBreadcrumb();
  displayJokes = applyActiveJokeManagerSort(jokesInPack(name));
  renderJokes(displayJokes);
}

function closePack() {
  activePackName = null;
  updatePackBreadcrumb();
  renderPackTiles();
}

function promptNewPack() {
  openPackNameModal('new', '');
}

function renameActivePack() {
  if (!activePackName) return;
  openPackNameModal('rename', activePackName);
}

function openPackNameModal(mode, currentName) {
  var overlay = document.getElementById('pack-name-modal');
  var title = document.getElementById('pack-name-title');
  var input = document.getElementById('pack-name-input');
  var saveBtn = document.getElementById('pack-name-save');
  if (!overlay || !input) {
    toast('Pack name form missing — refresh the page');
    return;
  }
  overlay.setAttribute('data-mode', mode === 'rename' ? 'rename' : 'new');
  if (title) title.textContent = mode === 'rename' ? 'Rename pack' : 'New pack';
  if (saveBtn) saveBtn.textContent = mode === 'rename' ? 'Save name' : 'Create pack';
  input.value = currentName || '';
  overlay.style.display = 'flex';
  setTimeout(function() {
    input.focus();
    input.select();
  }, 30);
}

function closePackNameModal() {
  var overlay = document.getElementById('pack-name-modal');
  if (overlay) overlay.style.display = 'none';
}

function savePackNameModal() {
  var overlay = document.getElementById('pack-name-modal');
  var input = document.getElementById('pack-name-input');
  if (!overlay || !input) return;
  var mode = overlay.getAttribute('data-mode') || 'new';
  var name = String(input.value || '').trim();
  if (!name) { toast('Pack needs a name'); return; }
  closePackNameModal();
  if (mode === 'rename') {
    applyPackRename(activePackName, name);
    return;
  }
  if (getAllPackNames().indexOf(name) !== -1) {
    toast('Pack already exists');
    openPack(name);
    return;
  }
  rememberPackName(name);
  toast('Pack "' + name + '" created — add jokes via Edit → Packs');
  openPack(name);
}

function applyPackRename(oldName, next) {
  if (!oldName || !next || next === oldName) return;
  var all = jokes.concat(archivedJokes);
  var touched = [];
  for (var i = 0; i < all.length; i++) {
    var packs = normalizeJokePacks(all[i]);
    var idx = packs.indexOf(oldName);
    if (idx === -1) continue;
    packs[idx] = next;
    all[i].packs = packs;
    all[i].updated_at = new Date().toISOString();
    touched.push(all[i]);
  }
  var cat = loadPackCatalog().filter(function(p) { return p !== oldName; });
  cat.push(next);
  savePackCatalog(cat);
  activePackName = next;
  updatePackBreadcrumb();
  displayJokes = applyActiveJokeManagerSort(jokesInPack(next));
  renderJokes(displayJokes);
  toast('Renamed to "' + next + '"');
  syncPackUpdates(touched);
}

function deleteActivePack() {
  if (!activePackName) return;
  openPackDeleteModal();
}

function openPackDeleteModal() {
  var overlay = document.getElementById('pack-delete-modal');
  var msg = document.getElementById('pack-delete-msg');
  if (!overlay) {
    toast('Refresh the page, then try Remove pack again');
    return;
  }
  if (msg) msg.textContent = 'Remove pack "' + activePackName + '" from all jokes? Jokes stay — only the pack label is removed.';
  overlay.style.display = 'flex';
}

function closePackDeleteModal() {
  var overlay = document.getElementById('pack-delete-modal');
  if (overlay) overlay.style.display = 'none';
}

function confirmDeleteActivePack() {
  if (!activePackName) { closePackDeleteModal(); return; }
  var oldName = activePackName;
  closePackDeleteModal();
  var all = jokes.concat(archivedJokes);
  var touched = [];
  for (var i = 0; i < all.length; i++) {
    var packs = normalizeJokePacks(all[i]);
    var idx = packs.indexOf(oldName);
    if (idx === -1) continue;
    packs.splice(idx, 1);
    all[i].packs = packs;
    all[i].updated_at = new Date().toISOString();
    touched.push(all[i]);
  }
  savePackCatalog(loadPackCatalog().filter(function(p) { return p !== oldName; }));
  activePackName = null;
  updatePackBreadcrumb();
  renderPackTiles();
  toast('Pack removed');
  syncPackUpdates(touched);
}

var _packAddSelected = {};
var _packAddCandidates = [];

function jokesNotInPack(name) {
  return jokes.filter(function(j) { return normalizeJokePacks(j).indexOf(name) === -1; });
}

function openAddJokesToPackModal() {
  if (!activePackName) {
    toast('Open a pack first');
    return;
  }
  var overlay = document.getElementById('pack-add-jokes-modal');
  var sub = document.getElementById('pack-add-jokes-subtitle');
  var search = document.getElementById('pack-add-jokes-search');
  if (!overlay) {
    toast('Refresh the page, then try Add jokes again');
    return;
  }
  _packAddSelected = {};
  _packAddCandidates = jokesNotInPack(activePackName);
  if (sub) sub.textContent = 'Pick jokes to add to "' + activePackName + '"';
  if (search) search.value = '';
  renderAddJokesToPackList('');
  updateAddJokesSelectedCount();
  overlay.style.display = 'flex';
  if (search) setTimeout(function() { search.focus(); }, 30);
}

function closeAddJokesToPackModal() {
  var overlay = document.getElementById('pack-add-jokes-modal');
  if (overlay) overlay.style.display = 'none';
  _packAddSelected = {};
}

function filterAddJokesToPackList(q) {
  renderAddJokesToPackList(q || '');
}

function renderAddJokesToPackList(q) {
  var list = document.getElementById('pack-add-jokes-list');
  if (!list) return;
  q = String(q || '').toLowerCase().trim();
  var rows = _packAddCandidates.filter(function(j) {
    if (!q) return true;
    return String(j.title || '').toLowerCase().indexOf(q) !== -1
      || String(j.body || '').toLowerCase().indexOf(q) !== -1;
  });
  if (!rows.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px">'
      + (_packAddCandidates.length ? 'No matches.' : 'Every joke is already in this pack.')
      + '</div>';
    return;
  }
  list.innerHTML = rows.map(function(j) {
    var id = String(j.id);
    var checked = !!_packAddSelected[id];
    return '<label class="pack-add-row" style="display:flex;gap:10px;align-items:flex-start;padding:8px 8px;border-radius:8px;cursor:pointer">'
      + '<input type="checkbox" ' + (checked ? 'checked ' : '') + 'onchange="toggleAddJokeToPack(\'' + id.replace(/'/g, "\\'") + '\', this.checked)" style="margin-top:3px">'
      + '<span style="flex:1;min-width:0">'
      + '<div style="font-size:13px;font-weight:600;color:var(--text)">' + escapePackHtml(j.title || 'Untitled') + '</div>'
      + '<div style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapePackHtml((j.body || '').slice(0, 80)) + '</div>'
      + '</span></label>';
  }).join('');
}

function toggleAddJokeToPack(id, on) {
  if (on) _packAddSelected[id] = true;
  else delete _packAddSelected[id];
  updateAddJokesSelectedCount();
}

function updateAddJokesSelectedCount() {
  var el = document.getElementById('pack-add-jokes-count');
  var n = Object.keys(_packAddSelected).length;
  if (el) el.textContent = n + ' selected';
}

function saveAddJokesToPack() {
  if (!activePackName) { closeAddJokesToPackModal(); return; }
  var ids = Object.keys(_packAddSelected);
  if (!ids.length) { toast('Pick at least one joke'); return; }
  var pack = activePackName;
  var touched = [];
  var now = new Date().toISOString();
  for (var i = 0; i < jokes.length; i++) {
    var j = jokes[i];
    if (!_packAddSelected[String(j.id)]) continue;
    var packs = normalizeJokePacks(j);
    if (packs.indexOf(pack) === -1) {
      packs.push(pack);
      j.packs = packs;
      j.updated_at = now;
      touched.push(j);
    }
  }
  rememberPackName(pack);
  closeAddJokesToPackModal();
  displayJokes = applyActiveJokeManagerSort(jokesInPack(pack));
  updatePackBreadcrumb();
  renderJokes(displayJokes);
  toast('Added ' + touched.length + ' joke' + (touched.length === 1 ? '' : 's') + ' to "' + pack + '"');
  syncPackUpdates(touched);
}

function selectedJokeCount() {
  return Object.keys(selectedJokeIds).length;
}

function updateJokeSelectUi() {
  var n = selectedJokeCount();
  var mergeBtn = document.getElementById('joke-merge-btn');
  var packMerge = document.getElementById('pack-merge-btn');
  var label = 'Merge';
  if (jokeSelectMode) {
    label = n >= 2 ? ('Merge ' + n) : ('Merge · ' + n);
  }
  if (mergeBtn) {
    mergeBtn.textContent = label;
    mergeBtn.classList.toggle('btn-primary', jokeSelectMode && n >= 2);
  }
  if (packMerge) {
    packMerge.textContent = label;
    packMerge.classList.toggle('btn-primary', jokeSelectMode && n >= 2);
  }
}

function onMergeToolbarClick() {
  if (!jokeSelectMode) {
    toggleJokeSelectMode();
    return;
  }
  if (selectedJokeCount() >= 2) {
    startMergeSelectedJokes();
    return;
  }
  clearJokeSelection();
  if (jokeViewMode === 'packs' && !activePackName) renderPackTiles();
  else renderJokes(displayJokes);
  toast('Pick at least 2 jokes, then tap Merge again');
}

function toggleJokeSelectMode() {
  jokeSelectMode = !jokeSelectMode;
  if (!jokeSelectMode) selectedJokeIds = {};
  updateJokeSelectUi();
  if (jokeViewMode === 'packs' && !activePackName) renderPackTiles();
  else renderJokes(displayJokes);
  if (jokeSelectMode) toast('Tap jokes to pick, then Merge again');
}

function clearJokeSelection() {
  jokeSelectMode = false;
  selectedJokeIds = {};
  updateJokeSelectUi();
}

function toggleJokeSelected(id) {
  id = String(id);
  if (selectedJokeIds[id]) delete selectedJokeIds[id];
  else selectedJokeIds[id] = true;
  updateJokeSelectUi();
  var card = document.querySelector('.jcard[data-jid="' + id.replace(/"/g, '\\"') + '"]');
  if (card) card.classList.toggle('jcard-selected', !!selectedJokeIds[id]);
}

function getSelectedJokes() {
  var out = [];
  var ids = Object.keys(selectedJokeIds);
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    for (var k = 0; k < jokes.length; k++) {
      if (String(jokes[k].id) === id) { out.push(jokes[k]); break; }
    }
  }
  return out;
}

function parseRuntimeToSeconds(rt) {
  var parts = String(rt || '0:00').split(':');
  var m = parseInt(parts[0], 10) || 0;
  var s = parseInt(parts[1], 10) || 0;
  return m * 60 + s;
}

function formatSecondsRuntime(total) {
  total = Math.max(0, Math.round(total) || 0);
  var m = Math.floor(total / 60);
  var s = total % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function unionJokeTags(list) {
  var tags = [];
  for (var i = 0; i < list.length; i++) {
    var t = list[i].tags || [];
    for (var k = 0; k < t.length; k++) {
      if (tags.indexOf(t[k]) === -1) tags.push(t[k]);
    }
  }
  return tags;
}

function unionJokePacks(list) {
  var packs = [];
  for (var i = 0; i < list.length; i++) {
    var p = normalizeJokePacks(list[i]);
    for (var k = 0; k < p.length; k++) {
      if (packs.indexOf(p[k]) === -1) packs.push(p[k]);
    }
  }
  if (activePackName && packs.indexOf(activePackName) === -1) packs.push(activePackName);
  return packs;
}

function bestJokeRating(list) {
  var best = 3;
  for (var i = 0; i < list.length; i++) {
    var r = list[i].rating || 0;
    if (r > best) best = r;
  }
  return best;
}

function parseMergeAiJson(text) {
  if (!text) return null;
  var raw = String(text).trim();
  var fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  var start = raw.indexOf('{');
  var end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

function buildLocalMergeDraft(selected) {
  var secs = 0;
  for (var i = 0; i < selected.length; i++) secs += parseRuntimeToSeconds(selected[i].runtime);
  return {
    title: selected.map(function(j) { return j.title; }).filter(Boolean).slice(0, 2).join(' / ') || 'Merged bit',
    body: selected.map(function(j) {
      return (j.title ? ('# ' + j.title + '\n') : '') + (j.body || '');
    }).join('\n\n---\n\n'),
    runtime: formatSecondsRuntime(secs || 60)
  };
}

function showMergeDraft(draft, statusText) {
  var titleEl = document.getElementById('merge-title');
  var bodyEl = document.getElementById('merge-body');
  var rtEl = document.getElementById('merge-runtime');
  var status = document.getElementById('merge-jokes-status');
  var loading = document.getElementById('merge-jokes-loading');
  var form = document.getElementById('merge-jokes-form');
  var saveBtn = document.getElementById('merge-jokes-save');
  if (loading) loading.style.display = 'none';
  if (form) form.style.display = 'block';
  if (saveBtn) saveBtn.style.display = '';
  if (status && statusText) status.textContent = statusText;
  if (titleEl) titleEl.value = draft.title || '';
  if (bodyEl) bodyEl.value = draft.body || '';
  if (rtEl) rtEl.value = draft.runtime || '2:00';
}

function startMergeSelectedJokes() {
  var selected = getSelectedJokes();
  if (selected.length < 2) {
    toast('Select at least 2 jokes to merge');
    return;
  }
  _mergeSourceIds = selected.map(function(j) { return String(j.id); });
  openMergeJokesModal(selected);

  // Instant local draft so the modal never sits on "Merging…" forever
  var localDraft = buildLocalMergeDraft(selected);
  showMergeDraft(localDraft, 'Quick merge ready — you can save now. Trying Brooks for a smarter stitch…');

  if (typeof callBrooksAPI !== 'function') {
    showMergeDraft(localDraft, 'Quick merge ready (Brooks not loaded). Edit if needed, then save.');
    return;
  }

  var blocks = selected.map(function(j, i) {
    return 'JOKE ' + (i + 1) + '\nTitle: ' + (j.title || '') + '\nRuntime: ' + (j.runtime || '') + '\nTags: ' + ((j.tags || []).join(', ') || 'none') + '\nBody:\n' + (j.body || '');
  }).join('\n\n---\n\n');
  var prompt = 'Merge these stand-up joke notes into ONE cohesive bit.\n'
    + 'Keep the funniest lines, cut duplicates, preserve voice. Do not invent a new premise.\n'
    + 'Return ONLY JSON with keys title, body, runtime (like "2:30").\n\n'
    + blocks;

  callBrooksAPI(prompt, function(reply) {
    var parsed = parseMergeAiJson(reply);
    if (!parsed || !(parsed.title || parsed.body)) {
      showMergeDraft(localDraft, 'Brooks was slow or unavailable — quick merge is ready. Edit if needed, then save.');
      return;
    }
    showMergeDraft({
      title: parsed.title || localDraft.title,
      body: parsed.body || localDraft.body,
      runtime: parsed.runtime || localDraft.runtime
    }, 'Brooks merge ready — edit if needed, then save. Sources will be archived.');
  }, {
    max_tokens: 1800,
    timeout_ms: 10000,
    system: 'You merge stand-up joke notes into one bit. Reply with JSON only.'
  });
}

function openMergeJokesModal(selected) {
  var overlay = document.getElementById('merge-jokes-modal');
  var status = document.getElementById('merge-jokes-status');
  var loading = document.getElementById('merge-jokes-loading');
  var form = document.getElementById('merge-jokes-form');
  var saveBtn = document.getElementById('merge-jokes-save');
  if (!overlay) { toast('Refresh the page, then try Merge again'); return; }
  _mergeDraftMeta = {
    tags: unionJokeTags(selected),
    packs: unionJokePacks(selected),
    rating: bestJokeRating(selected)
  };
  if (status) status.textContent = 'Merging ' + selected.length + ' jokes with Brooks…';
  if (loading) loading.style.display = 'block';
  if (form) form.style.display = 'none';
  if (saveBtn) saveBtn.style.display = 'none';
  overlay.style.display = 'flex';
}

function closeMergeJokesModal() {
  var overlay = document.getElementById('merge-jokes-modal');
  if (overlay) overlay.style.display = 'none';
  _mergeSourceIds = [];
  _mergeDraftMeta = null;
}

function archiveJokeQuiet(id) {
  id = String(id);
  var j = null, idx = -1;
  for (var i = 0; i < jokes.length; i++) {
    if (String(jokes[i].id) === id) { j = jokes[i]; idx = i; break; }
  }
  if (!j) return;
  j.archived = true;
  archivedJokes.unshift(j);
  jokes.splice(idx, 1);
  displayJokes = displayJokes.filter(function(x) { return String(x.id) !== id; });
  if (currentUser && _sb && id.indexOf('local-') !== 0) {
    _sb.from('jokes').update({ archived: true }).eq('id', id).then(function() {});
  }
}

function confirmMergeJokes() {
  var titleEl = document.getElementById('merge-title');
  var bodyEl = document.getElementById('merge-body');
  var rtEl = document.getElementById('merge-runtime');
  var title = titleEl ? titleEl.value.trim() : '';
  var body = bodyEl ? bodyEl.value.trim() : '';
  var runtime = rtEl ? (rtEl.value.trim() || '2:00') : '2:00';
  if (!title) { toast('Add a title for the merged joke'); return; }
  if (!_mergeSourceIds.length) { toast('No source jokes selected'); return; }
  var meta = _mergeDraftMeta || { tags: [], packs: [], rating: 3 };
  var rating = meta.rating || 3;
  var now = new Date().toISOString();
  var nj = {
    title: title,
    created_at: now,
    updated_at: now,
    body: body || '',
    tags: meta.tags || [],
    packs: meta.packs || [],
    tier: rating >= 4 ? 'a' : rating >= 3 ? 'b' : 'c',
    rating: rating,
    runtime: runtime,
    score: parseFloat((6 + rating * 0.5).toFixed(1)),
    archived: false
  };
  var sources = _mergeSourceIds.slice();
  closeMergeJokesModal();
  clearJokeSelection();

  function finishWithJoke(saved) {
    for (var i = 0; i < sources.length; i++) archiveJokeQuiet(sources[i]);
    for (var p = 0; p < (saved.packs || []).length; p++) rememberPackName(saved.packs[p]);
    jokes.unshift(saved);
    if (activePackName) displayJokes = applyActiveJokeManagerSort(jokesInPack(activePackName));
    else displayJokes = applyActiveJokeManagerSort(jokes.slice());
    updateCounts();
    updateJokeSelectUi();
    renderJokes(displayJokes);
    if (typeof openDetail === 'function') openDetail(saved.id);
    toast('Merged into "' + saved.title + '" — sources archived');
  }

  if (currentUser && _sb) {
    setSyncStatus('syncing');
    _sb.from('jokes').insert(Object.assign({}, nj, { user_id: currentUser.id })).select().single()
      .then(function(res) {
        if (res.error) {
          setSyncStatus('error');
          toast('Merge save failed: ' + res.error.message);
          return;
        }
        setSyncStatus('synced');
        finishWithJoke(res.data);
      });
  } else {
    nj.id = 'local-' + Date.now();
    finishWithJoke(nj);
  }
}

function syncPackUpdates(list) {
  if (!(currentUser && _sb) || !list || !list.length) return;
  setSyncStatus('syncing');
  var updates = list.map(function(j) {
    if (String(j.id).indexOf('local-') === 0) return Promise.resolve({});
    return _sb.from('jokes').update({ packs: normalizeJokePacks(j), updated_at: j.updated_at }).eq('id', j.id);
  });
  Promise.all(updates).then(function(results) {
    var err = null;
    for (var i = 0; i < results.length; i++) {
      if (results[i] && results[i].error) { err = results[i].error; break; }
    }
    if (err) {
      setSyncStatus('error');
      toast('Pack sync failed — run sql/joke_packs.sql in Supabase? ' + err.message);
    } else setSyncStatus('synced');
  });
}

function renderPackTiles() {
  var grid = document.getElementById('joke-grid');
  var cnt = document.getElementById('joke-count');
  if (!grid) return;
  if (jokeGridSortable) { jokeGridSortable.destroy(); jokeGridSortable = null; }
  var names = getAllPackNames();
  var unpacked = jokesWithoutPack().length;
  if (cnt) cnt.textContent = names.length + ' packs';
  var html = '';
  html += '<div class="pack-util-row">'
    + '<button type="button" class="pack-util-tile pack-util-new" onclick="promptNewPack()">+ New Pack</button>'
    + '<button type="button" class="pack-util-tile pack-util-loose" onclick="setJokeViewMode(\'all\')">Loose jokes · ' + unpacked + '</button>'
    + '</div>';
  if (names.length === 0) {
    html += '<div style="grid-column:1/-1;text-align:center;padding:28px 16px;color:var(--text3);font-size:13px">No packs yet. Use <b>+ New Pack</b> above.</div>';
  } else {
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var n = countJokesInPack(name);
      html += '<div class="jcard pack-card" data-pack="' + escapePackHtml(name) + '" style="cursor:pointer">'
        + '<div class="jtitle">' + escapePackHtml(name) + '</div>'
        + '<div class="pack-count">' + n + ' joke' + (n === 1 ? '' : 's') + '</div>'
        + '<div class="jprev">Tap to open</div>'
        + '</div>';
    }
  }
  grid.innerHTML = html;
  var cards = grid.querySelectorAll('[data-pack]');
  for (var c = 0; c < cards.length; c++) {
    (function(el) {
      el.addEventListener('click', function() { openPack(el.getAttribute('data-pack')); });
    })(cards[c]);
  }
}

function rebuildModalPackChips(containerId, selected) {
  var el = document.getElementById(containerId);
  if (!el) return;
  selected = selected || [];
  var names = getAllPackNames();
  for (var i = 0; i < selected.length; i++) {
    if (names.indexOf(selected[i]) === -1) names.push(selected[i]);
  }
  names.sort(function(a, b) { return a.localeCompare(b, undefined, { sensitivity: 'base' }); });
  el.innerHTML = '';
  for (var k = 0; k < names.length; k++) {
    var pname = names[k];
    var sp = document.createElement('span');
    var on = selected.indexOf(pname) !== -1;
    sp.className = 'tag tag-' + tagColor(pname) + (containerId.indexOf('edit') === 0 ? ' edit-pack' : '');
    sp.style.cursor = 'pointer';
    sp.style.opacity = on ? '1' : '.4';
    if (containerId.indexOf('edit') === 0 && !on) sp.classList.add('off');
    sp.textContent = pname;
    sp.onclick = (function(chip, pack) {
      return function() {
        if (containerId.indexOf('edit') === 0) toggleEditPack(chip, pack);
        else togglePack(chip, pack);
      };
    })(sp, pname);
    el.appendChild(sp);
  }
}

function togglePack(el, pack) {
  var idx = modalPacks.indexOf(pack);
  if (idx > -1) { modalPacks.splice(idx, 1); el.style.opacity = '.4'; }
  else { modalPacks.push(pack); el.style.opacity = '1'; rememberPackName(pack); }
}

function toggleEditPack(el, pack) {
  el.classList.toggle('off');
  el.style.opacity = el.classList.contains('off') ? '.4' : '1';
  var idx = modalPacks.indexOf(pack);
  if (idx > -1) modalPacks.splice(idx, 1);
  else { modalPacks.push(pack); rememberPackName(pack); }
}

function addCustomPack(isEdit) {
  var input = document.getElementById(isEdit ? 'edit-custom-pack-input' : 'custom-pack-input');
  if (!input) return;
  var pack = input.value.trim();
  if (!pack) return;
  rememberPackName(pack);
  if (modalPacks.indexOf(pack) === -1) modalPacks.push(pack);
  rebuildModalPackChips(isEdit ? 'edit-modal-packs' : 'modal-packs', modalPacks);
  input.value = '';
}

var _putInPackSelected = [];
var _putInPackMode = 'new';
var _putInPackJokeId = null;

function openPutInPackModal(mode, jokeId) {
  mode = mode || 'new';
  _putInPackMode = mode;
  _putInPackJokeId = jokeId ? String(jokeId) : null;
  var overlay = document.getElementById('put-in-pack-modal');
  var sub = document.getElementById('put-in-pack-subtitle');
  var input = document.getElementById('put-in-pack-new');
  if (!overlay) {
    toast('Refresh the page, then try again');
    return;
  }
  if (mode === 'new' || mode === 'edit') {
    _putInPackSelected = (modalPacks || []).slice();
  } else {
    var j = null;
    for (var i = 0; i < jokes.length; i++) {
      if (String(jokes[i].id) === _putInPackJokeId) { j = jokes[i]; break; }
    }
    if (!j) {
      for (var a = 0; a < archivedJokes.length; a++) {
        if (String(archivedJokes[a].id) === _putInPackJokeId) { j = archivedJokes[a]; break; }
      }
    }
    if (!j) { toast('Joke not found'); return; }
    _putInPackSelected = normalizeJokePacks(j).slice();
  }
  if (sub) {
    if (mode === 'new') sub.textContent = 'Choose packs for this new joke (saved when you hit Save Joke).';
    else if (mode === 'edit') sub.textContent = 'Choose packs, then Save Changes on the edit form.';
    else sub.textContent = 'Tap packs to include this joke.';
  }
  if (input) input.value = '';
  renderPutInPackList();
  overlay.style.display = 'flex';
  if (input) setTimeout(function() { input.focus(); }, 30);
}

function closePutInPackModal() {
  var overlay = document.getElementById('put-in-pack-modal');
  if (overlay) overlay.style.display = 'none';
}

function renderPutInPackList() {
  var list = document.getElementById('put-in-pack-list');
  if (!list) return;
  var names = getAllPackNames();
  for (var i = 0; i < _putInPackSelected.length; i++) {
    if (names.indexOf(_putInPackSelected[i]) === -1) names.push(_putInPackSelected[i]);
  }
  names.sort(function(a, b) { return a.localeCompare(b, undefined, { sensitivity: 'base' }); });
  if (!names.length) {
    list.innerHTML = '<div style="font-size:12px;color:var(--text3)">No packs yet — create one below.</div>';
    return;
  }
  list.innerHTML = names.map(function(name) {
    var on = _putInPackSelected.indexOf(name) !== -1;
    return '<button type="button" class="tag tag-' + tagColor(name) + '" style="cursor:pointer;opacity:' + (on ? '1' : '.4') + ';border:none" onclick="togglePutInPack(\'' + String(name).replace(/'/g, "\\'") + '\')">' + escapePackHtml(name) + (on ? ' ✓' : '') + '</button>';
  }).join('');
}

function togglePutInPack(name) {
  var idx = _putInPackSelected.indexOf(name);
  if (idx > -1) _putInPackSelected.splice(idx, 1);
  else {
    _putInPackSelected.push(name);
    rememberPackName(name);
  }
  renderPutInPackList();
}

function addPackFromPutInModal() {
  var input = document.getElementById('put-in-pack-new');
  if (!input) return;
  var name = input.value.trim();
  if (!name) return;
  rememberPackName(name);
  if (_putInPackSelected.indexOf(name) === -1) _putInPackSelected.push(name);
  input.value = '';
  renderPutInPackList();
}

function savePutInPackModal() {
  var chosen = _putInPackSelected.slice();
  if (_putInPackMode === 'new' || _putInPackMode === 'edit') {
    modalPacks = chosen.slice();
    rebuildModalPackChips(_putInPackMode === 'edit' ? 'edit-modal-packs' : 'modal-packs', modalPacks);
    closePutInPackModal();
    toast(chosen.length ? ('In ' + chosen.length + ' pack' + (chosen.length === 1 ? '' : 's')) : 'No packs selected');
    return;
  }
  var id = _putInPackJokeId;
  var j = null;
  for (var i = 0; i < jokes.length; i++) {
    if (String(jokes[i].id) === id) { j = jokes[i]; break; }
  }
  if (!j) { closePutInPackModal(); toast('Joke not found'); return; }
  j.packs = chosen.slice();
  j.updated_at = new Date().toISOString();
  for (var p = 0; p < chosen.length; p++) rememberPackName(chosen[p]);
  closePutInPackModal();
  if (typeof openDetail === 'function') openDetail(j.id);
  if (activePackName) displayJokes = applyActiveJokeManagerSort(jokesInPack(activePackName));
  else if (jokeViewMode === 'packs' && !activePackName) { /* stay on pack tiles */ }
  else displayJokes = applyActiveJokeManagerSort(jokes.slice());
  if (!(jokeViewMode === 'packs' && !activePackName)) renderJokes(displayJokes);
  else renderPackTiles();
  toast(chosen.length ? ('Added to ' + chosen.length + ' pack' + (chosen.length === 1 ? '' : 's')) : 'Removed from all packs');
  if (currentUser && _sb && String(j.id).indexOf('local-') !== 0) {
    syncPackUpdates([j]);
  }
}

function renderJokes(list) {
  var grid = document.getElementById('joke-grid');
  var cnt = document.getElementById('joke-count');
  if (!grid) return;
  if (jokeViewMode === 'packs' && !activePackName && !_currentSearchQuery) {
    renderPackTiles();
    return;
  }
  rebuildTagDropdown();
  updatePackBreadcrumb();
  updateJokeSelectUi();
  var isArchiveView = (list === archivedJokes || (list && list.length > 0 && list[0] && list[0].archived));
  var mode = getJokeManagerSortMode();
  var sortSelect = document.getElementById('sort-select');
  if (sortSelect && sortSelect.value !== mode) sortSelect.value = mode;
  // Re-sort on every paint so stale manual order / load paths can't leave oldest-first
  if (!isArchiveView && mode !== 'custom') {
    list = applyJokeSort(list || [], mode);
    displayJokes = list;
  } else {
    list = list || [];
  }
  if (cnt) {
    if (activePackName) cnt.textContent = list.length + ' in pack';
    else cnt.textContent = list.length + (isArchiveView ? ' archived' : ' jokes');
  }
  if (list.length === 0) {
    var msg = isArchiveView
      ? '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3);font-size:13px">No archived jokes yet.<br><span style="font-size:11px">Archive jokes from the detail panel to keep them off your main list.</span></div>'
      : activePackName
        ? '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3);font-size:13px">No jokes in this pack yet.<br><button class="btn btn-sm btn-primary" onclick="openAddJokesToPackModal()" style="margin-top:12px">+ Add jokes</button></div>'
      : '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3);font-size:13px">No jokes found. <button class="btn btn-sm btn-primary" onclick="openNewJoke()" style="margin-left:8px">+ Add a Joke</button></div>';
    grid.innerHTML = msg;
    return;
  }
  grid.innerHTML = list.map(function(j){
    var stars = '';
    for (var s=1;s<=5;s++) stars += (s<=j.rating?'\u2605':'\u2606');
    var archivedClass = j.archived ? ' archived' : '';
    var daysSince = j.updated_at ? Math.floor((Date.now()-new Date(j.updated_at).getTime())/86400000) : 0;
    var ageBadge = (daysSince > 60 && !j.archived) ? '<span style="font-size:9px;background:var(--red-bg);color:var(--red);border-radius:4px;padding:1px 5px;margin-left:4px">'+daysSince+'d</span>' : '';
    var dateLine = jokeDateLine(j);
    var packs = normalizeJokePacks(j);
    var packLine = packs.length
      ? '<div style="margin-bottom:6px">'+packs.map(function(p){return '<span class="tag tag-'+tagColor(p)+'">'+escapePackHtml(p)+'</span>';}).join('')+'</div>'
      : '';
    return '<div class="jcard t'+j.tier+archivedClass+(selectedJokeIds[String(j.id)]?' jcard-selected':'')+(jokeSelectMode?' jcard-selectable':'')+'" data-jid="'+j.id+'" style="cursor:pointer">'
      +(jokeSelectMode ? '<div class="jcard-check">'+(selectedJokeIds[String(j.id)]?'✓':'')+'</div>' : '')
      +'<div class="jtitle">'+j.title+ageBadge+'</div>'
      +'<div class="jprev">'+(j.body||'')+'</div>'
      +packLine
      +'<div style="margin-bottom:8px">'+j.tags.map(function(t){return '<span class="tag tag-'+tagColor(t)+'">'+t+'</span>';}).join('')+'</div>'
      +(dateLine ? '<div class="jdate">'+dateLine+'</div>' : '')
      +'<div class="jmeta"><span class="stars">'+stars+'</span><span style="font-family:\'DM Mono\',monospace;color:var(--text3);font-size:10px">'+j.runtime+'</span></div>'
      +'</div>';
  }).join('');
  var cards = grid.querySelectorAll('[data-jid]');
  for (var ci=0; ci<cards.length; ci++) {
    (function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        var jid = el.getAttribute('data-jid');
        if (jokeSelectMode) toggleJokeSelected(jid);
        else openDetail(jid);
      });
    })(cards[ci]);
  }

  // Initialize SortableJS
  if (!isArchiveView && typeof Sortable !== 'undefined') {
    if (jokeGridSortable) jokeGridSortable.destroy();
    
    var isCustomOrder = mode === 'custom';
    
    jokeGridSortable = new Sortable(grid, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      disabled: !isCustomOrder,
      delay: 400,
      delayOnTouchOnly: true,
      swap: true,
      swapClass: 'sortable-swap-highlight',
      onEnd: function(evt) {
        if (evt.oldIndex === evt.newIndex) return;
        var movedItem = displayJokes.splice(evt.oldIndex, 1)[0];
        displayJokes.splice(evt.newIndex, 0, movedItem);
        jokes = displayJokes.slice();
        try {
          localStorage.setItem('c4a_joke_order', JSON.stringify(jokes.map(function(j){ return String(j.id); })));
        } catch(e) {}
        toast('Order saved \u2713');
        if (currentUser && _sb) {
          var updates = jokes.map(function(j, i) {
            return _sb.from('jokes').update({ sort_order: i }).eq('id', j.id);
          });
          Promise.all(updates).catch(function() {});
        }
      }
    });
  } else if (jokeGridSortable) {
    // Disable sorting in archive view
    jokeGridSortable.destroy();
    jokeGridSortable = null;
  }
}

function highlightText(text, query) {
  if (!query || !query.trim()) return text;
  var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var regex = new RegExp('(' + escaped + ')', 'gi');
  return text.replace(regex, '<mark style="background:#ffe066;color:#26150f;border-radius:2px;padding:0 2px">$1</mark>');
}

function openDetail(id) {
  var j = null;
  for (var i=0;i<jokes.length;i++) { if(String(jokes[i].id)==String(id)){j=jokes[i];break;} }
  if (!j) { for (var i=0;i<archivedJokes.length;i++) { if(String(archivedJokes[i].id)==String(id)){j=archivedJokes[i];break;} } }
  if (!j) return;
  var isArchived = j.archived === true;
  var panel = document.getElementById('joke-detail');
  var stars = '';
  for (var s=1;s<=5;s++) stars += (s<=j.rating?'\u2605':'\u2606');
  var tierLabel = j.tier==='a'?'<span class="tag tag-tier-a">A-Tier</span>':j.tier==='b'?'<span class="tag tag-tier-b">B-Tier</span>':'<span class="tag tag-tier-c">C-Tier</span>';
  var mobileBar = '<div class="detail-close-bar" style="display:none;align-items:center;justify-content:center;padding:10px 14px 8px;border-bottom:1px solid var(--border);flex-shrink:0;position:relative">'
    +'<div style="width:40px;height:4px;background:var(--border2);border-radius:2px"></div>'
    +'<button onclick="closeDetail()" style="position:absolute;right:12px;top:8px;background:var(--bg3);border:1px solid var(--border2);border-radius:20px;font-size:12px;font-weight:600;color:var(--text2);padding:5px 14px;cursor:pointer;">x Close</button>'
    +'</div>';
  panel.innerHTML = mobileBar
    +'<div style="padding:14px;border-bottom:1px solid var(--border);flex-shrink:0">'
    +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">'
    +'<div style="font-size:13px;font-weight:600;color:var(--text);line-height:1.4">'+highlightText(j.title, _currentSearchQuery)+(isArchived?'<span class="archive-badge">[archived] Archived</span>':'')+'</div>'
    +'<button class="btn btn-sm" onclick="closeDetail()" style="flex-shrink:0;padding:3px 8px;font-size:11px">x</button>'
    +'</div>'
    +'<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">'+j.tags.map(function(t){return '<span class="tag tag-'+tagColor(t)+'">'+t+'</span>';}).join('')+' '+tierLabel+'</div>'
    +(normalizeJokePacks(j).length ? '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">'+normalizeJokePacks(j).map(function(p){return '<span class="tag tag-'+tagColor(p)+'" style="cursor:pointer" onclick="openPack(\''+String(p).replace(/'/g, "\\'")+'\')">'+escapePackHtml(p)+'</span>';}).join('')+'</div>' : '')
    +'<div style="display:flex;gap:14px;font-size:11px;color:var(--text3);flex-wrap:wrap"><span>'+j.runtime+'</span><span style="color:var(--gold)">'+stars+'</span></div>'
    +(jokeDateLine(j) ? '<div style="font-size:11px;color:var(--text3);margin-top:6px">'+jokeDateLine(j)+'</div>' : '')
    +'</div>'
    +'<div style="flex:1;overflow-y:auto;padding:14px" class="scroll">'
    +'<div class="sect-title">Material</div>'
    +'<div style="font-size:12.5px;line-height:1.85;color:var(--text2);margin-bottom:16px;white-space:pre-wrap">'+highlightText(j.body, _currentSearchQuery)+'</div>'
    +'<div class="sect-title">Brooks Notes</div>'
    +'<div style="font-size:11.5px;color:var(--text2);background:var(--gold-bg);border:1px solid var(--gold-br);border-radius:var(--r2);padding:10px 12px;line-height:1.65;margin-bottom:6px">Strong '+j.tier.toUpperCase()+'-tier material. '+(j.score>=8?'Consistent crowd pleaser -- protect it in your set.':'Room to tighten the setup. Try cutting 10-15 seconds from the lead-in.')+'</div>'
    +'</div>'
    +'<div class="detail-actions">'
    +'<button class="btn btn-primary btn-sm" onclick="addJokeToSet(\''+j.id+'\')">+ Add to Set</button>'
    +(!isArchived ? '<button class="btn btn-sm" onclick="openPutInPackModal(\'detail\',\''+j.id+'\')">+ Add to Pack</button>' : '')
    +(isArchived
      ? '<button class="btn btn-sm btn-archive" onclick="unarchiveJoke(\''+j.id+'\')"> Restore</button>'
      : '<button class="btn btn-sm" onclick="openEditModal(\''+j.id+'\')"> Edit</button>'
        +'<button class="btn btn-sm btn-archive" onclick="archiveJoke(\''+j.id+'\')">[archived] Archive</button>')
    +'<button class="btn btn-sm btn-danger" onclick="confirmDelete(\''+j.id+'\')"> Delete</button>'
    +'</div>'
    +'<div id="confirm-delete-box" style="display:none" class="confirm-box">'
    +'<div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:6px">Delete this joke?</div>'
    +'<div style="font-size:11.5px;color:var(--text2);margin-bottom:10px">This cannot be undone. Consider archiving instead.</div>'
    +'<div style="display:flex;gap:7px"><button class="btn btn-danger btn-sm" onclick="deleteJoke(\''+j.id+'\')">Yes, delete permanently</button><button class="btn btn-sm" onclick="document.getElementById(\'confirm-delete-box\').style.display=\'none\'">Cancel</button></div>'
    +'</div>';
  panel.classList.add('panel-open');
}

function closeDetail() {
  var panel = document.getElementById('joke-detail');
  panel.classList.remove('panel-open');
  setTimeout(function(){
    if (!panel.classList.contains('panel-open')) {
      panel.innerHTML = '<div class="detail-close-bar" style="display:none"></div><div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:12px;flex-direction:column;gap:10px;padding:20px;text-align:center"><div style="font-size:30px"></div><div>Click a joke to view details &amp; Brooks notes</div></div>';
    }
  }, 270);
}

function confirmDelete(id) {
  var box = document.getElementById('confirm-delete-box');
  if (box) box.style.display = box.style.display==='none' ? 'block' : 'none';
}

function deleteJoke(id) {
  jokes = jokes.filter(function(j){return j.id!=id;});
  archivedJokes = archivedJokes.filter(function(j){return j.id!=id;});
  displayJokes = displayJokes.filter(function(j){return j.id!=id;});
  closeDetail();
  updateCounts();
  renderJokes(displayJokes);
  toast('Joke deleted.');
}

function archiveJoke(id) {
  var j = null, idx = -1;
  for (var i=0;i<jokes.length;i++) { if(String(jokes[i].id)==String(id)){j=jokes[i];idx=i;break;} }
  if (!j) return;
  j.archived = true;
  archivedJokes.unshift(j);
  jokes.splice(idx, 1);
  displayJokes = displayJokes.filter(function(x){return String(x.id)!==String(id);});
  closeDetail();
  updateCounts();
  renderJokes(displayJokes);
  toast('Joke archived. View it with the "Archived" filter.');
}

function unarchiveJoke(id) {
  var j = null, idx = -1;
  for (var i=0;i<archivedJokes.length;i++) { if(String(archivedJokes[i].id)==String(id)){j=archivedJokes[i];idx=i;break;} }
  if (!j) return;
  j.archived = false;
  jokes.unshift(j);
  archivedJokes.splice(idx, 1);
  displayJokes = applyActiveJokeManagerSort(jokes);
  closeDetail();
  updateCounts();
  renderJokes(displayJokes);
  toast('Joke restored to your library! \u2713');
}

function filterJokes(q) {
  _currentSearchQuery = q || '';
  var pool = activePackName ? jokesInPack(activePackName) : jokes;
  var next = q ? pool.filter(function(j){
    return j.title.toLowerCase().indexOf(q.toLowerCase())>-1 || j.body.toLowerCase().indexOf(q.toLowerCase())>-1;
  }) : pool.slice();
  displayJokes = applyActiveJokeManagerSort(next);
  renderJokes(displayJokes);
}

function rebuildTagDropdown() {
  var sel = document.getElementById('tag-filter-select');
  if (!sel) return;
  var current = sel.value;
  var allTags = [];
  var allJokes = jokes.concat(archivedJokes);
  for (var i = 0; i < allJokes.length; i++) {
    var tags = allJokes[i].tags || [];
    for (var k = 0; k < tags.length; k++) {
      if (allTags.indexOf(tags[k]) === -1) allTags.push(tags[k]);
    }
  }
  allTags.sort();
  sel.innerHTML = '<option value="">All Tags</option>';
  for (var j = 0; j < allTags.length; j++) {
    var opt = document.createElement('option');
    opt.value = allTags[j];
    opt.textContent = allTags[j];
    if (allTags[j] === current) opt.selected = true;
    sel.appendChild(opt);
  }
}
function filterByTag(t) {
  var pool = activePackName ? jokesInPack(activePackName) : jokes;
  displayJokes = applyActiveJokeManagerSort(t ? pool.filter(function(j){return j.tags.indexOf(t)>-1;}) : pool.slice());
  renderJokes(displayJokes);
}
function filterByTier(t) {
  if (t === 'archived') {
    activePackName = null;
    jokeViewMode = 'all';
    updateJokeViewToggle();
    updatePackBreadcrumb();
  }
  var next;
  if (t==='archived') {
    next = archivedJokes.slice();
  } else {
    var pool = activePackName ? jokesInPack(activePackName) : jokes;
    next = t ? pool.filter(function(j){return j.tier===t;}) : pool.slice();
  }
  displayJokes = applyActiveJokeManagerSort(next);
  renderJokes(displayJokes);
}
function sortJokes(by) {
  by = normalizeJokeSortMode(by);
  persistJokeManagerSortMode(by);
  var s = by === 'custom' ? displayJokes.slice() : applyJokeSort(displayJokes, by);
  if (by !== 'custom') {
     if (jokeGridSortable) jokeGridSortable.option('disabled', true);
  }
  displayJokes = s;
  renderJokes(s);
}

// - NEW JOKE MODAL -
function openNewJoke() {
  modalRating = 0; modalTags = []; modalPacks = [];
  document.getElementById('joke-modal').style.display = 'flex';
  var t = document.getElementById('nj-title');
  var b = document.getElementById('nj-body');
  var r = document.getElementById('nj-runtime');
  if (t) t.value = '';
  if (b) b.value = '';
  if (r) r.value = '';
  var stars = document.getElementById('nj-stars');
  if (stars) {
    stars.innerHTML = '';
    for (var v=1;v<=5;v++) {
      var btn = document.createElement('button');
      btn.className = 'sstar';
      btn.textContent = '\u2605';
      btn.setAttribute('data-v', v);
      btn.onclick = (function(val){return function(){setStars(val);};})(v);
      stars.appendChild(btn);
    }
  }
  var tagEls = document.querySelectorAll('#modal-tags .tag');
  for (var i=0;i<tagEls.length;i++) tagEls[i].style.opacity = '.4';
  if (activePackName) {
    modalPacks = [activePackName];
    rememberPackName(activePackName);
  }
  rebuildModalPackChips('modal-packs', modalPacks);
}
function closeNewJoke() {
  document.getElementById('joke-modal').style.display = 'none';
}
function setStars(v) {
  modalRating = v;
  var btns = document.querySelectorAll('#nj-stars .sstar');
  for (var i=0;i<btns.length;i++) {
    if (parseInt(btns[i].getAttribute('data-v')) <= v) btns[i].classList.add('on');
    else btns[i].classList.remove('on');
  }
}
function toggleTag(el, tag) {
  var idx = modalTags.indexOf(tag);
  if (idx > -1) { modalTags.splice(idx,1); el.style.opacity = '.4'; }
  else { modalTags.push(tag); el.style.opacity = '1'; }
}
function addCustomTag() {
  var input = document.getElementById('custom-tag-input');
  if (!input) return;
  var tag = input.value.trim();
  if (!tag) return;
  if (modalTags.indexOf(tag) === -1) {
    modalTags.push(tag);
    var container = document.getElementById('modal-tags');
    if (container) {
      var sp = document.createElement('span');
      sp.className = 'tag tag-' + tagColor(tag);
      sp.style.cursor = 'pointer';
      sp.style.opacity = '1';
      sp.textContent = tag;
      sp.onclick = (function(t){ return function() { toggleTag(this, t); }; })(tag);
      var customTagsContainer = document.getElementById('custom-tags-container');
      if (customTagsContainer) {
        container.insertBefore(sp, customTagsContainer);
      } else {
        container.appendChild(sp);
      }
    }
  }
  input.value = '';
}

function saveNewJoke() {
  var titleEl = document.getElementById('nj-title');
  var bodyEl = document.getElementById('nj-body');
  var runtimeEl = document.getElementById('nj-runtime');
  var title = titleEl ? titleEl.value.trim() : '';
  if (!title) { toast('Please add a title!'); return; }
  var now = new Date().toISOString();
  var nj = {
    title: title,
    created_at: now,
    updated_at: now,
    body: bodyEl ? bodyEl.value.trim() || '' : '',
    tags: modalTags.length ? modalTags.slice() : [],
    packs: modalPacks.length ? modalPacks.slice() : [],
    tier: modalRating >= 4 ? 'a' : modalRating >= 3 ? 'b' : 'c',
    rating: modalRating || 3,
    runtime: runtimeEl ? runtimeEl.value.trim() || '1:00' : '1:00',
    score: parseFloat((6 + (modalRating || 3) * 0.5).toFixed(1)),
    archived: false
  };
  closeNewJoke();
  for (var pi = 0; pi < (nj.packs || []).length; pi++) rememberPackName(nj.packs[pi]);
  if (currentUser && _sb) {
    setSyncStatus('syncing');
    _sb.from('jokes').insert(Object.assign({}, nj, { user_id: currentUser.id })).select().single()
      .then(function(res) {
        if (res.error) { toast('Save failed: ' + res.error.message); return; }
        jokes.unshift(res.data); displayJokes = applyActiveJokeManagerSort(jokes); updateCounts();
        var scr = document.getElementById('screen-jokes');
        if (scr && scr.classList.contains('active')) renderJokes(displayJokes);
        setSyncStatus('synced');
        toast('Joke saved: "' + title + '" \u2713');
      });
  } else {
    nj.id = 'local-' + Date.now();
    jokes.unshift(nj); displayJokes = applyActiveJokeManagerSort(jokes); updateCounts();
    var scr = document.getElementById('screen-jokes');
    if (scr && scr.classList.contains('active')) renderJokes(displayJokes);
    toast('Saved locally (sign in to sync)');
  }
}

// Helper to initialize custom sorting
function initCustomSort() {
  document.getElementById('sort-select').value = 'custom';
  sortJokes('custom');
}

// - EDIT JOKE MODAL -
function openEditModal(id) {
  var j = null;
  for (var i=0;i<jokes.length;i++) { if(String(jokes[i].id)==String(id)){j=jokes[i];break;} }
  if (!j) return;
  editingId = j.id;
  var modal = document.getElementById('edit-modal');
  modal.style.display = 'flex';
  var et = document.getElementById('ej-title');
  var eb = document.getElementById('ej-body');
  var er = document.getElementById('ej-runtime');
  var etr = document.getElementById('ej-tier');
  if (et) et.value = j.title;
  if (eb) eb.value = j.body;
  if (er) er.value = j.runtime;
  if (etr) etr.value = j.tier;
  modalRating = j.rating;
  modalPacks = normalizeJokePacks(j).slice();
  var stars = document.getElementById('ej-stars');
  if (stars) {
    stars.innerHTML = '';
    for (var v=1;v<=5;v++) {
      var btn = document.createElement('button');
      btn.className = 'sstar' + (v<=j.rating?' on':'');
      btn.textContent = '\u2605';
      btn.setAttribute('data-v', v);
      btn.onclick = (function(val){return function(){setEditStars(val);};})(v);
      stars.appendChild(btn);
    }
  }
  modalTags = j.tags.slice();
  // rebuild edit modal tags to include any custom tags from all jokes
  var editTagsEl = document.getElementById('edit-modal-tags');
  if (editTagsEl) {
    var hardcoded = ['Travel', 'Tech', 'Dating', 'Family', 'Work', 'Current Events'];
    // collect all tags across jokes
    var allKnown = hardcoded.slice();
    var allJokes = jokes.concat(archivedJokes);
    for (var ai = 0; ai < allJokes.length; ai++) {
      var jt = allJokes[ai].tags || [];
      for (var ak = 0; ak < jt.length; ak++) {
        if (allKnown.indexOf(jt[ak]) === -1) allKnown.push(jt[ak]);
      }
    }
    // also include tags from the joke being edited
    for (var ti = 0; ti < j.tags.length; ti++) {
      if (allKnown.indexOf(j.tags[ti]) === -1) allKnown.push(j.tags[ti]);
    }
    editTagsEl.innerHTML = '';
    for (var eti = 0; eti < allKnown.length; eti++) {
      var tname = allKnown[eti];
      var sp = document.createElement('span');
      sp.className = 'tag tag-' + tagColor(tname) + ' edit-tag' + (j.tags.indexOf(tname) === -1 ? ' off' : '');
      sp.textContent = tname;
      sp.onclick = (function(el, tag) { return function() { toggleEditTag(el, tag); }; })(sp, tname);
      editTagsEl.appendChild(sp);
    }
  }
  rebuildModalPackChips('edit-modal-packs', modalPacks);
}
function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editingId = null;
}
function setEditStars(v) {
  modalRating = v;
  var btns = document.querySelectorAll('#ej-stars .sstar');
  for (var i=0;i<btns.length;i++) {
    if (parseInt(btns[i].getAttribute('data-v')) <= v) btns[i].classList.add('on');
    else btns[i].classList.remove('on');
  }
}
function toggleEditTag(el, tag) {
  el.classList.toggle('off');
  var idx = modalTags.indexOf(tag);
  if (idx > -1) modalTags.splice(idx, 1);
  else modalTags.push(tag);
}
function addEditCustomTag() {
  var input = document.getElementById('edit-custom-tag-input');
  if (!input) return;
  var tag = input.value.trim();
  if (!tag) return;
  if (modalTags.indexOf(tag) === -1) {
    modalTags.push(tag);
    var container = document.getElementById('edit-modal-tags');
    if (container) {
      var sp = document.createElement('span');
      sp.className = 'tag tag-' + tagColor(tag) + ' edit-tag';
      sp.textContent = tag;
      sp.onclick = (function(t){ return function() { toggleEditTag(this, t); }; })(tag);
      container.appendChild(sp);
    }
  }
  input.value = '';
}

function saveEditedJoke() {
  if (!editingId) return;
  var titleEl = document.getElementById('ej-title');
  var bodyEl = document.getElementById('ej-body');
  var runtimeEl = document.getElementById('ej-runtime');
  var tierEl = document.getElementById('ej-tier');
  var title = titleEl ? titleEl.value.trim() : '';
  if (!title) { toast('Please add a title!'); return; }
  for (var i=0;i<jokes.length;i++) {
    if (jokes[i].id == editingId) {
      jokes[i].title = title;
      jokes[i].body = bodyEl ? bodyEl.value.trim() || 'No notes yet.' : jokes[i].body;
      jokes[i].runtime = runtimeEl ? runtimeEl.value.trim() || jokes[i].runtime : jokes[i].runtime;
      jokes[i].tier = tierEl ? tierEl.value : jokes[i].tier;
      jokes[i].rating = modalRating || jokes[i].rating;
      jokes[i].tags = modalTags.slice();
      jokes[i].packs = modalPacks.slice();
      jokes[i].score = parseFloat((6 + jokes[i].rating * 0.5).toFixed(1));
      jokes[i].updated_at = new Date().toISOString();
      for (var rpi = 0; rpi < modalPacks.length; rpi++) rememberPackName(modalPacks[rpi]);
      break;
    }
  }
  var eid = editingId;
  displayJokes = applyActiveJokeManagerSort(jokes);
  closeEditModal();
  renderJokes(displayJokes);
  refreshSetViews();
  openDetail(eid);
  updateCounts();
  toast('Joke updated! \u2713');
}

var setLibSortable = null;
var setCanvasSortable = null;
var setScriptSortable = null;
var _setDragEndAt = 0;
var _setViewMode = 'bubbles';
var _scriptBodySaveTimers = {};
var SCRIPT_COLOR_COUNT = 8;

function escapeSetHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCurrentSetIds() {
  var canvas = document.getElementById('set-canvas');
  var ids = [];
  if (!canvas) return ids;
  canvas.querySelectorAll('.sslot[data-jid]').forEach(function(s) {
    ids.push(String(s.getAttribute('data-jid')));
  });
  return ids;
}

function findCanvasSlotById(jid) {
  var canvas = document.getElementById('set-canvas');
  if (!canvas) return null;
  var slots = canvas.querySelectorAll('.sslot[data-jid]');
  for (var i = 0; i < slots.length; i++) {
    if (String(slots[i].getAttribute('data-jid')) === String(jid)) return slots[i];
  }
  return null;
}

function syncCanvasOrderFromIds(ids) {
  var canvas = document.getElementById('set-canvas');
  if (!canvas || !ids || !ids.length) return;
  var frag = document.createDocumentFragment();
  var hint = canvas.querySelector('.set-empty-hint');
  ids.forEach(function(jid) {
    var slot = findCanvasSlotById(jid);
    if (slot) frag.appendChild(slot);
  });
  // Keep any leftover slots not in ids (shouldn't happen)
  canvas.querySelectorAll('.sslot[data-jid]').forEach(function(slot) {
    frag.appendChild(slot);
  });
  canvas.innerHTML = '';
  if (hint) canvas.appendChild(hint);
  canvas.appendChild(frag);
}

function setViewMode(mode) {
  if (mode !== 'script' && mode !== 'bubbles') mode = 'bubbles';
  _setViewMode = mode;
  try { localStorage.setItem('c4a_set_view', mode); } catch (e) {}
  var screen = document.getElementById('screen-sets');
  if (screen) {
    screen.classList.toggle('set-mode-script', mode === 'script');
    screen.classList.toggle('set-mode-bubbles', mode === 'bubbles');
  }
  var bubBtn = document.getElementById('set-view-bubbles');
  var scrBtn = document.getElementById('set-view-script');
  if (bubBtn) bubBtn.classList.toggle('active', mode === 'bubbles');
  if (scrBtn) scrBtn.classList.toggle('active', mode === 'script');
  var scriptEl = document.getElementById('set-script');
  if (scriptEl) {
    if (mode === 'script') {
      scriptEl.hidden = false;
      renderSetScript();
    } else {
      scriptEl.hidden = true;
    }
  }
}

function applySavedSetViewMode() {
  var mode = 'bubbles';
  try { mode = localStorage.getItem('c4a_set_view') || 'bubbles'; } catch (e) {}
  setViewMode(mode === 'script' ? 'script' : 'bubbles');
}

function buildSetScriptBlockHtml(j, index) {
  var runtime = j.runtime || '0:00';
  return '<div class="set-script-head">'
    + '<span class="set-script-num">' + (index + 1) + '</span>'
    + '<span class="set-script-title" contenteditable="true" spellcheck="true" role="textbox" data-placeholder="Joke title" data-jid="' + escapeSetHtml(String(j.id)) + '"></span>'
    + '<span class="set-script-runtime" title="Joke length">' + escapeSetHtml(runtime) + '</span>'
    + '<div class="set-script-actions">'
    + '<button type="button" class="sslot-move" onclick="event.stopPropagation();moveSetSlot(this,-1)" title="Move up">&#9650;</button>'
    + '<button type="button" class="sslot-move" onclick="event.stopPropagation();moveSetSlot(this,1)" title="Move down">&#9660;</button>'
    + '<button type="button" class="sslot-x" onclick="event.stopPropagation();removeSetSlot(this)" title="Remove">&times;</button>'
    + '</div></div>'
    + '<div class="set-script-body" contenteditable="true" spellcheck="true" role="textbox" data-placeholder="Write this joke…" data-jid="' + escapeSetHtml(String(j.id)) + '"></div>';
}

function bindScriptEditable(el, kind) {
  if (!el) return;
  el.addEventListener('mousedown', function(e) { e.stopPropagation(); });
  el.addEventListener('click', function(e) {
    e.stopPropagation();
    el.focus();
  });
  el.addEventListener('focus', function() {
    var block = el.closest('.set-script-block');
    if (block) block.classList.add('is-editing');
  });
  el.addEventListener('blur', function() {
    var block = el.closest('.set-script-block');
    if (block) block.classList.remove('is-editing');
    if (kind === 'title') flushScriptTitleSave(el.getAttribute('data-jid'), el.innerText);
    else flushScriptBodySave(el.getAttribute('data-jid'), el.innerText);
  });
  el.addEventListener('input', function() {
    if (kind === 'title') queueScriptTitleSave(el.getAttribute('data-jid'), el.innerText);
    else queueScriptBodySave(el.getAttribute('data-jid'), el.innerText);
  });
  el.addEventListener('keydown', function(e) {
    e.stopPropagation();
    if (kind === 'title' && e.key === 'Enter') {
      e.preventDefault();
      el.blur();
    }
  });
}

function renderSetScript() {
  var scriptEl = document.getElementById('set-script');
  if (!scriptEl) return;
  var ids = getCurrentSetIds();
  if (!ids.length) {
    scriptEl.innerHTML = '<div class="set-script-empty">Add jokes to your set, then read them here as one monologue</div>';
    if (setScriptSortable) { setScriptSortable.destroy(); setScriptSortable = null; }
    return;
  }
  var html = '';
  var payload = [];
  ids.forEach(function(jid, index) {
    var j = jokes.find(function(x) { return String(x.id) === String(jid); });
    if (!j) return;
    html += '<div class="set-script-block set-script-c' + (index % SCRIPT_COLOR_COUNT) + '" data-jid="' + escapeSetHtml(String(j.id)) + '">'
      + buildSetScriptBlockHtml(j, index)
      + '</div>';
    var body = j.body && j.body !== 'No notes yet.' ? j.body : '';
    payload.push({ id: String(j.id), title: j.title || '', body: body });
  });
  scriptEl.innerHTML = html || '<div class="set-script-empty">Add jokes to your set, then read them here as one monologue</div>';

  var titleEls = scriptEl.querySelectorAll('.set-script-title');
  for (var ti = 0; ti < titleEls.length; ti++) {
    (function(el) {
      var jid = String(el.getAttribute('data-jid') || '');
      var match = null;
      for (var m = 0; m < payload.length; m++) {
        if (payload[m].id === jid) { match = payload[m]; break; }
      }
      el.textContent = match ? match.title : '';
      bindScriptEditable(el, 'title');
    })(titleEls[ti]);
  }

  var bodyEls = scriptEl.querySelectorAll('.set-script-body');
  for (var bi = 0; bi < bodyEls.length; bi++) {
    (function(el) {
      var jid = String(el.getAttribute('data-jid') || '');
      var match = null;
      for (var m = 0; m < payload.length; m++) {
        if (payload[m].id === jid) { match = payload[m]; break; }
      }
      el.textContent = match ? match.body : '';
      bindScriptEditable(el, 'body');
    })(bodyEls[bi]);
  }

  if (setScriptSortable) { setScriptSortable.destroy(); setScriptSortable = null; }
  if (typeof Sortable !== 'undefined') {
    setScriptSortable = new Sortable(scriptEl, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      draggable: '.set-script-block',
      handle: '.set-script-head',
      filter: '.set-script-body, .set-script-title, .sslot-move, .sslot-x',
      preventOnFilter: true,
      delay: 120,
      delayOnTouchOnly: true,
      onEnd: function() {
        _setDragEndAt = Date.now();
        var ordered = [];
        scriptEl.querySelectorAll('.set-script-block[data-jid]').forEach(function(b) {
          ordered.push(String(b.getAttribute('data-jid')));
        });
        syncCanvasOrderFromIds(ordered);
        recalcSetRuntime();
        persistCurrentSet();
        renderSetScript();
      }
    });
  }
}

function queueScriptTitleSave(jid, text) {
  if (!jid) return;
  var key = 'title:' + jid;
  if (_scriptBodySaveTimers[key]) clearTimeout(_scriptBodySaveTimers[key]);
  _scriptBodySaveTimers[key] = setTimeout(function() {
    flushScriptTitleSave(jid, text);
  }, 400);
}

function syncJokeTitleEverywhere(jid, nextTitle) {
  var joke = null;
  for (var i = 0; i < jokes.length; i++) {
    if (String(jokes[i].id) === String(jid)) {
      jokes[i].title = nextTitle;
      jokes[i].updated_at = new Date().toISOString();
      joke = jokes[i];
      break;
    }
  }
  if (!joke) return null;
  if (typeof displayJokes !== 'undefined') {
    for (var d = 0; d < displayJokes.length; d++) {
      if (String(displayJokes[d].id) === String(jid)) {
        displayJokes[d].title = nextTitle;
        displayJokes[d].updated_at = new Date().toISOString();
        break;
      }
    }
  }
  var canvas = document.getElementById('set-canvas');
  if (canvas) {
    var slot = findCanvasSlotById(jid);
    if (slot) slot.innerHTML = buildSetSlotHtml(joke);
    if (typeof recalcSetRuntime === 'function') recalcSetRuntime();
  }
  var lib = document.getElementById('set-lib');
  if (lib) {
    var item = null;
    lib.querySelectorAll('.set-lib-item[data-jid]').forEach(function(el) {
      if (String(el.getAttribute('data-jid')) === String(jid)) item = el;
    });
    if (item) {
      var titleEl = item.querySelector('[data-title]');
      if (titleEl) titleEl.textContent = nextTitle;
    }
  }
  var jokesScreen = document.getElementById('screen-jokes');
  if (jokesScreen && jokesScreen.classList.contains('active') && typeof renderJokes === 'function') {
    var ae = document.activeElement;
    if (!(ae && ae.classList && (ae.classList.contains('set-script-body') || ae.classList.contains('set-script-title')))) {
      renderJokes(displayJokes);
    }
  }
  return joke;
}

function flushScriptTitleSave(jid, text) {
  if (!jid) return;
  var key = 'title:' + jid;
  if (_scriptBodySaveTimers[key]) {
    clearTimeout(_scriptBodySaveTimers[key]);
    delete _scriptBodySaveTimers[key];
  }
  var title = String(text == null ? '' : text).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  var existing = null;
  for (var i = 0; i < jokes.length; i++) {
    if (String(jokes[i].id) === String(jid)) { existing = jokes[i]; break; }
  }
  if (!existing) return;
  if (!title) {
    var titles = document.querySelectorAll('.set-script-title[data-jid]');
    for (var t = 0; t < titles.length; t++) {
      if (String(titles[t].getAttribute('data-jid')) === String(jid)) {
        titles[t].textContent = existing.title || '';
        break;
      }
    }
    return;
  }
  if (existing.title === title) return;
  syncJokeTitleEverywhere(jid, title);
  if (typeof persistScriptJokeFields === 'function') {
    persistScriptJokeFields(jid, { title: title });
  } else if (typeof persistScriptJokeBody === 'function') {
    // fallback: body helper only — title still updated locally
  }
}

function queueScriptBodySave(jid, text) {
  if (!jid) return;
  if (_scriptBodySaveTimers[jid]) clearTimeout(_scriptBodySaveTimers[jid]);
  _scriptBodySaveTimers[jid] = setTimeout(function() {
    flushScriptBodySave(jid, text);
  }, 400);
}

function syncJokeBodyEverywhere(jid, nextBody) {
  var joke = null;
  for (var i = 0; i < jokes.length; i++) {
    if (String(jokes[i].id) === String(jid)) {
      jokes[i].body = nextBody;
      jokes[i].updated_at = new Date().toISOString();
      joke = jokes[i];
      break;
    }
  }
  if (!joke) return null;
  if (typeof displayJokes !== 'undefined') {
    for (var d = 0; d < displayJokes.length; d++) {
      if (String(displayJokes[d].id) === String(jid)) {
        displayJokes[d].body = nextBody;
        displayJokes[d].updated_at = new Date().toISOString();
        break;
      }
    }
  }
  // Refresh Joke Manager list if that screen is open (titles only, but keeps data fresh)
  var jokesScreen = document.getElementById('screen-jokes');
  if (jokesScreen && jokesScreen.classList.contains('active') && typeof renderJokes === 'function') {
    // Don't rebuild the list while the user is mid-edit in Script view
    if (!(document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('set-script-body'))) {
      renderJokes(displayJokes);
    }
  }
  // If detail drawer is open for this joke and user isn't typing in script, refresh material text
  var panel = document.getElementById('joke-detail');
  if (panel && panel.classList.contains('panel-open') && typeof openDetail === 'function') {
    if (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('set-script-body')) {
      return joke;
    }
    var html = panel.innerHTML || '';
    if (html.indexOf("openEditModal('" + jid + "')") !== -1
      || html.indexOf("archiveJoke('" + jid + "')") !== -1
      || html.indexOf("unarchiveJoke('" + jid + "')") !== -1
      || html.indexOf("addJokeToSet('" + jid + "')") !== -1) {
      openDetail(jid);
    }
  }
  return joke;
}

function flushScriptBodySave(jid, text) {
  if (!jid) return;
  if (_scriptBodySaveTimers[jid]) {
    clearTimeout(_scriptBodySaveTimers[jid]);
    delete _scriptBodySaveTimers[jid];
  }
  var body = String(text == null ? '' : text).replace(/\u00a0/g, ' ').replace(/\s+$/,'');
  var existing = null;
  for (var i = 0; i < jokes.length; i++) {
    if (String(jokes[i].id) === String(jid)) { existing = jokes[i]; break; }
  }
  if (!existing) return;
  var nextBody = body || 'No notes yet.';
  if (existing.body === nextBody) return;
  syncJokeBodyEverywhere(jid, nextBody);
  if (typeof persistScriptJokeFields === 'function') {
    persistScriptJokeFields(jid, { body: nextBody });
  } else if (typeof persistScriptJokeBody === 'function') {
    persistScriptJokeBody(jid, nextBody);
  }
}

function afterSetOrderChanged() {
  if (_setViewMode === 'script') renderSetScript();
}

function getSavedSets() {
  try { return JSON.parse(localStorage.getItem('c4a_saved_sets') || '[]') || []; } catch(e) { return []; }
}

function writeSavedSetsLocal(sets) {
  try { localStorage.setItem('c4a_saved_sets', JSON.stringify(sets || [])); } catch(e) {}
}

function findSavedSetIndex(sets, name) {
  var lower = String(name || '').toLowerCase();
  for (var i = 0; i < sets.length; i++) {
    if (String(sets[i].name || '').toLowerCase() === lower) return i;
  }
  return -1;
}

function refreshSetNameSelect(activeName) {
  var sel = document.getElementById('set-name-select');
  if (!sel) return;
  var sets = getSavedSets();
  var opts = '<option value="">Current set</option>';
  sets.forEach(function(s){
    var nm = (s.name || 'Untitled').replace(/</g,'&lt;');
    opts += '<option value="'+nm+'">'+nm+'</option>';
  });
  sel.innerHTML = opts;
  if (activeName) sel.value = activeName;
}

function loadSavedSet(name) {
  if (!name) return;
  var sets = getSavedSets();
  var idx = findSavedSetIndex(sets, name);
  var found = idx !== -1 ? sets[idx] : null;
  if (!found) return;
  var canvas = document.getElementById('set-canvas');
  if (!canvas) return;
  canvas.querySelectorAll('.sslot').forEach(function(s){ s.remove(); });
  var hint = canvas.querySelector('.set-empty-hint');
  if (hint) hint.remove();
  (found.ids || []).forEach(function(jid){
    var j = jokes.find(function(x){ return String(x.id) === String(jid); });
    if (!j) return;
    var slot = document.createElement('div');
    slot.className = 'sslot';
    slot.setAttribute('data-jid', String(j.id));
    slot.innerHTML = buildSetSlotHtml(j);
    canvas.appendChild(slot);
  });
  recalcSetRuntime();
  syncLibraryToCanvas();
  persistCurrentSet();
  afterSetOrderChanged();
  var sel = document.getElementById('set-name-select');
  if (sel) sel.value = name;
  toast('Loaded "'+name+'"');
}

function saveCurrentSet() {
  var canvas = document.getElementById('set-canvas');
  if (!canvas) return false;
  var ids = [];
  canvas.querySelectorAll('.sslot[data-jid]').forEach(function(s){ ids.push(String(s.getAttribute('data-jid'))); });
  if (!ids.length) { toast('Add some jokes to your set first, then Save.'); return false; }

  var sel = document.getElementById('set-name-select');
  var suggested = (sel && sel.value) ? sel.value : '';
  var name = window.prompt('Name this set:', suggested);
  if (name === null) return false;
  name = name.trim();
  if (!name) name = 'Untitled Set';

  var sets = getSavedSets();
  var idx = findSavedSetIndex(sets, name);
  var saved = { name: name, ids: ids, savedAt: Date.now() };
  if (idx !== -1) {
    saved.supabase_id = sets[idx].supabase_id;
    sets[idx] = saved;
  } else {
    sets.push(saved);
  }
  writeSavedSetsLocal(sets);
  try { localStorage.setItem('c4a_active_set', JSON.stringify(ids)); } catch(e) {}
  refreshSetNameSelect(saved.name);
  sbUpsertSavedSet(saved, function(supabaseId) {
    if (!supabaseId) return;
    var latest = getSavedSets();
    var i = findSavedSetIndex(latest, saved.name);
    if (i !== -1) {
      latest[i].supabase_id = supabaseId;
      writeSavedSetsLocal(latest);
    }
  });
  sbPersistActiveSet(ids, saved.name);
  toast('Saved "'+saved.name+'" with '+ids.length+' joke'+(ids.length===1?'':'s')+' \u2713');
  return true;
}

function clearSetCanvas() {
  var canvas = document.getElementById('set-canvas');
  if (!canvas) return;
  canvas.innerHTML = '<div class="set-empty-hint" style="text-align:center;padding:30px;color:var(--text3);font-size:12px;border:2px dashed var(--border2);border-radius:var(--r2)">Tap + or drag a joke here to build your set</div>';
  var sel = document.getElementById('set-name-select');
  if (sel) sel.value = '';
  recalcSetRuntime();
  syncLibraryToCanvas();
  persistCurrentSet();
  afterSetOrderChanged();
}

function startNewSet() {
  var canvas = document.getElementById('set-canvas');
  var hasJokes = canvas && canvas.querySelectorAll('.sslot').length > 0;
  if (!hasJokes) {
    clearSetCanvas();
    toast('New set started.');
    return;
  }
  showConfirmModal(
    'Start a new set?',
    'Do you want to save your current set before starting a new one?',
    [
      { label: 'Save, then new', primary: true, onClick: function(){ if (saveCurrentSet()) { clearSetCanvas(); toast('New set started.'); } } },
      { label: "Don't save", onClick: function(){ clearSetCanvas(); toast('New set started.'); } },
      { label: 'Cancel', onClick: function(){} }
    ]
  );
}

function computeSetRuntime(ids) {
  var t = 0;
  (ids || []).forEach(function(jid){
    var j = jokes.find(function(x){ return String(x.id) === String(jid); });
    if (!j || !j.runtime) return;
    var parts = String(j.runtime).split(':');
    t += (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  });
  var m = Math.floor(t / 60);
  var s = t % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function deleteSavedSet(name) {
  var sets = getSavedSets();
  var doomedIdx = findSavedSetIndex(sets, name);
  var doomed = doomedIdx !== -1 ? sets[doomedIdx] : null;
  var kept = doomedIdx === -1 ? sets : sets.filter(function(_, i){ return i !== doomedIdx; });
  writeSavedSetsLocal(kept);
  refreshSetNameSelect();
  if (doomed) sbDeleteSavedSet(doomed);
}

function sbUpsertSavedSet(setObj, done) {
  if (!_sb || !currentUser || !setObj) { if (done) done(null); return; }
  var row = {
    user_id: currentUser.id,
    name: setObj.name,
    joke_ids: setObj.ids || [],
    updated_at: new Date().toISOString()
  };
  var finish = function(res) {
    if (res.error) {
      console.error('Set sync error:', res.error);
      if (done) done(null);
      return;
    }
    if (done) done(res.data && res.data.id ? res.data.id : setObj.supabase_id || null);
  };
  if (setObj.supabase_id) {
    _sb.from('saved_sets').update(row).eq('id', setObj.supabase_id).eq('user_id', currentUser.id).select('id').single().then(finish);
  } else {
    _sb.from('saved_sets').insert(row).select('id').single().then(function(res) {
      if (res.error && String(res.error.message || '').toLowerCase().indexOf('duplicate') !== -1) {
        _sb.from('saved_sets').select('id, name').eq('user_id', currentUser.id).then(function(list) {
          if (list.error || !list.data) { finish(res); return; }
          var match = null;
          list.data.forEach(function(r){
            if (String(r.name).toLowerCase() === String(setObj.name).toLowerCase()) match = r;
          });
          if (!match) { finish(res); return; }
          _sb.from('saved_sets').update(row).eq('id', match.id).select('id').single().then(finish);
        });
        return;
      }
      finish(res);
    });
  }
}

function sbDeleteSavedSet(setObj) {
  if (!_sb || !currentUser || !setObj) return;
  if (setObj.supabase_id) {
    _sb.from('saved_sets').delete().eq('id', setObj.supabase_id).eq('user_id', currentUser.id)
      .then(function(res){ if (res.error) console.error('Set delete error:', res.error); });
    return;
  }
  _sb.from('saved_sets').select('id, name').eq('user_id', currentUser.id).then(function(res) {
    if (res.error || !res.data) return;
    var match = null;
    res.data.forEach(function(r){
      if (String(r.name).toLowerCase() === String(setObj.name).toLowerCase()) match = r;
    });
    if (!match) return;
    _sb.from('saved_sets').delete().eq('id', match.id)
      .then(function(r){ if (r.error) console.error('Set delete error:', r.error); });
  });
}

function sbPersistActiveSet(ids, name) {
  if (!_sb || !currentUser) return;
  if (!ids) {
    ids = [];
    var canvas = document.getElementById('set-canvas');
    if (canvas) canvas.querySelectorAll('.sslot[data-jid]').forEach(function(s){ ids.push(String(s.getAttribute('data-jid'))); });
  }
  if (name === undefined) {
    var sel = document.getElementById('set-name-select');
    name = sel ? (sel.value || null) : null;
  }
  _sb.from('set_builder_state').upsert({
    user_id: currentUser.id,
    active_joke_ids: ids,
    active_set_name: name || null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' }).then(function(res) {
    if (res.error) console.error('Active set sync error:', res.error);
  });
}

function sbLoadSavedSets(opts) {
  opts = opts || {};
  if (!_sb || !currentUser) return;
  _sb.from('saved_sets')
    .select('id, name, joke_ids, updated_at')
    .eq('user_id', currentUser.id)
    .order('updated_at', { ascending: false })
    .then(function(res) {
      if (res.error) {
        console.error('Load sets error:', res.error);
        var msg = String(res.error.message || '');
        if (msg.indexOf('saved_sets') !== -1 || msg.indexOf('schema cache') !== -1 || res.error.code === '42P01' || res.error.code === 'PGRST205') {
          if (opts.notify) toast('Set sync not ready — run the SQL setup in Supabase first.');
        }
        if (opts.onDone) opts.onDone(getSavedSets());
        return;
      }
      var remote = res.data || [];
      var local = getSavedSets();
      var byName = {};

      function normalizeIds(ids) {
        if (typeof ids === 'string') {
          try { ids = JSON.parse(ids); } catch(e) { ids = []; }
        }
        if (!Array.isArray(ids)) ids = [];
        return ids.map(String);
      }

      remote.forEach(function(row) {
        byName[String(row.name).toLowerCase()] = {
          name: row.name,
          ids: normalizeIds(row.joke_ids),
          savedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
          supabase_id: row.id,
          _fromCloud: true
        };
      });

      var toUpload = [];
      local.forEach(function(s) {
        var key = String(s.name || '').toLowerCase();
        if (!key) return;
        var existing = byName[key];
        var localAt = s.savedAt || 0;
        if (!existing) {
          byName[key] = {
            name: s.name,
            ids: (s.ids || []).map(String),
            savedAt: localAt || Date.now(),
            supabase_id: s.supabase_id || null
          };
          toUpload.push(byName[key]);
        } else if (localAt > (existing.savedAt || 0)) {
          byName[key] = {
            name: s.name,
            ids: (s.ids || []).map(String),
            savedAt: localAt,
            supabase_id: existing.supabase_id || s.supabase_id || null
          };
          toUpload.push(byName[key]);
        } else if (s.supabase_id && !existing.supabase_id) {
          existing.supabase_id = s.supabase_id;
        }
      });

      var merged = Object.keys(byName).map(function(k){ return byName[k]; });
      merged.sort(function(a, b){ return (b.savedAt || 0) - (a.savedAt || 0); });
      writeSavedSetsLocal(merged);
      refreshSetNameSelect();

      var pending = toUpload.length;
      if (!pending) {
        if (opts.notify) {
          if (merged.length) toast('Loaded ' + merged.length + ' set' + (merged.length === 1 ? '' : 's') + ' from your account.');
          else toast('Jokes synced. No named sets in your account yet.');
        }
        if (opts.onDone) opts.onDone(merged);
      } else {
        toast('Uploading ' + pending + ' set' + (pending === 1 ? '' : 's') + ' from this device…');
        toUpload.forEach(function(s) {
          sbUpsertSavedSet(s, function(id) {
            if (id) {
              var latest = getSavedSets();
              var i = findSavedSetIndex(latest, s.name);
              if (i !== -1) {
                latest[i].supabase_id = id;
                writeSavedSetsLocal(latest);
              }
            }
            pending--;
            if (pending <= 0) {
              refreshSetNameSelect();
              toast('Sets synced to your account \u2713');
              if (opts.onDone) opts.onDone(getSavedSets());
            }
          });
        });
      }

      var setScreen = document.getElementById('screen-sets');
      if (setScreen && setScreen.classList.contains('active') && typeof renderSet === 'function') {
        renderSet();
      }
    });

  _sb.from('set_builder_state')
    .select('active_joke_ids, active_set_name, updated_at')
    .eq('user_id', currentUser.id)
    .limit(1)
    .then(function(res) {
      if (res.error || !res.data || !res.data.length) return;
      var row = res.data[0];
      var ids = row.active_joke_ids;
      if (typeof ids === 'string') {
        try { ids = JSON.parse(ids); } catch(e) { ids = []; }
      }
      if (!Array.isArray(ids)) ids = [];
      try { localStorage.setItem('c4a_active_set', JSON.stringify(ids.map(String))); } catch(e) {}
      if (row.active_set_name) refreshSetNameSelect(row.active_set_name);
      if (typeof restoreActiveSetIfEmpty === 'function') restoreActiveSetIfEmpty();
    });
}

function renderMySetsModalContent(sets) {
  sets = (sets || getSavedSets()).slice().sort(function(a,b){ return (b.savedAt||0) - (a.savedAt||0); });
  var rows = '';
  if (!sets.length) {
    rows = '<div style="text-align:center;color:var(--text3);font-size:13px;padding:24px 8px;line-height:1.6">No saved sets in your account yet.<br><br>If they are on your <strong>phone</strong>, open Comedy4All there → Set Builder → <strong>My Sets</strong> once (that uploads them). Then tap Refresh here.</div>';
  } else {
    sets.forEach(function(s){
      var count = (s.ids || []).length;
      var runtime = computeSetRuntime(s.ids);
      var nm = (s.name || 'Untitled').replace(/</g,'&lt;').replace(/'/g,"\\'");
      var nmAttr = (s.name || 'Untitled').replace(/'/g,"\\'");
      rows += '<div style="display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:1px solid var(--border)">'
        + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+nm+'</div>'
        + '<div style="font-size:11px;color:var(--text3)">'+count+' joke'+(count===1?'':'s')+' &middot; <span style="color:var(--gold);font-family:\'DM Mono\',monospace">'+runtime+'</span></div></div>'
        + '<button class="btn btn-sm btn-primary" onclick="loadSavedSet(\''+nmAttr+'\');closeMySetsModal()">Load</button>'
        + '<button class="btn btn-sm btn-danger" onclick="deleteSavedSet(\''+nmAttr+'\');openMySetsModal()">Delete</button>'
        + '</div>';
    });
  }
  return rows;
}

function openMySetsModal() {
  var existing = document.getElementById('my-sets-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'my-sets-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;z-index:10001;font-family:Inter,sans-serif;padding:16px';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });

  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg);padding:20px;border-radius:14px;border:1px solid var(--border);width:min(440px,100%);max-height:80vh;display:flex;flex-direction:column';
  box.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;flex-wrap:wrap">'
    + '<div style="font-weight:700;color:var(--text);font-size:15px">My Sets</div>'
    + '<div style="display:flex;gap:6px">'
    + '<button class="btn btn-sm" onclick="sbLoadSavedSets({notify:true,onDone:function(){openMySetsModal();}})">Refresh</button>'
    + '<button class="btn btn-sm" onclick="closeMySetsModal()">Close</button></div></div>'
    + '<div id="my-sets-list" style="overflow-y:auto" class="scroll">' + renderMySetsModalContent() + '</div>';
  modal.appendChild(box);
  document.body.appendChild(modal);

  if (typeof sbLoadSavedSets === 'function') {
    var list = document.getElementById('my-sets-list');
    if (list) list.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:12px;padding:20px">Syncing with your account…</div>';
    sbLoadSavedSets({
      onDone: function(sets) {
        var el = document.getElementById('my-sets-list');
        if (el) el.innerHTML = renderMySetsModalContent(sets);
      }
    });
  }
}

function closeMySetsModal() {
  var m = document.getElementById('my-sets-modal');
  if (m) m.remove();
}

function showConfirmModal(title, message, buttons) {
  var existing = document.getElementById('c4a-confirm-modal');
  if (existing) existing.remove();
  var modal = document.createElement('div');
  modal.id = 'c4a-confirm-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;z-index:10002;font-family:Inter,sans-serif;padding:16px';
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg);padding:20px;border-radius:14px;border:1px solid var(--border);width:min(400px,100%)';
  var btnHtml = '';
  buttons.forEach(function(b, i){
    btnHtml += '<button data-idx="'+i+'" class="btn btn-sm'+(b.primary?' btn-primary':'')+'" style="flex:1;justify-content:center">'+b.label+'</button>';
  });
  box.innerHTML = '<div style="font-weight:700;color:var(--text);font-size:15px;margin-bottom:8px">'+title+'</div>'
    + '<div style="font-size:12.5px;color:var(--text2);line-height:1.6;margin-bottom:16px">'+message+'</div>'
    + '<div style="display:flex;gap:8px">'+btnHtml+'</div>';
  modal.appendChild(box);
  document.body.appendChild(modal);
  var btns = box.querySelectorAll('button[data-idx]');
  for (var i=0;i<btns.length;i++){
    (function(idx){
      btns[idx].addEventListener('click', function(){
        modal.remove();
        if (buttons[idx] && typeof buttons[idx].onClick === 'function') buttons[idx].onClick();
      });
    })(i);
  }
}

function syncLibraryToCanvas() {
  var canvas = document.getElementById('set-canvas');
  var lib = document.getElementById('set-lib');
  if (!canvas || !lib) return;
  var usedIds = [];
  canvas.querySelectorAll('.sslot[data-jid]').forEach(function(slot) {
    usedIds.push(String(slot.getAttribute('data-jid')));
  });
  lib.querySelectorAll('[data-jid]').forEach(function(item) {
    if (usedIds.indexOf(String(item.getAttribute('data-jid'))) !== -1) {
      item.style.display = 'none';
    } else {
      item.style.display = '';
    }
  });
}

function filterSetLibrary(tag) {
  var lib = document.getElementById('set-lib');
  if (!lib) return;
  lib.querySelectorAll('.set-lib-item').forEach(function(item) {
    var jid = item.getAttribute('data-jid');
    var j = jokes.find(function(x){ return String(x.id) === String(jid); });
    if (!j) return;
    var visible = !tag || j.tags.indexOf(tag) !== -1;
    item.style.display = visible ? '' : 'none';
  });
  syncLibraryToCanvas();
}

function filterSetLibraryBySearch(q) {
  var lib = document.getElementById('set-lib');
  if (!lib) return;
  _currentSearchQuery = q || '';
  var lower = String(q || '').toLowerCase().trim();
  var topSearch = document.getElementById('set-search');
  var libSearch = document.getElementById('set-lib-search');
  if (topSearch && document.activeElement !== topSearch && topSearch.value !== (q || '')) topSearch.value = q || '';
  if (libSearch && document.activeElement !== libSearch && libSearch.value !== (q || '')) libSearch.value = q || '';
  var canvas = document.getElementById('set-canvas');
  var usedIds = [];
  if (canvas) {
    canvas.querySelectorAll('.sslot[data-jid]').forEach(function(slot) {
      usedIds.push(String(slot.getAttribute('data-jid')));
    });
  }
  lib.querySelectorAll('.set-lib-item').forEach(function(item) {
    var jid = String(item.getAttribute('data-jid'));
    if (usedIds.indexOf(jid) !== -1) { item.style.display = 'none'; return; }
    var j = jokes.find(function(x){ return String(x.id) === jid; });
    if (!j) return;
    var title = j.title || '';
    var body = j.body || '';
    var match = !lower
      || title.toLowerCase().indexOf(lower) !== -1
      || body.toLowerCase().indexOf(lower) !== -1
      || (j.tags && j.tags.some(function(t){ return String(t).toLowerCase().indexOf(lower) !== -1; }));
    item.style.display = match ? '' : 'none';
    var titleDiv = item.querySelector('[data-title]');
    if (titleDiv) {
      if (match && lower && title.toLowerCase().indexOf(lower) !== -1) {
        var escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        titleDiv.innerHTML = title.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark style="background:#ffe066;color:#26150f;border-radius:2px;padding:0 1px">$1</mark>');
      } else {
        titleDiv.textContent = title;
      }
    }
  });
}

var _libLastTouch = 0;
var _setLibSortBy = DEFAULT_JOKE_SORT_MODE;

function isSetLibSortMode(mode) {
  mode = normalizeJokeSortMode(mode);
  return mode === 'alpha' || mode === 'created-desc' || mode === 'created-asc' || mode === 'updated-desc' || mode === 'updated-asc' || mode === 'manual';
}

function migrateJokeSortDefaults() {
  try {
    if (localStorage.getItem('c4a_sort_pref_v') === '3') return;
    localStorage.setItem('c4a_sort_pref_v', '3');
    localStorage.setItem('c4a_joke_mgr_sort', DEFAULT_JOKE_SORT_MODE);
    localStorage.setItem('c4a_set_lib_sort', DEFAULT_JOKE_SORT_MODE);
    // Old drag order was winning and showing first-written jokes at the top
    localStorage.removeItem('c4a_joke_order');
  } catch (e) {}
}

function initJokeSortPreferences() {
  migrateJokeSortDefaults();
  var mgrMode = getJokeManagerSortMode();
  persistJokeManagerSortMode(mgrMode);
  _setLibSortBy = getSetLibSortMode();
  var libSel = document.getElementById('set-lib-sort');
  if (libSel) libSel.value = _setLibSortBy;
}

function getSetLibSortMode() {
  migrateJokeSortDefaults();
  try {
    var saved = normalizeJokeSortMode(localStorage.getItem('c4a_set_lib_sort'));
    if (isSetLibSortMode(saved)) return saved;
  } catch (e) {}
  return DEFAULT_JOKE_SORT_MODE;
}

function setLibSortMode(mode) {
  mode = normalizeJokeSortMode(mode);
  if (!isSetLibSortMode(mode)) mode = DEFAULT_JOKE_SORT_MODE;
  _setLibSortBy = mode;
  try { localStorage.setItem('c4a_set_lib_sort', mode); } catch (e) {}
  var sel = document.getElementById('set-lib-sort');
  if (sel && sel.value !== mode) sel.value = mode;
  renderSetLibraryList();
  if (typeof syncLibraryToCanvas === 'function') syncLibraryToCanvas();
  var qEl = document.getElementById('set-lib-search') || document.getElementById('set-search');
  if (qEl && qEl.value && typeof filterSetLibraryBySearch === 'function') filterSetLibraryBySearch(qEl.value);
  if (mode === 'manual') toast('Drag jokes in the library to reorder');
}

function getOrderedSetLibraryJokes() {
  var mode = normalizeJokeSortMode(_setLibSortBy || getSetLibSortMode());
  if (mode === 'manual') return jokes.slice();
  return applyJokeSort(jokes, mode);
}

function persistSetLibManualOrderFromDom() {
  var lib = document.getElementById('set-lib');
  if (!lib) return;
  var orderedIds = [];
  lib.querySelectorAll('.set-lib-item[data-jid]').forEach(function(el) {
    orderedIds.push(String(el.getAttribute('data-jid')));
  });
  if (!orderedIds.length) return;
  var byId = {};
  jokes.forEach(function(j) { byId[String(j.id)] = j; });
  var next = [];
  orderedIds.forEach(function(id) {
    if (byId[id]) {
      next.push(byId[id]);
      delete byId[id];
    }
  });
  Object.keys(byId).forEach(function(id) { next.push(byId[id]); });
  jokes = next;
  if (typeof displayJokes !== 'undefined') {
    displayJokes = typeof applyActiveJokeManagerSort === 'function' ? applyActiveJokeManagerSort(jokes) : jokes.slice();
  }
  try {
    localStorage.setItem('c4a_joke_order', JSON.stringify(jokes.map(function(j) { return String(j.id); })));
  } catch (e) {}
  toast('Library order saved \u2713');
  if (typeof currentUser !== 'undefined' && currentUser && typeof _sb !== 'undefined' && _sb) {
    var updates = jokes.map(function(j, i) {
      return _sb.from('jokes').update({ sort_order: i }).eq('id', j.id);
    });
    Promise.all(updates).catch(function() {});
  }
}

function renderSetLibraryList() {
  var lib = document.getElementById('set-lib');
  if (!lib) return;
  _setLibSortBy = getSetLibSortMode();
  var sel = document.getElementById('set-lib-sort');
  if (sel) sel.value = _setLibSortBy;

  var list = getOrderedSetLibraryJokes();
  var hint = _setLibSortBy === 'manual'
    ? 'drag to reorder · + to add'
    : 'tap to open · + to add';
  lib.innerHTML = list.map(function(j){
    var color = j.tier==='a'?'var(--gold)':j.tier==='b'?'var(--blue)':'var(--text3)';
    var dateLine = jokeDateLine(j);
    return '<div data-jid="'+j.id+'" class="set-lib-item" style="display:flex;align-items:center;gap:8px;padding:9px 10px 9px 12px;border-bottom:1px solid var(--border);border-left:3px solid '+color+';transition:background .12s;cursor:pointer" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'\'">'
      +'<div style="flex:1;min-width:0"><div data-title style="font-size:12px;font-weight:500;color:var(--text)">'+j.title+'</div><div style="font-size:10px;color:var(--text3)">'+j.runtime+(dateLine ? ' · '+dateLine : '')+'</div><div style="font-size:9px;color:var(--text3);margin-top:2px;opacity:.6">'+hint+'</div></div>'
      +'<button class="set-lib-add" onclick="event.stopPropagation();addJokeToSet(\''+j.id+'\')" style="flex-shrink:0;width:34px;height:34px;border-radius:9px;border:1px solid var(--gold-br);background:var(--gold-bg);color:var(--gold);font-size:20px;font-weight:600;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>'
      +'</div>';
  }).join('');

  var libItems = lib.querySelectorAll('.set-lib-item');
  for (var li = 0; li < libItems.length; li++) {
    (function(item) {
      var pressTimer = null;

      item.addEventListener('touchstart', function(e) {
        if (e.target.closest('.drag-handle') || e.target.closest('.set-lib-add')) return;
        _libLastTouch = Date.now();
        pressTimer = setTimeout(function() {
          pressTimer = null;
          var jid = item.getAttribute('data-jid');
          openDetail(jid);
          item.style.background = 'var(--gold-bg)';
          setTimeout(function(){ item.style.background = ''; }, 400);
        }, 500);
      }, { passive: true });

      item.addEventListener('touchend', function() {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      });

      item.addEventListener('touchmove', function() {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      }, { passive: true });

      item.addEventListener('click', function(e) {
        if (e.target.closest('.drag-handle') || e.target.closest('.set-lib-add')) return;
        if (Date.now() - _setDragEndAt < 350) return;
        var jid = item.getAttribute('data-jid');
        if (jid) openDetail(jid);
      });
    })(libItems[li]);
  }

  if (setLibSortable) setLibSortable.destroy();
  if (typeof Sortable !== 'undefined') {
    var allowManualSort = _setLibSortBy === 'manual';
    setLibSortable = new Sortable(lib, {
      group: { name: 'setbuilder', pull: 'clone', put: false },
      sort: allowManualSort,
      animation: 150,
      draggable: '.set-lib-item',
      filter: '.set-lib-add',
      preventOnFilter: false,
      forceFallback: true,
      fallbackOnBody: true,
      fallbackTolerance: 4,
      delay: allowManualSort ? 120 : 160,
      delayOnTouchOnly: true,
      touchStartThreshold: 8,
      onUpdate: function() {
        if (_setLibSortBy !== 'manual') return;
        _setDragEndAt = Date.now();
        persistSetLibManualOrderFromDom();
      },
      onEnd: function() {
        _setDragEndAt = Date.now();
      }
    });
  }
}

function renderSet() {
  refreshSetNameSelect();
  var setTagFilter = document.getElementById('set-tag-filter');
  if (setTagFilter) {
    var allTags = [];
    jokes.forEach(function(j){ j.tags.forEach(function(t){ if (allTags.indexOf(t)===-1) allTags.push(t); }); });
    setTagFilter.innerHTML = '<option value="">All Tags</option>' + allTags.map(function(t){ return '<option value="'+t+'">'+t+'</option>'; }).join('');
  }

  renderSetLibraryList();
  if (typeof syncLibraryToCanvas === 'function') syncLibraryToCanvas();
  var qEl = document.getElementById('set-lib-search') || document.getElementById('set-search');
  if (qEl && qEl.value) filterSetLibraryBySearch(qEl.value);
  var canvas = document.getElementById('set-canvas');
  if (canvas) {
    if (!setCanvasSortable && typeof Sortable !== 'undefined') {
      canvas.innerHTML = '<div class="set-empty-hint" style="text-align:center;padding:30px;color:var(--text3);font-size:12px;border:2px dashed var(--border2);border-radius:var(--r2)">Tap + or drag a joke here to build your set</div>';

      canvas.addEventListener('click', function(e) {
        if (Date.now() - _setDragEndAt < 350) return;
        if (e.target.closest('.sslot-x') || e.target.closest('.sslot-move')) return;
        var slot = e.target.closest('.sslot');
        if (!slot) return;
        var jid = slot.getAttribute('data-jid');
        if (jid) openDetail(jid);
      });
      
      setCanvasSortable = new Sortable(canvas, {
        group: { name: 'setbuilder', pull: true, put: true },
        animation: 150,
        ghostClass: 'sortable-ghost',
        draggable: '.sslot',
        filter: '.segue-wrapper, .set-empty-hint',
        forceFallback: true,
        fallbackOnBody: true,
        fallbackTolerance: 4,
        delay: 160,
        delayOnTouchOnly: true,
        touchStartThreshold: 8,
        onAdd: function(evt) {
          var hint = canvas.querySelector('.set-empty-hint');
          if (hint) hint.remove();
          
          var item = evt.item;
          var jid = item.getAttribute('data-jid');
          var j = null;
          for (var k=0; k<jokes.length; k++) {
            if (String(jokes[k].id) === String(jid)) { j = jokes[k]; break; }
          }
          if (!j) return;
          item.className = 'sslot';
          item.removeAttribute('style'); 
          item.setAttribute('data-jid', String(j.id));
          item.innerHTML = buildSetSlotHtml(j);
          recalcSetRuntime();
          syncLibraryToCanvas();
          persistCurrentSet();
          afterSetOrderChanged();
        },
        onEnd: function() {
          _setDragEndAt = Date.now();
          recalcSetRuntime();
          persistCurrentSet();
          afterSetOrderChanged();
        },
        onRemove: function() {
          recalcSetRuntime();
          persistCurrentSet();
          afterSetOrderChanged();
        }
      });
      recalcSetRuntime();
    }
    restoreActiveSetIfEmpty();
    var screen = document.getElementById('screen-sets');
    if (screen && !screen.classList.contains('set-mode-bubbles') && !screen.classList.contains('set-mode-script')) {
      applySavedSetViewMode();
    } else if (_setViewMode === 'script') {
      renderSetScript();
    }
  }
}

function restoreActiveSetIfEmpty() {
  var canvas = document.getElementById('set-canvas');
  if (!canvas) return;
  if (canvas.querySelectorAll('.sslot').length > 0) return;
  var savedSet = [];
  try { savedSet = JSON.parse(localStorage.getItem('c4a_active_set') || '[]'); } catch(e) { return; }
  if (!savedSet.length) return;
  var added = 0;
  savedSet.forEach(function(jid) {
    var j = jokes.find(function(x){ return String(x.id) === String(jid); });
    if (!j) return;
    var slot = document.createElement('div');
    slot.className = 'sslot';
    slot.setAttribute('data-jid', String(j.id));
    slot.innerHTML = buildSetSlotHtml(j);
    canvas.appendChild(slot);
    added++;
  });
  if (added > 0) {
    var hint = canvas.querySelector('.set-empty-hint');
    if (hint) hint.remove();
    recalcSetRuntime();
    syncLibraryToCanvas();
  }
}

function refreshSetViews() {
  var setScreen = document.getElementById('screen-sets');
  if (!setScreen || !setScreen.classList.contains('active')) return;
  if (typeof renderSet === 'function') renderSet();
  var canvas = document.getElementById('set-canvas');
  if (canvas) {
    canvas.querySelectorAll('.sslot[data-jid]').forEach(function(slot) {
      var jid = slot.getAttribute('data-jid');
      var j = jokes.find(function(x){ return String(x.id) === String(jid); });
      if (j) slot.innerHTML = buildSetSlotHtml(j);
    });
    recalcSetRuntime();
    syncLibraryToCanvas();
  }
  if (_setViewMode === 'script') renderSetScript();
}

function persistCurrentSet() {
  var canvas = document.getElementById('set-canvas');
  if (!canvas) return;
  var ids = [];
  canvas.querySelectorAll('.sslot[data-jid]').forEach(function(s){ ids.push(String(s.getAttribute('data-jid'))); });
  try { localStorage.setItem('c4a_active_set', JSON.stringify(ids)); } catch(e) {}
  var sel = document.getElementById('set-name-select');
  var name = sel ? (sel.value || null) : null;
  if (typeof sbPersistActiveSet === 'function') sbPersistActiveSet(ids, name);
}

function buildSetSlotHtml(j) {
  var color = j.tier==='a'?'var(--gold)':j.tier==='b'?'var(--blue)':'var(--text3)';
  return '<div class="sslot-num"></div>'
    +'<div class="sslot-card" style="border-left:3px solid '+color+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
    +'<div style="font-size:12px;font-weight:600;color:var(--text)">'+j.title+'</div>'
    +'<div style="display:flex;align-items:center;gap:1px;flex-shrink:0;margin-top:-2px">'
    +'<button class="sslot-move" onclick="event.stopPropagation();moveSetSlot(this,-1)" title="Move up" style="width:26px;height:26px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);border-radius:6px;font-size:11px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center">&#9650;</button>'
    +'<button class="sslot-move" onclick="event.stopPropagation();moveSetSlot(this,1)" title="Move down" style="width:26px;height:26px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);border-radius:6px;font-size:11px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center">&#9660;</button>'
    +'<div class="sslot-x" style="cursor:pointer;color:var(--text3);font-size:18px;line-height:1;padding:0 4px" onclick="event.stopPropagation();removeSetSlot(this)">&times;</div>'
    +'</div>'
    +'<div style="font-size:10px;color:var(--text3);font-family:\'DM Mono\',monospace" class="slot-runtime" data-rt="'+j.runtime+'">'+j.runtime+'</div></div>'
    +'<div class="sslot-time"></div>';
}

function addJokeToSet(id) {
  var j = null;
  for (var i=0;i<jokes.length;i++) { if(String(jokes[i].id)===String(id)){ j=jokes[i]; break; } }
  if (!j) return;

  var canvas = document.getElementById('set-canvas');
  if (!canvas) { toast('Open the Set Builder first, then add jokes.'); return; }

  var already = false;
  canvas.querySelectorAll('.sslot[data-jid]').forEach(function(s){
    if (String(s.getAttribute('data-jid')) === String(j.id)) already = true;
  });
  if (already) { toast('"'+j.title+'" is already in your set.'); return; }

  var hint = canvas.querySelector('.set-empty-hint');
  if (hint) hint.remove();
  var slot = document.createElement('div');
  slot.className = 'sslot';
  slot.setAttribute('data-jid', String(j.id));
  slot.innerHTML = buildSetSlotHtml(j);
  canvas.appendChild(slot);
  recalcSetRuntime();
  syncLibraryToCanvas();
  persistCurrentSet();
  afterSetOrderChanged();
  toast('Added "'+j.title+'" to your set \u2713');
}

function moveSetSlot(btn, dir) {
  var el = btn;
  while (el && !el.classList.contains('sslot') && !el.classList.contains('set-script-block')) {
    el = el.parentElement;
  }
  if (!el) return;
  var jid = el.getAttribute('data-jid');
  var canvas = document.getElementById('set-canvas');
  if (!canvas || !jid) return;
  var slot = findCanvasSlotById(jid);
  if (!slot) return;
  if (dir < 0) {
    var prev = slot.previousElementSibling;
    while (prev && !prev.classList.contains('sslot')) { prev = prev.previousElementSibling; }
    if (prev) canvas.insertBefore(slot, prev);
  } else {
    var next = slot.nextElementSibling;
    while (next && !next.classList.contains('sslot')) { next = next.nextElementSibling; }
    if (next) canvas.insertBefore(next, slot);
  }
  recalcSetRuntime();
  persistCurrentSet();
  afterSetOrderChanged();
}

function removeSetSlot(btn) {
  var el = btn;
  while (el && !el.classList.contains('sslot') && !el.classList.contains('set-script-block')) {
    el = el.parentElement;
  }
  if (!el) return;
  var jid = el.getAttribute('data-jid');
  var canvas = document.getElementById('set-canvas');
  var slot = jid ? findCanvasSlotById(jid) : (el.classList.contains('sslot') ? el : null);
  if (slot) {
    slot.remove();
    if (canvas && canvas.querySelectorAll('.sslot').length === 0) {
      canvas.innerHTML = '<div class="set-empty-hint" style="text-align:center;padding:30px;color:var(--text3);font-size:12px;border:2px dashed var(--border2);border-radius:var(--r2)">Tap + or drag a joke here to build your set</div>';
    }
    recalcSetRuntime();
    syncLibraryToCanvas();
    persistCurrentSet();
    afterSetOrderChanged();
  }
}

function recalcSetRuntime() {
  var canvas = document.getElementById('set-canvas');
  if (!canvas) return;
  
  // Remove existing segues
  var segues = canvas.querySelectorAll('.segue-wrapper');
  for (var i=0; i<segues.length; i++) {
    segues[i].remove();
  }
  
  var slots = canvas.querySelectorAll('.sslot');
  var t = 0;
  
  for (var k=0; k<slots.length; k++) {
    var slot = slots[k];
    
    // Set slot number
    var numEl = slot.querySelector('.sslot-num');
    if (numEl) numEl.textContent = (k + 1);
    
    // Get timestamp
    var m = Math.floor(t/60);
    var s = t%60;
    var tsStr = m + ':' + (s<10?'0':'') + s;
    
    // Apply timestamp
    var timeEl = slot.querySelector('.sslot-time');
    if (timeEl) timeEl.textContent = tsStr;
    
    // Calculate new total
    var rtEl = slot.querySelector('.slot-runtime');
    if (rtEl) {
      var rt = rtEl.getAttribute('data-rt') || '0:00';
      var parts = rt.split(':');
      t += parseInt(parts[0])*60 + (parseInt(parts[1])||0);
    }
    
    // Add segue if not last
    if (k < slots.length - 1) {
      slot.insertAdjacentHTML('afterend', '<div class="segue-wrapper" style="margin-left:24px;margin-bottom:6px"><div class="sslot-card segue" onclick="toast(\'Add segue here\')"><div style="font-size:10px;color:var(--text3)">+ segue / crowd work</div></div></div>');
    }
  }
  
  // Update totals (target 30 mins = 1800 secs)
  var totalM = Math.floor(t/60);
  var totalS = t%60;
  var totalStr = totalM + ':' + (totalS<10?'0':'') + totalS;
  var pct = Math.min(100, Math.round((t / 1800) * 100));
  
  var timeTop = document.getElementById('set-time-top');
  var timeSide = document.getElementById('set-time-side');
  var barTop = document.getElementById('set-bar-top');
  var barSide = document.getElementById('set-bar-side');
  var pctSide = document.getElementById('set-pct-side');
  
  if (timeTop) timeTop.textContent = totalStr;
  if (timeSide) timeSide.textContent = totalStr;
  if (barTop) barTop.style.width = pct + '%';
  if (barSide) barSide.style.width = pct + '%';
  if (pctSide) pctSide.textContent = pct + '% of 30min target';
}
