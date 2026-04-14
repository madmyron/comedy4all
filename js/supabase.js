// - SUPABASE CLIENT -
var _sb = null;
var currentUser = null;
var _rtChannel = null;

function initSupabase(url, key) {
  _sb = window.supabase.createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  _sb.auth.onAuthStateChange(function(event, session) {
    if (session && session.user) {
      currentUser = session.user;
      showApp();
      sbLoadJokes();
      sbStartRealtime();
      setSyncStatus('synced');
      var uel = document.getElementById('sync-user');
      if (uel) uel.textContent = session.user.email;
    } else {
      currentUser = null;
      jokes = []; archivedJokes = []; displayJokes = [];
      sbStopRealtime();
      showAuthScreen();
    }
  });
  _sb.auth.getSession().then(function(r) {
    var s = r.data && r.data.session;
    if (s && s.user) {
      currentUser = s.user;
      showApp();
      sbLoadJokes();
      sbStartRealtime();
      setSyncStatus('synced');
      var uel = document.getElementById('sync-user');
      if (uel) uel.textContent = s.user.email;
    } else {
      showAuthScreen();
    }
  });
}

function tryInitSupabase() {
  var url = (document.getElementById('sb-url') || {}).value || '';
  var key = (document.getElementById('sb-key') || {}).value || '';
  if (url.startsWith('https://') && key.length > 20) {
    try { localStorage.setItem('c4a_sb_url', url); localStorage.setItem('c4a_sb_key', key); } catch(e) {}
    initSupabase(url, key);
  }
}

function showApp() {
  var a = document.getElementById('auth-screen');
  var app = document.getElementById('app');
  var b = document.getElementById('sync-bar');
  if (a) a.style.display = 'none';
  if (app) app.style.display = 'flex';
  if (b) b.style.display = 'flex';
  if (currentUser && currentUser.email) {
    window._c4aUserEmail = currentUser.email;
  }
  var fullName = (currentUser && currentUser.user_metadata && currentUser.user_metadata.full_name) || '';
  var firstName = fullName ? fullName.trim().split(/\s+/)[0] : '';
  var emailName = (currentUser && currentUser.email) ? currentUser.email.split('@')[0].split(/[._-]/)[0] : '';
  var displayName = firstName || (emailName ? emailName.charAt(0).toUpperCase() + emailName.slice(1) : 'You');
  var initials = fullName ? fullName.trim().split(/\s+/).slice(0,2).map(function(part){ return part.charAt(0).toUpperCase(); }).join('') : displayName.charAt(0).toUpperCase();
  var avatar = document.getElementById('sidebar-avatar');
  var nameEl = document.getElementById('sidebar-user-name');
  if (avatar) avatar.textContent = initials || 'U';
  if (nameEl) nameEl.textContent = displayName || 'You';
  if (typeof updateUserGreetings === 'function') updateUserGreetings();
  if (typeof updateBrooksContext === 'function') updateBrooksContext();
}
function showAuthScreen() {
  var a = document.getElementById('auth-screen');
  var app = document.getElementById('app');
  var b = document.getElementById('sync-bar');
  if (a) a.style.display = 'flex';
  if (app) app.style.display = 'none';
  if (b) b.style.display = 'none';
}

