// - BROOKS AI -
var BROOKS_SYS='You are Brooks -- a seasoned comedy writing veteran who genuinely wants Michael to succeed. You are sharp, witty, and direct. You always help with whatever Michael asks first, then you can briefly mention what you think is most urgent. Never refuse a request or redirect away from it -- if he wants to work on sitcom ideas, you work on sitcom ideas. If he wants to punch up a joke, you punch up the joke. You give your honest opinion but you do the work he asks.\n\nYour personality: warm but no-nonsense. You roast weak material with affection. You celebrate wins with real enthusiasm. You give specific actionable notes. Think: the best writing partner in the room who makes every session productive.\n\nBackground on Michael: stand-up comedian, entrepreneur, 1996 Olympian, based in Dallas TX. Top joke is the Airport security bit (9.2/10), tech jokes avg 8.3, relationship material avg 7.4.\n\nYour style: open with a quick observation or quip, then get straight to work. Never say "Great question!" -- that is hack. Max 3 short punchy paragraphs unless writing actual material. Use numbered lists when giving options.';
var BROOKS_SCRIPT_SYS='You are Brooks in SCRIPT DEVELOPMENT mode — a calm, curious writing partner (not a roast comic right now). Your job is to help Michael deepen a movie or TV idea before any drafting.\n\nRules:\n- Ask ONE clear question per reply. Multi-part questions are forbidden unless they are truly a single concept — prefer a single focused question.\n- Invite messy, honest answers. Never demand polish.\n- Rotate through depth on: characters (want vs need), relationships, central conflict, tone/mood, theme, world/rules, why this story now, audience hook.\n- Keep paragraphs short. Warm, patient, zero gimmicky praise.\n- Do not dump outlines or beat sheets unless Michael explicitly asks.\n- Stay inside the format Michael chose (sitcom vs episodic TV vs feature vs skit) when giving examples.';
var BROOKS_TRIAL_CODES=['BROOKS-FRIEND-2026','BROOKS-VIP-PASS','SITCOM-SCAN'];
var brooksSessionKind = null;
var brooksScriptFormat = null;
var _brooksPendingTag = null;

function brooksResetSessionMode() {
  brooksSessionKind = null;
  brooksScriptFormat = null;
  _brooksPendingTag = null;
}

function brooksScriptFormatHumanLabel(fmt) {
  if (fmt === 'sitcom') return 'Sitcom (ensemble / recurring comedy)';
  if (fmt === 'tv') return 'Episodic TV (non-sitcom series — drama, dramedy, procedural with humor, limited series, etc.)';
  if (fmt === 'feature') return 'Feature film';
  if (fmt === 'skit') return 'Skit or short';
  if (fmt === 'open') return 'Format still open — we\'ll figure it out from your description';
  return fmt || 'script';
}

function applyBrooksSessionFromStoredTag(tag) {
  brooksResetSessionMode();
  if (!tag || typeof tag !== 'string') return;
  var parts = tag.split(',');
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (p.indexOf('script-') === 0) {
      brooksSessionKind = 'script';
      brooksScriptFormat = p.replace('script-', '');
      _brooksPendingTag = p;
      return;
    }
  }
  if (tag.indexOf('jokes-work') !== -1) {
    brooksSessionKind = 'jokes';
    _brooksPendingTag = 'jokes-work';
  }
}

function getBrooksActiveSystem() {
  if (brooksSessionKind === 'script' && brooksScriptFormat) {
    return BROOKS_SCRIPT_SYS + '\n\nActive format for this session: ' + brooksScriptFormatHumanLabel(brooksScriptFormat) + '.';
  }
  return BROOKS_SYS;
}

function brooksMessageContentPlain(content) {
  return brooksMessageContentToText(content).trim();
}

function brooksSkipChatRender(m) {
  if (!m) return true;
  var text = brooksMessageContentPlain(m.content);
  if (m.role === 'user' && text.indexOf('Here are all my jokes:') === 0) return true;
  if (m.role === 'user' && text.indexOf('_C4A_BRIDGE_') === 0) return true;
  return false;
}

function brooksExpandBridgeForApi(content) {
  var text = typeof content === 'string' ? content : brooksMessageContentToText(content);
  if (text.indexOf('_C4A_BRIDGE_') !== 0) return content;
  try {
    var o = JSON.parse(text.slice('_C4A_BRIDGE_'.length));
    if (o.type === 'script-kickoff') {
      return 'The writer chose script format: ' + (o.formatLabel || o.format || 'unknown') + '. Begin calmly: one brief welcoming sentence, then ask exactly ONE opening question so they can describe their rough idea in their own words (messy is fine). Do not ask multiple questions in one reply.';
    }
  } catch (e) {}
  return text;
}

function brooksAwaitingPathPick() {
  return document.getElementById('brooks-welcome') !== null || document.getElementById('brooks-script-format-picker') !== null;
}

function brooksChoiceRowHtml(buttons) {
  var html = '<div class="brooks-choice-row">';
  buttons.forEach(function(b) {
    var safeLabel = String(b.label).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
    html += '<button type="button" class="btn btn-sm brooks-choice-btn" onclick="' + b.onclick + '">' + safeLabel + '</button>';
  });
  html += '</div>';
  return html;
}

function updateBrooksScriptActionBar() {
  var projBtn = document.getElementById('brooks-save-project-btn');
  var hint = document.getElementById('brooks-script-hint');
  var mobileProj = document.getElementById('brooks-mobile-save-project');
  var showProj = brooksSessionKind === 'script' && brooksHistory && brooksHistory.length >= 2;
  if (projBtn) projBtn.style.display = showProj ? 'inline-flex' : 'none';
  if (mobileProj) mobileProj.style.display = showProj ? 'block' : 'none';
  if (hint) hint.style.display = brooksSessionKind === 'script' ? 'block' : 'none';
}

function getBrooksSaveTagPreferSession() {
  var manual = getSelectedTags();
  if (brooksSessionKind === 'script' && brooksScriptFormat) {
    var st = 'script-' + brooksScriptFormat;
    return manual ? manual + ',' + st : st;
  }
  if (brooksSessionKind === 'jokes') {
    return manual || _brooksPendingTag || 'jokes-work';
  }
  return manual || _brooksPendingTag || '';
}

function brooksPickPath(kind) {
  var welcome = document.getElementById('brooks-welcome');
  if (welcome) welcome.remove();
  var msgs = document.getElementById('chat-msgs');
  if (!msgs) return;
  if (kind === 'script') {
    brooksSessionKind = null;
    brooksScriptFormat = null;
    var wrap = document.createElement('div');
    wrap.id = 'brooks-script-format-picker';
    wrap.className = 'cmsg ai';
    wrap.innerHTML = '<div class="mfrom">BROOKS AI</div><div style="margin-bottom:10px">Cool — let\'s develop a script idea. What shape is it?</div>' +
      brooksChoiceRowHtml([
        { label: 'Sitcom', onclick: 'brooksPickScriptFormat(\'sitcom\')' },
        { label: 'TV show', onclick: 'brooksPickScriptFormat(\'tv\')' },
        { label: 'Feature film', onclick: 'brooksPickScriptFormat(\'feature\')' },
        { label: 'Skit / short', onclick: 'brooksPickScriptFormat(\'skit\')' }
      ]) +
      '<div style="font-size:11px;color:var(--text3);margin-top:8px">Or describe it in your own words in the box below and hit Send — we\'ll figure out the format together.</div>';
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
    brooksHistory = [];
    return;
  }
  if (kind === 'jokes') {
    brooksSessionKind = 'jokes';
    brooksScriptFormat = null;
    _brooksPendingTag = 'jokes-work';
    var jokeOpeners = [
      'Good — jokes mode. Tell me what you want first: punch up a bit, new angles, set order, weaker jokes… Or tap Story Mining below if you want me scanning everything for TV or movie DNA.',
      'Stand-up mode it is. What are we fixing, sharpening, or inventing today? The mining buttons are there if you want a big sweep through your library.',
      'Alright, material first. Pick a lane in plain English — or run a sitcom/movie scan when you\'re ready for that sugar rush.'
    ];
    var jo = jokeOpeners[Math.floor(Math.random() * jokeOpeners.length)];
    var div = document.createElement('div');
    div.className = 'cmsg ai';
    div.innerHTML = '<div class="mfrom">BROOKS AI</div>' + jo;
    msgs.appendChild(div);
    brooksHistory = [];
    msgs.scrollTop = msgs.scrollHeight;
    updateBrooksScriptActionBar();
  }
}

function brooksPickScriptFormat(fmt) {
  var picker = document.getElementById('brooks-script-format-picker');
  if (picker) picker.remove();
  brooksSessionKind = 'script';
  brooksScriptFormat = fmt;
  _brooksPendingTag = 'script-' + fmt;
  brooksScriptKickoff(fmt);
}

function brooksScriptKickoff(fmt) {
  if (!hasBrooksAccess()) {
    var o = document.getElementById('brooks-upgrade-overlay');
    if (o) o.style.display = 'flex';
    return;
  }
  if (!brooksAnthropicCredentialsReady()) {
    toast(brooksNeedCredentialsMessage());
    return;
  }
  var msgs = document.getElementById('chat-msgs');
  if (!msgs) return;
  var bridge = '_C4A_BRIDGE_' + JSON.stringify({ type: 'script-kickoff', format: fmt, formatLabel: brooksScriptFormatHumanLabel(fmt) });
  brooksHistory = [{ role: 'user', content: bridge }];
  var typing = document.createElement('div');
  typing.className = 'cmsg ai';
  typing.id = 'brooks-typing-kickoff';
  typing.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--text3)">thinking...</span>';
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;
  var btn = document.getElementById('send-btn');
  if (btn) { btn.disabled = true; }

  var kickMsg = { role: 'user', content: brooksExpandBridgeForApi(bridge) };
  var xhr = new XMLHttpRequest();
  if (!brooksConfigureAnthropicXhr(xhr)) {
    if (btn) { btn.disabled = false; }
    var tkFail = document.getElementById('brooks-typing-kickoff');
    if (tkFail) tkFail.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">' + brooksNeedCredentialsMessage() + '</span>';
    toast(brooksNeedCredentialsMessage());
    return;
  }
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    var tk = document.getElementById('brooks-typing-kickoff');
    if (btn) { btn.disabled = false; }
    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        var reply = (data.content || []).filter(function(c){ return c.type === 'text'; }).map(function(c){ return c.text; }).join('') || 'No response.';
        brooksHistory.push({ role: 'assistant', content: reply });
        if (tk) tk.innerHTML = '<div class="mfrom">BROOKS AI</div>' + reply.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
        tk.id = '';
      } catch (e) {
        if (tk) tk.innerHTML = '<div class="mfrom">BROOKS AI</div>Something glitched. Try Send with a hello.';
      }
    } else if (xhr.status === 401) {
      if (tk) tk.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Anthropic auth failed. Check the proxy (or optional direct key).</span>';
    } else {
      if (tk) tk.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Error ' + xhr.status + '.</span>';
    }
    msgs.scrollTop = msgs.scrollHeight;
    updateBrooksScriptActionBar();
  };
  xhr.onerror = function() {
    if (btn) { btn.disabled = false; }
    var tk = document.getElementById('brooks-typing-kickoff');
    if (tk) tk.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Network error.</span>';
  };
  var payload = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: getBrooksActiveSystem(),
    messages: [kickMsg]
  });
  xhr.send(payload);
}

