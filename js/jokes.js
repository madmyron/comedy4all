// - JOKE MANAGER -
function tagColor(t) {
  if (t==='Travel') return 'gold';
  if (t==='Tech') return 'blue';
  if (t==='Dating') return 'purple';
  if (t==='Family') return 'green';
  return 'gray';
}

function renderJokes(list) {
  var grid = document.getElementById('joke-grid');
  var cnt = document.getElementById('joke-count');
  if (!grid) return;
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
      +'<div class="jmeta"><span class="stars">'+stars+'</span><span style="font-family:\'DM Mono\',monospace;color:var(--text3);font-size:10px">'+j.runtime+'</span><span style="color:var('+(j.score>=8?'--gold':j.score>=7?'--blue':'--text3')+');font-weight:600">'+j.score+'</span></div>'
      +'</div>';
  }).join('');
  var cards = grid.querySelectorAll('[data-jid]');
  for (var ci=0; ci<cards.length; ci++) {
    (function(el) {
      el.addEventListener('click', function() { openDetail(el.getAttribute('data-jid')); });
    })(cards[ci]);
  }
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
  var tierLabel = j.tier==='a'?'<span class="tag tag-gold">A-Tier</span>':j.tier==='b'?'<span class="tag tag-blue">B-Tier</span>':'<span class="tag tag-gray">C-Tier</span>';
  var mobileBar = '<div class="detail-close-bar" style="display:none;align-items:center;justify-content:center;padding:10px 14px 8px;border-bottom:1px solid var(--border);flex-shrink:0;position:relative">'
    +'<div style="width:40px;height:4px;background:var(--border2);border-radius:2px"></div>'
    +'<button onclick="closeDetail()" style="position:absolute;right:12px;top:8px;background:var(--bg3);border:1px solid var(--border2);border-radius:20px;font-size:12px;font-weight:600;color:var(--text2);padding:5px 14px;cursor:pointer;">x Close</button>'
    +'</div>';
  panel.innerHTML = mobileBar
    +'<div style="padding:14px;border-bottom:1px solid var(--border);flex-shrink:0">'
    +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">'
    +'<div style="font-size:13px;font-weight:600;color:var(--text);line-height:1.4">'+j.title+(isArchived?'<span class="archive-badge">[archived] Archived</span>':'')+'</div>'
    +'<button class="btn btn-sm" onclick="closeDetail()" style="flex-shrink:0;padding:3px 8px;font-size:11px">x</button>'
    +'</div>'
    +'<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">'+j.tags.map(function(t){return '<span class="tag tag-'+tagColor(t)+'">'+t+'</span>';}).join('')+' '+tierLabel+'</div>'
    +'<div style="display:flex;gap:14px;font-size:11px;color:var(--text3)"><span> '+j.runtime+'</span><span style="color:var(--gold)">'+stars+'</span><span style="color:var('+(j.score>=8?'--gold':'--blue')+');font-weight:600">'+j.score+'/10</span></div>'
    +'</div>'
    +'<div style="flex:1;overflow-y:auto;padding:14px" class="scroll">'
    +'<div class="sect-title">Material</div>'
    +'<div style="font-size:12.5px;line-height:1.85;color:var(--text2);margin-bottom:16px;white-space:pre-wrap">'+j.body+'</div>'
    +'<div class="sect-title">Brooks Notes</div>'
    +'<div style="font-size:11.5px;color:var(--text2);background:var(--gold-bg);border:1px solid var(--gold-br);border-radius:var(--r2);padding:10px 12px;line-height:1.65;margin-bottom:6px">Strong '+j.tier.toUpperCase()+'-tier material. '+(j.score>=8?'Consistent crowd pleaser -- protect it in your set.':'Room to tighten the setup. Try cutting 10-15 seconds from the lead-in.')+'</div>'
    +'</div>'
    +'<div class="detail-actions">'
    +'<button class="btn btn-primary btn-sm" onclick="toast(\'Added to set!\')">+ Add to Set</button>'
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
  var pool = jokes;
  displayJokes = q ? pool.filter(function(j){
    return j.title.toLowerCase().indexOf(q.toLowerCase())>-1 || j.body.toLowerCase().indexOf(q.toLowerCase())>-1;
  }) : pool.slice();
  renderJokes(displayJokes);
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
function saveNewJoke() {
  var titleEl = document.getElementById('nj-title');
  var bodyEl = document.getElementById('nj-body');
  var runtimeEl = document.getElementById('nj-runtime');
  var title = titleEl ? titleEl.value.trim() : '';
  if (!title) { toast('Please add a title!'); return; }
  var newJoke = {
    id: nextId++,
    title: title,
    body: bodyEl ? bodyEl.value.trim() || 'No notes yet.' : 'No notes yet.',
    tags: modalTags.length ? modalTags.slice() : ['Work'],
    tier: modalRating >= 4 ? 'a' : modalRating >= 3 ? 'b' : 'c',
    rating: modalRating || 3,
    runtime: runtimeEl ? runtimeEl.value.trim() || '1:00' : '1:00',
    score: parseFloat((6 + modalRating * 0.5).toFixed(1))
  };
  jokes.unshift(newJoke);
  displayJokes = jokes.slice();
  closeNewJoke();
  updateCounts();
  if (document.getElementById('screen-jokes').classList.contains('active')) {
    renderJokes(displayJokes);
  }
  if (document.getElementById('screen-analytics').classList.contains('active')) {
    renderAnalytics();
  }
  toast('Joke saved: "' + title + '" \u2713');
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
  var tagEls = document.querySelectorAll('#edit-modal-tags .edit-tag');
  for (var i=0;i<tagEls.length;i++) {
    var tagName = tagEls[i].textContent.trim();
    tagEls[i].classList.toggle('off', j.tags.indexOf(tagName)===-1);
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
      jokes[i].tags = modalTags.length ? modalTags.slice() : jokes[i].tags;
      jokes[i].score = parseFloat((6 + jokes[i].rating * 0.5).toFixed(1));
      break;
    }
  }
  displayJokes = jokes.slice();
  closeEditModal();
  renderJokes(displayJokes);
  openDetail(editingId);
  updateCounts();
  toast('Joke updated! \u2713');
}

