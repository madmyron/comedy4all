// - WRITING STUDIO -

var SCRIPT_FORMATS = {
  'nbc-sitcom':       { name: 'NBC Multi-Cam Sitcom', pages: 22, acts: 2, sceneStyle: 'INT./EXT.', fontStyle: 'courier', margins: 'standard' },
  'netflix-sitcom':   { name: 'Netflix Single-Cam Sitcom', pages: 30, acts: 3, sceneStyle: 'INT./EXT.', fontStyle: 'courier', margins: 'standard' },
  'hbo-sitcom':       { name: 'HBO Single-Cam Comedy', pages: 30, acts: 3, sceneStyle: 'INT./EXT.', fontStyle: 'courier', margins: 'standard' },
  'abc-sitcom':       { name: 'ABC Multi-Cam Sitcom', pages: 22, acts: 2, sceneStyle: 'INT./EXT.', fontStyle: 'courier', margins: 'standard' },
  'fx-sitcom':        { name: 'FX Single-Cam Comedy', pages: 28, acts: 3, sceneStyle: 'INT./EXT.', fontStyle: 'courier', margins: 'standard' },
  'nbc-latenight':    { name: 'NBC Late Night Monologue', pages: 4, acts: 1, sceneStyle: 'STAGE', fontStyle: 'courier', margins: 'standard' },
  'netflix-special':  { name: 'Netflix Comedy Special', pages: 60, acts: 1, sceneStyle: 'STAGE', fontStyle: 'courier', margins: 'standard' },
  'warnerbros-movie': { name: 'Warner Bros. Feature Comedy', pages: 110, acts: 3, sceneStyle: 'INT./EXT.', fontStyle: 'courier', margins: 'standard' },
  'netflix-movie':    { name: 'Netflix Feature Comedy', pages: 100, acts: 3, sceneStyle: 'INT./EXT.', fontStyle: 'courier', margins: 'standard' },
  'a24-movie':        { name: 'A24 Comedy Feature', pages: 95, acts: 3, sceneStyle: 'INT./EXT.', fontStyle: 'courier', margins: 'standard' },
  'universal-movie':  { name: 'Universal Feature Comedy', pages: 110, acts: 3, sceneStyle: 'INT./EXT.', fontStyle: 'courier', margins: 'standard' },
  'standup-special':  { name: 'Stand-Up Special Script', pages: 45, acts: 1, sceneStyle: 'STAGE', fontStyle: 'courier', margins: 'standard' },
  'standup-set':      { name: 'Stand-Up Set Notes', pages: 5, acts: 1, sceneStyle: 'NOTES', fontStyle: 'sans', margins: 'loose' },
  'corporate-roast':  { name: 'Corporate Roast Script', pages: 10, acts: 1, sceneStyle: 'STAGE', fontStyle: 'sans', margins: 'loose' },
  'memoir-chapter':   { name: 'Memoir Chapter', pages: 15, acts: 1, sceneStyle: 'PROSE', fontStyle: 'sans', margins: 'loose' }
};

var STUDIO_STORAGE_KEY = 'c4a_scripts';
var STUDIO_AUTOSAVE_MS = 450;
var _studioSaveTimer = null;
var _studioLoaded = false;

function loadStudioState() {
  if (_studioLoaded) return;
  _studioLoaded = true;
  try {
    var raw = localStorage.getItem(STUDIO_STORAGE_KEY);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    if (parsed && parsed.scripts && parsed.scripts.length) {
      scripts = parsed.scripts;
      activeScriptId = parsed.activeScriptId || parsed.scripts[0].id;
      scriptNextId = parsed.scriptNextId || (parsed.scripts.reduce(function(max, script) {
        return Math.max(max, Number(script.id) || 0);
      }, 0) + 1);
    }
  } catch (e) {}
}

function persistStudioState() {
  try {
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({
      scripts: scripts,
      activeScriptId: activeScriptId,
      scriptNextId: scriptNextId
    }));
  } catch (e) {}
}