function showBrooksSaveProjectModal() {
  if (!currentUser || !_sb) {
    toast('Sign in to save a project.');
    return;
  }
  if (brooksSessionKind !== 'script') {
    toast('Save as project is for script-development chats.');
    return;
  }

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;z-index:10001;font-family:Inter,sans-serif;padding:16px';
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg);padding:22px;border-radius:14px;border:1px solid var(--border);width:min(400px,100%);max-height:90vh;overflow-y:auto';
  box.innerHTML = '<div style="font-weight:700;color:var(--text);margin-bottom:14px;font-size:15px">Save as project</div>' +
    '<label style="font-size:11px;color:var(--text3)">Title (optional for now)</label>' +
    '<input id="brooks-proj-title" type="text" placeholder="Working title…" style="width:100%;box-sizing:border-box;margin:6px 0 12px;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-size:13px">' +
    '<label style="font-size:11px;color:var(--text3)">Short description (optional)</label>' +
    '<textarea id="brooks-proj-desc" placeholder="One line about the idea…" style="width:100%;box-sizing:border-box;min-height:64px;margin:6px 0 14px;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg3);color:var(--text);font-size:13px"></textarea>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">' +
    '<button type="button" id="brooks-proj-suggest-titles" class="btn btn-sm" style="flex:1;min-width:120px">Suggest 3 titles</button>' +
    '</div>' +
    '<div id="brooks-proj-title-picks" style="display:none;flex-direction:column;gap:6px;margin-bottom:12px"></div>';

  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:8px';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = function() { document.body.removeChild(modal); };

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-sm btn-primary';
  saveBtn.textContent = 'Create project';
  saveBtn.style.background = 'var(--gold)';
  saveBtn.style.color = '#fff';
  saveBtn.onclick = function() {
    var titleEl = document.getElementById('brooks-proj-title');
    var descEl = document.getElementById('brooks-proj-desc');
    var name = (titleEl && titleEl.value.trim()) ? titleEl.value.trim() : 'Untitled project';
    var desc = descEl ? descEl.value.trim() : '';
    finalizeBrooksProjectSave(modal, name, desc);
  };

  row.appendChild(cancelBtn);
  row.appendChild(saveBtn);
  box.appendChild(row);
  modal.appendChild(box);
  document.body.appendChild(modal);

  var suggestBtn = document.getElementById('brooks-proj-suggest-titles');
  if (suggestBtn) {
    suggestBtn.onclick = function() {
      brooksSuggestThreeTitles(function(arr) {
        var picks = document.getElementById('brooks-proj-title-picks');
        var titleIn = document.getElementById('brooks-proj-title');
        if (!picks) return;
        picks.style.display = 'flex';
        picks.innerHTML = '';
        arr.forEach(function(t, idx) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn btn-sm';
          b.style.cssText = 'text-align:left;justify-content:flex-start';
          b.textContent = (idx + 1) + '. ' + t;
          b.onclick = function() {
            if (titleIn) titleIn.value = t;
          };
          picks.appendChild(b);
        });
      });
    };
  }
}

function brooksSuggestThreeTitles(done) {
  if (!brooksAnthropicCredentialsReady()) {
    toast(brooksNeedCredentialsMessage());
    return;
  }
  var transcript = '';
  brooksHistory.forEach(function(m) {
    if (brooksSkipChatRender(m)) return;
    transcript += (m.role === 'user' ? 'WRITER: ' : 'BROOKS: ') + brooksMessageContentPlain(m.content) + '\n';
  });
  var prompt = 'Based on this script-development conversation, suggest exactly 3 catchy working titles. Return ONLY valid JSON: {"titles":["...","...","..."]} — no markdown.\n\nCONVERSATION:\n' + transcript;
  var xhr = new XMLHttpRequest();
  if (!brooksConfigureAnthropicXhr(xhr)) {
    toast(brooksNeedCredentialsMessage());
    return;
  }
  xhr.onload = function() {
    if (xhr.status !== 200) {
      toast('Could not suggest titles (' + xhr.status + ').');
      return;
    }
    try {
      var data = JSON.parse(xhr.responseText);
      var raw = (data.content || []).filter(function(c){ return c.type === 'text'; }).map(function(c){ return c.text; }).join('');
      var parsed = brooksParseJsonResponse(raw);
      var titles = parsed.titles || parsed.title_suggestions;
      if (!titles || !titles.length) throw new Error('no titles');
      done(titles.slice(0, 3));
    } catch (e) {
      toast('Could not parse titles — try again.');
    }
  };
  xhr.onerror = function() { toast('Network error suggesting titles.'); };
  xhr.send(JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  }));
}

function finalizeBrooksProjectSave(modal, projectName, projectDesc) {
  function closeModal() {
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
  }
  var tiBar = document.getElementById('brooks-convo-title');
  var convoTitle = (tiBar && tiBar.value.trim()) ? tiBar.value.trim() : projectName;

  sbSaveBrooksConversation(function() {
    if (!currentBrooksConversationId) {
      toast('Save this chat first (nothing to link yet).');
      closeModal();
      return;
    }
    _sb.from('projects')
      .insert([{ user_id: currentUser.id, name: projectName, description: projectDesc || '' }])
      .select('id')
      .single()
      .then(function(ins) {
        if (ins.error || !ins.data || !ins.data.id) {
          toast('Could not create project.');
          closeModal();
          return;
        }
        var pid = ins.data.id;
        _sb.from('brooks_conversations')
          .update({ project_id: pid })
          .eq('id', currentBrooksConversationId)
          .eq('user_id', currentUser.id)
          .then(function(u1) {
            if (u1.error) {
              console.error(u1.error);
              toast('Project created but linking the chat failed.');
              closeModal();
              return;
            }
            var summaryBits = '';
            brooksHistory.forEach(function(m) {
              if (brooksSkipChatRender(m)) return;
              summaryBits += (m.role === 'user' ? 'Writer: ' : 'Brooks: ') + brooksMessageContentPlain(m.content).substring(0, 400) + '\n---\n';
            });
            var synopsis = summaryBits.length > 3500 ? summaryBits.substring(0, 3500) + '…' : summaryBits;
            var noteBody = 'Brooks script-development session (' + brooksScriptFormatHumanLabel(brooksScriptFormat || '') + ')\n\nConversation excerpt:\n' + synopsis;
            _sb.from('project_files').insert([{
              project_id: pid,
              name: 'Brooks — session notes',
              file_type: 'Notes',
              content: noteBody
            }]).then(function(pf) {
              if (pf.error) console.warn(pf.error);
              toast('Project created and linked!');
              closeModal();
              if (tiBar && projectName && projectName !== 'Untitled project') tiBar.value = projectName;
              if (typeof loadBrooksProjectSelector === 'function') loadBrooksProjectSelector();
              if (typeof loadProjects === 'function') loadProjects();
            });
          });
      });
  }, convoTitle, getBrooksSaveTagPreferSession());
}

var currentBrooksConversationId = null;
var _brooksConversationSaved = false;
var brooksImages = [];
var currentBrooksProjectId = null;
var currentProjectFiles = [];

function handleBrooksFile(input) {
  if (!input.files || !input.files.length) return;
  var files = Array.from(input.files);
  files.forEach(function(file) {
    var fileName = file.name.toLowerCase();
    var fileType = file.type || '';

    // Prioritize text files to avoid any accidental routing to image processing
    if (fileName.endsWith('.txt') || fileType === 'text/plain') {
      processBrooksText(file);
    } else if (fileType.startsWith('image/')) {
      processBrooksImage(file);
    } else {
      toast('Unsupported file type: ' + file.name);
    }
  });
}

function processBrooksImage(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    brooksImages.push({ data: e.target.result.split(',')[1], type: file.type, src: e.target.result });
    renderBrooksImagePreviews();
  };
  reader.readAsDataURL(file);
}

function processBrooksText(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var text = e.target.result;
    var input = document.getElementById('brooks-input');
    if (input) {
      input.value += (input.value ? '\n\n' : '') + '--- File: ' + file.name + ' ---\n' + text;
    }
    toast('File ' + file.name + ' added to chat.');
  };
  reader.readAsText(file);
}

function renderBrooksImagePreviews() {
  var preview = document.getElementById('brooks-image-preview');
  if (!preview) return;
  preview.innerHTML = '';
  brooksImages.forEach(function(img, i) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:inline-block;margin-right:8px';
    wrap.innerHTML = '<img src="' + img.src + '" style="max-height:80px;max-width:120px;border-radius:6px;object-fit:cover"><button onclick="removeBrooksImage(' + i + ')" style="position:absolute;top:-6px;right:-6px;background:var(--red);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;line-height:1">✕</button>';
    preview.appendChild(wrap);
  });
  preview.style.display = brooksImages.length ? 'block' : 'none';
}

function removeBrooksImage(i) {
  brooksImages.splice(i, 1);
  renderBrooksImagePreviews();
}

function clearBrooksImage() {
  brooksImages = [];
  var preview = document.getElementById('brooks-image-preview');
  if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
  var input = document.getElementById('brooks-image-input');
  if (input) input.value = '';
}

function loadBrooksHistory() {
  if (!currentUser || !_sb) return;
  _sb.from('brooks_messages')
    .select('role, content')
    .order('created_at', { ascending: true })
    .then(function(result) {
      if (result.error) {
        console.error('Error loading Brooks history:', result.error);
        return;
      }
      var messages = result.data;
      if (messages) {
        brooksHistory = messages.map(function(m) { return { role: m.role, content: m.content }; });
        var msgs = document.getElementById('chat-msgs');
        if (msgs) {
          msgs.innerHTML = '';
          brooksHistory.forEach(function(m) {
            if (brooksSkipChatRender(m)) return;
            var div = document.createElement('div');
            div.className = 'cmsg ' + (m.role === 'user' ? 'user' : 'ai');
            if (m.role === 'assistant') {
              div.innerHTML = '<div class="mfrom">BROOKS AI</div>' + m.content.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
            } else {
              div.textContent = m.content;
            }
            msgs.appendChild(div);
          });
          msgs.scrollTop = msgs.scrollHeight;
        }
      }
    });
}

function capBrooksMessages(userId) {
  _sb.from('brooks_messages')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .then(function(res) {
      if (res.error || !res.count || res.count <= 50) return;
      var toDelete = res.count - 50;
      var oldest = res.data.slice(0, toDelete).map(function(m) { return m.id; });
      _sb.from('brooks_messages').delete().in('id', oldest);
    });
}

