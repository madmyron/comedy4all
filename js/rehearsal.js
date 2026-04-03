// - REHEARSAL -
function initRehearsal() {
  rIdx=0; rPunch=false; rRatings={}; rTimer=0;
  clearInterval(rIv);
  rIv = setInterval(function(){
    rTimer++;
    var el=document.getElementById('r-timer');
    if(el) el.textContent=' '+Math.floor(rTimer/60)+':'+(rTimer%60<10?'0':'')+(rTimer%60)+' elapsed';
  },1000);
  updateRehearsal();
}
function updateRehearsal() {
  var j=rehearsalData[rIdx];
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
      html+='<div style="'+style+'">'+(i<rIdx?'\u2713 ':'')+rehearsalData[i].text.substring(0,28)+'...</div>';
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
        html+='<div style="font-size:11px;padding:3px 0;color:var(--text3)">'+rehearsalData[ki].text.substring(0,22)+'... <span style="color:var('+(rRatings[ki]==='kill'?'--green':rRatings[ki]==='bomb'?'--red':'--text2')+');">'+(rRatings[ki]==='kill'?'KILL':rRatings[ki]==='bomb'?'BOMB':'OK')+'</span></div>';
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
function rateJ(r){rRatings[rIdx]=r;toast(r==='kill'?'KILL Killer!':r==='bomb'?'BOMB Needs work':'OK Okay');setTimeout(nextJoke,400);}
