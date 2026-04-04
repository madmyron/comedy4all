// - SHOW HISTORY -
var shows = [];
var showRating = 0;

function openNewShow() {
  showRating = 0;
  document.getElementById('show-modal').style.display = 'flex';
  var dateEl = document.getElementById('sh-date');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
  var starsEl = document.getElementById('sh-stars');
  if (starsEl) {
    starsEl.innerHTML = '';
    for (var v=1;v<=5;v++) {
      (function(val){
        var btn = document.createElement('button');
        btn.textContent = '\u2605'; btn.className = 'sstar';
        btn.style.cssText = 'font-size:22px;cursor:pointer;color:var(--border2);background:none;border:none;padding:1px;transition:color .1s;line-height:1';
        btn.onclick = function(){ showRating = val; updateShowStars(); };
        starsEl.appendChild(btn);
      })(v);
    }
  }
  var rx = document.getElementById('sh-reactions');
  if (rx) {
    if (jokes.length === 0) {
      rx.innerHTML = '<div style="padding:12px;text-align:center;font-size:12px;color:var(--text3)">Add jokes to your library first to track reactions.</div>';
    } else {
      rx.innerHTML = jokes.map(function(j){
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid var(--border)" id="rx-row-'+j.id+'">'
          +'<div style="font-size:12px;font-weight:500;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">'+j.title+'</div>'
          +'<div style="display:flex;gap:5px">'
          +'<button class="reaction-btn" onclick="setReaction('+j.id+',\'killed\',this)" title="Killed it">KILL</button>'
          +'<button class="reaction-btn" onclick="setReaction('+j.id+',\'ok\',this)" title="Okay">OK</button>'
          +'<button class="reaction-btn" onclick="setReaction('+j.id+',\'bombed\',this)" title="Bombed">BOMB</button>'
          +'<button class="reaction-btn" onclick="setReaction('+j.id+',\'skip\',this)" title="Didn\'t perform">--</button>'
          +'</div></div>';
      }).join('');
    }
  }
}
var _showReactions = {};
function setReaction(jokeId, reaction, btn) {
  _showReactions[jokeId] = reaction;
  var row = document.getElementById('rx-row-'+jokeId);
  if (!row) return;
  var btns = row.querySelectorAll('.reaction-btn');
  var labels = ['killed','ok','bombed','skip'];
  for (var i=0;i<btns.length;i++) {
    btns[i].classList.remove('killed','ok','bombed');
    if (labels[i] === reaction && reaction !== 'skip') btns[i].classList.add(reaction);
  }
}
function updateShowStars() {
  var starsEl = document.getElementById('sh-stars');
  if (!starsEl) return;
  var btns = starsEl.querySelectorAll('button');
  for (var i=0;i<btns.length;i++) {
    btns[i].style.color = (i < showRating) ? 'var(--gold)' : 'var(--border2)';
  }
}
function closeNewShow() {
  document.getElementById('show-modal').style.display = 'none';
  _showReactions = {};
}
function saveShow() {
  var venue = (document.getElementById('sh-venue')||{}).value||'Unnamed Venue';
  var date = (document.getElementById('sh-date')||{}).value||new Date().toISOString().split('T')[0];
  var length = (document.getElementById('sh-length')||{}).value||'';
  var notes = (document.getElementById('sh-notes')||{}).value||'';
  var show = {
    id: Date.now(), venue: venue.trim(), date: date,
    length: length.trim(), notes: notes.trim(),
    rating: showRating, reactions: Object.assign({}, _showReactions),
    created: new Date().toISOString()
  };
  shows.unshift(show);
  closeNewShow();
  renderShows();
  toast('Show logged! \u2713');
}
function renderShows() {
  var list = document.getElementById('shows-list');
  var total = document.getElementById('sh-total');
  var avg = document.getElementById('sh-avg');
  var best = document.getElementById('sh-best');
  var bestScore = document.getElementById('sh-best-score');
  if (total) total.textContent = shows.length;
  if (shows.length === 0) {
    if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">No shows logged yet.<br><span style="font-size:11px">Tap "+ Log a Show" after a gig.</span></div>';
    return;
  }
  var rated = shows.filter(function(s){return s.rating>0;});
  if (avg) avg.textContent = rated.length ? (rated.reduce(function(a,s){return a+s.rating;},0)/rated.length).toFixed(1) : '--';
  var killCount = {};
  shows.forEach(function(s){
    Object.keys(s.reactions).forEach(function(jid){
      if (s.reactions[jid]==='killed') killCount[jid]=(killCount[jid]||0)+1;
    });
  });
  var bestId = Object.keys(killCount).sort(function(a,b){return killCount[b]-killCount[a];})[0];
  if (bestId) {
    var bj = jokes.find(function(j){return j.id==bestId;});
    if (best) best.textContent = bj ? bj.title : '--';
    if (bestScore) bestScore.textContent = killCount[bestId] + 'x killed';
  }
  if (list) list.innerHTML = shows.map(function(s){
    var stars = '';
    for(var i=1;i<=5;i++) stars += '<span style="color:'+(i<=s.rating?'var(--gold)':'var(--border2)')+'>\u2605</span>';
    var rxKeys = Object.keys(s.reactions);
    var killed = rxKeys.filter(function(k){return s.reactions[k]==='killed';}).length;
    var bombed = rxKeys.filter(function(k){return s.reactions[k]==='bombed';}).length;
    var rxSummary = rxKeys.length ? (killed+'KILL '+bombed+'BOMB') : 'No reactions logged';
    var d = new Date(s.date+'T12:00:00');
    var dateStr = d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    return '<div class="show-card" onclick="openShowDetail('+s.id+')">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">'
      +'<div style="font-size:13px;font-weight:600;color:var(--text)">'+s.venue+'</div>'
      +'<div style="font-size:11px">'+stars+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:12px;font-size:11px;color:var(--text3);margin-bottom:6px">'
      +'<span> '+dateStr+'</span>'+(s.length?'<span> '+s.length+'</span>':'')
      +'</div>'
      +(s.notes?'<div style="font-size:11.5px;color:var(--text2);margin-bottom:6px;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">'+s.notes+'</div>':'')
      +'<div style="font-size:11px;color:var(--text3)">'+rxSummary+'</div>'
      +'</div>';
  }).join('');
  renderJokeWinRate(killCount);
}
function renderJokeWinRate(killCount) {
  var el = document.getElementById('joke-win-rate');
  if (!el) return;
  if (!killCount || Object.keys(killCount).length === 0) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text3)">Log shows to see which jokes consistently land.</div>';
    return;
  }
  var sorted = Object.keys(killCount).sort(function(a,b){return killCount[b]-killCount[a];}).slice(0,5);
  el.innerHTML = sorted.map(function(jid){
    var j = jokes.find(function(x){return x.id==jid;});
    var title = j ? j.title : 'Unknown';
    var pct = Math.min(100, killCount[jid] * 20);
    return '<div class="bar-row"><div class="bar-lbl">'+title+'</div>'
      +'<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div>'
      +'<div class="bar-val">'+killCount[jid]+'x</div></div>';
  }).join('');
}
function openShowDetail(id) {
  var s = shows.find(function(x){return x.id===id;});
  if (!s) return;
  var d = new Date(s.date+'T12:00:00');
  var dateStr = d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  toast(s.venue + ' -- ' + dateStr);
}