function saveBrooksTitle(title) {
  if (!title.trim() || !currentBrooksConversationId || !_sb || !currentUser) return;
  _sb.from('brooks_conversations')
    .update({ title: title.trim() })
    .eq('id', currentBrooksConversationId)
    .eq('user_id', currentUser.id)
    .then(function(result) {
      if (!result.error) {
        toast('Conversation title saved!');
        var titleInput = document.getElementById('brooks-convo-title');
        if (titleInput) {
          var now = new Date();
          var stamp = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          titleInput.setAttribute('data-saved-title', title.trim());
          titleInput.placeholder = 'Saved at ' + stamp;
        }
        if (typeof sbLoadBrooksConversations === 'function') sbLoadBrooksConversations();
      }
    });
}

function getStoredBrooksInviteCode(){
  try{return localStorage.getItem('c4a_brooks_invite_code')||'';}catch(e){}
  return '';
}

function hasBrooksAccess(){
  var userEmail=(window._c4aUserEmail||'').toLowerCase().trim();
  var inviteCode=getStoredBrooksInviteCode();
  var creatorEmails=['michael@comedy4all.com','michael@dasaroland.com'];
  if(creatorEmails.indexOf(userEmail)!==-1) return true;
  if(brooksAnthropicProxyConfigured()) return true;
  if(apiKey && apiKey.length>10) return true;
  if(BROOKS_TRIAL_CODES.indexOf(inviteCode)!==-1) return true;
  try{ var k=localStorage.getItem('c4a_apikey')||''; if(k.length>10) return true; }catch(e){}
  return false;
}

function redeemBrooksCode(){
  var input=document.getElementById('brooks-invite-input');
  if(!input) return;
  var code=(input.value||'').trim().toUpperCase();
  if(!code){toast('Enter a Brooks access code.');return;}
  if(BROOKS_TRIAL_CODES.indexOf(code)===-1){toast('That Brooks code is not valid.');return;}
  try{localStorage.setItem('c4a_brooks_invite_code',code);}catch(e){}
  input.value=code;
  updateBrooksContext();
  toast('Brooks unlocked with friend access.');
}

function toggleQuickPrompts() {
  var panel = document.getElementById('mobile-quick-prompts');
  var btn = document.getElementById('quick-prompts-toggle');
  if (!panel) return;
  var isOpen = panel.style.display === 'flex';
  panel.style.display = isOpen ? 'none' : 'flex';
  if (btn) btn.textContent = isOpen ? '⚡ Prompts' : '✕ Close';
}

function updateBrooksContext(){
  var el=document.getElementById('brooks-context-display');
  var accessEl=document.getElementById('brooks-access-status');
  var inviteInput=document.getElementById('brooks-invite-input');
  var key = apiKey || (function(){ try { return localStorage.getItem('c4a_apikey') || ''; } catch(e) { return ''; } })();
  var top = null;
  for (var i=0;i<jokes.length;i++) {
    if (!top || (jokes[i].score||0) > (top.score||0)) top = jokes[i];
  }
  var access=hasBrooksAccess();
  var inviteCode=getStoredBrooksInviteCode();
  var userEmail=(window._c4aUserEmail||'').toLowerCase();
  if(el) el.innerHTML='\u2713 '+jokes.length+' joke'+(jokes.length===1?'':'s')+' in your library<br>\u2713 Top scoring joke: '+(top?top.title:'None yet')+(top?' ('+(top.score||0)+')':'')+'<br>\u2713 Brooks access: '+(access?'<span style="color:var(--green)">Unlocked</span>':'<span style="color:var(--text3)">Premium only</span>')+(brooksAnthropicProxyConfigured()?'<br>\u2713 Anthropic: <span style="color:var(--green)">via proxy</span> (key stays on server)':'<br>\u2713 Anthropic: <span style="color:var(--text3)">direct</span> (browser sends key to Anthropic)');
  syncBrooksApiKeyInputs(key);
  syncBrooksProxyInputs();
  hideBrooksSetupMessages();
  if(inviteInput && inviteCode) inviteInput.value=inviteCode;
  if(accessEl){
    accessEl.innerHTML=access
      ? 'Brooks AI is currently <strong style="color:var(--green)">Unlocked</strong>.<br>'+(userEmail==='michael@comedy4all.com'?'Friend trial code: <strong style="color:var(--gold)">BROOKS-FRIEND-2026</strong>':'Friend access is active on this device.')
      : 'Brooks AI is a <strong style="color:var(--gold)">Premium</strong> feature.<br>Enter a friend code below or upgrade to unlock it.';
  }
}

function syncBrooksApiKeyInputs(value){
  var key = typeof value === 'string' ? value : (apiKey || (function(){ try { return localStorage.getItem('c4a_apikey') || ''; } catch(e) { return ''; } })());
  var ki = document.getElementById('api-key-input');
  if (ki) ki.value = key;
  var saki = document.getElementById('settings-api-key-input');
  if (saki) saki.value = key;
}

function getSelectedTags() {
  var btns = document.querySelectorAll('.brooks-tag-btn');
  var active = [];
  btns.forEach(function(b) { if (b.classList.contains('tag-active')) active.push(b.dataset.tag); });
  return active.join(',');
}

function setSelectedTags(tagString) {
  var btns = document.querySelectorAll('.brooks-tag-btn');
  if (!tagString) {
    btns.forEach(function(b) {
      b.classList.remove('tag-active');
      b.style.background = 'transparent';
      b.style.color = 'var(--text2)';
      b.style.borderColor = b.dataset.color || 'var(--border)';
    });
    return;
  }
  var tags = tagString.split(',');
  btns.forEach(function(b) {
    var color = b.dataset.color || 'var(--border)';
    if (tags.indexOf(b.dataset.tag) !== -1) {
      b.classList.add('tag-active');
      b.style.background = color;
      b.style.color = '#fff';
      b.style.borderColor = color;
    } else {
      b.classList.remove('tag-active');
      b.style.background = 'transparent';
      b.style.color = 'var(--text2)';
      b.style.borderColor = color;
    }
  });
}

function sbSaveBrooksConversation(callback, customTitle, customTag) {
  if (!currentUser || !_sb) { if (typeof callback === 'function') callback(); return; }
  if (!currentBrooksConversationId && brooksHistory.length === 0) { if (typeof callback === 'function') callback(); return; }
  console.log('Brooks save:', currentBrooksConversationId ? 'UPDATE ' + currentBrooksConversationId : 'INSERT NEW');
  var title = customTitle || '';
  if (!title) {
    for (var i = 0; i < brooksHistory.length; i++) {
      var m = brooksHistory[i];
      var contentText = typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? ((m.content.find(function(c){ return c.type === 'text'; }) || {}).text || '[image]') : '[image]');
      if (m.role === 'user' && contentText.length < 200
        && contentText.indexOf('Here are all my jokes') === -1
        && contentText.indexOf('You are a TV development') === -1
        && contentText.indexOf('Read ALL of my jokes') === -1
        && contentText.indexOf('_C4A_BRIDGE_') === -1) {
        title = contentText.substring(0, 60);
        break;
      }
    }
    if (!title) title = 'Brooks Session ' + new Date().toLocaleDateString();
  }
  var now = new Date().toISOString();
  var resolvedInsertTag = (customTag !== undefined && customTag !== null && String(customTag).trim() !== '')
    ? String(customTag).trim()
    : (getBrooksSaveTagPreferSession() || null);
  if (resolvedInsertTag === '') resolvedInsertTag = null;

    if (!currentBrooksConversationId) {
      _sb.from('brooks_conversations')
        .insert({ user_id: currentUser.id, title: title, tag: resolvedInsertTag, messages: brooksHistory, created_at: now, updated_at: now })
        .select('id').single()
      .then(function(res) {
        if (res.error) { console.error('Brooks save error:', res.error); if (typeof callback === 'function') callback(); return; }
        currentBrooksConversationId = res.data.id;
        try { localStorage.setItem('c4a_active_brooks_convo', currentBrooksConversationId); } catch(e){}
        var titleInput = document.getElementById('brooks-convo-title');
        if (titleInput && !titleInput.value) titleInput.value = title;
        if (titleInput) {
          var now = new Date();
          var stamp = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          titleInput.title = 'Last saved at ' + stamp;
          titleInput.style.borderBottomColor = 'var(--green)';
          setTimeout(function(){ titleInput.style.borderBottomColor = 'var(--border)'; }, 2000);
        }
        _brooksConversationSaved = true;
        if (typeof callback === 'function') callback();
      });
  } else {
    var updateData = { messages: brooksHistory, updated_at: now };
    if (customTitle) updateData.title = customTitle;
    if (customTag !== undefined && customTag !== null && String(customTag).trim() !== '') {
      updateData.tag = String(customTag).trim();
    } else {
      var rt = getBrooksSaveTagPreferSession();
      if (rt) updateData.tag = rt;
    }
    _sb.from('brooks_conversations')
      .update(updateData)
      .eq('id', currentBrooksConversationId)
      .then(function(res) {
        if (res.error) console.error('Brooks update error:', res.error);
        if (!res.error) {
          var titleInput = document.getElementById('brooks-convo-title');
          if (titleInput) {
            var now = new Date();
            var stamp = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            titleInput.title = 'Last saved at ' + stamp;
            titleInput.style.borderBottomColor = 'var(--green)';
            setTimeout(function(){ titleInput.style.borderBottomColor = 'var(--border)'; }, 2000);
          }
          _brooksConversationSaved = true;
        }
        if (typeof callback === 'function') callback();
      });
  }
}