function renderSet() {
  var lib = document.getElementById('set-lib');
  if (lib) {
    lib.innerHTML = jokes.map(function(j){
      var color = j.tier==='a'?'var(--gold)':j.tier==='b'?'var(--blue)':'var(--text3)';
      return '<div style="display:flex;align-items:flex-start;gap:7px;padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .12s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'\'" onclick="toast(\'Added: '+j.title.replace(/'/g,'&#39;')+'\')">'
        +'<div style="width:6px;height:6px;border-radius:50%;margin-top:5px;background:'+color+';flex-shrink:0"></div>'
        +'<div><div style="font-size:12px;font-weight:500;color:var(--text)">'+j.title+'</div><div style="font-size:10px;color:var(--text3)">'+j.runtime+' - '+j.score+'/10</div></div>'
        +'</div>';
    }).join('');
  }
  var canvas = document.getElementById('set-canvas');
  var setJ = jokes.slice(0, 7);
  var t = 0;
  if (canvas) {
    canvas.innerHTML = setJ.map(function(j,i){
      var m=Math.floor(t/60), s=t%60, ts=m+':'+(s<10?'0':'')+s;
      var parts=j.runtime.split(':');
      t += parseInt(parts[0])*60+(parseInt(parts[1])||0);
      var color = j.tier==='a'?'var(--gold)':j.tier==='b'?'var(--blue)':'var(--text3)';
      return '<div class="sslot"><div class="sslot-num">'+(i+1)+'</div>'
        +'<div class="sslot-card" style="border-left:3px solid '+color+'"><div style="font-size:12px;font-weight:600;color:var(--text)">'+j.title+'</div><div style="font-size:10px;color:var(--text3);font-family:\'DM Mono\',monospace">'+j.runtime+' - '+j.score+'/10</div></div>'
        +'<div class="sslot-time">'+ts+'</div></div>'
        +(i<setJ.length-1?'<div style="margin-left:24px;margin-bottom:6px"><div class="sslot-card segue" onclick="toast(\'Add segue here\')"><div style="font-size:10px;color:var(--text3)">+ segue / crowd work</div></div></div>':'');
    }).join('');
  }
}