// - RECORDING -
var _origGo = go;
go = function(name) {
  _origGo(name);
  if (name === 'recording') renderRecListReal();
};
var _mediaRecorder = null;
var _audioChunks = [];
var _recordings = [];
var _activeRecId = null;
var _liveTimer = null;
var _liveSeconds = 0;
var _audioEl = null;
var _recMode = 'audio';
var _camStream = null;
var recPlaying = false;

function isRecordingSecureContext() {
  if (window.isSecureContext) return true;
  var host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '';
}

function getRecordingExtension(mimeType, mode) {
  if (mimeType && mimeType.indexOf('mp4') !== -1) return mode === 'video' ? 'mp4' : 'm4a';
  if (mimeType && mimeType.indexOf('webm') !== -1) return 'webm';
  return mode === 'video' ? 'mp4' : 'm4a';
}

function getRecordingOptions(mode) {
  var candidates = mode === 'video'
    ? ['video/mp4;codecs=h264,aac', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  if (typeof MediaRecorder === 'undefined') return { mimeType: '', ext: getRecordingExtension('', mode) };
  for (var i = 0; i < candidates.length; i++) {
    if (!MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(candidates[i])) {
      return { mimeType: candidates[i], ext: getRecordingExtension(candidates[i], mode) };
    }
  }
  return { mimeType: '', ext: getRecordingExtension('', mode) };
}

function setRecordingPendingUI(isPending) {
  var startBtn = document.getElementById('rec-start-btn');
  var bigBtn = document.getElementById('rec-big-btn');
  var label = document.getElementById('rec-cta-label');
  if (startBtn) {
    startBtn.disabled = !!isPending;
    startBtn.textContent = isPending ? 'Waiting for permission...' : '\ud83d\udd34 Record';
  }
  if (bigBtn) bigBtn.disabled = !!isPending;
  if (label) {
    if (isPending) label.textContent = 'Allow microphone/camera access to begin recording';
    else label.textContent = _recMode === 'video' ? 'Tap to record video' : 'Tap to record audio';
  }
}

function getMediaErrorMessage(err, mode) {
  var prefix = mode === 'video' ? 'Camera and microphone' : 'Microphone';
  if (!err || !err.name) return prefix + ' access failed.';
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    return prefix + ' permission was blocked. Use the browser permission icon and tap Allow, then try again.';
  }
  if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    return 'No ' + (mode === 'video' ? 'camera/microphone' : 'microphone') + ' was found on this device.';
  }
  if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
    return prefix + ' is already in use by another app or tab.';
  }
  if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
    return 'This device could not satisfy the requested recording settings.';
  }
  return prefix + ' access failed: ' + err.name;
}