function toggleBrooksMenu() {
  var menu = document.getElementById('brooks-mobile-menu');
  if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function togglePastConvos() {
  var panel = document.getElementById('mobile-past-convos');
  var btn = document.getElementById('past-convos-toggle');
  if (!panel) return;
  var isOpen = panel.style.display === 'flex';
  panel.style.display = isOpen ? 'none' : 'flex';
  if (btn) btn.textContent = isOpen ? '🕐 History' : '✕ Close';
  if (!isOpen) sbLoadBrooksConversations();
}

function restoreActiveBrooksSession() {
  var activeId = localStorage.getItem('c4a_active_brooks_convo');
  if (!activeId || !currentUser || !_sb) return;

  _sb.from('brooks_conversations')
    .select('id, title, messages, tag')
    .eq('id', activeId)
    .single()
    .then(function(res) {
      if (res.error || !res.data) {
        console.error('Error restoring active Brooks session:', res.error);
        return;
      }
      var convo = res.data;
      currentBrooksConversationId = convo.id;
      brooksHistory = convo.messages || [];
      applyBrooksSessionFromStoredTag(convo.tag);
      
      var msgs = document.getElementById('chat-msgs');
      if (msgs) {
        msgs.innerHTML = '';
        brooksHistory.forEach(function(m) {
          if (brooksSkipChatRender(m)) return;
          var div = document.createElement('div');
          div.className = 'cmsg ' + (m.role === 'user' ? 'user' : 'ai');
          if (m.role === 'assistant') {
            div.innerHTML = '<div class="mfrom">BROOKS AI</div>' + m.content.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
          } else {
            div.textContent = m.content;
          }
          msgs.appendChild(div);
        });
        msgs.scrollTop = msgs.scrollHeight;
      }
      
      var titleInput = document.getElementById('brooks-convo-title');
      if (titleInput) titleInput.value = convo.title || '';
      setSelectedTags(convo.tag);
      _brooksConversationSaved = true;
      updateBrooksScriptActionBar();
    });
}

function startFreshBrooksSession() {
  brooksHistory = [];
  currentBrooksConversationId = null;
  try { localStorage.removeItem('c4a_active_brooks_convo'); } catch(e){}
  _brooksConversationSaved = false;
  var titleInput = document.getElementById('brooks-convo-title');
  if (titleInput) titleInput.value = '';
  setSelectedTags('');
  var msgs = document.getElementById('chat-msgs');
  if (msgs) {
    msgs.innerHTML = '<div id="brooks-welcome" class="cmsg ai"></div>';
    renderBrooksGreeting();
  }
}

function sbLoadBrooksConversations() {
  var list = document.getElementById('brooks-history-list');
  var mlist = document.getElementById('mobile-brooks-history-list');
  if (!_sb || !currentUser) {
    if (list) list.innerHTML = '<div style="font-size:11px;color:var(--text3)">Not connected.</div>';
    if (mlist) mlist.innerHTML = '<div style="font-size:11px;color:var(--text3)">Not connected.</div>';
    return;
  }
  var mobileList = mlist;
  var emptyMsg = '<div style="font-size:11px;color:var(--text3)">No past conversations yet.</div>';
  if (list) list.innerHTML = '<div style="font-size:11px;color:var(--text3)">Loading...</div>';
  if (mobileList) mobileList.innerHTML = '<div style="font-size:11px;color:var(--text3)">Loading...</div>';

  var sortVal = document.getElementById('brooks-history-sort') ? document.getElementById('brooks-history-sort').value : 'newest';
  var query = _sb.from('brooks_conversations').select('id, title, updated_at, messages, tag').eq('user_id', currentUser.id);

  if (sortVal === 'newest') query = query.order('updated_at', { ascending: false });
  else if (sortVal === 'oldest') query = query.order('updated_at', { ascending: true });
  else if (sortVal === 'az') query = query.order('title', { ascending: true });
  else if (sortVal === 'za') query = query.order('title', { ascending: false });
  else if (sortVal === 'tag') query = query.order('tag', { ascending: true });
  else query = query.order('updated_at', { ascending: false });

  query.limit(50).then(function(result) {
      if (list) list.innerHTML = '';
      if (mobileList) mobileList.innerHTML = '';
      if (result.error || !result.data || result.data.length === 0) {
        if (list) list.innerHTML = emptyMsg;
        if (mobileList) mobileList.innerHTML = emptyMsg;
        return;
      }
      result.data.forEach(function(convo) {
        var targets = [];
        if (list) targets.push(list);
        if (mobileList) targets.push(mobileList);
        targets.forEach(function(container) {
          var item = document.createElement('div');
          item.style.cssText = 'padding:6px 8px;border-radius:var(--r2);cursor:pointer;font-size:12px;color:var(--text2);border:1px solid transparent;margin-bottom:4px;line-height:1.4';
          item.onmouseover = function(){ this.style.background='var(--bg3)'; };
          item.onmouseout = function(){ this.style.background=''; };
          var date = new Date(convo.updated_at).toLocaleDateString();
          item.style.display = 'flex';
          item.style.justifyContent = 'space-between';
          item.style.alignItems = 'center';
          
          var infoDiv = document.createElement('div');
          infoDiv.style.overflow = 'hidden';
          
          var tagColors = {
            'Feature': '#2196F3',
            'Sitcom': '#9C27B0',
            'Joke': '#FF9800',
            'Set': '#4CAF50',
            'Comedy': '#F44336',
            'Action': '#FF5722',
            'Drama': '#607D8B',
            'Other': '#795548'
          };
          
          var tagBadges = '';
          if (convo.tag) {
            var tags = convo.tag.split(',');
            tags.forEach(function(t) {
              var color = tagColors[t] || (t.indexOf('script-') === 0 ? '#7a43b5' : '#795548');
              tagBadges += '<span style="font-size:9px;font-weight:600;padding:1px 4px;border-radius:4px;margin-left:4px;background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44">' + t + '</span>';
            });
          }

          infoDiv.innerHTML = '<div style="font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (convo.title||'Untitled') + tagBadges + '</div><div style="font-size:10px;color:var(--text3)">' + date + '</div>';
          item.appendChild(infoDiv);

          var delBtn = document.createElement('div');
          delBtn.innerHTML = '&times;';
          delBtn.style.cssText = 'color:var(--red);cursor:pointer;font-size:16px;padding:0 4px;margin-left:8px;line-height:1';
          delBtn.onclick = function(e) {
            e.stopPropagation();
            if (confirm('Delete this conversation?')) {
              _sb.from('brooks_conversations').delete().eq('id', convo.id).then(function() {
                if (convo.id === currentBrooksConversationId) {
                  brooksHistory = [];
                  currentBrooksConversationId = null;
                  _brooksConversationSaved = false;
                  try { localStorage.removeItem('c4a_active_brooks_convo'); } catch(err){}
                  var titleInput = document.getElementById('brooks-convo-title');
                  if (titleInput) titleInput.value = '';
                  var msgs = document.getElementById('chat-msgs');
                  if (msgs) msgs.innerHTML = '';
                  renderBrooksGreeting();
                }
                sbLoadBrooksConversations();
              });
            }
          };
          item.appendChild(delBtn);

          item.onclick = function() {
            var msgs = document.getElementById('chat-msgs');
            if (!msgs) return;
            msgs.innerHTML = '';
            brooksHistory = convo.messages || [];
            currentBrooksConversationId = convo.id;
            var titleInput = document.getElementById('brooks-convo-title');
            if (titleInput) titleInput.value = convo.title || '';
            setSelectedTags(convo.tag);
            applyBrooksSessionFromStoredTag(convo.tag);
            brooksHistory.forEach(function(m) {
              if (brooksSkipChatRender(m)) return;
              var div = document.createElement('div');
              div.className = 'cmsg ' + (m.role === 'user' ? 'user' : 'ai');
              if (m.role === 'assistant') div.innerHTML = '<div class="mfrom">BROOKS AI</div>' + m.content.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
              else div.textContent = m.content;
              msgs.appendChild(div);
            });
            msgs.scrollTop = msgs.scrollHeight;
            updateBrooksScriptActionBar();
            var mpanel = document.getElementById('mobile-past-convos');
            var mbtn = document.getElementById('past-convos-toggle');
            if (mpanel) mpanel.style.display = 'none';
            if (mbtn) mbtn.textContent = '🕐 History';
          };
          container.appendChild(item);
        });
      });
    });
}

var BROOKS_DEFAULT_ANTHROPIC_PROXY = 'http://localhost:8788';

function saveApiKey(v){
  console.log('saveApiKey called with:', v);
  var trimmed=v.trim();
  try{localStorage.setItem('c4a_apikey',trimmed);}catch(e){}
  console.log('saved to localStorage:', (function(){ try { return localStorage.getItem('c4a_apikey'); } catch(e) { return ''; } })());
  apiKey=trimmed;
  syncBrooksApiKeyInputs(trimmed);
  updateBrooksContext();
}

function getBrooksStoredProxyRaw() {
  try {
    return localStorage.getItem('c4a_anthropic_proxy');
  } catch (e) {
    return null;
  }
}

function getBrooksAnthropicDirectKey() {
  return apiKey || (function(){ try { return localStorage.getItem('c4a_apikey') || ''; } catch(e) { return ''; } })();
}

function getBrooksAnthropicProxyBase() {
  var stored = getBrooksStoredProxyRaw();
  if (stored !== null) return stored.trim();
  var key = getBrooksAnthropicDirectKey();
  if (key && key.length > 10) return '';
  return BROOKS_DEFAULT_ANTHROPIC_PROXY;
}

function getBrooksProxyUrlForInput() {
  var stored = getBrooksStoredProxyRaw();
  if (stored !== null) return stored.trim();
  var key = getBrooksAnthropicDirectKey();
  if (key && key.length > 10) return '';
  return BROOKS_DEFAULT_ANTHROPIC_PROXY;
}

function brooksAnthropicProxyConfigured() {
  var u = getBrooksAnthropicProxyBase();
  return u.length >= 8 && /^https?:\/\//i.test(u);
}

function brooksNeedCredentialsMessage() {
  return 'Start the Anthropic proxy at ' + BROOKS_DEFAULT_ANTHROPIC_PROXY + ' (npm run proxy:dev). A direct API key in Settings is optional.';
}

function ensureBrooksDefaultAnthropicProxy() {
  if (getBrooksStoredProxyRaw() !== null) return;
  var key = getBrooksAnthropicDirectKey();
  if (key && key.length > 10) return;
  try {
    localStorage.setItem('c4a_anthropic_proxy', BROOKS_DEFAULT_ANTHROPIC_PROXY);
  } catch (e) {}
}

function brooksAnthropicCredentialsReady() {
  if (brooksAnthropicProxyConfigured()) return true;
  var k = getBrooksAnthropicDirectKey();
  return !!(k && k.length > 10);
}

function hideBrooksSetupMessages() {
  if (!brooksAnthropicCredentialsReady()) return;
  document.querySelectorAll('.cmsg.ai').forEach(function(el) {
    if (el.textContent.indexOf('SETUP') !== -1) el.style.display = 'none';
  });
}

function syncBrooksProxyInputs() {
  var url = getBrooksProxyUrlForInput();
  var ids = ['settings-anthropic-proxy-url', 'brooks-proxy-url-input'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) el.value = url;
  }
}

/** Opens POST to Messages API on xhr and sets headers. Returns false only in direct mode without a key. */
function brooksConfigureAnthropicXhr(xhr, asyncFlag) {
  if (asyncFlag === undefined) asyncFlag = true;
  var proxy = getBrooksAnthropicProxyBase().replace(/\/$/, '');
  xhr.open('POST', proxy ? proxy + '/v1/messages' : 'https://api.anthropic.com/v1/messages', asyncFlag);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('anthropic-version', '2023-06-01');
  if (proxy) {
    var secret = '';
    try { secret = (localStorage.getItem('c4a_proxy_secret') || '').trim(); } catch (e) {}
    if (secret) xhr.setRequestHeader('Authorization', 'Bearer ' + secret);
    return true;
  }
  xhr.setRequestHeader('anthropic-dangerous-direct-browser-access', 'true');
  var key = getBrooksAnthropicDirectKey();
  if (!key || key.length < 10) return false;
  xhr.setRequestHeader('x-api-key', key);
  return true;
}

function saveAnthropicProxyUrl(v) {
  var trimmed = (v || '').trim();
  try {
    localStorage.setItem('c4a_anthropic_proxy', trimmed);
  } catch (e) {}
  updateBrooksContext();
}

