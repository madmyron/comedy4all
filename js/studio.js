// - WRITING STUDIO -

// Script format templates keyed by [network]-[type]
var SCRIPT_FORMATS = {
  // --- SITCOMS ---
  'nbc-sitcom':       { name: 'NBC Multi-Cam Sitcom',      pages: 22, acts: 2, sceneStyle: 'INT./EXT.',   fontStyle: 'courier', margins: 'standard' },
  'netflix-sitcom':   { name: 'Netflix Single-Cam Sitcom', pages: 30, acts: 3, sceneStyle: 'INT./EXT.',   fontStyle: 'courier', margins: 'standard' },
  'hbo-sitcom':       { name: 'HBO Single-Cam Comedy',     pages: 30, acts: 3, sceneStyle: 'INT./EXT.',   fontStyle: 'courier', margins: 'standard' },
  'abc-sitcom':       { name: 'ABC Multi-Cam Sitcom',      pages: 22, acts: 2, sceneStyle: 'INT./EXT.',   fontStyle: 'courier', margins: 'standard' },
  'fx-sitcom':        { name: 'FX Single-Cam Comedy',      pages: 28, acts: 3, sceneStyle: 'INT./EXT.',   fontStyle: 'courier', margins: 'standard' },
  // --- LATE NIGHT ---
  'nbc-latenight':    { name: 'NBC Late Night Monologue',  pages: 4,  acts: 1, sceneStyle: 'STAGE',       fontStyle: 'courier', margins: 'standard' },
  'netflix-special':  { name: 'Netflix Comedy Special',    pages: 60, acts: 1, sceneStyle: 'STAGE',       fontStyle: 'courier', margins: 'standard' },
  // --- FEATURE FILM ---
  'warnerbros-movie': { name: 'Warner Bros. Feature Comedy', pages: 110, acts: 3, sceneStyle: 'INT./EXT.', fontStyle: 'courier', margins: 'standard' },
  'netflix-movie':    { name: 'Netflix Feature Comedy',    pages: 100, acts: 3, sceneStyle: 'INT./EXT.',  fontStyle: 'courier', margins: 'standard' },
  'a24-movie':        { name: 'A24 Comedy Feature',        pages: 95,  acts: 3, sceneStyle: 'INT./EXT.',  fontStyle: 'courier', margins: 'standard' },
  'universal-movie':  { name: 'Universal Feature Comedy',  pages: 110, acts: 3, sceneStyle: 'INT./EXT.',  fontStyle: 'courier', margins: 'standard' },
  // --- STAND-UP ---
  'standup-special':  { name: 'Stand-Up Special Script',   pages: 45, acts: 1, sceneStyle: 'STAGE',       fontStyle: 'courier', margins: 'standard' },
  'standup-set':      { name: 'Stand-Up Set Notes',        pages: 5,  acts: 1, sceneStyle: 'NOTES',       fontStyle: 'sans',    margins: 'loose' },
  // --- OTHER ---
  'corporate-roast':  { name: 'Corporate Roast Script',    pages: 10, acts: 1, sceneStyle: 'STAGE',       fontStyle: 'sans',    margins: 'loose' },
  'memoir-chapter':   { name: 'Memoir Chapter',            pages: 15, acts: 1, sceneStyle: 'PROSE',       fontStyle: 'sans',    margins: 'loose' }
};

function renderStudio() {
  var projectList = document.getElementById('studio-project-list');
  var editor = document.getElementById('studio-editor');
  var placeholder = document.getElementById('studio-placeholder');

  if (projectList) {
    if (scripts.length === 0) {
      projectList.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:12px;text-align:center">No scripts yet.<br>Click + New Script to start.</div>';
    } else {
      projectList.innerHTML = scripts.map(function(s) {
        var active = s.id === activeScriptId;
        return '<div onclick="openScript(' + s.id + ')" style="padding:8px 10px;border-radius:var(--r2);cursor:pointer;margin-bottom:3px;font-size:12px;'
          + (active ? 'background:var(--gold-bg);color:var(--gold);font-weight:600;' : 'color:var(--text2);')
          + '">'
          + '<div style="font-weight:' + (active ? '600' : '500') + ';margin-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + s.title + '</div>'
          + '<div style="font-size:10px;color:var(--text3)">' + (SCRIPT_FORMATS[s.formatKey] ? SCRIPT_FORMATS[s.formatKey].name : s.formatKey) + '</div>'
          + '</div>';
      }).join('');
    }
  }

  if (activeScriptId) {
    var s = scripts.find(function(x) { return x.id === activeScriptId; });
    if (s && editor) {
      if (placeholder) placeholder.style.display = 'none';
      editor.style.display = 'flex';
      renderScriptEditor(s);
    }
  } else {
    if (editor) editor.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
  }
}

