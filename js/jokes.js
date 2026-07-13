// - JOKE MANAGER -
var jokeGridSortable = null;
var _currentSearchQuery = '';

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

function renderJokes(list) {
  var grid = document.getElementById('joke-grid');
  var cnt = document.getElementById('joke-count');
  if (!grid) return;
  rebuildTagDropdown();
  var isArchiveView = (list === archivedJokes || (list.length > 0 && list[0] && list[0].archived));
  if (cnt) cnt.textContent = list.length + (isArchiveView ? ' archived' : ' jokes');
  if (list.length === 0) {
    var msg = isArchiveView
      ? '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3);font-size:13px">No archived jokes yet.<br><span style="font-size:11px">Archive jokes from the detail panel to keep them off your main list.</span></div>'
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
    return '<div class="jcard t'+j.tier+archivedClass+'" data-jid="'+j.id+'" style="cursor:pointer">'
      +'<div class="jtitle">'+j.title+ageBadge+'</div>'
      +'<div class="jprev">'+(j.body||'')+'</div>'
      +'<div style="margin-bottom:8px">'+j.tags.map(function(t){return '<span class="tag tag-'+tagColor(t)+'">'+t+'</span>';}).join('')+'</div>'
      +'<div class="jmeta"><span class="stars">'+stars+'</span><span style="font-family:\'DM Mono\',monospace;color:var(--text3);font-size:10px">'+j.runtime+'</span></div>'
      +'</div>';
  }).join('');
  var cards = grid.querySelectorAll('[data-jid]');
  for (var ci=0; ci<cards.length; ci++) {
    (function(el) {
      el.addEventListener('click', function() { openDetail(el.getAttribute('data-jid')); });
    })(cards[ci]);
  }

  // Initialize SortableJS
  if (!isArchiveView && typeof Sortable !== 'undefined') {
    if (jokeGridSortable) jokeGridSortable.destroy();
    
    var sortSelect = document.getElementById('sort-select');
    var isCustomOrder = sortSelect && sortSelect.value === 'custom';
    
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
    +'<div style="display:flex;gap:14px;font-size:11px;color:var(--text3)"><span> '+j.runtime+'</span><span style="color:var(--gold)">'+stars+'</span></div>'
    +'</div>'
    +'<div style="flex:1;overflow-y:auto;padding:14px" class="scroll">'
    +'<div class="sect-title">Material</div>'
    +'<div style="font-size:12.5px;line-height:1.85;color:var(--text2);margin-bottom:16px;white-space:pre-wrap">'+highlightText(j.body, _currentSearchQuery)+'</div>'
    +'<div class="sect-title">Brooks Notes</div>'
    +'<div style="font-size:11.5px;color:var(--text2);background:var(--gold-bg);border:1px solid var(--gold-br);border-radius:var(--r2);padding:10px 12px;line-height:1.65;margin-bottom:6px">Strong '+j.tier.toUpperCase()+'-tier material. '+(j.score>=8?'Consistent crowd pleaser -- protect it in your set.':'Room to tighten the setup. Try cutting 10-15 seconds from the lead-in.')+'</div>'
    +'</div>'
    +'<div class="detail-actions">'
    +'<button class="btn btn-primary btn-sm" onclick="addJokeToSet(\''+j.id+'\')">+ Add to Set</button>'
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
  displayJokes = jokes.slice();
  closeDetail();
  updateCounts();
  renderJokes(displayJokes);
  toast('Joke restored to your library! \u2713');
}

function filterJokes(q) {
  _currentSearchQuery = q || '';
  var pool = jokes;
  displayJokes = q ? pool.filter(function(j){
    return j.title.toLowerCase().indexOf(q.toLowerCase())>-1 || j.body.toLowerCase().indexOf(q.toLowerCase())>-1;
  }) : pool.slice();
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
  displayJokes = t ? jokes.filter(function(j){return j.tags.indexOf(t)>-1;}) : jokes.slice();
  renderJokes(displayJokes);
}
function filterByTier(t) {
  if (t==='archived') {
    displayJokes = archivedJokes.slice();
  } else {
    displayJokes = t ? jokes.filter(function(j){return j.tier===t;}) : jokes.slice();
  }
  renderJokes(displayJokes);
}
function sortJokes(by) {
  var s = displayJokes.slice();
  if (by==='score') s.sort(function(a,b){return b.score-a.score;});
  else if (by==='alpha') s.sort(function(a,b){return a.title.localeCompare(b.title);});
  else if (by==='newest') s.sort(function(a,b){return b.id-a.id;});
  // If 'custom', we leave it alone (or it triggers re-render to activate drag & drop)
  if (by !== 'custom') {
     // If not custom, disable Sortable
     if (jokeGridSortable) jokeGridSortable.option('disabled', true);
  }
  
  displayJokes = s;
  renderJokes(s);
}