function saveAnthropicProxySecret(v) {
  var trimmed = (v || '').trim();
  try {
    if (trimmed) localStorage.setItem('c4a_proxy_secret', trimmed);
    else localStorage.removeItem('c4a_proxy_secret');
  } catch (e) {}
}

function brooksMessageContentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(function(part) {
      if (!part) return '';
      if (part.type === 'text') return part.text || '';
      if (part.type === 'image') return '[image]';
      return '';
    }).join('\n');
  }
  return '';
}

function buildBrooksProjectContextBlock() {
  if (!currentBrooksProjectId || !currentProjectFiles || currentProjectFiles.length === 0) return '';
  var block = '[PROJECT CONTEXT]\n';
  currentProjectFiles.forEach(function(file) {
    var fileType = (file.file_type || 'Other').toString().toUpperCase();
    var fileName = file.name || 'untitled';
    block += '[' + fileType + '] - ' + fileName + ':\n' + (file.content || '') + '\n\n';
  });
  block += '[END PROJECT CONTEXT]';
  return block;
}

function prependBrooksProjectContextToContent(content) {
  var projectContext = buildBrooksProjectContextBlock();
  if (!projectContext) return content;
  if (Array.isArray(content)) {
    var cloned = content.slice();
    cloned.unshift({ type: 'text', text: projectContext + '\n\n' });
    return cloned;
  }
  return projectContext + '\n\n' + content;
}

function sendBrooks(){
  if (!hasBrooksAccess()) {
    document.getElementById('brooks-upgrade-overlay').style.display = 'flex';
    return;
  }
  if (!brooksAnthropicCredentialsReady()) {
    toast(brooksNeedCredentialsMessage());
    return;
  }
  var input=document.getElementById('brooks-input'),msgs=document.getElementById('chat-msgs');
  if(!input||!msgs||(!input.value.trim()&&!brooksImages.length)) return;
  var text=input.value.trim();

  if (document.getElementById('brooks-welcome')) {
    toast('Pick a button first — jokes or script idea.');
    return;
  }

  var pickerEl = document.getElementById('brooks-script-format-picker');
  if (pickerEl) {
    pickerEl.remove();
    brooksSessionKind = 'script';
    if (!brooksScriptFormat) {
      brooksScriptFormat = 'open';
      _brooksPendingTag = 'script-open';
    }
    updateBrooksScriptActionBar();
  }

  input.value='';
  var um=document.createElement('div');
  um.className='cmsg user';
  if (brooksImages && brooksImages.length > 0) {
    var thumbs = brooksImages.map(function(img) {
      return '<img src="' + img.src + '" style="max-height:60px;max-width:80px;border-radius:4px;margin-right:4px">';
    }).join('');
    um.innerHTML = thumbs + (text ? '<div style="margin-top:6px">' + text + '</div>' : '');
  } else {
    um.textContent = text;
  }
  var hadImages = brooksImages && brooksImages.length > 0;
  var userContent;
  if (hadImages) {
    userContent = brooksImages.map(function(img) {
      return { type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } };
    });
    userContent.push({ type: 'text', text: text || 'Please read these screenshots and continue our conversation based on what you see.' });
    clearBrooksImage();
  } else {
    userContent = text;
  }
  if (brooksSessionKind === 'jokes' && brooksHistory.length === 0 && jokes && jokes.length > 0) {
    var jokeContext = jokes.map(function(j, i) {
      return (i+1) + '. ' + (j.title||'') + ': ' + (j.body||j.text||j.setup||'') + (j.punch ? ' / ' + j.punch : '') + ' [' + (j.tier||'?') + '-tier, ' + (j.rating||'?') + '/5]';
    }).join('\n');
    brooksHistory.push({role:'user', content:'Here are all my jokes:\n\n' + jokeContext});
    brooksHistory.push({role:'assistant', content:"Got it. I've read all your material. What do you want to work on?"});
  }
  brooksHistory.push({role:'user',content:userContent});
  if (currentUser && _sb) {
    var contentText = typeof userContent === 'string' ? userContent : (Array.isArray(userContent) ? 'Images uploaded' : '');
    _sb.from('brooks_messages').insert({ user_id: currentUser.id, role: 'user', content: contentText }).then(function() {
      capBrooksMessages(currentUser.id);
    });
  }
  msgs.appendChild(um);
  msgs.scrollTop=msgs.scrollHeight;
  var typing=document.createElement('div');
  typing.className='cmsg ai';
  typing.innerHTML='<div class="mfrom">BROOKS AI</div><span style="color:var(--text3)">thinking...</span>';
  msgs.appendChild(typing);
  msgs.scrollTop=msgs.scrollHeight;
  var btn=document.getElementById('send-btn');
  if(btn){btn.disabled=true;btn.textContent='...';}
  var xhr=new XMLHttpRequest();
  if (!brooksConfigureAnthropicXhr(xhr)) {
    if(btn){btn.disabled=false;btn.textContent='Send';}
    typing.remove();
    brooksHistory.pop();
    msgs.removeChild(um);
    input.value=text;
    toast(brooksNeedCredentialsMessage());
    return;
  }
  xhr.onreadystatechange=function(){
    if(xhr.readyState!==4) return;
    if(btn){btn.disabled=false;btn.textContent='Send';}
    if(xhr.status===200){
      try{
        var data=JSON.parse(xhr.responseText);
        var reply=(data.content||[]).filter(function(c){return c.type==='text';}).map(function(c){return c.text;}).join('')||'No response.';
        brooksHistory.push({role:'assistant',content:reply});
        if (currentUser && _sb) {
          _sb.from('brooks_messages').insert({ user_id: currentUser.id, role: 'assistant', content: reply }).then(function() {
            capBrooksMessages(currentUser.id);
          });
        }
        if (currentBrooksConversationId) {
          sbSaveBrooksConversation();
        }
        typing.innerHTML='<div class="mfrom">BROOKS AI</div>'+reply.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
      }catch(e){typing.innerHTML='<div class="mfrom">BROOKS AI</div>Parse error. Try again.';}
    } else if(xhr.status===401){
      typing.innerHTML='<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Anthropic auth failed. Check the proxy server, or your optional direct key in Settings.</span>';
    } else {
      typing.innerHTML='<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Error '+xhr.status+'. Check the Anthropic proxy, or your optional API key, and try again.</span>';
    }
    msgs.scrollTop=msgs.scrollHeight;
    updateBrooksScriptActionBar();
  };
  xhr.onerror=function(){
    if(btn){btn.disabled=false;btn.textContent='Send';}
    typing.innerHTML='<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Network error. If you use the local proxy, start it with npm run proxy:dev (' + BROOKS_DEFAULT_ANTHROPIC_PROXY + ').</span>';
    msgs.scrollTop=msgs.scrollHeight;
    updateBrooksScriptActionBar();
  };
  // Build a trimmed alternating window for the API only — brooksHistory stays intact
  var apiHistory = [brooksHistory[brooksHistory.length - 1]];
  for (var i = brooksHistory.length - 2; i >= 0; i--) {
    if (brooksHistory[i].role !== apiHistory[0].role) {
      apiHistory.unshift(brooksHistory[i]);
      if (apiHistory.length >= 10) break;
    }
  }

  var apiMessages = apiHistory.slice();
  var lastIndex = apiMessages.length - 1;
  if (lastIndex >= 0) {
    var rawC = apiMessages[lastIndex].content;
    var expanded = brooksExpandBridgeForApi(rawC);
    apiMessages[lastIndex] = {
      role: apiMessages[lastIndex].role,
      content: prependBrooksProjectContextToContent(expanded)
    };
  }

  var payload=JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:hadImages?2000:1000,system:getBrooksActiveSystem(),messages:apiMessages});
  xhr.send(payload);
}

