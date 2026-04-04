// - SIDEBAR TOGGLE -
var sidebarCollapsed = false;
var isMobile = function(){ return window.innerWidth <= 700; };

function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  var btns = document.querySelectorAll('.nav-toggle');
  if (isMobile()) {
    var isOpen = sb.classList.contains('mobile-open');
    if (isOpen) {
      sb.classList.remove('mobile-open');
      overlay.classList.remove('show');
      for (var i=0;i<btns.length;i++) btns[i].classList.remove('open');
    } else {
      sb.classList.remove('collapsed');
      sb.classList.add('mobile-open');
      overlay.classList.add('show');
      for (var i=0;i<btns.length;i++) btns[i].classList.add('open');
    }
  } else {
    sidebarCollapsed = !sidebarCollapsed;
    sb.classList.toggle('collapsed', sidebarCollapsed);
    for (var i=0;i<btns.length;i++) btns[i].classList.toggle('open', sidebarCollapsed);
  }
}

function closeSidebar() {
  var sb = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  var btns = document.querySelectorAll('.nav-toggle');
  sb.classList.remove('mobile-open');
  overlay.classList.remove('show');
  for (var i=0;i<btns.length;i++) btns[i].classList.remove('open');
}

// - NAVIGATION -
function go(name) {
  var screens = document.querySelectorAll('.screen');
  for (var i=0;i<screens.length;i++) screens[i].classList.remove('active');
  var navItems = document.querySelectorAll('.nav-item');
  for (var i=0;i<navItems.length;i++) navItems[i].classList.remove('active');
  var el = document.getElementById('screen-'+name);
  if (el) el.classList.add('active');
  var ni = document.querySelectorAll('.nav-item[data-screen="'+name+'"]');
  for (var i=0;i<ni.length;i++) ni[i].classList.add('active');
  if (name==='home') {}
  if (name==='jokes') renderJokes(displayJokes);
  if (name==='sets') renderSet();
  if (name==='analytics') renderAnalytics();
  if (name==='rehearsal') {
    if (!rehearsalData.length) {
      toast('Add a few jokes first to start rehearsing.');
      go('jokes');
      return;
    }
    initRehearsal();
  }
  if (name==='recording') {
    if (typeof renderWaveform === 'function') renderWaveform();
    if (typeof renderRecList === 'function') renderRecList();
    else if (typeof renderRecListReal === 'function') renderRecListReal();
    if (typeof renderMoments === 'function') renderMoments();
  }
  if (name==='studio') renderStudio();
  if (name==='versions') renderVersions();
  if (name==='shows') renderShows();
  if (name==='settings') showTab('profile', document.querySelector('.snav-item'));
  if (name==='brooks') {
    updateBrooksContext();
    try {
      var saved = localStorage.getItem('c4a_apikey') || '';
      if (saved) {
        apiKey = saved;
        var ki = document.getElementById('api-key-input');
        if (ki) ki.value = saved;
      }
    } catch(e) {}
  }
  updateCounts();
  if (isMobile()) closeSidebar();
}
var navItems = document.querySelectorAll('.nav-item[data-screen]');
for (var i=0;i<navItems.length;i++) {
  (function(item){ item.addEventListener('click', function(){ go(item.dataset.screen); }); })(navItems[i]);
}

function updateCounts() {
  var nb = document.getElementById('nb-jokes');
  var dc = document.getElementById('dash-count');
  var ac = document.getElementById('analytics-count');
  var total = jokes.length;
  if (nb) nb.textContent = total + (archivedJokes.length ? '+'+archivedJokes.length+'[archived]' : '');
  if (dc) dc.textContent = total;
  if (ac) ac.textContent = total;
}