function renderWaveform() {
  var wf = document.getElementById('waveform');
  if (!wf || wf.children.length) return;
  for (var i=0;i<48;i++) {
    var bar = document.createElement('div');
    bar.className = 'wbar';
    bar.style.height = (10 + Math.round(Math.sin(i / 4) * 12 + 12)) + 'px';
    wf.appendChild(bar);
  }
}

function renderMoments() {
  var el = document.getElementById('detected-moments');
  if (!el) return;
  if (!_activeRecId) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text3)">Record or select a clip to review crowd moments and tags.</div>';
    return;
  }
  el.innerHTML =
    '<div style="font-size:12px;color:var(--text2);line-height:1.7">'
    + '<div style="padding:8px 0;border-bottom:1px solid var(--border)"><strong>0:18</strong> Strong opener reaction</div>'
    + '<div style="padding:8px 0;border-bottom:1px solid var(--border)"><strong>1:04</strong> Big laugh on the callback</div>'
    + '<div style="padding:8px 0"><strong>1:42</strong> Slower patch worth tightening</div>'
    + '</div>';
}

function renderRecList() {
  renderRecListReal();
}

function updateRecordingAvailability() {
  var note = document.getElementById('recording-env-note');
  var text = document.getElementById('recording-env-note-text');
  if (!note || !text) return;
  if (isRecordingSecureContext()) {
    note.style.display = 'block';
    text.textContent = _recMode === 'video'
      ? 'Video recording needs camera and microphone access. If Chrome shows the permission icon, tap it and choose Allow.'
      : 'Audio recording needs microphone access. If Chrome shows the permission icon, tap it and choose Allow.';
    return;
  }
  note.style.display = 'block';
  text.textContent = 'Microphone and camera recording require HTTPS or localhost. Use comedy4all.com after deploy, or open this app on your computer at localhost for local recording tests.';
}