function runStoryMining(type) {
  var msgs = document.getElementById('chat-msgs');
  if (!msgs) return;
  var welcome = document.getElementById('brooks-welcome');
  if (welcome) welcome.remove();
  var picker = document.getElementById('brooks-script-format-picker');
  if (picker) picker.remove();
  brooksSessionKind = 'jokes';
  brooksScriptFormat = null;
  _brooksPendingTag = 'jokes-work';
  updateBrooksScriptActionBar();
  if (!hasBrooksAccess()) {
    document.getElementById('brooks-upgrade-overlay').style.display = 'flex';
    return;
  }
  if (!brooksAnthropicCredentialsReady()) {
    toast(brooksNeedCredentialsMessage());
    return;
  }
  var jokeList = jokes.map(function(j, i) {
    return (i+1) + '. [' + (j.tier||'?').toUpperCase() + '-tier, ' + (j.rating||'?') + '/5 stars] TITLE: ' + (j.title||'Untitled') + (j.body ? ' | MATERIAL: ' + j.body : '');
  }).join('\n');
  var prompt = '';
  if (type === 'sitcom') {
    prompt = 'You are a TV development expert. Analyze these jokes and find sitcom potential using these proven comedy formulas:\n\nSITCOM ARCHETYPES TO LOOK FOR:\n- The Fish Out of Water (character in an unfamiliar world)\n- The Odd Couple (two incompatible people forced together)\n- The Workplace Ensemble (group dynamic with hierarchy and conflict)\n- The Family Dysfunction (relatives who love and irritate each other)\n- The Reluctant Hero (someone thrust into a role they didn\'t choose)\n- The Con Artist / Schemer (lovable character always running angles)\n- The Eternal Loser (sympathetic underdog who never quite wins)\n- The Status Obsessed (character desperately chasing respectability)\n\nSTRUCTURAL PATTERNS TO IDENTIFY:\n- Recurring world or setting (what environment do these jokes live in?)\n- A character\'s fatal flaw that drives comedy\n- A social group or community with its own rules\n- A relationship with inherent tension (boss/employee, parent/child, rivals)\n- A premise that resets each episode but generates endless variations\n\nScan all jokes below. Identify: (1) the strongest sitcom premise, (2) which archetype it fits, (3) the main character\'s flaw, (4) the recurring world, (5) two potential episode ideas. Be specific and reference actual jokes.\n\nJOKES:\n' + jokeList;
  } else if (type === 'sitcom-diversity') {
    prompt = 'Audit ALL of my jokes below and tell me whether I have enough diversity of characters, worlds, relationships, recurring conflicts, and emotional point of view to support a sitcom. Give me: (1) a sitcom readiness score from 1-10, (2) the strongest recurring world/theme already in my material, (3) where my act is repetitive or too narrow, (4) which joke clusters could become recurring characters or story engines, and (5) five topic areas I should write next if I want a sitcom sample that grows naturally out of my stand-up.\n\nMY JOKES:\n' + jokeList;
  } else if (type === 'movie') {
    prompt = 'You are a film development executive. Analyze these jokes for feature film comedy potential using these proven structures:\n\nCOMEDY MOVIE FORMULAS:\n- The Buddy Comedy (two mismatched people on a shared mission)\n- The Coming of Age (protagonist learns hard truths about themselves)\n- The Underdog Sports/Competition Story (loser proves everyone wrong)\n- The Fish Out of Water Journey (character in completely wrong world)\n- The Revenge Fantasy (powerless person gets satisfying payback)\n- The Con/Heist Comedy (elaborate scheme that goes hilariously wrong)\n- The Romance Obstacle Course (two people who should be together aren\'t)\n- The Identity Crisis (character pretending to be someone they\'re not)\n- The Mid-Life Reckoning (adult confronts choices they\'ve made)\n\nTHREE-ACT STRUCTURE SIGNALS:\n- Act 1: What\'s the inciting incident in these jokes? What disrupts the normal world?\n- Act 2: What\'s the escalating conflict? What does the protagonist want vs. need?\n- Act 3: What\'s the potential resolution? What would change?\n\nScan all jokes below. Identify: (1) the strongest movie premise, (2) the formula it fits, (3) the protagonist\'s want vs. need, (4) the core conflict, (5) a one-paragraph pitch. Be specific.\n\nJOKES:\n' + jokeList;
  } else {
    prompt = 'You are a comedy special producer and dramaturg. Analyze these jokes to architect a full Netflix-style comedy special using these structural principles:\n\nCOMEDY SPECIAL ARCHITECTURE:\n- The Opening Salvo: A strong first joke that establishes voice and makes a promise to the audience\n- The Theme Engine: The central worldview or obsession that ties everything together\n- The Callback Web: Jokes that can reference each other for compounding laughs\n- The Anchor Bit: The 5-8 minute centerpiece that the special is remembered for\n- The Emotional Turn: The moment where comedy becomes briefly vulnerable or true\n- The Closing Argument: The final bit that pays off everything and sends the audience out strong\n\nTHEMATIC PATTERNS TO FIND:\n- What is the comedian\'s central conflict with the world?\n- What does this material say about family, society, relationships, or identity?\n- What is the point of view that runs through all the jokes?\n- Which jokes cluster naturally into acts or chapters?\n\nScan all jokes below and build: (1) a proposed running order with act breaks, (2) the central theme in one sentence, (3) which joke is the anchor bit, (4) two potential callback pairs, (5) what the emotional turn should be. Be specific and reference actual joke titles.\n\nJOKES:\n' + jokeList;
  }
  var userMsg = document.createElement('div');
  userMsg.className = 'cmsg user';
  var label = type === 'sitcom' ? 'Scan my jokes for sitcom ideas' : type === 'sitcom-diversity' ? 'Audit my jokes for sitcom diversity' : type === 'movie' ? 'Scan my jokes for movie ideas' : 'Build my comedy special arc';
  userMsg.textContent = label;
  msgs.appendChild(userMsg);
  msgs.scrollTop = msgs.scrollHeight;
  var typing = document.createElement('div');
  typing.className = 'cmsg ai';
  typing.id = 'brooks-typing';
  typing.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--text3)">Reading all your jokes... this may take a moment...</span>';
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;
  brooksHistory.push({role:'user', content: prompt});
  var xhr = new XMLHttpRequest();
  if (!brooksConfigureAnthropicXhr(xhr)) {
    typing.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">' + brooksNeedCredentialsMessage() + '</span>';
    return;
  }
  xhr.onload = function() {
    var t = document.getElementById('brooks-typing');
    if (!t) return;
        if (xhr.status === 200) {
          try {
            var d = JSON.parse(xhr.responseText);
            var reply = d.content && d.content[0] && d.content[0].text ? d.content[0].text : 'No response.';
            brooksHistory.push({role:'assistant', content: reply});
            t.innerHTML = '<div class="mfrom">BROOKS AI</div>' + reply.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');

        var followPrompt = 'You just gave story mining results. Now generate exactly 4 short follow-up questions (under 10 words each) that would help develop the single most promising idea you found. Return ONLY a JSON array of 4 strings, nothing else. Example: ["Who is the main character?","What\'s the recurring conflict?","Single or multi-camera?","Write the pilot cold open"]';
        var followFallback = [
          'Develop the strongest idea further',
          'Write a pitch paragraph',
          'Name the main character',
          'Write the opening scene'
        ];
        var renderFollowUps = function(options, heading) {
          var followDiv = document.createElement('div');
          followDiv.className = 'cmsg ai';
          followDiv.style.marginTop = '8px';
          var followHTML = '<div class="mfrom">BROOKS AI</div><div style="margin-bottom:8px">' + heading + '</div>';
          options.forEach(function(option) {
            followHTML += '<div class="sugg" onclick="fillBrooks(\'' + option.replace(/'/g, "\\'") + '\');document.getElementById(\'brooks-input\').focus()" style="margin-bottom:6px"><div>' + option + '</div></div>';
          });
          followDiv.innerHTML = followHTML;
          msgs.appendChild(followDiv);
          msgs.scrollTop = msgs.scrollHeight;
        };
        var followPayload = JSON.stringify({
          model:'claude-haiku-4-5-20251001',
          max_tokens:300,
          system:BROOKS_SYS,
          messages:brooksHistory.concat([{role:'user',content:followPrompt}])
        });
        var followXHR = new XMLHttpRequest();
        if (!brooksConfigureAnthropicXhr(followXHR)) {
          renderFollowUps(followFallback, "That one's got legs. Let's develop it — pick a direction:");
          return;
        }
        followXHR.onload = function() {
          try {
            if (followXHR.status !== 200) throw new Error('follow-up request failed');
            var followData = JSON.parse(followXHR.responseText);
            var followText = followData.content && followData.content[0] && followData.content[0].text ? followData.content[0].text : '';
            var parsed = JSON.parse(followText);
            if (!parsed || !parsed.length) throw new Error('invalid follow-up json');
            renderFollowUps(parsed, "That one's got legs. Let's develop it — pick a direction:");
          } catch (e) {
            renderFollowUps(followFallback, "That one's got legs. Let's develop it — pick a direction:");
          }
        };
        followXHR.onerror = function() {
          renderFollowUps(followFallback, "That one's got legs. Let's develop it — pick a direction:");
        };
        followXHR.send(followPayload);
      } catch(e) { t.innerHTML = '<div class="mfrom">BROOKS AI</div>Parse error. Try again.'; }
    } else if (xhr.status === 401) {
      t.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Anthropic auth failed. Check the proxy (or optional direct key).</span>';
    } else {
      t.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Error ' + xhr.status + '. Try again.</span>';
    }
    t.id = '';
    msgs.scrollTop = msgs.scrollHeight;
  };
  xhr.onerror = function() {
    var t = document.getElementById('brooks-typing');
    if (t) t.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Network error. Check your connection.</span>';
  };
  // Ensure messages alternate user/assistant - remove consecutive duplicates
  var cleanHistory = [];
  for (var i = 0; i < brooksHistory.length; i++) {
    if (cleanHistory.length === 0 || cleanHistory[cleanHistory.length-1].role !== brooksHistory[i].role) {
      cleanHistory.push(brooksHistory[i]);
    }
  }
  brooksHistory = cleanHistory;
  var payload = JSON.stringify({model:'claude-haiku-4-5-20251001', max_tokens:1500, system: BROOKS_SYS, messages: brooksHistory});
  xhr.send(payload);
}
function fillBrooks(t){var input=document.getElementById('brooks-input');if(input){input.value=t;input.focus();}}
function handleBrooksKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendBrooks();}}

function loadBrooksProjectSelector() {
  if (!currentUser || !_sb) return;
  var select = document.getElementById('brooks-project-select');
  if (!select) return;

  var currentVal = select.value;

  _sb.from('projects')
    .select('id, name')
    .eq('user_id', currentUser.id)
    .order('name', { ascending: true })
    .then(function(res) {
      if (res.error) {
        console.error('Error loading projects for Brooks:', res.error);
        return;
      }
      var projects = res.data || [];
      select.innerHTML = '<option value="">(No Project)</option>';
      projects.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === currentVal) opt.selected = true;
        select.appendChild(opt);
      });
    });
}

function onBrooksProjectChange(val) {
  currentBrooksProjectId = val || null;
  currentProjectFiles = [];

  if (!val) {
    toast('Project deselected');
    return;
  }

  _sb.from('project_files')
    .select('*')
    .eq('project_id', val)
    .then(function(res) {
      if (res.error) {
        console.error('Error loading project files:', res.error);
        toast('Error loading project files');
        return;
      }
      currentProjectFiles = res.data || [];
      toast(currentProjectFiles.length + ' project files loaded');
    });
}
function renderBrooksGreeting(){
  brooksResetSessionMode();
  var msgs = document.getElementById('chat-msgs');
  if (msgs) {
    msgs.innerHTML = '<div id="brooks-welcome" class="cmsg ai"></div>';
  }
  var el = document.getElementById('brooks-welcome');
  if (!el) return;
  var lines = [
    'Hey — before we dive in, what kind of session is this?',
    'Good to see you. Are we working stand-up material, or hashing out a script idea?',
    'Quick choice first so I don\'t bulldoze the wrong lane.'
  ];
  var pick = lines[Math.floor(Math.random() * lines.length)];
  var proxyUrl = getBrooksProxyUrlForInput();
  el.innerHTML = '<div class="mfrom">BROOKS AI</div><div style="margin-bottom:10px;line-height:1.45">' + pick + '</div>' +
    brooksChoiceRowHtml([
      { label: 'Stand-up / jokes', onclick: 'brooksPickPath(\'jokes\')' },
      { label: 'Script idea', onclick: 'brooksPickPath(\'script\')' }
    ]) +
    '<div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">Brooks uses the Anthropic proxy at <span style="font-family:\'DM Mono\',monospace;font-size:10px">' + proxyUrl + '</span> so your API key stays on the server. A direct key in Settings is optional.</div>';
  updateBrooksScriptActionBar();
}

function initBrooksTags() {
  document.querySelectorAll('.brooks-tag-btn').forEach(function(btn) {
    btn.onclick = function() {
      var color = this.dataset.color || 'var(--border)';
      this.classList.toggle('tag-active');
      if (this.classList.contains('tag-active')) {
        this.style.background = color;
        this.style.color = '#fff';
        this.style.borderColor = color;
      } else {
        this.style.background = 'transparent';
        this.style.color = 'var(--text2)';
        this.style.borderColor = color;
      }
    };
  });
}

