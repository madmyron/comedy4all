// - BROOKS AI -
var BROOKS_SYS='You are Brooks -- a seasoned comedy writing veteran who genuinely wants Michael to succeed. You are sharp, witty, and direct. You always help with whatever Michael asks first, then you can briefly mention what you think is most urgent. Never refuse a request or redirect away from it -- if he wants to work on sitcom ideas, you work on sitcom ideas. If he wants to punch up a joke, you punch up the joke. You give your honest opinion but you do the work he asks.\n\nYour personality: warm but no-nonsense. You roast weak material with affection. You celebrate wins with real enthusiasm. You give specific actionable notes. Think: the best writing partner in the room who makes every session productive.\n\nBackground on Michael: stand-up comedian, entrepreneur, 1996 Olympian, based in Dallas TX. Top joke is the Airport security bit (9.2/10), tech jokes avg 8.3, relationship material avg 7.4.\n\nYour style: open with a quick observation or quip, then get straight to work. Never say "Great question!" -- that is hack. Max 3 short punchy paragraphs unless writing actual material. Use numbered lists when giving options.';
var BROOKS_TRIAL_CODES=['BROOKS-FRIEND-2026','BROOKS-VIP-PASS','SITCOM-SCAN'];
var currentBrooksConversationId = null;

function getStoredBrooksInviteCode(){
  try{return localStorage.getItem('c4a_brooks_invite_code')||'';}catch(e){}
  return '';
}

function hasBrooksAccess(){
  var userEmail=(window._c4aUserEmail||'').toLowerCase().trim();
  var inviteCode=getStoredBrooksInviteCode();
  var creatorEmails=['michael@comedy4all.com','michael@dasaroland.com'];
  if(creatorEmails.indexOf(userEmail)!==-1) return true;
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
  if(el) el.innerHTML='\u2713 '+jokes.length+' joke'+(jokes.length===1?'':'s')+' in your library<br>\u2713 Top scoring joke: '+(top?top.title:'None yet')+(top?' ('+(top.score||0)+')':'')+'<br>\u2713 Brooks access: '+(access?'<span style="color:var(--green)">Unlocked</span>':'<span style="color:var(--text3)">Premium only</span>');
  syncBrooksApiKeyInputs(key);
  if(inviteInput && inviteCode) inviteInput.value=inviteCode;
  if(accessEl){
    accessEl.innerHTML=access
      ? 'Brooks AI is currently <strong style="color:var(--green)">Unlocked</strong>.<br>'+(userEmail==='michael@comedy4all.com'?'Friend trial code: <strong style="color:var(--gold)">BROOKS-FRIEND-2026</strong>':'Friend access is active on this device.')
      : 'Brooks AI is a <strong style="color:var(--gold)">Premium</strong> feature.<br>Enter a friend code below or upgrade to unlock it.';
  }
  if (apiKey && apiKey.length > 10) {
    document.querySelectorAll('.cmsg.ai').forEach(function(el) {
      if (el.textContent.indexOf('SETUP') !== -1) {
        el.style.display = 'none';
      }
    });
  }
}

function syncBrooksApiKeyInputs(value){
  var key = typeof value === 'string' ? value : (apiKey || (function(){ try { return localStorage.getItem('c4a_apikey') || ''; } catch(e) { return ''; } })());
  var ki = document.getElementById('api-key-input');
  if (ki) ki.value = key;
  var saki = document.getElementById('settings-api-key-input');
  if (saki) saki.value = key;
}

