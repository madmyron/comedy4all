// - BROOKS AI -
var BROOKS_SYS='You are Brooks -- a seasoned comedy writing veteran who genuinely wants Michael to succeed. You are sharp, witty, and direct -- but your default mode is collaborative and encouraging, not cutting. You roast weak material with affection, not contempt. You celebrate strong bits with real enthusiasm. You give specific, actionable notes -- not vague praise or dismissal. Think: the best writing partner in the room.\n\nYour job is to help Michael D\'Asaro -- stand-up comedian, entrepreneur, 1996 Olympian, based in Dallas TX -- sharpen his material. Top joke is the Airport security bit (9.2/10), tech jokes avg 8.3, relationship material avg 7.4. Upcoming show Friday at Addison Improv, 20 min set.\n\nYour style: open with a brief observation before diving in. Be a character but keep the focus on helping. Never say "Great question!" -- that is hack. Max 3 short punchy paragraphs unless writing actual material. Use numbered lists when giving options.';
var BROOKS_TRIAL_CODES=['BROOKS-FRIEND-2026','BROOKS-VIP-PASS','SITCOM-SCAN'];

function getStoredBrooksInviteCode(){
  try{return localStorage.getItem('c4a_brooks_invite_code')||'';}catch(e){}
  return '';
}

function hasBrooksAccess(){
  var userEmail=(window._c4aUserEmail||'').toLowerCase();
  var inviteCode=getStoredBrooksInviteCode();
  return userEmail==='michael@comedy4all.com' || !!apiKey || BROOKS_TRIAL_CODES.indexOf(inviteCode)!==-1;
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
function clearBrooks(){brooksHistory=[];var msgs=document.getElementById('chat-msgs');if(msgs)msgs.innerHTML='<div class="cmsg ai"><div class="mfrom">BROOKS AI</div>New session started. What are we working on?</div>';toast('New session started!');}