renderBrooksGreeting();
initBrooksTags();
function showBrooksSaveModal(onSave, onDiscard) {
  var autoTitle = '';
  var titleInput = document.getElementById('brooks-convo-title');
  if (titleInput && titleInput.value.trim()) {
    autoTitle = titleInput.value.trim();
  } else {
    for (var i = 0; i < brooksHistory.length; i++) {
      var m = brooksHistory[i];
      var contentText = typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? ((m.content.find(function(c){ return c.type === 'text'; }) || {}).text || '[image]') : '[image]');
      if (m.role === 'user' && contentText.length < 200
        && contentText.indexOf('Here are all my jokes') === -1
        && contentText.indexOf('You are a TV development') === -1
        && contentText.indexOf('Read ALL of my jokes') === -1
        && contentText.indexOf('_C4A_BRIDGE_') === -1) {
        autoTitle = contentText.substring(0, 60);
        break;
      }
    }
  }
  if (!autoTitle) autoTitle = 'Brooks Session ' + new Date().toLocaleDateString();

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;font-family:sans-serif';
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg);padding:20px;border-radius:12px;border:1px solid var(--border);width:300px;text-align:center';
  box.innerHTML = '<div style="margin-bottom:15px;font-weight:600;color:var(--text)">Save this conversation?</div>';
  
  var input = document.createElement('input');
  input.type = 'text';
  input.value = autoTitle;
  input.style.cssText = 'width:100%;padding:8px;margin-bottom:12px;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text)';
  box.appendChild(input);

  var tagContainer = document.createElement('div');
  tagContainer.id = 'modal-brooks-tags';
  tagContainer.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:20px;justify-content:center';
  var options = {
    'Feature': '#2196F3',
    'Sitcom': '#9C27B0',
    'Joke': '#FF9800',
    'Set': '#4CAF50',
    'Comedy': '#F44336',
    'Action': '#FF5722',
    'Drama': '#607D8B',
    'Other': '#795548'
  };
  Object.keys(options).forEach(function(opt) {
    var color = options[opt];
    var btn = document.createElement('button');
    btn.className = 'btn btn-sm brooks-tag-btn';
    btn.dataset.tag = opt;
    btn.dataset.color = color;
    btn.textContent = opt;
    btn.style.cssText = 'padding:2px 6px;font-size:10px;border-radius:10px;border:1px solid ' + color + ';background:transparent;color:var(--text2);cursor:pointer;font-family:sans-serif';
    btn.onclick = function() {
      this.classList.toggle('tag-active');
      if (this.classList.contains('tag-active')) {
        this.style.background = color;
        this.style.color = '#fff';
        this.style.borderColor = color;
      } else {
        this.style.background = 'transparent';
        this.style.color = 'var(--text2)';
        this.style.borderColor = color;
      }
    };
    tagContainer.appendChild(btn);
  });
  box.appendChild(tagContainer);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;justify-content:space-between;gap:10px';
  
  var discardBtn = document.createElement('button');
  discardBtn.textContent = 'Discard';
  discardBtn.style.cssText = 'flex:1;padding:8px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--text2);cursor:pointer';
  discardBtn.onclick = function() { document.body.removeChild(modal); onDiscard(); };
  
  var saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.cssText = 'flex:1;padding:8px;border-radius:4px;border:none;background:var(--green);color:#fff;cursor:pointer';
  saveBtn.onclick = function() {
    var finalTitle = input.value.trim();
    var activeTags = [];
    tagContainer.querySelectorAll('.tag-active').forEach(function(btn) {
      activeTags.push(btn.dataset.tag);
    });
    var finalTag = activeTags.join(',');
    if (finalTitle) {
      var titleInput = document.getElementById('brooks-convo-title');
      if (titleInput) titleInput.value = finalTitle;
    }
    document.body.removeChild(modal);
    onSave(finalTitle, finalTag);
  };
  
  btnRow.appendChild(discardBtn);
  btnRow.appendChild(saveBtn);
  box.appendChild(btnRow);
  modal.appendChild(box);
  document.body.appendChild(modal);
}

function saveBrooksManual() {
  var titleInput = document.getElementById('brooks-convo-title');
  var title = titleInput ? titleInput.value.trim() : '';
  var tag = getBrooksSaveTagPreferSession();

  sbSaveBrooksConversation(function() {
    toast('Conversation saved!');
    var btn = document.getElementById('brooks-save-btn');
    if (btn) {
      btn.textContent = '✓ Saved';
      setTimeout(function() { btn.textContent = '💾 Save'; }, 2000);
    }
    sbLoadBrooksConversations();
  }, title, tag);
}

function discardBrooksSession() {
  if (!confirm('Discard this conversation? It won\'t be saved.')) return;

  if (currentBrooksConversationId && _sb) {
    _sb.from('brooks_conversations').delete().eq('id', currentBrooksConversationId).then(function() {
      finalizeDiscard();
    });
  } else {
    finalizeDiscard();
  }

  function finalizeDiscard() {
    brooksHistory = [];
    currentBrooksConversationId = null;
    _brooksConversationSaved = false;
    try { localStorage.removeItem('c4a_active_brooks_convo'); } catch(e){}
    var titleInput = document.getElementById('brooks-convo-title');
    if (titleInput) titleInput.value = '';
    setSelectedTags('');
    var msgs = document.getElementById('chat-msgs');
    if (msgs) {
      msgs.innerHTML = '';
      renderBrooksGreeting();
    }
    if (typeof sbLoadBrooksConversations === 'function') sbLoadBrooksConversations();
    toast('Session discarded.');
  }
}

function clearBrooks() {
  var msgs = document.getElementById('chat-msgs');
  function resetUI() {
    if (currentUser && _sb) {
      _sb.from('brooks_messages').delete().eq('user_id', currentUser.id);
    }
    brooksHistory = [];
    currentBrooksConversationId = null;
    try { localStorage.removeItem('c4a_active_brooks_convo'); } catch(e){}
    _brooksTitlePrompted = false;
    _brooksConversationSaved = false;
    var titleInput = document.getElementById('brooks-convo-title');
    if (titleInput) titleInput.value = '';
    setSelectedTags('');
    if (msgs) {
      msgs.innerHTML = '<div id="brooks-welcome" class="cmsg ai"></div>';
      renderBrooksGreeting();
    }
    if (typeof sbLoadBrooksConversations === 'function') sbLoadBrooksConversations();
    toast('Session saved and started fresh!');
  }

  if (brooksHistory && brooksHistory.length > 2 && !_brooksConversationSaved) {
    showBrooksSaveModal(function(title, tag) { sbSaveBrooksConversation(resetUI, title, tag); }, resetUI);
  } else {
    resetUI();
  }
}

function sendToWritingStudio() {
  if (!brooksHistory || brooksHistory.length < 2) {
    toast('Nothing to send yet — have a conversation with Brooks first!');
    return;
  }
  if (!brooksAnthropicCredentialsReady()) {
    toast(brooksNeedCredentialsMessage());
    return;
  }
  var transcript = '';
  brooksHistory.forEach(function(m) {
    if (brooksSkipChatRender(m)) return;
    var ct = brooksMessageContentToText(m.content);
    if (m.role === 'user' && (ct.indexOf('Here are all my jokes') !== -1 || ct.length > 200)) return;
    var label = m.role === 'user' ? 'MICHAEL' : 'BROOKS';
    transcript += label + ':\n' + ct + '\n\n';
  });
  var title = 'New Script';
  for (var i = 0; i < brooksHistory.length; i++) {
    var m = brooksHistory[i];
    if (brooksSkipChatRender(m)) continue;
    var uc = brooksMessageContentToText(m.content);
    if (m.role === 'user' && uc.length < 200 && uc.indexOf('Here are all my jokes') === -1) {
      title = uc.substring(0, 50);
      break;
    }
  }
  toast('Brooks is writing your script...');
  var prompt = 'Based on this development conversation, write a proper TV pilot script outline. Include: a title page, logline, character descriptions, a cold open scene, Act One outline with 3-4 scenes, Act Two outline with 3-4 scenes, and a tag scene. Use proper screenplay formatting. Base everything specifically on the ideas discussed.\n\nCONVERSATION:\n' + transcript;
  var xhr = new XMLHttpRequest();
  if (!brooksConfigureAnthropicXhr(xhr)) {
    toast(brooksNeedCredentialsMessage());
    return;
  }
  xhr.onload = function() {
    if (xhr.status === 200) {
      try {
        var d = JSON.parse(xhr.responseText);
        var script = d.content && d.content[0] && d.content[0].text ? d.content[0].text : '';
        if (typeof go === 'function') go('studio');
        setTimeout(function() {
          if (typeof newScript === 'function') newScript();
          setTimeout(function() {
            var titleInput = document.getElementById('studio-script-title-input');
            var bodyInput = document.getElementById('studio-script-body');
            if (titleInput) titleInput.value = title;
            if (bodyInput) bodyInput.value = script;
            if (typeof saveActiveScript === 'function') saveActiveScript();
            toast('Script created in Writing Studio!');
          }, 400);
        }, 400);
      } catch(e) { toast('Error creating script. Try again.'); }
    } else {
      toast('Error ' + xhr.status + '. Check the Anthropic proxy or your optional API key.');
    }
  };
  xhr.onerror = function() { toast('Network error. Try again.'); };
  var payload = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });
  xhr.send(payload);
}

var _brooksTitlePrompted = false;

// Auto-save disabled per user request.

function loadBrooksProjectSelector() {
  if (!currentUser || !_sb) return;
  var select = document.getElementById('brooks-project-select');
  if (!select) return;

  _sb.from('projects')
    .select('id, name')
    .eq('user_id', currentUser.id)
    .order('name', { ascending: true })
    .then(function(res) {
      if (res.error) {
        console.error('Error loading project selector:', res.error);
        return;
      }
      var projects = res.data;
      select.innerHTML = '<option value="">(No Project)</option>';
      projects.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === currentBrooksProjectId) opt.selected = true;
        select.appendChild(opt);
      });
    });
}

function handleBrooksProjectChange(projectId) {
  currentBrooksProjectId = projectId || null;
  currentProjectFiles = [];

  if (!currentBrooksProjectId) {
    return;
  }

  _sb.from('project_files')
    .select('*')
    .eq('project_id', currentBrooksProjectId)
    .then(function(res) {
      if (res.error) {
        console.error('Error loading project files:', res.error);
        return;
      }
      currentProjectFiles = res.data || [];
      toast('Project files loaded');
    });
}

function brooksNormalizeFileType(type) {
  var t = (type || '').toString().trim().toLowerCase();
  if (t === 'character') return 'Character';
  if (t === 'theme') return 'Theme';
  if (t === 'tone') return 'Tone';
  if (t === 'plot') return 'Plot';
  if (t === 'story') return 'Story';
  if (t === 'notes') return 'Notes';
  return 'Other';
}

function brooksNormalizeExtractedFiles(result) {
  var list = [];
  if (!result) return list;
  if (Array.isArray(result)) list = result;
  else if (Array.isArray(result.files)) list = result.files;
  else if (Array.isArray(result.items)) list = result.items;
  else if (result.type || result.name || result.content) list = [result];

  return list.map(function(item) {
    return {
      type: brooksNormalizeFileType(item.type),
      name: (item.name || 'Untitled File').toString().trim(),
      content: (item.content || '').toString().trim()
    };
  }).filter(function(item) {
    return item.name || item.content;
  });
}

function brooksBuildConversationMessages() {
  var messages = [];
  brooksHistory.forEach(function(m) {
    if (brooksSkipChatRender(m)) return;
    var text = brooksMessageContentToText(m.content).trim();
    if (!text) return;
    messages.push({ role: m.role, content: text });
  });
  return messages;
}

function brooksParseJsonResponse(text) {
  var raw = (text || '').toString().trim();
  if (!raw) throw new Error('Empty response');
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(raw);
}