function setStudioStatus(message, isDirty) {
  var status = document.getElementById('studio-save-status');
  if (!status) return;
  status.textContent = message;
  status.style.color = isDirty ? 'var(--gold)' : 'var(--text3)';
}

function getActiveScript() {
  if (!activeScriptId) return null;
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].id === activeScriptId) return scripts[i];
  }
  return null;
}

function queueStudioSave() {
  clearTimeout(_studioSaveTimer);
  setStudioStatus('Saving...', true);
  _studioSaveTimer = setTimeout(function() {
    saveActiveScript(true);
  }, STUDIO_AUTOSAVE_MS);
}

function renderStudio() {
  loadStudioState();
  renderStudioProjectList();
  var editor = document.getElementById('studio-editor');
  var placeholder = document.getElementById('studio-placeholder');

  if (activeScriptId) {
    var script = getActiveScript();
    if (script && editor) {
      if (placeholder) placeholder.style.display = 'none';
      editor.style.display = 'flex';
      renderScriptEditor(script);
      return;
    }
  }

  if (editor) editor.style.display = 'none';
  if (placeholder) placeholder.style.display = 'flex';
  setStudioStatus('Saved locally', false);
}

function renderStudioProjectList() {
  var projectList = document.getElementById('studio-project-list');
  if (projectList) {
    if (scripts.length === 0) {
      projectList.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:12px;text-align:center">No scripts yet.<br>Click + New Script to start.</div>';
    } else {
      projectList.innerHTML = scripts.map(function(s) {
        var active = s.id === activeScriptId;
        return '<div onclick="openScript(' + s.id + ')" style="padding:8px 10px;border-radius:var(--r2);cursor:pointer;margin-bottom:3px;font-size:12px;'
          + (active ? 'background:var(--gold-bg);color:var(--gold);font-weight:600;' : 'color:var(--text2);')
          + '">'
          + '<div style="font-weight:' + (active ? '600' : '500') + ';margin-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(s.title) + '</div>'
          + '<div style="font-size:10px;color:var(--text3)">' + escapeHtml((SCRIPT_FORMATS[s.formatKey] ? SCRIPT_FORMATS[s.formatKey].name : s.formatKey) || 'Script') + '</div>'
          + '</div>';
      }).join('');
    }
  }
}

function renderScriptEditor(script) {
  var titleInput = document.getElementById('studio-script-title-input');
  var formatEl = document.getElementById('studio-format-label');
  var bodyEl = document.getElementById('studio-script-body');
  if (titleInput) {
    titleInput.value = script.title;
    titleInput.oninput = function() {
      script.title = titleInput.value || 'Untitled Script';
      script.updated = new Date().toISOString();
      renderStudioProjectList();
      queueStudioSave();
    };
  }
  if (formatEl) formatEl.textContent = SCRIPT_FORMATS[script.formatKey] ? SCRIPT_FORMATS[script.formatKey].name : script.formatKey;
  if (bodyEl) {
    bodyEl.value = script.body;
    bodyEl.oninput = function() {
      script.body = bodyEl.value;
      script.updated = new Date().toISOString();
      queueStudioSave();
    };
  }
  setStudioStatus('Saved locally', false);
}

function openScript(id) {
  loadStudioState();
  activeScriptId = id;
  persistStudioState();
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
  if (!preview) return;
  if (!fmt) {
    preview.innerHTML = '';
    return;
  }
  preview.innerHTML = '<div style="background:var(--gold-bg);border:1px solid var(--gold-br);border-radius:var(--r2);padding:9px 12px;font-size:11.5px;color:var(--text2);line-height:1.7">'
    + '<strong>' + escapeHtml(fmt.name) + '</strong><br>'
    + 'Approx. ' + fmt.pages + ' pages &middot; ' + fmt.acts + ' act' + (fmt.acts > 1 ? 's' : '') + '<br>'
    + 'Scene headers: ' + escapeHtml(fmt.sceneStyle)
    + '</div>';
}