function showAuthTab(tab) {
  var si = document.getElementById('auth-signin'), su = document.getElementById('auth-signup'), sp = document.getElementById('auth-phone');
  var tsi = document.getElementById('tab-signin'), tsu = document.getElementById('tab-signup');
  if (!si || !su) return;
  si.style.display = 'none'; su.style.display = 'none'; if(sp) sp.style.display = 'none';
  tsi.style.background = 'var(--bg3)'; tsi.style.color = 'var(--text2)';
  tsu.style.background = 'var(--bg3)'; tsu.style.color = 'var(--text2)';
  if (tab === 'signin') {
    si.style.display = 'block';
    tsi.style.background = 'var(--gold)'; tsi.style.color = '#fff';
  } else if (tab === 'signup') {
    su.style.display = 'block';
    tsu.style.background = 'var(--gold)'; tsu.style.color = '#fff';
  } else if (tab === 'phone') {
    if(sp) sp.style.display = 'block';
    showPhoneStep1();
  }
  var er = document.getElementById('auth-error'), ok = document.getElementById('auth-success');
  if (er) er.style.display = 'none'; if (ok) ok.style.display = 'none';
}
function showPhoneStep1() {
  var s1 = document.getElementById('phone-step1'), s2 = document.getElementById('phone-step2');
  if(s1) s1.style.display = 'block'; if(s2) s2.style.display = 'none';
}
var _phoneNumber = '';
function doPhoneSend() {
  if (!_sb) { authMsg('auth-error', 'App not initialized. Please refresh.'); return; }
  var raw = (document.getElementById('phone-input') || {}).value || '';
  var phone = raw.replace(/[\s\-\(\)]/g, '');
  if (!phone.startsWith('+')) phone = '+1' + phone.replace(/\D/g,'');
  if (phone.length < 10) { authMsg('auth-error', 'Please enter a valid phone number.'); return; }
  _phoneNumber = phone;
  var btn = document.getElementById('phone-send-btn');
  if(btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
  _sb.auth.signInWithOtp({ phone: phone })
    .then(function(r) {
      if(btn) { btn.disabled = false; btn.textContent = 'Send Code'; }
      if (r.error) { authMsg('auth-error', r.error.message); return; }
      var s1 = document.getElementById('phone-step1'), s2 = document.getElementById('phone-step2');
      var msg = document.getElementById('phone-sent-msg');
      if(msg) msg.textContent = 'Code sent to ' + phone + '. Check your texts!';
      if(s1) s1.style.display = 'none'; if(s2) s2.style.display = 'block';
      var er = document.getElementById('auth-error'), ok = document.getElementById('auth-success');
      if(er) er.style.display = 'none'; if(ok) ok.style.display = 'none';
      setTimeout(function(){ var oi = document.getElementById('otp-input'); if(oi) oi.focus(); }, 100);
    });
}
function doPhoneVerify() {
  if (!_sb || !_phoneNumber) return;
  var token = ((document.getElementById('otp-input') || {}).value || '').trim();
  if (token.length !== 6) { authMsg('auth-error', 'Please enter the 6-digit code.'); return; }
  var btn = document.getElementById('phone-verify-btn');
  if(btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }
  _sb.auth.verifyOtp({ phone: _phoneNumber, token: token, type: 'sms' })
    .then(function(r) {
      if(btn) { btn.disabled = false; btn.textContent = 'Verify & Sign In'; }
      if (r.error) { authMsg('auth-error', r.error.message); }
    });
}
function authMsg(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  var other = id === 'auth-error' ? 'auth-success' : 'auth-error';
  var oth = document.getElementById(other); if (oth) oth.style.display = 'none';
}
function doSignIn() {
  if (!_sb) { authMsg('auth-error', 'Please enter your Supabase URL and key first.'); return; }
  var email = (document.getElementById('signin-email') || {}).value || '';
  var pass  = (document.getElementById('signin-password') || {}).value || '';
  if (!email || !pass) { authMsg('auth-error', 'Please fill in all fields.'); return; }
  _sb.auth.signInWithPassword({ email: email.trim(), password: pass })
    .then(function(r) { if (r.error) authMsg('auth-error', r.error.message); });
}
function doSignUp() {
  if (!_sb) { authMsg('auth-error', 'App not initialized. Please refresh.'); return; }
  var name  = (document.getElementById('signup-name') || {}).value || '';
  var email = (document.getElementById('signup-email') || {}).value || '';
  var pass  = (document.getElementById('signup-password') || {}).value || '';
  if (!name || !email || !pass) { authMsg('auth-error', 'Please fill in all fields.'); return; }
  if (pass.length < 6) { authMsg('auth-error', 'Password must be at least 6 characters.'); return; }
  var btn = document.getElementById('signup-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }
  _sb.auth.signUp({
    email: email.trim(), password: pass,
    options: { data: { full_name: name }, emailRedirectTo: null }
  }).then(function(r) {
    if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    if (r.error) { authMsg('auth-error', r.error.message); return; }
    if (r.data && r.data.session) {
      authMsg('auth-success', 'Welcome to Comedy 4 All!');
    } else {
      authMsg('auth-success', 'Account created! Check your email to confirm, then sign in.');
    }
  });
}
function doGoogleSignIn() {
  if (!_sb) { authMsg('auth-error', 'App not initialized. Please refresh.'); return; }
  var redirect = window.location.href.split('?')[0].split('#')[0];
  _sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect } });
}
function doSignOut() {
  if (_sb) _sb.auth.signOut();
}

