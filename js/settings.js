// - SETTINGS -
var settingsTabs={
  subscription:'',
  notifications:'<div style="max-width:460px"><h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);padding-bottom:10px;border-bottom:1px solid var(--border)">Notifications</h3>'+[['Show reminders','24h reminder before each show'],['Brooks suggestions','Alert when Brooks finds improvements'],['Sync alerts','Alert when mobile sync fails'],['Weekly report','Weekly performance digest']].map(function(x){return '<div class="srow"><div><div style="font-size:13px;color:var(--text);font-weight:500">'+x[0]+'</div><div style="font-size:11px;color:var(--text3);margin-top:1px">'+x[1]+'</div></div><button class="stoggle on" onclick="this.classList.toggle(\'on\')"></button></div>';}).join('')+'</div>',
  ai:'<div style="max-width:460px"><h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);padding-bottom:10px;border-bottom:1px solid var(--border)">Brooks AI Settings</h3>'+[['Background analysis','Continuously analyzes your jokes'],['Writing prompts','Daily prompts based on your style'],['Post-show insights','Auto-analysis after recordings'],['Tier suggestions','Auto-suggest A/B/C tier']].map(function(x){return '<div class="srow"><div><div style="font-size:13px;color:var(--text);font-weight:500">'+x[0]+'</div><div style="font-size:11px;color:var(--text3);margin-top:1px">'+x[1]+'</div></div><button class="stoggle on" onclick="this.classList.toggle(\'on\')"></button></div>';}).join('')+'</div>',
  sync:'<div style="max-width:460px"><h3 style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--text);padding-bottom:10px;border-bottom:1px solid var(--border)">Mobile Sync</h3><div style="font-size:12.5px;color:var(--text2);margin-bottom:16px;line-height:1.7;background:var(--green-bg);border:1px solid #a8d8aa;border-radius:var(--r2);padding:11px 13px">\u2713 <strong>Connected</strong> -- Last synced: 2 minutes ago</div>'+[['Real-time sync','Instant sync across devices'],['Offline mode','Cache data when offline'],['Auto-backup','Daily cloud backup']].map(function(x){return '<div class="srow"><div><div style="font-size:13px;color:var(--text);font-weight:500">'+x[0]+'</div><div style="font-size:11px;color:var(--text3);margin-top:1px">'+x[1]+'</div></div><button class="stoggle on" onclick="this.classList.toggle(\'on\')"></button></div>';}).join('')+'<div style="margin-top:14px"><button class="btn btn-sm" onclick="toast(\'Force synced! \u2713\')">Force Sync Now</button></div></div>',
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
function showTab(tab,el){
  var items=document.querySelectorAll('.snav-item');
  for(var i=0;i<items.length;i++) items[i].classList.remove('active');
  if(el) el.classList.add('active');
  var body=document.getElementById('settings-body');
  if(body) {
    body.innerHTML=tab==='profile' ? renderProfileSettings() : (tab==='subscription' ? renderSubscriptionSettings() : (tab==='theme' ? renderThemeSettings() : (settingsTabs[tab]||'')));
    if (tab === 'theme' && typeof syncThemeCards === 'function') syncThemeCards();
  }
}