function renderScriptEditor(s) {
  var titleEl = document.getElementById('studio-script-title');
  var formatEl = document.getElementById('studio-format-label');
  var bodyEl = document.getElementById('studio-script-body');
  if (titleEl) titleEl.textContent = s.title;
  if (formatEl) formatEl.textContent = SCRIPT_FORMATS[s.formatKey] ? SCRIPT_FORMATS[s.formatKey].name : s.formatKey;
  if (bodyEl) {
    bodyEl.value = s.body;
    bodyEl.oninput = function() {
      s.body = bodyEl.value;
      s.updated = new Date().toISOString();
    };
  }
}

function openScript(id) {
  activeScriptId = id;
  renderStudio();
}

function openNewScript() {
  document.getElementById('new-script-modal').style.display = 'flex';
  var titleEl = document.getElementById('ns-title');
  if (titleEl) titleEl.value = '';
  updateFormatPreview();
}

function closeNewScript() {
  document.getElementById('new-script-modal').style.display = 'none';
}

function updateFormatPreview() {
  var network = (document.getElementById('ns-network') || {}).value || '';
  var type = (document.getElementById('ns-type') || {}).value || '';
  var key = network + '-' + type;
  var fmt = SCRIPT_FORMATS[key];
  var preview = document.getElementById('ns-format-preview');
  if (preview) {
    if (fmt) {
      preview.innerHTML = '<div style="background:var(--gold-bg);border:1px solid var(--gold-br);border-radius:var(--r2);padding:9px 12px;font-size:11.5px;color:var(--text2);line-height:1.7">'
        + '<strong>' + fmt.name + '</strong><br>'
        + 'Approx. ' + fmt.pages + ' pages &nbsp;·&nbsp; ' + fmt.acts + ' act' + (fmt.acts > 1 ? 's' : '') + '<br>'
        + 'Scene headers: ' + fmt.sceneStyle
        + '</div>';
    } else {
      preview.innerHTML = '';
    }
  }
}

function saveNewScript() {
  var title = ((document.getElementById('ns-title') || {}).value || '').trim();
  if (!title) { toast('Please add a title!'); return; }
  var network = (document.getElementById('ns-network') || {}).value || 'netflix';
  var type = (document.getElementById('ns-type') || {}).value || 'sitcom';
  var key = network + '-' + type;
  var fmt = SCRIPT_FORMATS[key] || SCRIPT_FORMATS['netflix-sitcom'];
  var starter = buildStarterContent(title, fmt);
  var script = {
    id: scriptNextId++,
    title: title,
    formatKey: key,
    body: starter,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  scripts.unshift(script);
  activeScriptId = script.id;
  closeNewScript();
  renderStudio();
  toast('Script created! \u2713');
}

function buildStarterContent(title, fmt) {
  if (fmt.sceneStyle === 'STAGE' || fmt.sceneStyle === 'NOTES') {
    return title.toUpperCase() + '\n\nWritten by Michael D\'Asaro\n\n\n';
  }
  if (fmt.sceneStyle === 'PROSE') {
    return title.toUpperCase() + '\n\nBy Michael D\'Asaro\n\n\n';
  }
  return 'TITLE: ' + title.toUpperCase() + '\nWritten by Michael D\'Asaro\n\n'
    + 'COLD OPEN\n\n'
    + 'INT. LOCATION - DAY\n\n'
    + 'Description of scene...\n\n'
    + 'CHARACTER\nDialogue here.\n\n'
    + 'ACT ONE\n\n';
}

function deleteActiveScript() {
  if (!activeScriptId) return;
  if (!confirm('Delete this script? This cannot be undone.')) return;
  scripts = scripts.filter(function(s) { return s.id !== activeScriptId; });
  activeScriptId = scripts.length ? scripts[0].id : null;
  renderStudio();
  toast('Script deleted.');
}

function exportActiveScript() {
  if (!activeScriptId) return;
  var s = scripts.find(function(x) { return x.id === activeScriptId; });
  if (!s) return;
  var blob = new Blob([s.body], { type: 'text/plain' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = s.title.replace(/[^a-z0-9]/gi, '_') + '.txt';
  a.click();
  toast('Exported!');
}