function saveNewScript() {
  loadStudioState();
  var title = ((document.getElementById('ns-title') || {}).value || '').trim();
  if (!title) { toast('Please add a title!'); return; }
  var network = (document.getElementById('ns-network') || {}).value || 'netflix';
  var type = (document.getElementById('ns-type') || {}).value || 'sitcom';
  var key = network + '-' + type;
  var fmt = SCRIPT_FORMATS[key] || SCRIPT_FORMATS['netflix-sitcom'];
  var now = new Date().toISOString();
  var script = {
    id: scriptNextId++,
    title: title,
    formatKey: key,
    body: buildStarterContent(title, fmt),
    created: now,
    updated: now
  };
  scripts.unshift(script);
  activeScriptId = script.id;
  persistStudioState();
  sbSaveScript(script);
  closeNewScript();
  renderStudio();
  toast('Script created! \u2713');
}

function buildStarterContent(title, fmt) {
  if (fmt.sceneStyle === 'STAGE' || fmt.sceneStyle === 'NOTES') {
    return title.toUpperCase() + '\n\nWritten by Michael D\'Asaro\n\nOPEN\n\n';
  }
  if (fmt.sceneStyle === 'PROSE') {
    return title.toUpperCase() + '\n\nBy Michael D\'Asaro\n\nChapter One\n\n';
  }
  return 'TITLE: ' + title.toUpperCase() + '\nWritten by Michael D\'Asaro\n\n'
    + 'COLD OPEN\n\n'
    + 'INT. LOCATION - DAY\n\n'
    + 'Description of scene...\n\n'
    + 'CHARACTER\nDialogue here.\n\n'
    + 'ACT ONE\n\n';
}

function saveActiveScript(isAutoSave) {
  loadStudioState();
  var script = getActiveScript();
  if (!script) return;
  var titleInput = document.getElementById('studio-script-title-input');
  var bodyEl = document.getElementById('studio-script-body');
  if (titleInput) script.title = (titleInput.value || '').trim() || 'Untitled Script';
  if (bodyEl) script.body = bodyEl.value;
  script.updated = new Date().toISOString();
  persistStudioState();
  sbSaveScript(script);
  renderStudioProjectList();
  setStudioStatus(isAutoSave ? 'Saving...' : 'Saving...', true);
  if (!isAutoSave) toast('Script saved. \u2713');
}

function deleteActiveScript() {
  loadStudioState();
  if (!activeScriptId) return;
  if (!confirm('Delete this script? This cannot be undone.')) return;
  var deletingScript = getActiveScript();
  scripts = scripts.filter(function(s) { return s.id !== activeScriptId; });
  activeScriptId = scripts.length ? scripts[0].id : null;
  persistStudioState();
  if (deletingScript) sbDeleteScript(deletingScript.supabase_id);
  renderStudio();
  toast('Script deleted.');
}

function exportActiveScript() {
  loadStudioState();
  saveActiveScript(true);
  var script = getActiveScript();
  if (!script) return;
  var format = ((document.getElementById('studio-export-format') || {}).value || 'fdx');
  var payload = buildScriptExport(script, format);
  var blob = new Blob([payload.content], { type: payload.type });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = slugifyFileName(script.title) + '.' + payload.ext;
  a.click();
  toast('Exported for ' + payload.label + '.');
}

function buildScriptExport(script, format) {
  if (format === 'fountain') {
    return {
      content: buildFountain(script),
      ext: 'fountain',
      type: 'text/plain;charset=utf-8',
      label: 'Fountain'
    };
  }
  if (format === 'txt') {
    return {
      content: script.body,
      ext: 'txt',
      type: 'text/plain;charset=utf-8',
      label: 'plain text'
    };
  }
  return {
    content: buildFinalDraft(script),
    ext: 'fdx',
    type: 'application/vnd.finaldraft',
    label: 'Final Draft'
  };
}

