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
  var brooksScreen = document.getElementById('screen-brooks');
  if (brooksScreen && brooksScreen.classList.contains('active') && name !== 'brooks') {
    if (typeof brooksHistory !== 'undefined' && brooksHistory.length > 2 && typeof _brooksConversationSaved !== 'undefined' && !_brooksConversationSaved) {
      if (typeof showBrooksSaveModal === 'function') {
        showBrooksSaveModal(
          function(title) { sbSaveBrooksConversation(function() { performGo(name); }, title); },
          function() { performGo(name); }
        );
        return;
      }
    }
  }
  performGo(name);
}

function performGo(name) {
  var screens = document.querySelectorAll('.screen');
  for (var i=0;i<screens.length;i++) screens[i].classList.remove('active');
  var navItems = document.querySelectorAll('.nav-item');
  for (var i=0;i<navItems.length;i++) navItems[i].classList.remove('active');
  var el = document.getElementById('screen-'+name);
  if (el) el.classList.add('active');
  if (name==='brooks' && typeof updateBrooksContext === 'function') updateBrooksContext();
  if (name==='brooks' && typeof startFreshBrooksSession === 'function') startFreshBrooksSession();
  if (name==='brooks' && typeof sbLoadBrooksConversations === 'function') sbLoadBrooksConversations();
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
  if (name==='studio') { renderStudio(); if (typeof sbLoadScripts === 'function') sbLoadScripts(); }
  if (name==='versions') renderVersions();
  if (name==='shows') renderShows();
  if (name==='settings') showTab('profile', document.querySelector('.snav-item'));
  if (name==='brooks') {
    updateBrooksContext();
    if (typeof initBrooksTags === 'function') initBrooksTags();
    if (apiKey && apiKey.length > 10) {
      document.querySelectorAll('.cmsg.ai').forEach(function(el) {
        if (el.textContent.indexOf('SETUP') !== -1) el.style.display = 'none';
      });
    }
    if (typeof syncBrooksApiKeyInputs === 'function') syncBrooksApiKeyInputs();
    try {
      var saved = localStorage.getItem('c4a_apikey') || '';
      if (saved) {
        apiKey = saved;
        if (typeof syncBrooksApiKeyInputs === 'function') syncBrooksApiKeyInputs(saved);
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

var themePresets = {
  classic: {
    name: 'Classic Stage',
    copy: 'Warm amber, parchment surfaces, and a traditional club-lounge feel.',
    swatches: ['#f7efe2','#b8822f','#3569b2','#5e8d4e'],
    dark: false,
    vars: {
      '--bg':'#f7efe2','--bg2':'#fffdf8','--bg3':'#f3e6d5','--bg4':'#e7d6bf',
      '--border':'#dcc8ae','--border2':'#cab291','--text':'#2b2018','--text2':'#685647','--text3':'#9a846f',
      '--gold':'#b8822f','--gold-bg':'#faefd9','--gold-br':'#d8b06d','--red':'#aa5b42','--red-bg':'#f6e7de',
      '--green':'#5e8d4e','--green-bg':'#eef6e8','--blue':'#3569b2','--blue-bg':'#e8effa','--purple':'#7a5fa0','--purple-bg':'#f1ebf8',
      '--sidebar-grad1':'#f2e4cb','--sidebar-grad2':'#ddc3a3',
      '--sidebar-text':'#2f251c','--sidebar-text-muted':'#6f5d4f','--sidebar-sect':'#9a846f',
      '--sidebar-badge-bg':'rgba(53,105,178,.08)','--sidebar-badge-text':'#6b5a4c',
      '--sidebar-hover-bg':'linear-gradient(90deg,rgba(184,130,47,.10),rgba(255,255,255,.45))','--sidebar-hover-text':'#2b2018',
      '--sidebar-active-text':'#8c5f16','--sidebar-active-border':'#b8822f','--sidebar-active-bg':'linear-gradient(90deg,rgba(184,130,47,.16),rgba(255,255,255,.6))',
      '--sidebar-chip-hover':'rgba(184,130,47,.08)',
      '--content-wash':'linear-gradient(180deg,#fbf6ee 0%,#f4eadc 56%,#efe1cf 100%)'
    }
  },
  ocean: {
    name: 'Ocean Blue',
    copy: 'Cooler blues and sea-glass neutrals for a calmer workspace.',
    swatches: ['#edf6fb','#0f6c9f','#2b8a6e','#f0a500'],
    dark: false,
    vars: {
      '--bg':'#edf6fb','--bg2':'#fcfeff','--bg3':'#e3eef5','--bg4':'#d6e3eb',
      '--border':'#c9d9e4','--border2':'#acc0ce','--text':'#15212b','--text2':'#4b6270','--text3':'#7b92a0',
      '--gold':'#c88818','--gold-bg':'#fff5df','--gold-br':'#efcb7f','--red':'#c44d3f','--red-bg':'#fff0ed',
      '--green':'#2b8a6e','--green-bg':'#eaf8f2','--blue':'#0f6c9f','--blue-bg':'#e9f4fb','--purple':'#5c5bb2','--purple-bg':'#efefff',
      '--sidebar-grad1':'#f6fbff','--sidebar-grad2':'#dceaf4',
      '--sidebar-text':'#163042','--sidebar-text-muted':'#577180','--sidebar-sect':'#7b92a0',
      '--sidebar-badge-bg':'rgba(15,108,159,.08)','--sidebar-badge-text':'#35586b',
      '--sidebar-hover-bg':'linear-gradient(90deg,rgba(15,108,159,.08),rgba(255,255,255,.4))','--sidebar-hover-text':'#163042',
      '--sidebar-active-text':'#0f6c9f','--sidebar-active-border':'#74b4d6','--sidebar-active-bg':'linear-gradient(90deg,rgba(15,108,159,.14),rgba(255,255,255,.55))',
      '--sidebar-chip-hover':'rgba(15,108,159,.08)',
      '--content-wash':'linear-gradient(180deg,#fafdff 0%,#edf6fb 100%)'
    }
  },
  sunburst: {
    name: 'Sunburst',
    copy: 'A bright orange-and-gold daytime look with more punch and warmth.',
    swatches: ['#fff5e8','#e67e22','#ffb347','#b6462f'],
    dark: false,
    vars: {
      '--bg':'#fff5e8','--bg2':'#fffdfa','--bg3':'#fde9d2','--bg4':'#f7d5b4',
      '--border':'#efc8a2','--border2':'#dfaf80','--text':'#2d1a10','--text2':'#7b553f','--text3':'#b08368',
      '--gold':'#e67e22','--gold-bg':'#fff0dd','--gold-br':'#f4b16c','--red':'#b6462f','--red-bg':'#fde8e2',
      '--green':'#5d9a43','--green-bg':'#eef8e7','--blue':'#3f78c9','--blue-bg':'#ebf2ff','--purple':'#9a5dbf','--purple-bg':'#f6edfc',
      '--sidebar-grad1':'#ffedd5','--sidebar-grad2':'#f4c78e',
      '--sidebar-text':'#3b2517','--sidebar-text-muted':'#7f5d47','--sidebar-sect':'#b08368',
      '--sidebar-badge-bg':'rgba(230,126,34,.10)','--sidebar-badge-text':'#8a5730',
      '--sidebar-hover-bg':'linear-gradient(90deg,rgba(230,126,34,.12),rgba(255,255,255,.5))','--sidebar-hover-text':'#2d1a10',
      '--sidebar-active-text':'#b85f11','--sidebar-active-border':'#e67e22','--sidebar-active-bg':'linear-gradient(90deg,rgba(230,126,34,.18),rgba(255,255,255,.65))',
      '--sidebar-chip-hover':'rgba(230,126,34,.08)',
      '--content-wash':'radial-gradient(circle at top left, rgba(255,179,71,.28), transparent 28%), linear-gradient(180deg,#fffaf2 0%,#fff1df 56%,#ffe5cf 100%)'
    }
  },
  backstage: {
    name: 'Backstage Blue',
    copy: 'A stronger blue theme with crisp cool surfaces and navy accents.',
    swatches: ['#eef4ff','#2f6fd6','#0f3b73','#67b6ff'],
    dark: false,
    vars: {
      '--bg':'#eef4ff','--bg2':'#fcfdff','--bg3':'#e1ebfb','--bg4':'#d2def4',
      '--border':'#c0d0ed','--border2':'#9fb6de','--text':'#16233a','--text2':'#4f678d','--text3':'#7f95ba',
      '--gold':'#2f6fd6','--gold-bg':'#e8f0ff','--gold-br':'#7da8ef','--red':'#c8575d','--red-bg':'#fdecef',
      '--green':'#2f8a74','--green-bg':'#e7f7f2','--blue':'#2f6fd6','--blue-bg':'#e8f0ff','--purple':'#7065c7','--purple-bg':'#efedff',
      '--sidebar-grad1':'#103563','--sidebar-grad2':'#1d5699',
      '--sidebar-text':'#f4f8ff','--sidebar-text-muted':'#c7d8f2','--sidebar-sect':'#8fb0dc',
      '--sidebar-badge-bg':'rgba(255,255,255,.10)','--sidebar-badge-text':'#edf4ff',
      '--sidebar-hover-bg':'linear-gradient(90deg,rgba(103,182,255,.18),rgba(255,255,255,.04))','--sidebar-hover-text':'#ffffff',
      '--sidebar-active-text':'#ffffff','--sidebar-active-border':'#67b6ff','--sidebar-active-bg':'linear-gradient(90deg,rgba(103,182,255,.22),rgba(255,255,255,.06))',
      '--sidebar-chip-hover':'rgba(103,182,255,.12)',
      '--content-wash':'radial-gradient(circle at top right, rgba(103,182,255,.18), transparent 24%), linear-gradient(180deg,#f7faff 0%,#eef4ff 100%)'
    }
  },
  headliner: {
    name: 'Headliner Red',
    copy: 'A richer red-and-rose club look with bold warm accents.',
    swatches: ['#fff1ef','#b73a3a','#f08a5d','#7b1f34'],
    dark: false,
    vars: {
      '--bg':'#fff1ef','--bg2':'#fffdfb','--bg3':'#f9e2de','--bg4':'#efc6c0',
      '--border':'#e7b9b1','--border2':'#d48f85','--text':'#2b1717','--text2':'#774b48','--text3':'#ad7771',
      '--gold':'#b73a3a','--gold-bg':'#fde7e4','--gold-br':'#e38b7a','--red':'#b73a3a','--red-bg':'#fde7e4',
      '--green':'#4d8b63','--green-bg':'#ecf7ef','--blue':'#4e74c7','--blue-bg':'#eef2ff','--purple':'#8d4e9d','--purple-bg':'#f5ecfa',
      '--sidebar-grad1':'#7b1f34','--sidebar-grad2':'#c04c46',
      '--sidebar-text':'#fff3f1','--sidebar-text-muted':'#f1c8c2','--sidebar-sect':'#dea19a',
      '--sidebar-badge-bg':'rgba(255,255,255,.10)','--sidebar-badge-text':'#fff0ee',
      '--sidebar-hover-bg':'linear-gradient(90deg,rgba(240,138,93,.16),rgba(255,255,255,.05))','--sidebar-hover-text':'#ffffff',
      '--sidebar-active-text':'#ffffff','--sidebar-active-border':'#ffd2c3','--sidebar-active-bg':'linear-gradient(90deg,rgba(255,210,195,.22),rgba(255,255,255,.06))',
      '--sidebar-chip-hover':'rgba(255,210,195,.12)',
      '--content-wash':'radial-gradient(circle at top left, rgba(240,138,93,.18), transparent 24%), linear-gradient(180deg,#fff7f5 0%,#fff1ef 100%)'
    }
  },
  spotlight: {
    name: 'Spotlight',
    copy: 'Bolder burgundy sidebar, brighter stage lights, and more theatrical contrast.',
    swatches: ['#fff6ee','#cc6f2f','#3c67c7','#8a4fa0'],
    dark: false,
    vars: {
      '--bg':'#fff6ee','--bg2':'#fffdf9','--bg3':'#fbecdf','--bg4':'#f2ddca',
      '--border':'#e6cdb8','--border2':'#d7b79e','--text':'#26150f','--text2':'#6f5144','--text3':'#a27e72',
      '--gold':'#cc6f2f','--gold-bg':'#fff0dc','--gold-br':'#f2b178','--red':'#a9443d','--red-bg':'#fbe7e2',
      '--green':'#2f7d57','--green-bg':'#e9f7ef','--blue':'#3c67c7','--blue-bg':'#eaf0ff','--purple':'#8a4fa0','--purple-bg':'#f5ecfb',
      '--sidebar-grad1':'#5b1e25','--sidebar-grad2':'#2f0f14',
      '--sidebar-text':'#fff6ef','--sidebar-text-muted':'rgba(255,232,218,.7)','--sidebar-sect':'rgba(255,232,218,.58)',
      '--sidebar-badge-bg':'rgba(255,247,240,.12)','--sidebar-badge-text':'rgba(255,238,228,.84)',
      '--sidebar-hover-bg':'linear-gradient(90deg,rgba(255,213,174,.16),rgba(255,255,255,.04))','--sidebar-hover-text':'#fffaf5',
      '--sidebar-active-text':'#fff8f2','--sidebar-active-border':'#ffd8a9','--sidebar-active-bg':'linear-gradient(90deg,rgba(255,191,138,.32),rgba(255,255,255,.09))',
      '--sidebar-chip-hover':'rgba(255,213,174,.14)',
      '--content-wash':'radial-gradient(circle at top left, rgba(255,193,122,.24), transparent 28%), radial-gradient(circle at top right, rgba(138,79,160,.10), transparent 24%), linear-gradient(180deg,#fff8f1 0%,#fff1e4 52%,#fde9dd 100%)'
    }
  },
  spring: {
    name: 'Spring',
    copy: 'Soft floral pinks with a warmer, lighter club-lounge feel.',
    swatches: ['#fdf6fb','#f7eef7','#c45fa0','#3a1a3a'],
    dark: false,
    vars: {
      '--bg':'#fdf6fb','--bg2':'#f7eef7','--bg3':'#efe0ef','--bg4':'#e8d5e8',
      '--border':'#dbb8db','--border2':'#cfa0cf',
      '--text':'#3a1a3a','--text2':'#6b3d6b','--text3':'#9a6a9a',
      '--gold':'#c45fa0','--gold-bg':'#fce8f5','--gold-br':'#e8a0d0',
      '--sidebar-grad1':'#c45fa0','--sidebar-grad2':'#a03880',
      '--sidebar-text':'#ffffff','--sidebar-active-text':'#fce8f5'
    }
  },
  summer: {
    name: 'Summer',
    copy: 'Bright citrus warmth with a clean daylight glow.',
    swatches: ['#fff9f0','#fff0d6','#ff6b1a','#2d1a00'],
    dark: false,
    vars: {
      '--bg':'#fff9f0','--bg2':'#fff0d6','--bg3':'#ffe5b8','--bg4':'#ffd99a',
      '--border':'#ffbe5c','--border2':'#ff9f1c',
      '--text':'#2d1a00','--text2':'#7a4400','--text3':'#b36a00',
      '--gold':'#ff6b1a','--gold-bg':'#fff0e0','--gold-br':'#ffb380',
      '--sidebar-grad1':'#ff6b1a','--sidebar-grad2':'#cc4400',
      '--sidebar-text':'#ffffff','--sidebar-active-text':'#fff0e0'
    }
  },
  ocean: {
    name: 'Ocean',
    copy: 'Cool blue water tones with a clean, open-air feel.',
    swatches: ['#f0f8ff','#dff0ff','#0090e0','#001a33'],
    dark: false,
    vars: {
      '--bg':'#f0f8ff','--bg2':'#dff0ff','--bg3':'#c0e4ff','--bg4':'#a0d4ff',
      '--border':'#60b0f0','--border2':'#2080d0',
      '--text':'#001a33','--text2':'#004080','--text3':'#0060c0',
      '--gold':'#0090e0','--gold-bg':'#e0f4ff','--gold-br':'#80ccff',
      '--sidebar-grad1':'#0090e0','--sidebar-grad2':'#0050a0',
      '--sidebar-text':'#ffffff','--sidebar-active-text':'#e0f4ff'
    }
  },
  sunset: {
    name: 'Sunset',
    copy: 'Warm rose and ember tones with a softer late-night glow.',
    swatches: ['#fff5f5','#ffe8e8','#ff3366','#2d0000'],
    dark: false,
    vars: {
      '--bg':'#fff5f5','--bg2':'#ffe8e8','--bg3':'#ffd0d0','--bg4':'#ffb8b8',
      '--border':'#ff8080','--border2':'#ff4040',
      '--text':'#2d0000','--text2':'#800000','--text3':'#c00000',
      '--gold':'#ff3366','--gold-bg':'#ffe0e8','--gold-br':'#ff99aa',
      '--sidebar-grad1':'#ff3366','--sidebar-grad2':'#cc0044',
      '--sidebar-text':'#ffffff','--sidebar-active-text':'#ffe0e8'
    }
  },
  lime: {
    name: 'Lime',
    copy: 'A loud green room with neon energy and a bright comic-book edge.',
    swatches: ['#f4fff4','#c0ffc0','#00cc00','#002200'],
    dark: false,
    vars: {
      '--bg':'#f4fff4','--bg2':'#e0ffe0','--bg3':'#c0ffc0','--bg4':'#a0ffa0',
      '--border':'#40dd40','--border2':'#20bb20',
      '--text':'#002200','--text2':'#005500','--text3':'#008800',
      '--gold':'#00cc00','--gold-bg':'#e0ffe0','--gold-br':'#80ff80',
      '--sidebar-grad1':'#00cc00','--sidebar-grad2':'#008800',
      '--sidebar-text':'#ffffff','--sidebar-active-text':'#e0ffe0'
    }
  },
  cherry: {
    name: 'Cherry',
    copy: 'A bright red pop-art palette with clean contrast and punch.',
    swatches: ['#ffffff','#fff0f0','#ff0000','#1a0000'],
    dark: false,
    vars: {
      '--bg':'#ffffff','--bg2':'#fff0f0','--bg3':'#ffd0d0','--bg4':'#ffb0b0',
      '--border':'#ff2020','--border2':'#cc0000',
      '--text':'#1a0000','--text2':'#660000','--text3':'#cc0000',
      '--gold':'#ff0000','--gold-bg':'#fff0f0','--gold-br':'#ff8080',
      '--sidebar-grad1':'#ff0000','--sidebar-grad2':'#aa0000',
      '--sidebar-text':'#ffffff','--sidebar-active-text':'#fff0f0'
    }
  },
  lemon: {
    name: 'Lemon',
    copy: 'A zesty yellow palette with sharp daylight brightness.',
    swatches: ['#fffff0','#ffffd0','#cccc00','#1a1a00'],
    dark: false,
    vars: {
      '--bg':'#fffff0','--bg2':'#ffffd0','--bg3':'#ffff90','--bg4':'#ffff50',
      '--border':'#dddd00','--border2':'#aaaa00',
      '--text':'#1a1a00','--text2':'#555500','--text3':'#888800',
      '--gold':'#cccc00','--gold-bg':'#fffff0','--gold-br':'#eeee80',
      '--sidebar-grad1':'#cccc00','--sidebar-grad2':'#888800',
      '--sidebar-text':'#ffffff','--sidebar-active-text':'#fffff0'
    }
  },
  tangerine: {
    name: 'Tangerine',
    copy: 'A warm orange glow with soft cream surfaces and stage heat.',
    swatches: ['#fffaf5','#fff0e0','#ff7700','#1a0800'],
    dark: false,
    vars: {
      '--bg':'#fffaf5','--bg2':'#fff0e0','--bg3':'#ffd8a8','--bg4':'#ffbf70',
      '--border':'#ff8800','--border2':'#dd6600',
      '--text':'#1a0800','--text2':'#663300','--text3':'#cc6600',
      '--gold':'#ff7700','--gold-bg':'#fff0e0','--gold-br':'#ffaa55',
      '--sidebar-grad1':'#ff7700','--sidebar-grad2':'#cc4400',
      '--sidebar-text':'#ffffff','--sidebar-active-text':'#fff0e0'
    }
  },
  tropical: {
    name: 'Tropical',
    copy: 'A breezy aqua-and-mint palette with bright island contrast.',
    swatches: ['#f0fffc','#d0fff5','#00cc99','#001a14'],
    dark: false,
    vars: {
      '--bg':'#f0fffc','--bg2':'#d0fff5','--bg3':'#a0ffe8','--bg4':'#60ffd8',
      '--border':'#00ddaa','--border2':'#00aa80',
      '--text':'#001a14','--text2':'#005540','--text3':'#008860',
      '--gold':'#00cc99','--gold-bg':'#d0fff5','--gold-br':'#80ffdd',
      '--sidebar-grad1':'#00cc99','--sidebar-grad2':'#008866',
      '--sidebar-text':'#ffffff','--sidebar-active-text':'#d0fff5'
    }
  },
  sunshine: {
    name: 'Sunshine',
    copy: 'A bright yellow stage-light palette with a sharp daytime punch.',
    swatches: ['#ffffff','#fffde0','#f5c400','#1a1400'],
    dark: false,
    vars: {
      '--bg':'#ffffff','--bg2':'#fffde0','--bg3':'#fff99a','--bg4':'#fff500',
      '--border':'#f0d000','--border2':'#c0a000',
      '--text':'#1a1400','--text2':'#4a3c00','--text3':'#8a7000',
      '--gold':'#f5c400','--gold-bg':'#fffde0','--gold-br':'#ffe860',
      '--sidebar-grad1':'#f5c400','--sidebar-grad2':'#c09000',
      '--sidebar-text':'#1a1400','--sidebar-active-text':'#ffffff'
    }
  },
  'neon-green': {
    name: 'Neon Green',
    copy: 'A hard-edged electric green theme with a clean, high-voltage look.',
    swatches: ['#ffffff','#f0fff0','#00dd00','#001a00'],
    dark: false,
    vars: {
      '--bg':'#ffffff','--bg2':'#f0fff0','--bg3':'#ccffcc','--bg4':'#99ff99',
      '--border':'#00ee00','--border2':'#00bb00',
      '--text':'#001a00','--text2':'#004400','--text3':'#007700',
      '--gold':'#00dd00','--gold-bg':'#eeffee','--gold-br':'#66ff66',
      '--sidebar-grad1':'#00dd00','--sidebar-grad2':'#009900',
      '--sidebar-text':'#ffffff','--sidebar-active-text':'#eeffee'
    }
  },
  midnight: {
    name: 'Midnight Club',
    copy: 'A smoky charcoal club with gold accents and low-light warmth.',
    swatches: ['#161311','#ddb24d','#8e6dd1','#4aa36d'],
    dark: true,
    vars: {
      '--bg':'#161311','--bg2':'#201b18','--bg3':'#2a2420','--bg4':'#352e2a',
      '--border':'#3e3731','--border2':'#534a43','--text':'#f4efe9','--text2':'#c0b6ad','--text3':'#7d746d',
      '--gold':'#ddb24d','--gold-bg':'#2d2412','--gold-br':'#65511f','--red':'#ca6a58','--red-bg':'#2f1714',
      '--green':'#4aa36d','--green-bg':'#11261a','--blue':'#6f86d6','--blue-bg':'#162034','--purple':'#8e6dd1','--purple-bg':'#21172f',
      '--sidebar-grad1':'#2a221c','--sidebar-grad2':'#15110f',
      '--sidebar-text':'#f4efe9','--sidebar-text-muted':'#c0b6ad','--sidebar-sect':'#8b8178',
      '--sidebar-badge-bg':'rgba(255,255,255,.07)','--sidebar-badge-text':'#efe7dc',
      '--sidebar-hover-bg':'linear-gradient(90deg,rgba(221,178,77,.10),rgba(255,255,255,.02))','--sidebar-hover-text':'#fff8ee',
      '--sidebar-active-text':'#fff8ee','--sidebar-active-border':'#ddb24d','--sidebar-active-bg':'linear-gradient(90deg,rgba(221,178,77,.16),rgba(255,255,255,.04))',
      '--sidebar-chip-hover':'rgba(221,178,77,.08)',
      '--content-wash':'radial-gradient(circle at top left, rgba(221,178,77,.14), transparent 22%), radial-gradient(circle at bottom right, rgba(142,109,209,.10), transparent 22%), linear-gradient(180deg,#241d19 0%,#161311 100%)',
      '--logo-grad1':'#f0c062','--logo-grad2':'#8f5f08','--brooks-bg1':'#2c241d','--brooks-bg2':'#191410',
      '--nav-active-shadow':'rgba(221,178,77,.22)','--surface-pop':'0 14px 34px rgba(0,0,0,.34)'
    }
  },
  greenroom: {
    name: 'Green Room',
    copy: 'A moody backstage palette with deep green walls and warm brass accents.',
    swatches: ['#16231c','#6fbf8f','#d7a24a','#e8e1d7'],
    dark: true,
    vars: {
      '--bg':'#121915','--bg2':'#19231e','--bg3':'#223029','--bg4':'#2b3d34',
      '--border':'#31453b','--border2':'#446053','--text':'#eef3ed','--text2':'#b7c5bc','--text3':'#7f9286',
      '--gold':'#d7a24a','--gold-bg':'#2f2616','--gold-br':'#7d6330','--red':'#c86d60','--red-bg':'#311916',
      '--green':'#6fbf8f','--green-bg':'#16281f','--blue':'#5f8fda','--blue-bg':'#152031','--purple':'#9778c8','--purple-bg':'#24192f',
      '--sidebar-grad1':'#0f1713','--sidebar-grad2':'#1d2a23',
      '--sidebar-text':'#eef3ed','--sidebar-text-muted':'#b7c5bc','--sidebar-sect':'#7f9286',
      '--sidebar-badge-bg':'rgba(255,255,255,.08)','--sidebar-badge-text':'#e7efe9',
      '--sidebar-hover-bg':'linear-gradient(90deg,rgba(111,191,143,.14),rgba(255,255,255,.03))','--sidebar-hover-text':'#f6fbf7',
      '--sidebar-active-text':'#f6fbf7','--sidebar-active-border':'#6fbf8f','--sidebar-active-bg':'linear-gradient(90deg,rgba(111,191,143,.18),rgba(255,255,255,.05))',
      '--sidebar-chip-hover':'rgba(111,191,143,.10)',
      '--content-wash':'radial-gradient(circle at top left, rgba(111,191,143,.20), transparent 26%), radial-gradient(circle at bottom right, rgba(40,93,68,.18), transparent 22%), linear-gradient(180deg,#1a241e 0%,#121915 100%)',
      '--logo-grad1':'#7ed49f','--logo-grad2':'#245c44','--brooks-bg1':'#1d2a23','--brooks-bg2':'#111915',
      '--nav-active-shadow':'rgba(111,191,143,.24)','--surface-pop':'0 14px 34px rgba(5,22,14,.32)'
    }
  },
  neonnoir: {
    name: 'Neon Noir',
    copy: 'A darker club feel with electric blue and magenta highlights.',
    swatches: ['#171321','#66a3ff','#d86de3','#ffd166'],
    dark: true,
    vars: {
      '--bg':'#13111a','--bg2':'#1a1724','--bg3':'#232032','--bg4':'#2d2940',
      '--border':'#35304a','--border2':'#4a4564','--text':'#f4f1fb','--text2':'#bcb5d2','--text3':'#827b9f',
      '--gold':'#ffd166','--gold-bg':'#332913','--gold-br':'#7e6932','--red':'#f07078','--red-bg':'#34171d',
      '--green':'#54c7a5','--green-bg':'#122723','--blue':'#66a3ff','--blue-bg':'#131f35','--purple':'#d86de3','--purple-bg':'#31163a',
      '--sidebar-grad1':'#120f1d','--sidebar-grad2':'#221638',
      '--sidebar-text':'#f4f1fb','--sidebar-text-muted':'#c6bfda','--sidebar-sect':'#8f87aa',
      '--sidebar-badge-bg':'rgba(255,255,255,.08)','--sidebar-badge-text':'#efeaff',
      '--sidebar-hover-bg':'linear-gradient(90deg,rgba(102,163,255,.14),rgba(216,109,227,.08))','--sidebar-hover-text':'#ffffff',
      '--sidebar-active-text':'#ffffff','--sidebar-active-border':'#66a3ff','--sidebar-active-bg':'linear-gradient(90deg,rgba(102,163,255,.18),rgba(216,109,227,.12))',
      '--sidebar-chip-hover':'rgba(216,109,227,.10)',
      '--content-wash':'radial-gradient(circle at top left, rgba(102,163,255,.24), transparent 25%), radial-gradient(circle at top right, rgba(216,109,227,.22), transparent 24%), linear-gradient(180deg,#1d1730 0%,#13111a 100%)',
      '--logo-grad1':'#78b0ff','--logo-grad2':'#c54bda','--brooks-bg1':'#221a35','--brooks-bg2':'#15111f',
      '--nav-active-shadow':'rgba(102,163,255,.28)','--surface-pop':'0 14px 34px rgba(8,7,22,.4)'
    }
  },
  velvetnoir: {
    name: 'Velvet Noir',
    copy: 'Dark plum walls, amber highlights, and a richer classic-club mood.',
    swatches: ['#20131b','#a96ad8','#e6a24f','#f4ede8'],
    dark: true,
    vars: {
      '--bg':'#171017','--bg2':'#211720','--bg3':'#2b202a','--bg4':'#362936',
      '--border':'#423241','--border2':'#584456','--text':'#f5edf3','--text2':'#c4b3c1','--text3':'#8f7c8d',
      '--gold':'#e6a24f','--gold-bg':'#342617','--gold-br':'#8b6331','--red':'#d9746b','--red-bg':'#351a1a',
      '--green':'#62b891','--green-bg':'#14251f','--blue':'#7a9df0','--blue-bg':'#172033','--purple':'#a96ad8','--purple-bg':'#301a39',
      '--sidebar-grad1':'#1b1019','--sidebar-grad2':'#311827',
      '--sidebar-text':'#f5edf3','--sidebar-text-muted':'#d0bfd0','--sidebar-sect':'#9c8698',
      '--sidebar-badge-bg':'rgba(255,255,255,.08)','--sidebar-badge-text':'#f4ebf2',
      '--sidebar-hover-bg':'linear-gradient(90deg,rgba(169,106,216,.16),rgba(230,162,79,.07))','--sidebar-hover-text':'#fff8fd',
      '--sidebar-active-text':'#fff8fd','--sidebar-active-border':'#e6a24f','--sidebar-active-bg':'linear-gradient(90deg,rgba(169,106,216,.16),rgba(230,162,79,.12))',
      '--sidebar-chip-hover':'rgba(169,106,216,.10)',
      '--content-wash':'radial-gradient(circle at top left, rgba(169,106,216,.20), transparent 24%), radial-gradient(circle at bottom right, rgba(230,162,79,.16), transparent 22%), linear-gradient(180deg,#2a1930 0%,#171017 100%)',
      '--logo-grad1':'#cb8cff','--logo-grad2':'#b5642b','--brooks-bg1':'#2c1d2c','--brooks-bg2':'#191117',
      '--nav-active-shadow':'rgba(169,106,216,.26)','--surface-pop':'0 14px 34px rgba(23,7,20,.38)'
    }
  }
};
var activeThemeKey = 'spotlight';

function applyThemePreset(key) {
  var preset = themePresets[key] || themePresets.classic;
  activeThemeKey = themePresets[key] ? key : 'classic';
  var root = document.documentElement;
  Object.keys(preset.vars).forEach(function(name) {
    root.style.setProperty(name, preset.vars[name]);
  });
  document.body.classList.toggle('dark', !!preset.dark);
  var darkBtn = document.getElementById('dark-btn');
  if (darkBtn) darkBtn.textContent = preset.dark ? '\u2600\ufe0f' : '\ud83c\udf19';
  try { localStorage.setItem('c4a_theme', activeThemeKey); } catch(e) {}
  syncThemeCards();
}

function renderThemeSettings() {
  var cards = Object.keys(themePresets).map(function(key) {
    var preset = themePresets[key];
    var previewStyle = [
      'background:' + preset.vars['--bg2'],
      'color:' + preset.vars['--text'],
      'border-color:' + preset.vars['--border']
    ].join(';');
    var topbarStyle = 'background:' + (preset.vars['--content-wash'] || preset.vars['--bg3']) + ';';
    var sidebarStyle = 'background:linear-gradient(180deg,' + preset.vars['--sidebar-grad1'] + ',' + preset.vars['--sidebar-grad2'] + ');';
    var cardStyle = 'background:' + preset.vars['--bg2'] + ';border-color:' + preset.vars['--border'] + ';';
    return '<button class="theme-card' + (key === activeThemeKey ? ' active' : '') + '" data-theme-card="' + key + '" onclick="applyThemePreset(\'' + key + '\')" type="button">'
      + '<div class="theme-preview" style="' + previewStyle + '">'
      + '<div class="theme-preview-sidebar" style="' + sidebarStyle + '"></div>'
      + '<div class="theme-preview-main">'
      + '<div class="theme-preview-topbar" style="' + topbarStyle + '"></div>'
      + '<div class="theme-preview-grid">'
      + '<span class="theme-preview-card" style="' + cardStyle + '"></span>'
      + '<span class="theme-preview-card" style="' + cardStyle + '"></span>'
      + '<span class="theme-preview-card theme-preview-card-accent" style="background:' + preset.vars['--gold-bg'] + ';border-color:' + preset.vars['--gold-br'] + ';"></span>'
      + '</div></div></div>'
      + '<div class="theme-card-title">' + preset.name + '</div>'
      + '<div class="theme-card-copy">' + preset.copy + '</div>'
      + '<div class="theme-swatches">' + preset.swatches.map(function(color){return '<span style="background:' + color + '"></span>';}).join('')
      + '</div></button>';
  }).join('');
  return '<div><h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);padding-bottom:10px;border-bottom:1px solid var(--border)">Color Theme</h3>'
    + '<div style="font-size:12px;color:var(--text2);line-height:1.7;margin-bottom:16px">Pick a look for the whole app. Your choice saves on this device.</div>'
    + '<div class="theme-grid">' + cards + '</div></div>';
}

function syncThemeCards() {
  var cards = document.querySelectorAll('[data-theme-card]');
  for (var i = 0; i < cards.length; i++) {
    cards[i].classList.toggle('active', cards[i].getAttribute('data-theme-card') === activeThemeKey);
  }
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
  applyThemePreset(activeThemeKey === 'midnight' ? 'classic' : 'midnight');
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
