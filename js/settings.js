// - SETTINGS -
var settingsTabs={
  subscription:'',
  notifications:'<div style="max-width:460px"><h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);padding-bottom:10px;border-bottom:1px solid var(--border)">Notifications</h3>'+[['Show reminders','24h reminder before each show'],['Brooks suggestions','Alert when Brooks finds improvements'],['Sync alerts','Alert when mobile sync fails'],['Weekly report','Weekly performance digest']].map(function(x){return '<div class="srow"><div><div style="font-size:13px;color:var(--text);font-weight:500">'+x[0]+'</div><div style="font-size:11px;color:var(--text3);margin-top:1px">'+x[1]+'</div></div><button class="stoggle on" onclick="this.classList.toggle(\'on\')"></button></div>';}).join('')+'</div>',
  ai:'<div style="max-width:460px"><h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);padding-bottom:10px;border-bottom:1px solid var(--border)">Brooks AI Settings</h3><div class="sect-title">API Key (direct)</div><p style="font-size:12px;color:var(--text3);margin-bottom:8px">Paste your Anthropic API key to call Anthropic from this browser (Anthropic allows this with their browser header). Or skip this and use an Anthropic proxy below.</p><input id="settings-api-key-input" type="password" placeholder="sk-ant-..." style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r2);padding:10px 12px;color:var(--text);font-size:13px;font-family:\'DM Mono\',monospace;outline:none;margin-bottom:6px;box-sizing:border-box" oninput="saveApiKey(this.value)"><div style="font-size:10px;color:var(--text3);margin-bottom:16px">Stored only in this browser. Sent only to api.anthropic.com unless you configure a proxy.</div><div class="sect-title" style="margin-top:10px">Anthropic proxy (optional)</div><p style="font-size:12px;color:var(--text3);margin-bottom:8px">Base URL of your proxy server (no trailing slash), e.g. <span style="font-family:\'DM Mono\',monospace;font-size:11px">https://anthropic-proxy.onrender.com</span>. Brooks then posts to <span style="font-family:\'DM Mono\',monospace;font-size:11px">…/v1/messages</span> — same JSON as Anthropic.</p><input id="settings-anthropic-proxy-url" type="url" placeholder="https://…" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r2);padding:10px 12px;color:var(--text);font-size:13px;font-family:\'DM Mono\',monospace;outline:none;margin-bottom:8px;box-sizing:border-box" oninput="saveAnthropicProxyUrl(this.value)"><div style="font-size:10px;color:var(--text3);margin-bottom:10px">If your proxy requires a shared secret, set it here (sent as <span style="font-family:\'DM Mono\',monospace;font-size:10px">Authorization: Bearer …</span>).</div><input id="settings-proxy-secret" type="password" placeholder="Proxy secret (optional)" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r2);padding:10px 12px;color:var(--text);font-size:13px;font-family:\'DM Mono\',monospace;outline:none;margin-bottom:16px;box-sizing:border-box" oninput="saveAnthropicProxySecret(this.value)"><div class="sep"></div>'+[['Background analysis','Continuously analyzes your jokes'],['Writing prompts','Daily prompts based on your style'],['Post-show insights','Auto-analysis after recordings'],['Tier suggestions','Auto-suggest A/B/C tier']].map(function(x){return '<div class="srow"><div><div style="font-size:13px;color:var(--text);font-weight:500">'+x[0]+'</div><div style="font-size:11px;color:var(--text3);margin-top:1px">'+x[1]+'</div></div><button class="stoggle on" onclick="this.classList.toggle(\'on\')"></button></div>';}).join('')+'</div>',
  sync:'',
  theme:'',
  export:'<div class="export-panel"><h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);padding-bottom:10px;border-bottom:1px solid var(--border)">Data &amp; Export</h3><div class="export-actions"><button class="btn" onclick="toast(\'Jokes exported!\')">[PDF] Export all jokes (PDF)</button><button class="btn" onclick="toast(\'Sets exported!\')">[PDF] Export all sets (PDF)</button><button class="btn" onclick="toast(\'Report exported!\')">[PDF] Analytics report (PDF)</button><button class="btn" onclick="toast(\'Backup downloaded!\')">[ZIP] Full backup (JSON)</button><div style="height:1px;background:var(--border);margin:3px 0"></div><button class="btn" style="color:var(--red)" onclick="toast(\'Check email to confirm.\')">Delete account</button></div></div>',
  keyboard:'<div style="max-width:420px"><h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);padding-bottom:10px;border-bottom:1px solid var(--border)">Keyboard Shortcuts</h3>'+[['N','New joke'],['R','Rehearsal mode'],['B','Brooks AI'],['A','Analytics'],['Escape','Close modal'],['->','Next joke (rehearsal)'],['Space','Reveal punchline (rehearsal)']].map(function(x){return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="color:var(--text2)">'+x[1]+'</span><kbd style="background:var(--bg3);border:1px solid var(--border2);border-radius:5px;padding:3px 11px;font-family:\'DM Mono\',monospace;font-size:11px;color:var(--text);font-weight:500">'+x[0]+'</kbd></div>';}).join('')+'<div style="font-size:11px;color:var(--text3);margin-top:12px">Shortcuts inactive when typing in text fields.</div></div>'
};

function renderSubscriptionSettings() {
  var userEmail = (window._c4aUserEmail || '').toLowerCase();
  var hasCreatorPro = userEmail === 'michael@comedy4all.com';
  var brooksUnlocked = typeof hasBrooksAccess === 'function' ? hasBrooksAccess() : false;
  var currentPlan = hasCreatorPro ? 'pro' : 'free';
  var freeClass = currentPlan === 'free' ? 'plan-card cur-plan' : 'plan-card';
  var proClass = currentPlan === 'pro' ? 'plan-card cur-plan' : 'plan-card';
  var proBadge = currentPlan === 'pro'
    ? '<div style="font-size:9px;color:var(--gold);margin-bottom:5px;font-weight:700;letter-spacing:.05em">* CURRENT</div>'
    : '';
  var freeBadge = currentPlan === 'free'
    ? '<div style="font-size:9px;color:var(--gold);margin-bottom:5px;font-weight:700;letter-spacing:.05em">* CURRENT</div>'
    : '';
  var brooksNote = brooksUnlocked
    ? '<div style="font-size:12px;color:var(--text2);line-height:1.7;background:var(--green-bg);border:1px solid var(--green);border-radius:var(--r2);padding:11px 13px;max-width:580px;margin-bottom:16px">Brooks access is unlocked on this device, but that does not automatically mean this account is on the Pro subscription.</div>'
    : '<div style="font-size:12px;color:var(--text2);line-height:1.7;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r2);padding:11px 13px;max-width:580px;margin-bottom:16px">Billing is not connected yet, so this screen shows the default plan state for the signed-in account.</div>';
  return '<div><h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);padding-bottom:10px;border-bottom:1px solid var(--border)">Subscription</h3>'
    + brooksNote
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:580px;margin-bottom:20px">'
    + '<div class="' + freeClass + '">' + freeBadge + '<div style="font-size:13px;font-weight:600;margin-bottom:5px">Free</div><div style="font-size:26px;font-weight:700;color:var(--text3)">$0<span style="font-size:12px;font-weight:400">/mo</span></div><div style="font-size:11px;color:var(--text3);margin-top:7px;line-height:1.8">10 jokes - 2 sets - No AI</div></div>'
    + '<div class="' + proClass + '">' + proBadge + '<div style="font-size:13px;font-weight:600;margin-bottom:5px">Pro</div><div style="font-size:26px;font-weight:700;color:var(--gold)">$12<span style="font-size:12px;font-weight:400;color:var(--text3)">/mo</span></div><div style="font-size:11px;color:var(--text3);margin-top:7px;line-height:1.8">Unlimited - Brooks AI - Recording - Analytics</div></div>'
    + '<div class="plan-card"><div style="font-size:13px;font-weight:600;margin-bottom:5px">Team</div><div style="font-size:26px;font-weight:700;color:var(--purple)">$29<span style="font-size:12px;font-weight:400;color:var(--text3)">/mo</span></div><div style="font-size:11px;color:var(--text3);margin-top:7px;line-height:1.8">Pro + Manager access - Collaboration</div></div>'
    + '</div><button class="btn btn-sm" onclick="toast(\'Billing portal!\')">Manage Billing -></button></div>';
}

function renderProfileSettings() {
  var meta = (currentUser && currentUser.user_metadata) || {};
  var fullName = (meta.full_name || '').trim();
  var email = (currentUser && currentUser.email) || '';
  var stageName = fullName ? fullName.split(/\s+/)[0] : '';
  return '<div style="max-width:460px"><h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);padding-bottom:10px;border-bottom:1px solid var(--border)">Profile</h3><div style="margin-bottom:12px"><label class="mlbl">Display Name</label><input class="minput" style="max-width:300px" value="' + fullName.replace(/"/g,'&quot;') + '"></div><div style="margin-bottom:12px"><label class="mlbl">Email</label><input class="minput" style="max-width:300px" value="' + email.replace(/"/g,'&quot;') + '"></div><div style="margin-bottom:12px"><label class="mlbl">Stage Name</label><input class="minput" style="max-width:300px" value="' + stageName.replace(/"/g,'&quot;') + '"></div><div style="margin-bottom:18px"><label class="mlbl">Bio</label><textarea class="minput" style="max-width:300px;height:85px"></textarea></div><button class="btn btn-primary btn-sm" onclick="toast(\'Profile saved! \\u2713\')">Save Profile</button></div>';
}
function formatLastSyncLabel() {
  var ms = 0;
  try { ms = parseInt(localStorage.getItem('c4a_last_sync_at') || '0', 10) || 0; } catch(e) {}
  if (!ms) return 'Not synced yet on this device';
  var ago = Math.max(0, Date.now() - ms);
  if (ago < 60000) return 'just now';
  if (ago < 3600000) return Math.floor(ago / 60000) + ' min ago';
  if (ago < 86400000) return Math.floor(ago / 3600000) + ' hr ago';
  return Math.floor(ago / 86400000) + ' day' + (Math.floor(ago / 86400000) === 1 ? '' : 's') + ' ago';
}

function renderSyncSettings() {
  var signedIn = !!(typeof currentUser !== 'undefined' && currentUser && typeof _sb !== 'undefined' && _sb);
  var statusBox = signedIn
    ? '<div id="sync-settings-status" style="font-size:12.5px;color:var(--text2);margin-bottom:16px;line-height:1.7;background:var(--green-bg);border:1px solid #a8d8aa;border-radius:var(--r2);padding:11px 13px">\u2713 <strong>Connected</strong> — Last synced: ' + formatLastSyncLabel() + '</div>'
    : '<div id="sync-settings-status" style="font-size:12.5px;color:var(--text2);margin-bottom:16px;line-height:1.7;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r2);padding:11px 13px">Sign in to sync jokes and sets across your phone and computer.</div>';
  return '<div style="max-width:460px"><h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);padding-bottom:10px;border-bottom:1px solid var(--border)">Mobile Sync</h3>'
    + statusBox
    + '<p style="font-size:12px;color:var(--text3);margin-bottom:14px;line-height:1.6">Jokes sync live. Named sets pull when you open the app, open My Sets, or tap Force Sync Now.</p>'
    + '<div style="margin-top:4px"><button class="btn btn-sm btn-primary" onclick="forceSyncNow()">Force Sync Now</button></div></div>';
}

function refreshSyncSettingsPanel() {
  var el = document.getElementById('sync-settings-status');
  if (!el) return;
  var signedIn = !!(typeof currentUser !== 'undefined' && currentUser && typeof _sb !== 'undefined' && _sb);
  if (signedIn) {
    el.style.background = 'var(--green-bg)';
    el.style.borderColor = '#a8d8aa';
    el.innerHTML = '\u2713 <strong>Connected</strong> — Last synced: ' + formatLastSyncLabel();
  }
}

function showTab(tab,el){
  var items=document.querySelectorAll('.snav-item');
  for(var i=0;i<items.length;i++) items[i].classList.remove('active');
  if(el) el.classList.add('active');
  var body=document.getElementById('settings-body');
  if(body) {
    body.innerHTML=tab==='profile' ? renderProfileSettings() : (tab==='subscription' ? renderSubscriptionSettings() : (tab==='theme' ? renderThemeSettings() : (tab==='sync' ? renderSyncSettings() : (settingsTabs[tab]||''))));
    if (tab === 'ai') {
      var saki = document.getElementById('settings-api-key-input');
      if (saki) {
        var existingKey = apiKey || (function(){ try { return localStorage.getItem('c4a_apikey') || ''; } catch(e) { return ''; } })();
        saki.value = existingKey;
        if (existingKey) saveApiKey(existingKey);
      }
      var proxyEl = document.getElementById('settings-anthropic-proxy-url');
      if (proxyEl) {
        try { proxyEl.value = localStorage.getItem('c4a_anthropic_proxy') || ''; } catch (e) {}
      }
      var secretEl = document.getElementById('settings-proxy-secret');
      if (secretEl) {
        try { secretEl.value = localStorage.getItem('c4a_proxy_secret') || ''; } catch (e) {}
      }
    }
    if (tab === 'theme' && typeof syncThemeCards === 'function') syncThemeCards();
  }
}