function sbSaveBrooksConversation(callback) {
  if (!currentUser || !_sb) { if (typeof callback === 'function') callback(); return; }
  var title = '';
  for (var i = 0; i < brooksHistory.length; i++) {
    var m = brooksHistory[i];
    if (m.role === 'user' && m.content.length < 200
      && m.content.indexOf('Here are all my jokes') === -1
      && m.content.indexOf('You are a TV development') === -1
      && m.content.indexOf('Read ALL of my jokes') === -1) {
      title = m.content.substring(0, 60);
      break;
    }
  }
  if (!title) title = 'Brooks Session ' + new Date().toLocaleDateString();
  var now = new Date().toISOString();
  if (!currentBrooksConversationId) {
    _sb.from('brooks_conversations')
      .insert({ user_id: currentUser.id, title: title, messages: brooksHistory, created_at: now, updated_at: now })
      .select('id').single()
      .then(function(res) {
        if (res.error) { console.error('Brooks save error:', res.error); if (typeof callback === 'function') callback(); return; }
        currentBrooksConversationId = res.data.id;
        if (typeof callback === 'function') callback();
      });
  } else {
    _sb.from('brooks_conversations')
      .update({ messages: brooksHistory, updated_at: now })
      .eq('id', currentBrooksConversationId)
      .then(function(res) {
        if (res.error) console.error('Brooks update error:', res.error);
        if (typeof callback === 'function') callback();
      });
  }
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

function sbLoadBrooksConversations() {
  if (!_sb || !currentUser) return;
  var list = document.getElementById('brooks-history-list');
  var mobileList = document.getElementById('mobile-brooks-history-list');
  var emptyMsg = '<div style="font-size:11px;color:var(--text3)">No past conversations yet.</div>';
  if (list) list.innerHTML = '<div style="font-size:11px;color:var(--text3)">Loading...</div>';
  if (mobileList) mobileList.innerHTML = '<div style="font-size:11px;color:var(--text3)">Loading...</div>';
  _sb.from('brooks_conversations')
    .select('id, title, updated_at, messages')
    .eq('user_id', currentUser.id)
    .order('updated_at', { ascending: false })
    .limit(20)
    .then(function(result) {
      if (result.error || !result.data || result.data.length === 0) {
        if (list) list.innerHTML = emptyMsg;
        if (mobileList) mobileList.innerHTML = emptyMsg;
        return;
      }
      if (list) list.innerHTML = '';
      if (mobileList) mobileList.innerHTML = '';
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
          item.innerHTML = '<div style="font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (convo.title||'Untitled') + '</div><div style="font-size:10px;color:var(--text3)">' + date + '</div>';
          item.onclick = function() {
            var msgs = document.getElementById('chat-msgs');
            if (!msgs) return;
            msgs.innerHTML = '';
            brooksHistory = convo.messages || [];
            currentBrooksConversationId = convo.id;
            brooksHistory.forEach(function(m) {
              if (m.role === 'user' && m.content && m.content.indexOf('Here are all my jokes:') === 0) return;
              var div = document.createElement('div');
              div.className = 'cmsg ' + (m.role === 'user' ? 'user' : 'ai');
              if (m.role === 'assistant') div.innerHTML = '<div class="mfrom">BROOKS AI</div>' + m.content.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
              else div.textContent = m.content;
              msgs.appendChild(div);
            });
            msgs.scrollTop = msgs.scrollHeight;
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

function saveApiKey(v){
  console.log('saveApiKey called with:', v);
  var trimmed=v.trim();
  try{localStorage.setItem('c4a_apikey',trimmed);}catch(e){}
  console.log('saved to localStorage:', (function(){ try { return localStorage.getItem('c4a_apikey'); } catch(e) { return ''; } })());
  apiKey=trimmed;
  syncBrooksApiKeyInputs(trimmed);
  updateBrooksContext();
}

function sendBrooks(){
  if (!hasBrooksAccess()) {
    document.getElementById('brooks-upgrade-overlay').style.display = 'flex';
    return;
  }
  var input=document.getElementById('brooks-input'),msgs=document.getElementById('chat-msgs');
  if(!input||!msgs||!input.value.trim()) return;
  var text=input.value.trim();
  input.value='';
  if (brooksHistory.length === 0 && jokes && jokes.length > 0) {
    var jokeContext = jokes.map(function(j, i) {
      return (i+1) + '. ' + (j.title||'') + ': ' + (j.body||j.text||j.setup||'') + (j.punch ? ' / ' + j.punch : '') + ' [' + (j.tier||'?') + '-tier, ' + (j.rating||'?') + '/5]';
    }).join('\n');
    brooksHistory.push({role:'user', content:'Here are all my jokes:\n\n' + jokeContext});
    brooksHistory.push({role:'assistant', content:"Got it. I've read all your material. What do you want to work on?"});
  }
  brooksHistory.push({role:'user',content:text});
  var um=document.createElement('div');
  um.className='cmsg user';
  um.textContent=text;
  msgs.appendChild(um);
  msgs.scrollTop=msgs.scrollHeight;
  var typing=document.createElement('div');
  typing.className='cmsg ai';
  typing.innerHTML='<div class="mfrom">BROOKS AI</div><span style="color:var(--text3)">thinking...</span>';
  msgs.appendChild(typing);
  msgs.scrollTop=msgs.scrollHeight;
  var btn=document.getElementById('send-btn');
  if(btn){btn.disabled=true;btn.textContent='...';}
  var payload=JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1000,system:BROOKS_SYS,messages:brooksHistory});
  var xhr=new XMLHttpRequest();
  xhr.open('POST','https://api.anthropic.com/v1/messages',true);
  xhr.setRequestHeader('Content-Type','application/json');
  xhr.setRequestHeader('x-api-key',apiKey);
  xhr.setRequestHeader('anthropic-version','2023-06-01');
  xhr.setRequestHeader('anthropic-dangerous-direct-browser-access','true');
  xhr.onreadystatechange=function(){
    if(xhr.readyState!==4) return;
    if(btn){btn.disabled=false;btn.textContent='Send';}
    if(xhr.status===200){
      try{
        var data=JSON.parse(xhr.responseText);
        var reply=(data.content||[]).filter(function(c){return c.type==='text';}).map(function(c){return c.text;}).join('')||'No response.';
        brooksHistory.push({role:'assistant',content:reply});
        sbSaveBrooksConversation();
        typing.innerHTML='<div class="mfrom">BROOKS AI</div>'+reply.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
      }catch(e){typing.innerHTML='<div class="mfrom">BROOKS AI</div>Parse error. Try again.';}
    } else if(xhr.status===401){
      typing.innerHTML='<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Invalid API key. Please check your key in the right panel.</span>';
    } else {
      typing.innerHTML='<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Error '+xhr.status+'. Check your API key and try again.</span>';
    }
    msgs.scrollTop=msgs.scrollHeight;
  };
  xhr.onerror=function(){
    if(btn){btn.disabled=false;btn.textContent='Send';}
    typing.innerHTML='<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Network error. Make sure you\'re online and your API key is correct.</span>';
    msgs.scrollTop=msgs.scrollHeight;
  };
  // Force alternating messages - API requires user/assistant/user/assistant
  var cleanHistory = [brooksHistory[brooksHistory.length - 1]];
  for (var i = brooksHistory.length - 2; i >= 0; i--) {
    if (brooksHistory[i].role !== cleanHistory[0].role) {
      cleanHistory.unshift(brooksHistory[i]);
      if (cleanHistory.length >= 10) break;
    }
  }
  brooksHistory = cleanHistory;
  console.log('Brooks payload:', payload);
  xhr.send(payload);
}

function runStoryMining(type) {
  var msgs = document.getElementById('chat-msgs');
  if (!msgs) return;
  if (!hasBrooksAccess()) {
    document.getElementById('brooks-upgrade-overlay').style.display = 'flex';
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
  var key = apiKey || (document.getElementById('api-key-input') ? document.getElementById('api-key-input').value.trim() : '') || (function(){ try { return localStorage.getItem('c4a_apikey') || ''; } catch(e) { return ''; } })();
  if (!key) {
    typing.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">No API key found. Add your key in the right panel under API Key.</span>';
    return;
  }
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://api.anthropic.com/v1/messages');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('x-api-key', key);
  xhr.setRequestHeader('anthropic-version', '2023-06-01');
  xhr.setRequestHeader('anthropic-dangerous-direct-browser-access', 'true');
  xhr.onload = function() {
    var t = document.getElementById('brooks-typing');
    if (!t) return;
    if (xhr.status === 200) {
      try {
        var d = JSON.parse(xhr.responseText);
        var reply = d.content && d.content[0] && d.content[0].text ? d.content[0].text : 'No response.';
        brooksHistory.push({role:'assistant', content: reply});
        sbSaveBrooksConversation();
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
        followXHR.open('POST', 'https://api.anthropic.com/v1/messages');
        followXHR.setRequestHeader('Content-Type', 'application/json');
        followXHR.setRequestHeader('x-api-key', key);
        followXHR.setRequestHeader('anthropic-version', '2023-06-01');
        followXHR.setRequestHeader('anthropic-dangerous-direct-browser-access', 'true');
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
      t.innerHTML = '<div class="mfrom">BROOKS AI</div><span style="color:var(--red)">Invalid API key.</span>';
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
function renderBrooksGreeting(){
  var el=document.getElementById('brooks-welcome');
  if(!el) return;
  var greetings=[
    "Alright, kid. Let's see if this material's got a pulse or if we're just embalming it in punchlines.",
    "Pull up a chair. I've been around long enough to know where the laugh is hiding, and where it's pretending to be.",
    "Okay, rookie. Hand me the jokes and I'll tell you which ones are road-ready and which ones belong in witness protection.",
    "I've got news: the audience is mean, time is short, and your opener better know how to fight.",
    "Let's go through this pile and separate the gold from the cafeteria tray."
  ];
  el.innerHTML='<div class="mfrom">BROOKS AI</div>'+greetings[Math.floor(Math.random()*greetings.length)];
}
renderBrooksGreeting();
function clearBrooks() {
  var msgs = document.getElementById('chat-msgs');
  var openers = [
    "Okay, rookie. Hand me the jokes and I'll tell you which ones are road-ready and which ones belong in witness protection.",
    "Pull up a chair. I've been around long enough to know where the laugh is hiding, and where it's pretending to be.",
    "Alright, kid. Let's see if this material's got a pulse or if we're just embalming it in punchlines.",
    "I've got news: the audience is mean, time is short, and your opener better know how to fight.",
    "New session. Same standards. Let's see what you've got."
  ];
  var opener = openers[Math.floor(Math.random() * openers.length)];
  function resetUI() {
    brooksHistory = [];
    currentBrooksConversationId = null;
    if (msgs) msgs.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'cmsg ai';
    div.innerHTML = '<div class="mfrom">BROOKS AI</div>' + opener;
    if (msgs) msgs.appendChild(div);
    if (typeof sbLoadBrooksConversations === 'function') sbLoadBrooksConversations();
    toast('Session saved and started fresh!');
  }
  if (brooksHistory && brooksHistory.length > 2) {
    toast('Saving session...');
    sbSaveBrooksConversation(resetUI);
  } else {
    resetUI();
  }
}

function sendToWritingStudio() {
  if (!brooksHistory || brooksHistory.length < 2) {
    toast('Nothing to send yet — have a conversation with Brooks first!');
    return;
  }
  var key = apiKey || (function(){ try { return localStorage.getItem('c4a_apikey')||''; } catch(e){ return ''; } })();
  if (!key) { toast('Add your API key in Settings to use this feature.'); return; }
  var transcript = '';
  brooksHistory.forEach(function(m) {
    if (m.role === 'user' && (m.content.indexOf('Here are all my jokes') !== -1 || m.content.length > 200)) return;
    var label = m.role === 'user' ? 'MICHAEL' : 'BROOKS';
    transcript += label + ':\n' + m.content + '\n\n';
  });
  var title = 'New Script';
  for (var i = 0; i < brooksHistory.length; i++) {
    var m = brooksHistory[i];
    if (m.role === 'user' && m.content.length < 200 && m.content.indexOf('Here are all my jokes') === -1) {
      title = m.content.substring(0, 50);
      break;
    }
  }
  toast('Brooks is writing your script...');
  var prompt = 'Based on this development conversation, write a proper TV pilot script outline. Include: a title page, logline, character descriptions, a cold open scene, Act One outline with 3-4 scenes, Act Two outline with 3-4 scenes, and a tag scene. Use proper screenplay formatting. Base everything specifically on the ideas discussed.\n\nCONVERSATION:\n' + transcript;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://api.anthropic.com/v1/messages');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('x-api-key', key);
  xhr.setRequestHeader('anthropic-version', '2023-06-01');
  xhr.setRequestHeader('anthropic-dangerous-direct-browser-access', 'true');
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
      toast('Error ' + xhr.status + '. Check your API key.');
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
