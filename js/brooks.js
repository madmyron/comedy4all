// - BROOKS AI -
var BROOKS_SYS='You are Brooks -- a grizzled, sharp-tongued comedy writing veteran who has seen every hack premise die on stage and lived to roast it. You have written for late-night, survived open mics in basements that smelled like regret, and you have zero tolerance for lazy setups or obvious punchlines. You are funny. Genuinely funny. Not "haha good one" funny -- actually funny. You crack wise, you drop callbacks, you roast Michael\'s weaker bits with love but without mercy. Think: the sharpest writer in the room who actually wants you to succeed.\n\nYour job is to help Michael D\'Asaro -- stand-up comedian, entrepreneur, 1996 Olympian, based in Dallas TX -- sharpen his material. His stats: top joke is the Airport security bit (9.2/10), tech jokes avg 8.3, relationship material avg 7.4. Upcoming show Friday at Addison Improv, 20 min set.\n\nYour style: be a character. Open with a quip or observation before giving advice. Roast the bad stuff gently. Celebrate the good stuff with genuine enthusiasm. Use comedy writer shorthand. Never be generic. Never say "Great question!" -- that is hack. Max 3 short punchy paragraphs unless writing actual material. Use numbered lists when giving options. Sign off occasionally with something a little unhinged.';

function updateBrooksContext(){
  var el=document.getElementById('brooks-context-display');
  var top = null;
  for (var i=0;i<jokes.length;i++) {
    if (!top || (jokes[i].score||0) > (top.score||0)) top = jokes[i];
  }
  if(el) el.innerHTML='\u2713 '+jokes.length+' joke'+(jokes.length===1?'':'s')+' in your library<br>\u2713 Top scoring joke: '+(top?top.title:'None yet')+(top?' ('+(top.score||0)+')':'')+'<br>\u2713 Brooks access: '+(apiKey?'<span style="color:var(--green)">Ready</span>':'<span style="color:var(--text3)">Premium / creator account</span>');
  var ki=document.getElementById('api-key-input');
  if(ki && apiKey) ki.value=apiKey;
}
function saveApiKey(v){
  var trimmed=v.trim();
  try{localStorage.setItem('c4a_apikey',trimmed);}catch(e){}
  apiKey=trimmed;
  var ki=document.getElementById('api-key-input');
  if(ki) ki.value=trimmed;
  updateBrooksContext();
}

function sendBrooks(){
  // Check for premium access — hardcoded for now, backend billing check comes later
  var userEmail = (window._c4aUserEmail || '');
  var isPremium = (userEmail === 'michael@comedy4all.com') || apiKey;
  if (!isPremium) {
    document.getElementById('brooks-upgrade-overlay').style.display = 'flex';
    return;
  }
  var input=document.getElementById('brooks-input'),msgs=document.getElementById('chat-msgs');
  if(!input||!msgs||!input.value.trim()) return;
  var text=input.value.trim();
  input.value='';
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
  var payload=JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:BROOKS_SYS,messages:brooksHistory});
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
  xhr.send(payload);
}

function runStoryMining(type) {
  var msgs = document.getElementById('chat-msgs');
  if (!msgs) return;
  var jokeList = jokes.map(function(j, i) {
    return (i+1) + '. [' + (j.tier||'?') + '-tier, ' + (j.rating||'?') + '/5 stars] ' + (j.text||j.setup||'') + (j.punch ? ' PUNCHLINE: ' + j.punch : '');
  }).join('\n');
  var prompt = '';
  if (type === 'sitcom') {
    prompt = 'Read ALL of my jokes below and identify which ones could be the basis for a sitcom. For each idea give me: (1) a working title, (2) a one-sentence premise, (3) which jokes it is based on, (4) the main character recurring problem, and (5) a comparable show. Be specific to MY material.\n\nMY JOKES:\n' + jokeList;
  } else if (type === 'movie') {
    prompt = 'Read ALL of my jokes below and tell me which ones could anchor a feature comedy film. For each idea give me: (1) a working title, (2) a logline, (3) which jokes it is drawn from, (4) the three-act structure in 2-3 sentences, and (5) a comparable film. Be specific to MY actual material.\n\nMY JOKES:\n' + jokeList;
  } else {
    prompt = 'Look at ALL of my jokes below and design a comedy special arc. Suggest: (1) an overall theme or title, (2) which jokes should open, (3) the emotional arc through the middle, (4) which joke should close and why, (5) any callbacks that connect bits. Treat it like you are producing my Netflix special.\n\nMY JOKES:\n' + jokeList;
  }
  var userMsg = document.createElement('div');
  userMsg.className = 'cmsg user';
  var label = type === 'sitcom' ? 'Scan my jokes for sitcom ideas' : type === 'movie' ? 'Scan my jokes for movie ideas' : 'Build my comedy special arc';
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
  var payload = JSON.stringify({model:'claude-sonnet-4-20250514', max_tokens:1500, system: BROOKS_SYS, messages: brooksHistory});
  xhr.send(payload);
}
function fillBrooks(t){var input=document.getElementById('brooks-input');if(input){input.value=t;input.focus();}}
function handleBrooksKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendBrooks();}}
function clearBrooks(){brooksHistory=[];var msgs=document.getElementById('chat-msgs');if(msgs)msgs.innerHTML='<div class="cmsg ai"><div class="mfrom">BROOKS AI</div>New session started. What are we working on?</div>';toast('New session started!');}