// - NEW JOKE MODAL -
function openNewJoke() {
  modalRating = 0; modalTags = [];
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
  var nj = {
    title: title,
    body: bodyEl ? bodyEl.value.trim() || '' : '',
    tags: modalTags.length ? modalTags.slice() : [],
    tier: modalRating >= 4 ? 'a' : modalRating >= 3 ? 'b' : 'c',
    rating: modalRating || 3,
    runtime: runtimeEl ? runtimeEl.value.trim() || '1:00' : '1:00',
    score: parseFloat((6 + (modalRating || 3) * 0.5).toFixed(1)),
    archived: false
  };
  closeNewJoke();
  if (currentUser && _sb) {
    setSyncStatus('syncing');
    _sb.from('jokes').insert(Object.assign({}, nj, { user_id: currentUser.id })).select().single()
      .then(function(res) {
        if (res.error) { toast('Save failed: ' + res.error.message); return; }
        jokes.unshift(res.data); displayJokes = jokes.slice(); updateCounts();
        var scr = document.getElementById('screen-jokes');
        if (scr && scr.classList.contains('active')) renderJokes(displayJokes);
        setSyncStatus('synced');
        toast('Joke saved: "' + title + '" \u2713');
      });
  } else {
    nj.id = 'local-' + Date.now();
    jokes.unshift(nj); displayJokes = jokes.slice(); updateCounts();
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
      jokes[i].score = parseFloat((6 + jokes[i].rating * 0.5).toFixed(1));
      break;
    }
  }
  var eid = editingId;
  displayJokes = jokes.slice();
  closeEditModal();
  renderJokes(displayJokes);
  refreshSetViews();
  openDetail(eid);
  updateCounts();
  toast('Joke updated! \u2713');
}

var setLibSortable = null;
var setCanvasSortable = null;
var _setDragEndAt = 0;

function getSavedSets() {
  try { return JSON.parse(localStorage.getItem('c4a_saved_sets') || '[]') || []; } catch(e) { return []; }
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
  var found = null;
  for (var i=0;i<sets.length;i++){ if (String(sets[i].name) === String(name)) { found = sets[i]; break; } }
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
  var replaced = false;
  for (var i=0;i<sets.length;i++){
    if (String(sets[i].name).toLowerCase() === name.toLowerCase()) {
      sets[i].ids = ids; sets[i].savedAt = Date.now(); replaced = true; break;
    }
  }
  if (!replaced) sets.push({ name: name, ids: ids, savedAt: Date.now() });
  try {
    localStorage.setItem('c4a_saved_sets', JSON.stringify(sets));
    localStorage.setItem('c4a_active_set', JSON.stringify(ids));
  } catch(e) {}
  refreshSetNameSelect(name);
  toast('Saved "'+name+'" with '+ids.length+' joke'+(ids.length===1?'':'s')+' \u2713');
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

function deleteSavedSet(name) {
  var sets = getSavedSets().filter(function(s){ return String(s.name) !== String(name); });
  try { localStorage.setItem('c4a_saved_sets', JSON.stringify(sets)); } catch(e) {}
  refreshSetNameSelect();
}

function openMySetsModal() {
  var existing = document.getElementById('my-sets-modal');
  if (existing) existing.remove();
  var sets = getSavedSets().slice().sort(function(a,b){ return (b.savedAt||0) - (a.savedAt||0); });

  var modal = document.createElement('div');
  modal.id = 'my-sets-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;z-index:10001;font-family:Inter,sans-serif;padding:16px';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });

  var rows = '';
  if (!sets.length) {
    rows = '<div style="text-align:center;color:var(--text3);font-size:13px;padding:24px 8px">No saved sets yet.<br>Build a set and tap <strong>Save Set</strong>.</div>';
  } else {
    sets.forEach(function(s){
      var count = (s.ids || []).length;
      var nm = (s.name || 'Untitled').replace(/</g,'&lt;').replace(/'/g,"\\'");
      var nmAttr = (s.name || 'Untitled').replace(/'/g,"\\'");
      rows += '<div style="display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:1px solid var(--border)">'
        + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+nm+'</div>'
        + '<div style="font-size:11px;color:var(--text3)">'+count+' joke'+(count===1?'':'s')+'</div></div>'
        + '<button class="btn btn-sm btn-primary" onclick="loadSavedSet(\''+nmAttr+'\');closeMySetsModal()">Load</button>'
        + '<button class="btn btn-sm btn-danger" onclick="deleteSavedSet(\''+nmAttr+'\');openMySetsModal()">Delete</button>'
        + '</div>';
    });
  }

  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg);padding:20px;border-radius:14px;border:1px solid var(--border);width:min(440px,100%);max-height:80vh;display:flex;flex-direction:column';
  box.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
    + '<div style="font-weight:700;color:var(--text);font-size:15px">My Sets</div>'
    + '<button class="btn btn-sm" onclick="closeMySetsModal()">Close</button></div>'
    + '<div style="overflow-y:auto" class="scroll">' + rows + '</div>';
  modal.appendChild(box);
  document.body.appendChild(modal);
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
  var lower = q.toLowerCase().trim();
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
    if (!lower) { item.style.display = ''; return; }
    var match = j.title.toLowerCase().indexOf(lower) !== -1
      || (j.body && j.body.toLowerCase().indexOf(lower) !== -1)
      || (j.tags && j.tags.some(function(t){ return t.toLowerCase().indexOf(lower) !== -1; }));
    item.style.display = match ? '' : 'none';
    var titleDiv = item.querySelector('[data-title]');
    if (titleDiv) {
      if (match && lower) {
        var escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        titleDiv.innerHTML = j.title.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark style="background:#ffe066;color:#26150f;border-radius:2px;padding:0 1px">$1</mark>');
      } else {
        titleDiv.textContent = j.title;
      }
    }
  });
}

