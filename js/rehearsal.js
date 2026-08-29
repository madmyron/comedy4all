// - REHEARSAL -
function getRehearsalScores() {
  try {
    var stored = JSON.parse(localStorage.getItem('c4a_rehearsal_scores') || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch (e) {
    return {};
  }
}

function writeRehearsalScoresLocal(scores) {
  try { localStorage.setItem('c4a_rehearsal_scores', JSON.stringify(scores || {})); } catch (e) {}
}

function persistRehearsalScore(jokeId, rating) {
  if (!jokeId || !rating) return;
  var scores = getRehearsalScores();
  scores[String(jokeId)] = { rating: rating, at: new Date().toISOString() };
  writeRehearsalScoresLocal(scores);
  sbUpsertRehearsalScores(scores);
}

function getRehearsalScoreForJoke(jokeId) {
  var row = getRehearsalScores()[String(jokeId)];
  return row && row.rating ? row.rating : '';
}

function snapshotRehearsalForJokeIds(ids) {
  var snap = {};
  (ids || []).forEach(function(jid) {
    var r = getRehearsalScoreForJoke(jid);
    if (r) snap[String(jid)] = r;
  });
  return snap;
}

function sbUpsertRehearsalScores(scores) {
  if (!_sb || !currentUser) return;
  _sb.from('rehearsal_scores').upsert({
    user_id: currentUser.id,
    scores: scores || {},
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' }).then(function(res) {
    if (!res.error) return;
    var msg = String(res.error.message || '');
    if (msg.indexOf('rehearsal_scores') !== -1 || res.error.code === '42P01' || res.error.code === 'PGRST205') return;
    console.error('Rehearsal score sync error:', res.error);
  });
}

function sbLoadRehearsalScores(done) {
  if (!_sb || !currentUser) { if (done) done(getRehearsalScores()); return; }
  _sb.from('rehearsal_scores').select('scores, updated_at').eq('user_id', currentUser.id).maybeSingle()
    .then(function(res) {
      if (res.error) {
        var msg = String(res.error.message || '');
        if (msg.indexOf('rehearsal_scores') === -1 && res.error.code !== '42P01' && res.error.code !== 'PGRST205') {
          console.error('Load rehearsal scores error:', res.error);
        }
        if (done) done(getRehearsalScores());
        return;
      }
      var remote = (res.data && res.data.scores) || {};
      if (typeof remote === 'string') {
        try { remote = JSON.parse(remote); } catch (e) { remote = {}; }
      }
      var local = getRehearsalScores();
      var merged = {};
      Object.keys(local).forEach(function(k) { merged[k] = local[k]; });
      Object.keys(remote).forEach(function(k) {
        var r = remote[k];
        var l = merged[k];
        if (!l) { merged[k] = r; return; }
        var rAt = r && r.at ? Date.parse(r.at) : 0;
        var lAt = l && l.at ? Date.parse(l.at) : 0;
        if (rAt > lAt) merged[k] = r;
      });
      writeRehearsalScoresLocal(merged);
      var localNewer = Object.keys(local).some(function(k) {
        var l = local[k];
        var r = remote[k];
        if (!r) return true;
        return (l && l.at ? Date.parse(l.at) : 0) > (r && r.at ? Date.parse(r.at) : 0);
      });
      if (localNewer) sbUpsertRehearsalScores(merged);
      if (done) done(merged);
    });
}

function buildRehearsalFromSet() {
  if (typeof restoreActiveSetIfEmpty === 'function') restoreActiveSetIfEmpty();
  var ids = typeof getCurrentSetIds === 'function' ? getCurrentSetIds() : [];
  var source = [];
  (ids || []).forEach(function(jid) {
    var j = jokes.find(function(x) { return String(x.id) === String(jid); });
    if (j) source.push(j);
  });
  if (!source.length) source = (jokes || []).slice();
  rehearsalData = source.map(function(j) {
    return {
      id: String(j.id),
      title: j.title || 'Untitled',
      text: j.title || j.body || '',
      punch: j.body || j.punch || ''
    };
  });
  return rehearsalData.length;
}

function restoreSessionRatingsFromStore() {
  rRatings = {};
  var scores = getRehearsalScores();
  rehearsalData.forEach(function(item, i) {
    var saved = scores[String(item.id)];
    if (saved && saved.rating) rRatings[i] = saved.rating;
  });
}

function initRehearsal() {
  rIdx=0; rPunch=false; rRatings={}; rTimer=0;
  restoreSessionRatingsFromStore();
  clearInterval(rIv);
  rIv = setInterval(function(){
    rTimer++;
    var el=document.getElementById('r-timer');
    if(el) el.textContent=' '+Math.floor(rTimer/60)+':'+(rTimer%60<10?'0':'')+(rTimer%60)+' elapsed';
  },1000);
  var titleEl = document.querySelector('#screen-rehearsal .topbar-title');
  if (titleEl) {
    var sel = document.getElementById('set-name-select');
    var setName = (sel && sel.value) ? sel.value : 'Current set';
    titleEl.innerHTML = 'Rehearsal -- <span style="color:var(--gold)">' + String(setName).replace(/</g,'&lt;') + '</span>';
  }
  updateRehearsal();
}
function updateRehearsal() {
  var j=rehearsalData[rIdx];
  if (!j) return;
  var t=document.getElementById('r-text'),p=document.getElementById('r-punch'),c=document.getElementById('r-counter'),rb=document.getElementById('reveal-btn');
  if(t) t.textContent=j.text;
  if(p){p.textContent=j.punch;p.classList.remove('show');}
  if(c) c.textContent='JOKE '+(rIdx+1)+' OF '+rehearsalData.length;
  if(rb) rb.textContent='Show Punchline';
  rPunch=false;
  var dots=document.getElementById('r-dots');
  if(dots){
    var html='';
    for(var i=0;i<rehearsalData.length;i++) html+='<div class="rdot'+(i<rIdx?' done':i===rIdx?' cur':'')+'"></div>';
    dots.innerHTML=html;
  }
  var sl=document.getElementById('r-setlist');
  if(sl){
    var html='';
    for(var i=0;i<rehearsalData.length;i++){
      var style='padding:5px 7px;border-radius:5px;margin-bottom:3px;font-size:11px;';
      if(i===rIdx) style+='background:var(--gold-bg);color:var(--gold);font-weight:500';
      else if(i<rIdx) style+='color:var(--green)';
      else style+='color:var(--text3)';
      html+='<div style="'+style+'">'+(i<rIdx?'\u2713 ':'')+(rehearsalData[i].text||'').substring(0,28)+'...</div>';
    }
    sl.innerHTML=html;
  }
  var rr=document.getElementById('r-ratings');
  if(rr){
    var keys=Object.keys(rRatings);
    if(keys.length===0){rr.innerHTML='Rate jokes as you rehearse...';}
    else{
      var html='';
      for(var k=0;k<keys.length;k++){
        var ki=keys[k];
        var item = rehearsalData[ki];
        if (!item) continue;
        html+='<div style="font-size:11px;padding:3px 0;color:var(--text3)">'+(item.text||'').substring(0,22)+'... <span style="color:var('+(rRatings[ki]==='kill'?'--green':rRatings[ki]==='bomb'?'--red':'--text2')+');">'+(rRatings[ki]==='kill'?'KILL':rRatings[ki]==='bomb'?'BOMB':'OK')+'</span></div>';
      }
      rr.innerHTML=html;
    }
  }
}
function togglePunch(){
  rPunch=!rPunch;
  var p=document.getElementById('r-punch'),rb=document.getElementById('reveal-btn');
  if(p) p.classList.toggle('show',rPunch);
  if(rb) rb.textContent=rPunch?'Hide Punchline':'Show Punchline';
}
function nextJoke(){if(rIdx<rehearsalData.length-1){rIdx++;updateRehearsal();}else{toast(' Set complete!');clearInterval(rIv);}}
function prevJoke(){if(rIdx>0){rIdx--;updateRehearsal();}}
function rateJ(r){
  rRatings[rIdx]=r;
  var item = rehearsalData[rIdx];
  if (item && item.id) persistRehearsalScore(item.id, r);
  toast(r==='kill'?'KILL Killer!':r==='bomb'?'BOMB Needs work':'OK Okay');
  setTimeout(nextJoke,400);
}