function brooksShowExtractConfirmationModal(files) {
  if (!files || !files.length) {
    toast('Brooks could not identify any files. Use manual add instead.');
    showBrooksManualFileModal();
    return;
  }

  var existing = document.getElementById('brooks-file-extract-modal');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

  var modal = document.createElement('div');
  modal.id = 'brooks-file-extract-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:10000;font-family:sans-serif;padding:16px';

  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg);padding:20px;border-radius:12px;border:1px solid var(--border);width:min(720px,100%);max-height:88vh;display:flex;flex-direction:column;gap:14px';
  box.innerHTML = '<div style="font-weight:600;color:var(--text);font-size:16px">Brooks found ' + files.length + ' file' + (files.length === 1 ? '' : 's') + '</div><div style="font-size:12px;color:var(--text2)">Uncheck anything you do not want to save.</div>';

  var list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:50vh;padding-right:4px';

  files.forEach(function(file, idx) {
    var row = document.createElement('label');
    row.style.cssText = 'display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg2);cursor:pointer';
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.index = String(idx);
    checkbox.style.marginTop = '4px';

    var meta = document.createElement('div');
    meta.style.cssText = 'flex:1;min-width:0';
    var title = document.createElement('div');
    title.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px';
    title.innerHTML = '<span style="font-weight:600;color:var(--text)">' + file.name + '</span><span style="font-size:10px;padding:2px 6px;border-radius:999px;background:var(--gold-bg);color:var(--gold);border:1px solid var(--gold-br)">' + file.type + '</span>';

    var preview = document.createElement('div');
    preview.style.cssText = 'font-size:12px;color:var(--text2);line-height:1.5;white-space:pre-wrap';
    preview.textContent = file.content.length > 280 ? file.content.substring(0, 280) + '...' : file.content;

    meta.appendChild(title);
    meta.appendChild(preview);
    row.appendChild(checkbox);
    row.appendChild(meta);
    list.appendChild(row);
  });

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;justify-content:space-between;gap:10px;margin-top:4px';

  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'btn btn-sm';
  cancelBtn.style.cssText = 'flex:1;justify-content:center';
  cancelBtn.onclick = function() {
    if (modal.parentNode) modal.parentNode.removeChild(modal);
  };

  var saveBtn = document.createElement('button');
  saveBtn.textContent = 'Create Selected';
  saveBtn.className = 'btn btn-sm btn-primary';
  saveBtn.style.cssText = 'flex:1;justify-content:center';
  saveBtn.onclick = function() {
    var selected = [];
    modal.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
      if (!cb.checked) return;
      var idx = parseInt(cb.dataset.index, 10);
      if (!isNaN(idx) && files[idx]) selected.push(files[idx]);
    });
    if (modal.parentNode) modal.parentNode.removeChild(modal);
    if (!selected.length) {
      toast('No files selected.');
      return;
    }
    brooksInsertProjectFiles(selected);
  };

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  box.appendChild(list);
  box.appendChild(btnRow);
  modal.appendChild(box);
  document.body.appendChild(modal);
}

function brooksInsertProjectFiles(files) {
  if (!currentBrooksProjectId || !_sb) {
    toast('Select a project first.');
    return;
  }
  var payload = files.map(function(file) {
    return {
      project_id: currentBrooksProjectId,
      name: file.name,
      file_type: brooksNormalizeFileType(file.type),
      content: file.content || ''
    };
  });

  _sb.from('project_files').insert(payload).then(function(res) {
    if (res.error) {
      console.error('Error saving project files:', res.error);
      toast('Error saving project files');
      return;
    }
    toast(payload.length + ' file' + (payload.length === 1 ? '' : 's') + ' created');
    handleBrooksProjectChange(currentBrooksProjectId);
  });
}

function createFileFromChat() {
  if (!currentBrooksProjectId) {
    toast('Select a project first.');
    return;
  }

  if (!brooksHistory || !brooksHistory.length) {
    toast('No conversation to analyze yet.');
    return;
  }

  toast('Brooks is analyzing the conversation...');

  var systemPrompt = 'You are a script development assistant. Analyze this conversation and identify all distinct elements that should be saved as separate project files. For each element, provide a JSON array with objects containing: type (one of: Character, Theme, Tone, Plot, Notes, Other), name (a short descriptive name), and content (a clean, structured summary of that element based on the conversation). Return ONLY valid JSON, no markdown, no backticks, no preamble.';
  var userMessages = brooksBuildConversationMessages();
  var followup = { role: 'user', content: 'Analyze the conversation and return the JSON array now.' };

  callBrooksAPI('', function(content) {
    if (!content) {
      toast('Brooks could not auto-extract files. Use manual add instead.');
      showBrooksManualFileModal();
      return;
    }

    var parsed;
    try {
      parsed = brooksParseJsonResponse(content);
    } catch (e) {
      console.error('Brooks auto-extract parse error:', e, content);
      toast('Brooks could not parse the file list. Use manual add instead.');
      showBrooksManualFileModal();
      return;
    }

    var files = brooksNormalizeExtractedFiles(parsed);
    if (!files.length) {
      toast('Brooks did not find any files to create. Use manual add instead.');
      showBrooksManualFileModal();
      return;
    }

    brooksShowExtractConfirmationModal(files);
  }, {
    system: systemPrompt,
    messages: userMessages.concat([followup]),
    max_tokens: 2000
  });
}

function showBrooksManualFileModal() {
  if (!currentBrooksProjectId) {
    toast('Select a project first.');
    return;
  }
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;font-family:sans-serif';
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg);padding:20px;border-radius:12px;border:1px solid var(--border);width:320px;text-align:center';
  box.innerHTML = '<div style="margin-bottom:15px;font-weight:600;color:var(--text)">Manual Add File</div>';

  var typeSelect = document.createElement('select');
  typeSelect.style.cssText = 'width:100%;padding:8px;margin-bottom:12px;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text)';
  ['Character', 'Theme', 'Tone', 'Plot', 'Story', 'Notes', 'Other'].forEach(function(t) {
    var opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });
  box.appendChild(typeSelect);

  var nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'File name...';
  nameInput.style.cssText = 'width:100%;padding:8px;margin-bottom:20px;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text)';
  box.appendChild(nameInput);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;justify-content:space-between;gap:10px';

  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'flex:1;padding:8px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--text2);cursor:pointer';
  cancelBtn.onclick = function() { document.body.removeChild(modal); };

  var createBtn = document.createElement('button');
  createBtn.textContent = 'Create';
  createBtn.style.cssText = 'flex:1;padding:8px;border-radius:4px;border:none;background:var(--green);color:#fff;cursor:pointer';
  createBtn.onclick = function() {
    var type = typeSelect.value;
    var name = nameInput.value.trim();
    if (!name) { toast('Please enter a file name'); return; }
    document.body.removeChild(modal);
    createProjectFileFromChat(type, name);
  };

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(createBtn);
  box.appendChild(btnRow);
  modal.appendChild(box);
  document.body.appendChild(modal);
}

function showBrooksCreateFileModal() {
  showBrooksManualFileModal();
}

function createProjectFileFromChat(fileType, fileName) {
  if (!currentBrooksProjectId) return;
  toast('Brooks is generating ' + fileType + ' profile...');

  var systemPrompt = 'You are Brooks. Turn the conversation into a clean, structured ' + fileType + ' document for a project file.\n' +
    'Keep it concise, organized, and useful as a reference.\n' +
    'Do not add any conversational filler or mention that you were asked to generate it.\n' +
    'Use plain text with light structure only if it improves clarity.';
  var userPrompt = 'Generate a ' + fileType + ' file named "' + fileName + '" from this conversation. Return only the final document.';

  callBrooksAPI(userPrompt, function(content) {
    if (!content) { toast('Failed to generate content'); return; }
    _sb.from('project_files').insert([{ 
      project_id: currentBrooksProjectId, 
      name: fileName, 
      file_type: fileType, 
      content: content 
    }]).then(function(res) {
      if (res.error) {
        console.error('Error saving project file:', res.error);
        toast('Error saving file');
      } else {
        toast('Project file created!');
        handleBrooksProjectChange(currentBrooksProjectId);
      }
    });
  }, {
    system: systemPrompt,
    messages: brooksHistory.concat([{ role: 'user', content: userPrompt }]),
    max_tokens: 2000
  });
}

function updateProjectFileFromChat(fileId) {
  if (!currentBrooksProjectId) return;
  
  _sb.from('project_files').select('content, file_type').eq('id', fileId).single().then(function(res) {
    if (res.error || !res.data) { toast('Error loading file'); return; }
    var file = res.data;
    toast('Brooks is updating ' + file.file_type + ' file...');

    var prompt = 'Existing ' + file.file_type + ' file content:\n' + (file.content || 'Empty') + '\n\nBased on the following new conversation, update this profile to reflect new decisions, additions, or refinements. Provide ONLY the final updated content of the file, no conversational filler.\n\nCONVERSATION:\n';
    
    var transcript = '';
    brooksHistory.forEach(function(m) {
      if (brooksSkipChatRender(m)) return;
      transcript += (m.role === 'user' ? 'MICHAEL: ' : 'BROOKS: ') + brooksMessageContentToText(m.content) + '\n\n';
    });
    prompt += transcript;

    callBrooksAPI(prompt, function(content) {
      if (!content) { toast('Failed to update content'); return; }
      _sb.from('project_files').update({ content: content }).eq('id', fileId).then(function(res) {
        if (res.error) {
          console.error('Error updating project file:', res.error);
          toast('Error updating file');
        } else {
          toast('Project file updated!');
          handleBrooksProjectChange(currentBrooksProjectId);
        }
      });
    });
  });
}

function callBrooksAPI(prompt, callback, options) {
  var xhr = new XMLHttpRequest();
  if (!brooksConfigureAnthropicXhr(xhr)) {
    toast(brooksNeedCredentialsMessage());
    if (typeof callback === 'function') callback(null);
    return;
  }
  options = options || {};
  var done = false;
  function finish(reply) {
    if (done) return;
    done = true;
    if (typeof callback === 'function') callback(reply);
  }
  var timeoutMs = options.timeout_ms || 20000;
  var timer = setTimeout(function() {
    try { xhr.abort(); } catch (e) {}
    finish(null);
  }, timeoutMs);

  xhr.onload = function() {
    clearTimeout(timer);
    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        var reply = (data.content || []).filter(function(c){ return c.type === 'text'; }).map(function(c){ return c.text; }).join('');
        finish(reply);
      } catch(e) {
        console.error('Parse error', e);
        finish(null);
      }
    } else {
      console.error('API error ' + xhr.status);
      finish(null);
    }
  };
  xhr.onerror = function() { clearTimeout(timer); finish(null); };
  xhr.onabort = function() { clearTimeout(timer); finish(null); };
  
  var messages = options.messages || [{ role: 'user', content: prompt }];
  var payload = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: options.max_tokens || 2000,
    system: options.system || BROOKS_SYS,
    messages: messages
  });
  xhr.send(payload);
}