// - SUPABASE DATA OPERATIONS -
function sbLoadJokes() {
  if (!currentUser || !_sb) return;
  setSyncStatus('syncing');
  _sb.from('jokes').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false })
    .then(function(res) {
      if (res.error) { setSyncStatus('error'); return; }
      var all = res.data || [];
      jokes = all.filter(function(j) { return !j.archived; });
      try {
        var savedOrder = JSON.parse(localStorage.getItem('c4a_joke_order') || '[]');
        if (savedOrder.length) {
          jokes.sort(function(a, b) {
            var ai = savedOrder.indexOf(String(a.id));
            var bi = savedOrder.indexOf(String(b.id));
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });
        }
      } catch(e) {}
      archivedJokes = all.filter(function(j) { return j.archived; });
      displayJokes = jokes.slice();
      var scr = document.getElementById('screen-jokes');
      if (scr && scr.classList.contains('active')) renderJokes(displayJokes);
      updateCounts();
      setSyncStatus('synced');
      attachGridClicks();
    });
}

function attachGridClicks() {
  var grid = document.getElementById('joke-grid');
  if (!grid || grid._clickAttached) return;
  grid._clickAttached = true;
  grid.addEventListener('click', function(e) {
    var card = e.target.closest('.jcard');
    if (!card) return;
    var jid = card.getAttribute('data-jid');
    if (jid) { openDetail(jid); return; }
    var cards = grid.querySelectorAll('.jcard');
    var idx = Array.from(cards).indexOf(card);
    if (jokes[idx]) openDetail(jokes[idx].id);
  });
}
function sbStartRealtime() {
  if (!currentUser || !_sb) return;
  sbStopRealtime();
  _rtChannel = _sb.channel('jokes:' + currentUser.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jokes', filter: 'user_id=eq.' + currentUser.id },
      function(payload) {
        setSyncStatus('syncing');
        var ev = payload.eventType, rec = payload.new, old = payload.old;
        if (ev === 'INSERT') {
          if (!rec.archived && !jokes.some(function(j) { return j.id === rec.id; })) {
            jokes.unshift(rec); displayJokes = jokes.slice();
          }
        } else if (ev === 'UPDATE') {
          if (!rec.archived) {
            var found = false;
            for (var i = 0; i < jokes.length; i++) { if (jokes[i].id === rec.id) { jokes[i] = rec; found = true; break; } }
            if (!found) { archivedJokes = archivedJokes.filter(function(j) { return j.id !== rec.id; }); jokes.unshift(rec); }
          } else {
            jokes = jokes.filter(function(j) { return j.id !== rec.id; });
            var fa = false;
            for (var i = 0; i < archivedJokes.length; i++) { if (archivedJokes[i].id === rec.id) { archivedJokes[i] = rec; fa = true; break; } }
            if (!fa) archivedJokes.unshift(rec);
          }
          displayJokes = jokes.slice();
        } else if (ev === 'DELETE') {
          jokes = jokes.filter(function(j) { return j.id !== old.id; });
          archivedJokes = archivedJokes.filter(function(j) { return j.id !== old.id; });
          displayJokes = jokes.slice();
        }
        var s = document.getElementById('screen-jokes');
        if (s && s.classList.contains('active')) renderJokes(displayJokes);
        updateCounts(); setSyncStatus('synced');
      })
    .subscribe();
}
function sbStopRealtime() {
  if (_rtChannel) { _sb.removeChannel(_rtChannel); _rtChannel = null; }
}
function setSyncStatus(state) {
  var dot = document.getElementById('sync-dot'), msg = document.getElementById('sync-msg');
  if (!dot || !msg) return;
  if (state === 'synced')   { dot.style.background = 'var(--green)'; msg.textContent = 'Synced across all devices'; }
  else if (state === 'syncing') { dot.style.background = 'var(--gold)';  msg.textContent = 'Syncing...'; }
  else                      { dot.style.background = 'var(--red)';   msg.textContent = 'Sync error -- check connection'; }
}

// - SUPABASE-BACKED CRUD WRAPPERS -
var _origSaveNewJoke = null;
var _origSaveEdit    = null;
var _origDelete      = null;
var _origArchive     = null;
var _origUnarchive   = null;