var _libLastTouch = 0;
function renderSet() {
  refreshSetNameSelect();
  var setTagFilter = document.getElementById('set-tag-filter');
  if (setTagFilter) {
    var allTags = [];
    jokes.forEach(function(j){ j.tags.forEach(function(t){ if (allTags.indexOf(t)===-1) allTags.push(t); }); });
    setTagFilter.innerHTML = '<option value="">All Tags</option>' + allTags.map(function(t){ return '<option value="'+t+'">'+t+'</option>'; }).join('');
  }

  var lib = document.getElementById('set-lib');
  if (lib) {
    lib.innerHTML = jokes.map(function(j){
      var color = j.tier==='a'?'var(--gold)':j.tier==='b'?'var(--blue)':'var(--text3)';
      return '<div data-jid="'+j.id+'" class="set-lib-item" style="display:flex;align-items:center;gap:8px;padding:9px 10px 9px 12px;border-bottom:1px solid var(--border);border-left:3px solid '+color+';transition:background .12s;cursor:pointer" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'\'">'
        +'<div style="flex:1;min-width:0"><div data-title style="font-size:12px;font-weight:500;color:var(--text)">'+j.title+'</div><div style="font-size:10px;color:var(--text3)">'+j.runtime+'</div><div style="font-size:9px;color:var(--text3);margin-top:2px;opacity:.6">tap to open &middot; + to add</div></div>'
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
          if (e.target.closest('.set-lib-item')) {
            var jid = item.getAttribute('data-jid');
            if (jid) openDetail(jid);
          }
        });
      })(libItems[li]);
    }

    if (setLibSortable) setLibSortable.destroy();
    
    if (typeof Sortable !== 'undefined') {
      setLibSortable = new Sortable(lib, {
        group: { name: 'setbuilder', pull: 'clone', put: false },
        sort: false,
        animation: 150,
        draggable: '.set-lib-item',
        filter: '.set-lib-add',
        preventOnFilter: false,
        forceFallback: true,
        fallbackOnBody: true,
        fallbackTolerance: 4,
        delay: 160,
        delayOnTouchOnly: true,
        touchStartThreshold: 8
      });
    }
  }

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
        },
        onEnd: function() {
          _setDragEndAt = Date.now();
          recalcSetRuntime();
          persistCurrentSet();
        },
        onRemove: function() {
          recalcSetRuntime();
          persistCurrentSet();
        }
      });
      recalcSetRuntime();
    }
    restoreActiveSetIfEmpty();
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
}

function persistCurrentSet() {
  var canvas = document.getElementById('set-canvas');
  if (!canvas) return;
  var ids = [];
  canvas.querySelectorAll('.sslot[data-jid]').forEach(function(s){ ids.push(String(s.getAttribute('data-jid'))); });
  try { localStorage.setItem('c4a_active_set', JSON.stringify(ids)); } catch(e) {}
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
  toast('Added "'+j.title+'" to your set \u2713');
}

function moveSetSlot(btn, dir) {
  var el = btn;
  while (el && !el.classList.contains('sslot')) { el = el.parentElement; }
  if (!el) return;
  var canvas = document.getElementById('set-canvas');
  if (!canvas) return;
  if (dir < 0) {
    var prev = el.previousElementSibling;
    while (prev && !prev.classList.contains('sslot')) { prev = prev.previousElementSibling; }
    if (prev) canvas.insertBefore(el, prev);
  } else {
    var next = el.nextElementSibling;
    while (next && !next.classList.contains('sslot')) { next = next.nextElementSibling; }
    if (next) canvas.insertBefore(next, el);
  }
  recalcSetRuntime();
  persistCurrentSet();
}

function removeSetSlot(btn) {
  var el = btn;
  while (el && !el.classList.contains('sslot')) { el = el.parentElement; }
  if (el) {
    var canvas = document.getElementById('set-canvas');
    el.remove(); 
    if (canvas && canvas.querySelectorAll('.sslot').length === 0) {
      canvas.innerHTML = '<div class="set-empty-hint" style="text-align:center;padding:30px;color:var(--text3);font-size:12px;border:2px dashed var(--border2);border-radius:var(--r2)">Tap + or drag a joke here to build your set</div>';
    }
    recalcSetRuntime(); 
    syncLibraryToCanvas();
    persistCurrentSet();
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
