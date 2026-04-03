// - ANALYTICS -
function renderAnalytics(){
  var scores=[6.8,7.2,7.9,8.1,7.5,8.6,9.1,8.3],labels=['F5','F12','F19','F28','M8','M15','M22','M26'],max=9.1;
  var bars=document.getElementById('show-bars');
  if(bars){
    var h='';
    for(var i=0;i<scores.length;i++){
      var color=scores[i]>=8.5?'var(--gold)':scores[i]>=7.5?'var(--blue)':'var(--text3)';
      h+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:100%;border-radius:4px 4px 0 0;background:'+color+';height:'+Math.round((scores[i]/max)*100)+'%"></div><div style="font-size:8px;color:var(--text3)">'+scores[i].toFixed(1)+'</div><div style="font-size:7px;color:var(--text3)">'+labels[i]+'</div></div>';
    }
    bars.innerHTML=h;
  }
  var hm=document.getElementById('heatmap');
  if(hm){var vals=[3,5,4,6,8,9,7,2,4,5,7,6,8,9,4,5,3,6,7,9,8];var h='';for(var i=0;i<vals.length;i++)h+='<div style="height:22px;border-radius:3px;background:rgba(176,125,16,'+(vals[i]/10)+');cursor:pointer" title="Score: '+vals[i]+'/10"></div>';hm.innerHTML=h;}
  var jr=document.getElementById('joke-ranking');
  if(jr){
    var sorted=jokes.slice().sort(function(a,b){return b.score-a.score;});
    var h='';
    for(var i=0;i<sorted.length;i++){
      var j=sorted[i];
      h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)"><div style="flex:1;font-size:11.5px;color:var(--text)">'+j.title+'</div><div style="width:75px"><div style="background:var(--bg3);border-radius:3px;height:4px;overflow:hidden"><div style="height:100%;background:var('+(j.score>=8?'--gold':'--blue')+');width:'+(j.score*10)+'%;border-radius:3px"></div></div></div><div style="font-size:11px;font-family:\'DM Mono\',monospace;width:28px;text-align:right;color:var('+(j.score>=8?'--gold':'--text3')+');font-weight:600">'+j.score+'</div></div>';
    }
    jr.innerHTML=h;
  }
  updateCounts();
}

// - VERSION HISTORY -
function renderVersions(){
  var vl=document.getElementById('ver-list');
  if(vl){
    var vers=[{v:'v3 -- Current (Mar 22)',n:'Tightened setup by 8 seconds'},{v:'v2 -- Mar 14',n:'Added Tinder comparison'},{v:'v1 -- Mar 1',n:'Original draft'}];
    vl.innerHTML=vers.map(function(x,i){return '<div class="vitem '+(i===0?'vactive':'')+'" onclick="showDiff('+i+')">'+'<div style="font-family:\'DM Mono\',monospace;color:var(--gold);font-size:10px;margin-bottom:2px;font-weight:700">'+x.v+'</div>'+'<div style="font-size:11px;color:var(--text3)">'+x.n+'</div></div>';}).join('');
  }
  showDiff(0);
}
var diffs=[
  '<div style="font-size:11px;color:var(--text3);margin-bottom:10px;font-weight:600">Changes: v2 -&gt; v3</div><div style="background:var(--red-bg);border:1px solid #f0bfbb;border-radius:var(--r2);padding:9px 12px;margin-bottom:9px;font-size:13px;color:var(--red)">-- So I\'m at the airport security line, right, and this guy in front of me, he\'s taking off his shoes and his belt and his watch and all his rings and his jacket and everything...</div><div style="background:var(--green-bg);border:1px solid #a8d8aa;border-radius:var(--r2);padding:9px 12px;font-size:13px;color:var(--green)">+ So I\'m at the airport, right? The guy in front of me starts fully undressing. Shoes, belt, watch -- is this security or your Tinder profile photo?</div>',
  '<div style="font-size:11px;color:var(--text3);margin-bottom:10px;font-weight:600">Changes: v1 -&gt; v2</div><div style="background:var(--green-bg);border:1px solid #a8d8aa;border-radius:var(--r2);padding:9px 12px;font-size:13px;color:var(--green)">+ Added the Tinder profile comparison line -- this became the first laugh at ~15 seconds in.</div>',
  '<div style="font-size:11px;color:var(--text3);margin-bottom:10px;font-weight:600">v1 -- Original draft (Mar 1)</div><div style="font-size:13px;color:var(--text2);line-height:1.9;padding:11px;background:var(--bg3);border-radius:var(--r2);border:1px solid var(--border)">So I\'m at airport security and the guy in front of me is taking forever... he asks if it\'s my first time flying. I said yes.<br><br><em style="color:var(--text3);font-size:11px">"First time divorced" came from a workshop session -- added in v2</em></div>'
];
function showDiff(i){
  var vitems=document.querySelectorAll('.vitem');
  for(var k=0;k<vitems.length;k++) vitems[k].classList.toggle('vactive',k===i);
  var vd=document.getElementById('ver-diff'),dl=document.getElementById('diff-label');
  if(vd) vd.innerHTML=diffs[i]||'';
  if(dl) dl.textContent=i===0?'v2 -> v3 (current)':i===1?'v1 -> v2':'v1 (original)';
}