// - ACTIVITY FEED -
var actFeed = document.getElementById('activity-feed');
if (actFeed) {
  var acts = [
    {c:'#2d7a35',t:'New joke added: <strong>"Grocery self-checkout"</strong>',time:'2h ago'},
    {c:'#b07d10',t:'Set updated: <strong>"The Weekender"</strong>',time:'5h ago'},
    {c:'#1a5aa0',t:'Recording transcribed: <strong>Laugh Factory 3/22</strong>',time:'1d ago'},
    {c:'#6830a0',t:'Brooks AI suggestion saved',time:'2d ago'}
  ];
  actFeed.innerHTML = acts.map(function(a){
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--text2)"><span style="width:7px;height:7px;border-radius:50%;background:'+a.c+';flex-shrink:0"></span><span style="flex:1">'+a.t+'</span><span style="color:var(--text3);font-size:10px;white-space:nowrap">'+a.time+'</span></div>';
  }).join('');
}

// - TOAST -
function toast(msg){
  var el=document.getElementById('toast-el');
  if(!el) return;
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t=setTimeout(function(){el.classList.remove('show');},2600);
}

// - KEYBOARD SHORTCUTS -
document.addEventListener('keydown',function(e){
  if(document.getElementById('joke-modal').style.display!=='none') return;
  var tag=e.target.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return;
  if(e.key==='n'||e.key==='N') openNewJoke();
  if(e.key==='r'||e.key==='R') go('rehearsal');
  if(e.key==='b'||e.key==='B') go('brooks');
  if(e.key==='a'||e.key==='A') go('analytics');
  if(e.key==='Escape') closeNewJoke();
  var rScreen=document.getElementById('screen-rehearsal');
  if(rScreen&&rScreen.classList.contains('active')){
    if(e.key==='ArrowRight') nextJoke();
    if(e.key===' '){e.preventDefault();togglePunch();}
  }
});

// - DARK MODE -
function toggleDark() {
  var isDark = document.body.classList.toggle('dark');
  var btn = document.getElementById('dark-btn');
  if (btn) btn.textContent = isDark ? '\u2600\ufe0f' : '\ud83c\udf19';
  try { localStorage.setItem('c4a_dark', isDark ? '1' : '0'); } catch(e) {}
}

// -- CUSTOM TAGS --
function addCustomTag() {
  var input = document.getElementById('custom-tag-input');
  if (!input) return;
  var tag = input.value.trim();
  if (!tag) return;
  var container = document.getElementById('custom-tags-container');
  if (container) {
    var span = document.createElement('span');
    span.className = 'tag tag-gold';
    span.style.cssText = 'cursor:pointer;opacity:1';
    span.textContent = tag;
    span.onclick = function() { toggleTag(this, tag); };
    container.appendChild(span);
    toggleTag(span, tag);
  }
  input.value = '';
}

// -- EXPORT SET --
function exportSet() {
  var setName = (document.getElementById('set-name-el') || {}).textContent || 'My Set';
  var items = document.querySelectorAll('#set-list .set-item-title');
  if (!items.length) { toast('No jokes in set to export!'); return; }
  var lines = ['SET LIST: ' + setName, '='.repeat(40), ''];
  items.forEach(function(el, i) {
    lines.push((i+1) + '. ' + el.textContent);
  });
  lines.push('', 'Generated by Comedy 4 All');
  var blob = new Blob([lines.join('\n')], {type:'text/plain'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = setName.replace(/[^a-z0-9]/gi,'_') + '_setlist.txt';
  a.click();
  toast('Set exported!');
}

function updateSetRuntime() {
  var el = document.getElementById('set-total-runtime');
  if (!el) return;
  var items = document.querySelectorAll('#set-list .set-item');
  var totalSecs = 0;
  items.forEach(function(item) {
    var rt = item.getAttribute('data-runtime') || '1:00';
    var parts = rt.split(':');
    totalSecs += (parseInt(parts[0])||0)*60 + (parseInt(parts[1])||0);
  });
  var mins = Math.floor(totalSecs/60);
  var secs = totalSecs%60;
  el.textContent = mins + ':' + (secs<10?'0':'')+secs + ' total';
}
