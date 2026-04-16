if (typeof Sortable !== 'undefined' && Sortable.mount && typeof Sortable.Swap !== 'undefined') { Sortable.mount(new Sortable.Swap()); }
// - INIT -
function runIfAvailable(fn) {
  if (typeof fn === 'function') fn();
}

renderJokes(jokes);
renderSet();
renderAnalytics();
runIfAvailable(typeof renderWaveform === 'function' ? renderWaveform : null);
runIfAvailable(typeof renderRecList === 'function' ? renderRecList : (typeof renderRecListReal === 'function' ? renderRecListReal : null));
runIfAvailable(typeof renderMoments === 'function' ? renderMoments : null);
renderVersions();
showTab('profile', document.querySelector('.snav-item'));
updateCounts();
renderStudio();

function getGreeting() {
  var h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function getCurrentUserFirstName() {
  var meta = (currentUser && currentUser.user_metadata) || {};
  var fullName = (meta.full_name || '').trim();
  return fullName ? fullName.split(/\s+/)[0] : '';
}
function updateUserGreetings() {
  var firstName = getCurrentUserFirstName();
  var wave = String.fromCharCode(0x1F44B);
  var text = firstName ? (getGreeting() + ', ' + firstName + ' ' + wave) : ('Hey there ' + wave);
  var homeEl = document.getElementById('home-greeting');
  var dashEl = document.getElementById('dashboard-greeting');
  if (homeEl) homeEl.textContent = text;
  if (dashEl) dashEl.textContent = text;
}
updateUserGreetings();

// - SUPABASE INIT PATCH -
_patchFunctions();

// Default: show auth screen
showAuthScreen();

// Auto-init Supabase
(function() {
  var url = 'https://largbufmopnfeodsmhkr.supabase.co';
  var key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhcmdidWZtb3BuZmVvZHNtaGtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzA1NzMsImV4cCI6MjA5MDMwNjU3M30.HnQSgcuLYlEdx_P2pt_7FCxad7gODMtwWKuyghRPzfI';
  var ui = document.getElementById('sb-url'), ki = document.getElementById('sb-key');
  if (ui) ui.value = url; if (ki) ki.value = '(configured)';
  initSupabase(url, key);
  try { localStorage.setItem('c4a_sb_url', url); localStorage.setItem('c4a_sb_key', key); } catch(e) {}
  try { apiKey = localStorage.getItem('c4a_apikey') || ''; } catch(e) {}
  setTimeout(function() {
    var ki2 = document.getElementById('api-key-input');
    if (ki2 && apiKey) ki2.value = apiKey;
    var ki3 = document.getElementById('settings-api-key-input');
    if (ki3 && apiKey) ki3.value = apiKey;
  }, 500);
  try {
    var savedTheme = localStorage.getItem('c4a_theme') || (localStorage.getItem('c4a_dark') === '1' ? 'midnight' : 'spotlight');
    if (typeof applyThemePreset === 'function') applyThemePreset(savedTheme);
  } catch(e) {}
})();

// - ONBOARDING -
function checkOnboarding() {
  try {
    if (!localStorage.getItem('c4a_onboarded')) {
      document.getElementById('onboard-overlay').style.display = 'flex';
    }
  } catch(e) {}
}
function onboardNext(step) {
  for (var i=1;i<=3;i++) {
    var s = document.getElementById('onboard-step-'+i);
    if(s) s.classList.toggle('active', i===step);
    var d = document.getElementById('od'+i);
    if(d) d.classList.toggle('cur', i===step);
  }
}
function onboardSaveJoke() {
  var t = (document.getElementById('ob-title')||{}).value||'';
  var b = (document.getElementById('ob-body')||{}).value||'';
  if (t.trim()) {
    var newJ = {id:nextId++,title:t.trim(),body:b.trim()||'Work in progress.',tags:[],tier:'c',rating:3,runtime:'1:00',score:7.0};
    jokes.unshift(newJ); displayJokes = jokes.slice();
    renderJokes(displayJokes); updateCounts();
    toast('First joke saved! \u2713');
  }
  onboardNext(3);
}
function onboardSkip() { onboardNext(3); }
function onboardFinish() {
  document.getElementById('onboard-overlay').style.display = 'none';
  try { localStorage.setItem('c4a_onboarded', '1'); } catch(e) {}
}

// Hook onboarding into showApp
var _origShowApp = showApp;
showApp = function() {
  _origShowApp();
  setTimeout(checkOnboarding, 600);
};

// Grant Brooks access to creator account
(function() {
  try {
    var saved = localStorage.getItem('c4a_apikey') || '';
    if (saved) { apiKey = saved; }
  } catch(e) {}
})();
