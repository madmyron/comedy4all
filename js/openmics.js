// C4A-466 — Find Open Mics this week near you (DFW-first v1)
// Candidates are a search input only. Nights are shown after two silent
// independent signals pass (Maps listing still exists; a public listing
// agrees on venue + weekday). Failures are dropped. No verifying UI.

var OPENMIC_RADIUS_MI = 40;
var OPENMIC_WINDOW_DAYS = 7;
var OPENMIC_CK_URL = 'https://www.cerealkillerproductions.com/dfw-comedy-open-mic-list/';
var OPENMIC_DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
var _openMicOrigin = null;
var _openMicCkText = '';
var _openMicCkAt = 0;
var _openMicSearching = false;

// Weekly DFW nights used as search seeds — not rendered as a directory.
var OPENMIC_CANDIDATES = [
  { id:'dcc-sun', venue:'Dallas Comedy Club', city:'Dallas', lat:32.78535, lon:-96.77937, dow:0, time:'4:30 PM', mapsQuery:'Dallas Comedy Club Deep Ellum', hints:['dallas comedy club'], signup:'In person at 4:00 PM. 5-minute sets.', venueUrl:'https://dallas-comedyclub.com/open-mics/' },
  { id:'dcc-wed', venue:'Dallas Comedy Club', city:'Dallas', lat:32.78535, lon:-96.77937, dow:3, time:'7:30 PM', mapsQuery:'Dallas Comedy Club Deep Ellum', hints:['dallas comedy club'], signup:'Lottery Thursday–Tuesday; standby at 7:15 PM. 5-minute sets.', venueUrl:'https://dallas-comedyclub.com/open-mics/' },
  { id:'addison-sun', venue:'Addison Improv', city:'Addison', lat:32.95372, lon:-96.82673, dow:0, time:'3:00 PM', mapsQuery:'Addison Improv', hints:['addison improv'], signup:'Workshop mic. In person at 2:30 PM. 5 min.', venueUrl:'https://improvtx.com/' },
  { id:'tks-sun', venue:"TK's", city:'Addison', lat:32.955, lon:-96.829, dow:0, time:'5:30 PM', mapsQuery:"TK's Addison Texas", hints:["tk's", 'tks addison'], signup:'DM Rudy or in person at 5:00 PM. 5 min.' },
  { id:'tks-wed', venue:"TK's", city:'Addison', lat:32.955, lon:-96.829, dow:3, time:'5:30 PM', mapsQuery:"TK's Addison Texas", hints:["tk's", 'tks addison'], signup:'DM Rudy or in person at 5:00 PM. 5 min.' },
  { id:'tks-thu', venue:"TK's", city:'Addison', lat:32.955, lon:-96.829, dow:4, time:'5:30 PM', mapsQuery:"TK's Addison Texas", hints:["tk's", 'tks addison'], signup:'DM Justin or in person at 5:00 PM. Hard stop 7:00 PM. 5 min.' },
  { id:'hyena-thu', venue:"Hyena's Comedy Nightclub", city:'Fort Worth', lat:32.75517, lon:-97.33023, dow:4, time:'10:00 PM', mapsQuery:"Hyena's Comedy Club Fort Worth", hints:['hyena'], signup:'In person 7:30–9:30 PM. 3–5 min.', venueUrl:'https://www.hyenascomedynightclub.com/fort-worth' },
  { id:'backdoor-thu', venue:'Backdoor Comedy Club', city:'Richardson', lat:32.9478, lon:-96.7312, dow:4, time:'8:00 PM', mapsQuery:'Backdoor Comedy Club Richardson', hints:['backdoor'], signup:'Clean comedy. Call (214) 328-4444 to sign up. 3 min.', venueUrl:'https://backdoorcomedy.com/' },
  { id:'arlington-tue', venue:'Arlington Improv', city:'Arlington', lat:32.7356, lon:-97.1081, dow:2, time:'6:00 PM', mapsQuery:'Arlington Improv', hints:['arlington improv'], signup:'In person at 5:30 PM. 5 min.', venueUrl:'https://improvtx.com/' },
  { id:'plano-tue', venue:'Plano House of Comedy', city:'Plano', lat:33.0198, lon:-96.6989, dow:2, time:'7:30 PM', mapsQuery:'House of Comedy Plano', hints:['plano house of comedy', 'house of comedy'], signup:'Club lottery. Sign up at 6:30 PM. 5 min.' },
  { id:'blc-mon', venue:'Big Laugh Comedy Club', city:'Fort Worth', lat:32.751, lon:-97.333, dow:1, time:'7:30 PM', mapsQuery:'Big Laugh Comedy Club Fort Worth', hints:['big laugh'], signup:'Sign up online; 10 standby spots in person.', venueUrl:'https://fortworth.blcomedy.com/submissions/open-mic-sign-up' },
  { id:'nines-wed', venue:'The Nines', city:'Dallas', lat:32.7845, lon:-96.7808, dow:3, time:'9:00 PM', mapsQuery:'The Nines Deep Ellum Dallas', hints:['the nines'], signup:'In person at 8:30 PM.' },
  { id:'renos-thu', venue:"Reno's Chop Shop", city:'Dallas', lat:32.7842, lon:-96.7848, dow:4, time:'8:30 PM', mapsQuery:"Reno's Chop Shop Deep Ellum", hints:["reno's", 'renos chop'], signup:'In person at 8:00 PM.' },
  { id:'statler-tue', venue:'The Statler', city:'Dallas', lat:32.7802, lon:-96.7974, dow:2, time:'7:00 PM', mapsQuery:'The Statler Dallas Bourbons and Banter', hints:['statler'], signup:'Sign up at 6:30 PM. 1914 Commerce St.' },
  { id:'ocs-tue', venue:'Oak Cliff Social Club', city:'Dallas', lat:32.7434, lon:-96.8275, dow:2, time:'8:00 PM', mapsQuery:'Oak Cliff Social Club Dallas', hints:['oak cliff social'], signup:'Sign up at 7:30 PM or DM Erick. 5 min.' },
  { id:'monk-sun', venue:'The Bearded Monk', city:'Denton', lat:33.2148, lon:-97.1331, dow:0, time:'7:30 PM', mapsQuery:'The Bearded Monk Denton', hints:['bearded monk'], signup:'In person at 6:30 PM. 5 min.' },
  { id:'1851-mon', venue:'1851 Club', city:'Arlington', lat:32.7359, lon:-97.1089, dow:1, time:'8:00 PM', mapsQuery:'1851 Club Arlington', hints:['1851'], signup:'In person at 7:30 PM. 4–6 min.', venueUrl:'https://clawsoutcomedy.com/openmics' },
  { id:'boozy-wed', venue:'Boozy Bird', city:'Carrollton', lat:32.9748, lon:-96.8894, dow:3, time:'7:30 PM', mapsQuery:'Boozy Bird Carrollton', hints:['boozy bird'], signup:'Sign up at 7:00 PM; must buy something to go up. 7 min.' },
  { id:'maverick-wed', venue:'The Maverick', city:'Carrollton', lat:32.9752, lon:-96.8901, dow:3, time:'8:00 PM', mapsQuery:'The Maverick Carrollton Texas', hints:['the maverick'], signup:'Clean comedy. Sign up at 7:00 PM. 5 min.' },
  { id:'cellar-tue', venue:'Southside Cellar', city:'Fort Worth', lat:32.7431, lon:-97.3274, dow:2, time:'8:30 PM', mapsQuery:'Southside Cellar Fort Worth', hints:['southside cellar'], signup:'In person at 8:00 PM. 5–7 min.' },
  { id:'arena-tue', venue:'Comedy Arena', city:'McKinney', lat:33.1972, lon:-96.6153, dow:2, time:'8:00 PM', mapsQuery:'Comedy Arena McKinney', hints:['comedy arena'], signup:'In person at 7:30 PM. Web sign-up. 5 min.' },
  { id:'bebop-tue', venue:'Vickery Park', city:'Plano', lat:33.0204, lon:-96.6995, dow:2, time:'9:00 PM', mapsQuery:'Vickery Park The Bebop Plano', hints:['vickery park', 'bebop'], signup:'Sign up at 8:30 PM.' },
  { id:'outfit-fri', venue:'Outfit Brewing', city:'Dallas', lat:32.8143, lon:-96.8706, dow:5, time:'7:00 PM', mapsQuery:'Outfit Brewing Dallas', hints:['outfit brewing'], signup:'Every Friday. In person or DM host. 5 min.' },
  { id:'shark-thu', venue:"Shark's Comedy Club", city:'Dallas', lat:32.812, lon:-96.84, dow:4, time:'9:30 PM', mapsQuery:"Shark's Comedy Club Dallas", hints:['shark'], signup:'In person at 9:00 PM. 3–5 min.', venueUrl:'https://www.sharkscomedyclub.com/' },
  { id:'reys-sat', venue:"Rey's Sports Bar", city:'Irving', lat:32.8141, lon:-96.9482, dow:6, time:'7:00 PM', mapsQuery:"Rey's Sports Bar Irving", hints:["rey's sports", 'reys sports'], signup:'Sign up 6:30 PM or DM Amos. Hard stop 9:00 PM.' },
  { id:'quinlan-wed', venue:'Quinlans', city:'Carrollton', lat:32.975, lon:-96.889, dow:3, time:'9:30 PM', mapsQuery:'Quinlans Carrollton', hints:['quinlan'], signup:'Sign up at 9:00 PM. 7 min.' },
  { id:'point-sun', venue:'Point After North', city:'Flower Mound', lat:33.0144, lon:-97.0969, dow:0, time:'8:00 PM', mapsQuery:'Point After North Flower Mound', hints:['point after'], signup:'In person. No cursing. Clean mic.' }
];