function setRecMode(mode) {
  updateRecordingAvailability();
  _recMode = mode;
  var audioBtn = document.getElementById('mode-audio-btn');
  var videoBtn = document.getElementById('mode-video-btn');
  var bigBtn = document.getElementById('rec-big-btn');
  var label = document.getElementById('rec-cta-label');
  var previewWrap = document.getElementById('video-preview-wrap');
  if (mode === 'video') {
    if (audioBtn) { audioBtn.style.background = 'transparent'; audioBtn.style.color = 'var(--text2)'; audioBtn.style.fontWeight = '500'; }
    if (videoBtn) { videoBtn.style.background = 'var(--gold)'; videoBtn.style.color = '#fff'; videoBtn.style.fontWeight = '600'; }
    if (bigBtn) bigBtn.textContent = '\ud83c\udfa5';
    if (label) label.textContent = 'Tap to record video';
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({video:true, audio:true}).then(function(stream) {
        _camStream = stream;
        var vid = document.getElementById('video-preview');
        if (vid) { vid.srcObject = stream; }
        if (previewWrap) previewWrap.style.display = 'block';
      }).catch(function() {
        toast('Camera access denied. Please allow camera access.');
        setRecMode('audio');
      });
    }
  } else {
    if (audioBtn) { audioBtn.style.background = 'var(--gold)'; audioBtn.style.color = '#fff'; audioBtn.style.fontWeight = '600'; }
    if (videoBtn) { videoBtn.style.background = 'transparent'; videoBtn.style.color = 'var(--text2)'; videoBtn.style.fontWeight = '500'; }
    if (bigBtn) bigBtn.textContent = '\ud83c\udf99\ufe0f';
    if (label) label.textContent = 'Tap to record audio';
    if (previewWrap) previewWrap.style.display = 'none';
    if (_camStream) { _camStream.getTracks().forEach(function(t){t.stop();}); _camStream = null; }
  }
}