function buildFountain(script) {
  return 'Title: ' + script.title + '\n'
    + 'Credit: Written by\n'
    + 'Author: Michael D\'Asaro\n'
    + 'Format: ' + ((SCRIPT_FORMATS[script.formatKey] || {}).name || 'Screenplay') + '\n\n'
    + script.body;
}

function buildFinalDraft(script) {
  var paragraphs = script.body.split(/\r?\n/).map(function(line) {
    var type = getFinalDraftParagraphType(line);
    return '    <Paragraph Type="' + type + '"><Text>' + escapeXml(line || ' ') + '</Text></Paragraph>';
  }).join('\n');
  return '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n'
    + '<FinalDraft DocumentType="Script" Template="' + escapeXml((SCRIPT_FORMATS[script.formatKey] || {}).name || 'Screenplay') + '" Version="3">\n'
    + '  <Content>\n'
    + paragraphs + '\n'
    + '  </Content>\n'
    + '</FinalDraft>\n';
}

function getFinalDraftParagraphType(line) {
  var text = (line || '').trim();
  if (!text) return 'Action';
  if (/^(INT\.|EXT\.|INT\/EXT\.|EST\.)/.test(text)) return 'Scene Heading';
  if (/^(ACT|COLD OPEN|TAG|END OF SHOW)/.test(text)) return 'Act';
  if (/^[A-Z0-9 ()'.-]+$/.test(text) && text.length < 32) return 'Character';
  return 'Action';
}

function slugifyFileName(value) {
  return (value || 'script').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'script';
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// - SUPABASE SYNC -

function sbSaveScript(script) {
  if (!_sb || !currentUser || !script) return;
  var now = new Date().toISOString();
  var row = {
    user_id: currentUser.id,
    title: script.title,
    content: script.body,
    format: script.formatKey,
    updated_at: now
  };
  if (script.supabase_id) {
    _sb.from('studio_scripts').update(row).eq('id', script.supabase_id)
      .then(function(res) {
        if (res.error) { console.error('Studio sync error:', res.error); return; }
        setStudioStatus('Synced \u2713', false);
      });
  } else {
    row.created_at = now;
    _sb.from('studio_scripts').insert(row).select('id').single()
      .then(function(res) {
        if (res.error) { console.error('Studio sync error:', res.error); return; }
        script.supabase_id = res.data.id;
        persistStudioState();
        setStudioStatus('Synced \u2713', false);
      });
  }
}

function sbDeleteScript(supabaseId) {
  if (!_sb || !currentUser || !supabaseId) return;
  _sb.from('studio_scripts').delete().eq('id', supabaseId)
    .then(function(res) { if (res.error) console.error('Studio delete error:', res.error); });
}

function sbLoadScripts() {
  if (!_sb || !currentUser) return;
  _sb.from('studio_scripts')
    .select('id, title, content, format, created_at, updated_at')
    .eq('user_id', currentUser.id)
    .order('updated_at', { ascending: false })
    .then(function(res) {
      if (res.error || !res.data || res.data.length === 0) return;
      var remoteIds = {};
      res.data.forEach(function(row) { remoteIds[row.id] = true; });
      // Update existing local scripts that have a supabase_id match
      scripts.forEach(function(s) {
        if (s.supabase_id && remoteIds[s.supabase_id]) {
          var row = res.data.find(function(r) { return r.id === s.supabase_id; });
          if (row && new Date(row.updated_at) > new Date(s.updated)) {
            s.title = row.title;
            s.body = row.content;
            s.formatKey = row.format;
            s.updated = row.updated_at;
          }
          delete remoteIds[s.supabase_id];
        }
      });
      // Add remote scripts not yet local
      res.data.forEach(function(row) {
        if (!remoteIds[row.id]) return;
        scripts.unshift({
          id: scriptNextId++,
          supabase_id: row.id,
          title: row.title,
          formatKey: row.format,
          body: row.content,
          created: row.created_at,
          updated: row.updated_at
        });
      });
      persistStudioState();
      renderStudio();
    });
}