function openMicEscape(str) {
  return String(str == null ? '' : str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function dfwNow() {
  var fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  var map = {};
  fmt.formatToParts(new Date()).forEach(function(p) { map[p.type] = p.value; });
  return new Date(Number(map.year), Number(map.month) - 1, Number(map.day), Number(map.hour) % 24, Number(map.minute), Number(map.second));
}

function haversineMi(lat1, lon1, lat2, lon2) {
  var r = 3958.8;
  var p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  var dlat = (lat2 - lat1) * Math.PI / 180, dlon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dlat/2)*Math.sin(dlat/2) + Math.cos(p1)*Math.cos(p2)*Math.sin(dlon/2)*Math.sin(dlon/2);
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function nextDateForDow(dow, from) {
  var d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (var i = 0; i < OPENMIC_WINDOW_DAYS; i++) {
    var n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    if (n.getDay() === dow) return n;
  }
  return null;
}

function formatMicDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function isoDate(d) {
  var m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

function loadNextShow() {
  try {
    var raw = JSON.parse(localStorage.getItem('c4a_next_show') || 'null');
    return raw && typeof raw === 'object' ? raw : null;
  } catch (e) { return null; }
}

function saveNextShow(show) {
  try { localStorage.setItem('c4a_next_show', JSON.stringify(show)); } catch (e) {}
  renderHomeNextShow();
  toast('Saved as your next show');
}

function renderHomeNextShow() {
  var venueEl = document.getElementById('home-next-venue');
  var metaEl = document.getElementById('home-next-meta');
  var show = loadNextShow();
  if (!venueEl || !metaEl) return;
  if (show && show.venue) {
    venueEl.textContent = show.venue;
    var bits = [];
    if (show.weekday) bits.push(show.weekday);
    if (show.time) bits.push(show.time);
    if (show.date) {
      var p = String(show.date).split('-');
      if (p.length === 3) {
        var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        if (!isNaN(d.getTime())) bits.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
    } else if (show.dateLabel) {
      bits.push(show.dateLabel);
    }
    metaEl.textContent = bits.join(' · ') || 'Saved from Find Open Mics';
  } else {
    venueEl.textContent = 'No night saved yet';
    metaEl.textContent = 'Find an open mic this week, then save it here.';
  }
}

function saveOpenMicAsNextShow(id) {
  var card = document.querySelector('.om-card[data-om-id="' + id + '"]');
  if (!card) return;
  var show = {
    id: id,
    venue: card.getAttribute('data-venue') || '',
    city: card.getAttribute('data-city') || '',
    time: card.getAttribute('data-time') || '',
    weekday: card.getAttribute('data-weekday') || '',
    date: card.getAttribute('data-date') || '',
    dateLabel: card.getAttribute('data-date-label') || '',
    signup: card.getAttribute('data-signup') || '',
    savedAt: new Date().toISOString()
  };
  saveNextShow(show);
}

function fetchPlain(url, timeoutMs) {
  var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timer = setTimeout(function() { if (ctrl) ctrl.abort(); }, timeoutMs || 9000);
  return fetch(url, { signal: ctrl ? ctrl.signal : undefined })
    .then(function(res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error('bad status');
      return res.text();
    })
    .catch(function(err) {
      clearTimeout(timer);
      throw err;
    });
}

function fetchViaJina(targetUrl) {
  return fetchPlain('https://r.jina.ai/' + targetUrl, 12000);
}

function fetchCkListing() {
  var now = Date.now();
  if (_openMicCkText && (now - _openMicCkAt) < 30 * 60 * 1000) {
    return Promise.resolve(_openMicCkText);
  }
  return fetchViaJina(OPENMIC_CK_URL).then(function(text) {
    _openMicCkText = text || '';
    _openMicCkAt = Date.now();
    return _openMicCkText;
  });
}

function ckSectionForDay(text, dayName) {
  if (!text) return '';
  var names = OPENMIC_DAY_NAMES;
  var upper = text.toUpperCase();
  var startKey = '**' + dayName.toUpperCase() + '**';
  var start = upper.indexOf(startKey);
  if (start === -1) {
    start = upper.indexOf('\n' + dayName.toUpperCase() + '\n');
    if (start === -1) return text;
  }
  var rest = text.slice(start);
  var restUpper = rest.toUpperCase();
  var end = rest.length;
  for (var i = 0; i < names.length; i++) {
    if (names[i].toLowerCase() === dayName.toLowerCase()) continue;
    var key = '**' + names[i].toUpperCase() + '**';
    var idx = restUpper.indexOf(key, 8);
    if (idx !== -1 && idx < end) end = idx;
  }
  var monthly = restUpper.indexOf('**MONTHLY**');
  if (monthly !== -1 && monthly < end) end = monthly;
  return rest.slice(0, end);
}

function listingAgrees(mic, ckText, venuePageText) {
  var day = OPENMIC_DAY_NAMES[mic.dow];
  var section = ckSectionForDay(ckText, day).toLowerCase();
  var hints = mic.hints || [mic.venue];
  var nameInCk = hints.some(function(h) { return section.indexOf(String(h).toLowerCase()) !== -1; });
  if (nameInCk) return true;
  if (!venuePageText) return false;
  var page = venuePageText.toLowerCase();
  var hasMic = page.indexOf('open mic') !== -1 || page.indexOf('open-mic') !== -1;
  var hasDay = page.indexOf(day.toLowerCase()) !== -1;
  var hasName = hints.some(function(h) { return page.indexOf(String(h).toLowerCase()) !== -1; });
  return hasMic && hasDay && hasName;
}

function mapsAgrees(mic) {
  var q = encodeURIComponent(mic.mapsQuery || (mic.venue + ' ' + mic.city + ' TX'));
  var url = 'https://photon.komoot.io/api/?q=' + q + '&lat=' + mic.lat + '&lon=' + mic.lon + '&limit=5';
  return fetch(url).then(function(res) {
    if (!res.ok) throw new Error('maps');
    return res.json();
  }).then(function(data) {
    var feats = (data && data.features) || [];
    for (var i = 0; i < feats.length; i++) {
      var f = feats[i];
      var coords = (f.geometry && f.geometry.coordinates) || [];
      var lon = coords[0], lat = coords[1];
      if (typeof lat !== 'number' || typeof lon !== 'number') continue;
      var mi = haversineMi(mic.lat, mic.lon, lat, lon);
      if (mi > 4) continue;
      var propsName = String((f.properties && (f.properties.name || '')) || '').toLowerCase();
      var venueKey = String(mic.venue).toLowerCase().replace(/^the\s+/, '');
      var hintHit = (mic.hints || []).some(function(h) { return propsName.indexOf(String(h).toLowerCase()) !== -1; });
      var venueHit = propsName.indexOf(venueKey.split(' ')[0]) !== -1;
      if (hintHit || venueHit || mi < 0.6) {
        return { lat: lat, lon: lon, name: (f.properties && f.properties.name) || mic.venue };
      }
    }
    return null;
  }).catch(function() { return null; });
}

function geocodeCity(city) {
  var q = encodeURIComponent(city);
  return fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + q + '&count=5&language=en&format=json')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var rows = (data && data.results) || [];
      if (!rows.length) return null;
      var tx = rows.filter(function(r) { return String(r.admin1 || '') === 'Texas' || String(r.country_code || '') === 'US'; });
      var pick = tx[0] || rows[0];
      return { lat: pick.latitude, lon: pick.longitude, label: [pick.name, pick.admin1].filter(Boolean).join(', ') };
    });
}

function runPool(items, limit, worker) {
  var i = 0, out = new Array(items.length);
  function next() {
    if (i >= items.length) return Promise.resolve();
    var idx = i++;
    return Promise.resolve(worker(items[idx], idx)).then(function(val) {
      out[idx] = val;
      return next();
    });
  }
  var starters = [];
  for (var n = 0; n < Math.min(limit, items.length); n++) starters.push(next());
  return Promise.all(starters).then(function() { return out; });
}

function confirmCandidate(mic, origin, ckText) {
  var when = nextDateForDow(mic.dow, dfwNow());
  if (!when) return Promise.resolve(null);
  var dist = haversineMi(origin.lat, origin.lon, mic.lat, mic.lon);
  if (dist > OPENMIC_RADIUS_MI) return Promise.resolve(null);
  var pageP = mic.venueUrl ? fetchViaJina(mic.venueUrl).catch(function() { return ''; }) : Promise.resolve('');
  return Promise.all([mapsAgrees(mic), pageP]).then(function(pair) {
    var maps = pair[0];
    var page = pair[1];
    if (!maps) return null;
    if (!listingAgrees(mic, ckText, page)) return null;
    var lat = maps.lat, lon = maps.lon;
    return {
      id: mic.id,
      venue: mic.venue,
      city: mic.city,
      time: mic.time,
      signup: mic.signup || '',
      weekday: OPENMIC_DAY_NAMES[mic.dow],
      date: isoDate(when),
      dateObj: when,
      dateLabel: formatMicDate(when),
      miles: haversineMi(origin.lat, origin.lon, lat, lon)
    };
  }).catch(function() { return null; });
}

function setOpenMicStatus(msg) {
  var el = document.getElementById('om-status');
  if (el) el.textContent = msg || '';
}

function renderOpenMicResults(nights) {
  var root = document.getElementById('om-results');
  if (!root) return;
  var found = (nights || []).filter(Boolean);
  if (!found.length) {
    root.innerHTML = '<div class="card" style="padding:22px;text-align:center;color:var(--text3);font-size:13px">No nights we could silently confirm for the next 7 days near that search.<br><span style="font-size:11px">Try Dallas, Fort Worth, or Use my location.</span></div>';
    return;
  }
  found.sort(function(a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.miles - b.miles;
  });
  var groups = [];
  found.forEach(function(n) {
    if (!groups.length || groups[groups.length - 1].date !== n.date) {
      groups.push({ date: n.date, label: n.dateLabel, items: [] });
    }
    groups[groups.length - 1].items.push(n);
  });
  root.innerHTML = groups.map(function(g) {
    var cards = g.items.map(function(n) {
      var dist = n.miles < 10 ? n.miles.toFixed(1) : String(Math.round(n.miles));
      return '<div class="om-card card" data-om-id="'+openMicEscape(n.id)+'" data-venue="'+openMicEscape(n.venue)+'" data-city="'+openMicEscape(n.city)+'" data-time="'+openMicEscape(n.time)+'" data-weekday="'+openMicEscape(n.weekday)+'" data-date="'+openMicEscape(n.date)+'" data-date-label="'+openMicEscape(n.dateLabel)+'" data-signup="'+openMicEscape(n.signup)+'">'
        + '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">'
        + '<div><div style="font-size:14px;font-weight:650;color:var(--text)">'+openMicEscape(n.venue)+'</div>'
        + '<div style="font-size:12px;color:var(--text2);margin-top:3px">'+openMicEscape(n.city)+' · '+openMicEscape(n.weekday)+' · '+openMicEscape(n.time)+'</div>'
        + '<div style="font-size:11px;color:var(--text3);margin-top:4px">'+dist+' mi'
        + (n.signup ? ' · '+openMicEscape(n.signup) : '')
        + '</div></div>'
        + '<button type="button" class="btn btn-sm btn-primary" onclick="saveOpenMicAsNextShow(\''+openMicEscape(n.id)+'\')">Save as next show</button>'
        + '</div></div>';
    }).join('');
    return '<div class="om-day" style="margin-bottom:16px"><div class="sect-title" style="margin-bottom:8px">'+openMicEscape(g.label)+'</div>'+cards+'</div>';
  }).join('');
}

function searchOpenMicsFromOrigin(origin) {
  _openMicOrigin = origin;
  _openMicSearching = true;
  setOpenMicStatus('Looking for nights this week…');
  var results = document.getElementById('om-results');
  if (results) results.innerHTML = '';
  var loc = document.getElementById('om-location-label');
  if (loc) loc.textContent = origin.label ? ('Searching near ' + origin.label) : 'Searching near you';
  fetchCkListing().catch(function() { return ''; }).then(function(ckText) {
    return runPool(OPENMIC_CANDIDATES, 4, function(mic) {
      return confirmCandidate(mic, origin, ckText || '').catch(function() { return null; });
    });
  }).then(function(nights) {
    _openMicSearching = false;
    var kept = (nights || []).filter(Boolean);
    setOpenMicStatus(kept.length ? (kept.length + ' confirmed night' + (kept.length === 1 ? '' : 's') + ' in the next 7 days') : '');
    renderOpenMicResults(kept);
  }).catch(function() {
    _openMicSearching = false;
    setOpenMicStatus('');
    renderOpenMicResults([]);
  });
}

function searchOpenMicsCity() {
  var input = document.getElementById('om-city');
  var city = input && input.value ? input.value.trim() : '';
  if (!city) { toast('Type a city or use your location.'); return; }
  try { localStorage.setItem('c4a_openmic_city', city); } catch (e) {}
  setOpenMicStatus('Looking for nights this week…');
  geocodeCity(city).then(function(origin) {
    if (!origin) { toast('Could not find that city.'); setOpenMicStatus(''); return; }
    searchOpenMicsFromOrigin(origin);
  }).catch(function() {
    toast('City search failed. Try Dallas or Fort Worth.');
    setOpenMicStatus('');
  });
}

function searchOpenMicsGps() {
  if (!navigator.geolocation) { toast('Location is not available in this browser.'); return; }
  setOpenMicStatus('Looking for nights this week…');
  navigator.geolocation.getCurrentPosition(function(pos) {
    searchOpenMicsFromOrigin({
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      label: 'your location'
    });
  }, function() {
    setOpenMicStatus('');
    toast('Location denied. Type a city instead.');
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
}

function searchOpenMicsDfw() {
  var input = document.getElementById('om-city');
  if (input) input.value = 'Dallas, TX';
  searchOpenMicsFromOrigin({ lat: 32.78306, lon: -96.80667, label: 'Dallas–Fort Worth' });
}

function initOpenMics() {
  var input = document.getElementById('om-city');
  if (input && !input.value) {
    try { input.value = localStorage.getItem('c4a_openmic_city') || ''; } catch (e) {}
  }
  renderHomeNextShow();
}