function _patchFunctions() {
  _origSaveNewJoke = saveNewJoke;
  saveNewJoke = function() {
    var titleEl = document.getElementById('nj-title');
    var bodyEl  = document.getElementById('nj-body');
    var rtEl    = document.getElementById('nj-runtime');
    var title   = titleEl ? titleEl.value.trim() : '';
    if (!title) { toast('Please add a title!'); return; }
    var nj = {
      title: title,
      body: bodyEl ? bodyEl.value.trim() : '',
      tags: modalTags.length ? modalTags.slice() : [],
      tier: modalRating >= 4 ? 'a' : modalRating >= 3 ? 'b' : 'c',
      rating: modalRating || 3,
      runtime: rtEl ? rtEl.value.trim() || '1:00' : '1:00',
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
  };

  _origSaveEdit = saveEditedJoke;
  saveEditedJoke = function() {
    if (!editingId) return;
    var titleEl = document.getElementById('ej-title'), bodyEl = document.getElementById('ej-body');
    var rtEl = document.getElementById('ej-runtime'), tierEl = document.getElementById('ej-tier');
    var title = titleEl ? titleEl.value.trim() : '';
    if (!title) { toast('Please add a title!'); return; }
    var updates = {
      title: title, body: bodyEl ? bodyEl.value.trim() : '',
      runtime: rtEl ? rtEl.value.trim() || '1:00' : '1:00',
      tier: tierEl ? tierEl.value : 'b', rating: modalRating || 3,
      tags: modalTags.length ? modalTags.slice() : [],
      score: parseFloat((6 + (modalRating || 3) * 0.5).toFixed(1))
    };
    var eid = editingId; closeEditModal();
    for (var i = 0; i < jokes.length; i++) { if (jokes[i].id === eid) { Object.assign(jokes[i], updates); break; } }
    displayJokes = jokes.slice();
    var scr = document.getElementById('screen-jokes');
    if (scr && scr.classList.contains('active')) renderJokes(displayJokes);
    openDetail(eid); updateCounts(); toast('Joke updated! \u2713');
    if (currentUser && _sb) {
      setSyncStatus('syncing');
      var ex = jokes.find(function(j) { return j.id === eid; });
      var vp = ex ? _sb.from('joke_versions').insert({ joke_id: eid, user_id: currentUser.id, title: ex.title, body: ex.body }) : Promise.resolve({});
      vp.then(function() { return _sb.from('jokes').update(updates).eq('id', eid); })
        .then(function(r) { if (r && r.error) toast('Sync failed: ' + r.error.message); else setSyncStatus('synced'); });
    }
  };

  _origDelete = deleteJoke;
  deleteJoke = function(id) {
    jokes = jokes.filter(function(j) { return j.id !== id; });
    archivedJokes = archivedJokes.filter(function(j) { return j.id !== id; });
    displayJokes = displayJokes.filter(function(j) { return j.id !== id; });
    closeDetail(); updateCounts(); renderJokes(displayJokes);
    toast('Joke deleted.');
    if (currentUser && _sb) {
      setSyncStatus('syncing');
      _sb.from('jokes').delete().eq('id', id)
        .then(function(r) { if (r.error) toast('Sync error: ' + r.error.message); else setSyncStatus('synced'); });
    }
  };

  _origArchive = archiveJoke;
  archiveJoke = function(id) {
    var j = null, idx = -1;
    for (var i = 0; i < jokes.length; i++) { if (jokes[i].id === id) { j = jokes[i]; idx = i; break; } }
    if (!j) return;
    j.archived = true; archivedJokes.unshift(j); jokes.splice(idx, 1);
    displayJokes = displayJokes.filter(function(x) { return x.id !== id; });
    closeDetail(); updateCounts(); renderJokes(displayJokes);
    toast('Joke archived.');
    if (currentUser && _sb) {
      setSyncStatus('syncing');
      _sb.from('jokes').update({ archived: true }).eq('id', id)
        .then(function(r) { if (r.error) toast('Sync error: ' + r.error.message); else setSyncStatus('synced'); });
    }
  };

  _origUnarchive = unarchiveJoke;
  unarchiveJoke = function(id) {
    var j = null, idx = -1;
    for (var i = 0; i < archivedJokes.length; i++) { if (archivedJokes[i].id === id) { j = archivedJokes[i]; idx = i; break; } }
    if (!j) return;
    j.archived = false; jokes.unshift(j); archivedJokes.splice(idx, 1); displayJokes = jokes.slice();
    closeDetail(); updateCounts(); renderJokes(displayJokes);
    toast('Joke restored! \u2713');
    if (currentUser && _sb) {
      setSyncStatus('syncing');
      _sb.from('jokes').update({ archived: false }).eq('id', id)
        .then(function(r) { if (r.error) toast('Sync error: ' + r.error.message); else setSyncStatus('synced'); });
    }
  };
}