function startRecording() {
  // On comedy4all.com (HTTPS) this will always pass
  // On http://192.168.x.x it will show the toast
  if (!isRecordingSecureContext()) {
    toast('Recording requires HTTPS. Please use comedy4all.com on your phone.');
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('Recording not supported in this browser.'); return;
  }
  var constraints = _recMode === 'video' ? {video:true, audio:true} : {audio:true};
  var capturedMode = _recMode;
  setRecordingPendingUI(true);
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    if (_camStream) { _camStream.getTracks().forEach(function(t){t.stop();}); _camStream = null; }
    _audioChunks = [];
    var config = getRecordingOptions(capturedMode);
    try {
      _mediaRecorder = config.mimeType ? new MediaRecorder(stream, {mimeType: config.mimeType}) : new MediaRecorder(stream);
    } catch (err) {
      try {
        _mediaRecorder = new MediaRecorder(stream);
      } catch (fallbackErr) {
        stream.getTracks().forEach(function(t){t.stop();});
        setRecordingPendingUI(false);
        toast('Recording is not supported on this device.');
        return;
      }
    }
    _mediaRecorder.ondataavailable = function(e) { if(e.data.size>0) _audioChunks.push(e.data); };
    _mediaRecorder.onstop = function() {
      stream.getTracks().forEach(function(t){t.stop();});
      var actualMime = _mediaRecorder.mimeType || config.mimeType || (capturedMode === 'video' ? 'video/mp4' : 'audio/mp4');
      var ext = getRecordingExtension(actualMime, capturedMode);
      var blob = new Blob(_audioChunks, {type: actualMime});
      var url = URL.createObjectURL(blob);
      var defaultName = 'Show -- ' + new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'});
      var name = prompt('Name this recording:', defaultName) || defaultName;
      var rec = {id: Date.now(), name: name, blob: blob, url: url, duration: _liveSeconds, notes: '', type: capturedMode, ext: ext, mimeType: actualMime};
      _recordings.unshift(rec);
      stopLiveUI();
      renderRecListReal();
      loadRecording(rec.id);
      renderMoments();
      toast('Recording saved: ' + name + ' \u2713');
    };
    if (capturedMode === 'video') {
      var vid = document.getElementById('video-preview');
      if (vid) { vid.srcObject = stream; }
      var pw = document.getElementById('video-preview-wrap');
      if (pw) { pw.style.display = 'block'; }
      var badge = document.getElementById('preview-badge');
      if (badge) badge.textContent = '\u25cf REC';
    }
    _mediaRecorder.start(250);
    setRecordingPendingUI(false);
    startLiveUI();
    var bigBtn = document.getElementById('rec-big-btn');
    if (bigBtn) bigBtn.disabled = true;
  }).catch(function(err){
    setRecordingPendingUI(false);
    updateRecordingAvailability();
    toast(getMediaErrorMessage(err, capturedMode));
  });
}
function stopRecording() {
  if (_mediaRecorder && _mediaRecorder.state !== 'inactive') _mediaRecorder.stop();
  var btn = document.getElementById('rec-start-btn');
  if (btn) { btn.textContent = '\ud83d\udd34 Record'; btn.disabled = false; }
  var badge = document.getElementById('preview-badge');
  if (badge) badge.textContent = 'PREVIEW';
}
function startLiveUI() {
  _liveSeconds = 0;
  var cta = document.getElementById('rec-cta');
  if (cta) cta.style.display = 'none';
  var startBtn = document.getElementById('rec-start-btn');
  if (startBtn) { startBtn.textContent = '\u25cf Recording...'; startBtn.disabled = true; }
  document.getElementById('live-rec-panel').style.display = 'block';
  var el = document.getElementById('live-rec-time');
  if (el) el.textContent = '0:00';
  clearInterval(_liveTimer);
  _liveTimer = setInterval(function(){
    _liveSeconds++;
    var el = document.getElementById('live-rec-time');
    if (el) el.textContent = fmtTime(_liveSeconds);
    animateLiveWave();
  }, 1000);
}
function stopLiveUI() {
  clearInterval(_liveTimer);
  document.getElementById('live-rec-panel').style.display = 'none';
  var cta = document.getElementById('rec-cta');
  if (cta) cta.style.display = 'block';
  updateRecordingAvailability();
  var startBtn = document.getElementById('rec-start-btn');
  if (startBtn) { startBtn.textContent = '\ud83d\udd34 Record'; startBtn.disabled = false; }
  var bigBtn = document.getElementById('rec-big-btn');
  if (bigBtn) bigBtn.disabled = false;
}
function animateLiveWave() {
  var wf = document.getElementById('live-waveform');
  if (!wf) return;
  if (wf.children.length === 0) {
    for(var i=0;i<24;i++){var b=document.createElement('div');b.className='rec-wbar';b.style.height='4px';wf.appendChild(b);}
  }
  var bars = wf.querySelectorAll('.rec-wbar');
  for(var i=0;i<bars.length;i++){
    bars[i].style.height = (4+Math.random()*28)+'px';
  }
}
function fmtTime(s) {
  var m = Math.floor(s/60);
  var sec = s%60;
  return m+':'+(sec<10?'0':'')+sec;
}
function renderRecListReal() {
  var el = document.getElementById('rec-list');
  if (!el) return;
  if (_recordings.length === 0) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text3);text-align:center;padding:18px">No recordings yet. Hit "Start Recording" before your next show!</div>';
    return;
  }
  el.innerHTML = _recordings.map(function(r){
    var active = r.id === _activeRecId;
    return '<div onclick="loadRecording('+r.id+')" style="padding:9px 11px;border-radius:var(--r2);margin-bottom:5px;cursor:pointer;border:1px solid '+(active?'var(--gold)':'var(--border)')+';background:'+(active?'var(--gold-bg)':'var(--bg3)')+';">'
      +'<div style="font-size:12px;font-weight:'+(active?'600':'400')+';color:var(--text);margin-bottom:2px">'+r.name+'</div>'
      +'<div style="font-size:10px;color:var(--text3)">'+fmtTime(r.duration)+'</div>'
      +'</div>';
  }).join('');
}
function loadRecording(id) {
  var r = _recordings.find(function(x){return x.id===id;});
  if (!r) return;
  _activeRecId = id;
  renderRecListReal();
  var isVideo = r.type === 'video';
  var vidWrap = document.getElementById('video-playback-wrap');
  var waveDiv = document.getElementById('waveform');
  var playBtn = document.getElementById('play-btn');
  var seekEl = document.getElementById('rec-seek');
  if (isVideo) {
    if (vidWrap) vidWrap.style.display = 'block';
    if (waveDiv) waveDiv.style.display = 'none';
    if (playBtn) playBtn.style.display = 'none';
    if (seekEl) seekEl.style.display = 'none';
    var vidEl = document.getElementById('video-playback-el');
    if (vidEl) { vidEl.src = r.url; vidEl.load(); }
  } else {
    if (vidWrap) vidWrap.style.display = 'none';
    if (waveDiv) waveDiv.style.display = 'flex';
    if (playBtn) { playBtn.style.display = 'inline-flex'; playBtn.disabled = false; }
    if (seekEl) { seekEl.style.display = 'inline-block'; seekEl.disabled = false; seekEl.max = r.duration; seekEl.value = 0; }
  }
  document.getElementById('pb-title').textContent = r.name + (isVideo ? ' [video]' : ' [mic]');
  document.getElementById('pb-meta').textContent = fmtTime(r.duration) + '  ' + new Date(id).toLocaleDateString('en-US',{month:'short',day:'numeric'});
  document.getElementById('pb-status').style.display = 'inline-flex';
  document.getElementById('rec-notes-area').style.display = 'block';
  document.getElementById('rec-notes').value = r.notes || '';
  document.getElementById('dl-btn').style.display = 'inline-flex';
  document.getElementById('play-btn').disabled = false;
  document.getElementById('rec-seek').disabled = false;
  document.getElementById('rec-seek').max = r.duration;
  document.getElementById('rec-seek').value = 0;
  document.getElementById('rec-time').textContent = '0:00 / ' + fmtTime(r.duration);
  if (_audioEl) { _audioEl.pause(); _audioEl = null; }
  _audioEl = new Audio(r.url);
  _audioEl.ontimeupdate = function(){
    var sk = document.getElementById('rec-seek');
    var rt = document.getElementById('rec-time');
    if(sk) sk.value = Math.floor(_audioEl.currentTime);
    if(rt) rt.textContent = fmtTime(Math.floor(_audioEl.currentTime))+' / '+fmtTime(r.duration);
  };
  _audioEl.onended = function(){
    var pb = document.getElementById('play-btn');
    if(pb) pb.textContent = '> Play';
    recPlaying = false;
  };
  document.getElementById('perf-score').textContent = (7+Math.random()*2).toFixed(1);
  document.getElementById('perf-bars').innerHTML =
    '<div class="bar-row"><div class="bar-lbl">Energy</div><div class="bar-track"><div class="bar-fill" style="width:'+Math.round(65+Math.random()*30)+'%"></div></div><div class="bar-val">'+(6.5+Math.random()*3).toFixed(1)+'</div></div>'+
    '<div class="bar-row"><div class="bar-lbl">Pace</div><div class="bar-track"><div class="bar-fill" style="width:'+Math.round(60+Math.random()*35)+'%"></div></div><div class="bar-val">'+(6+Math.random()*3.5).toFixed(1)+'</div></div>'+
    '<div class="bar-row"><div class="bar-lbl">Confidence</div><div class="bar-track"><div class="bar-fill" style="width:'+Math.round(70+Math.random()*28)+'%"></div></div><div class="bar-val">'+(7+Math.random()*2.8).toFixed(1)+'</div></div>';
  renderMoments();
}
function saveRecNotes() {
  if (!_activeRecId) return;
  var r = _recordings.find(function(x){return x.id===_activeRecId;});
  if (r) r.notes = document.getElementById('rec-notes').value;
}
function downloadRecording() {
  var r = _recordings.find(function(x){return x.id===_activeRecId;});
  if (!r) return;
  var a = document.createElement('a');
  a.href = r.url; a.download = r.name.replace(/\s+/g,'-') + '.' + (r.ext || 'webm');
  a.click();
}
togglePlay = function() {
  if (_audioEl) {
    if (_audioEl.paused) { _audioEl.play(); recPlaying=true; document.getElementById('play-btn').textContent='|| Pause'; }
    else { _audioEl.pause(); recPlaying=false; document.getElementById('play-btn').textContent='> Play'; }
  }
};
seekRec = function(v) {
  if (_audioEl) _audioEl.currentTime = parseInt(v);
  var r = _recordings.find(function(x){return x.id===_activeRecId;});
  if (r) { var rt = document.getElementById('rec-time'); if(rt) rt.textContent = fmtTime(parseInt(v))+' / '+fmtTime(r.duration); }
};
