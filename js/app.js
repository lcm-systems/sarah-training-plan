(function(){
"use strict";
const D=window.SARAH_DATA, EX=D.EX, WORKOUTS=D.WORKOUTS, CREDIT=D.CREDIT||{};
const TRAIN_DAYS=[6,1,3], DAY_NAMES=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const GROUP={machine_chest_press:"Chest",incline_machine_press:"Chest",pec_deck:"Chest",cable_fly:"Chest",pushup:"Chest",db_pullover:"Chest",incline_db_press:"Chest",db_bench:"Chest",
 machine_shoulder_press:"Shoulders",arnold_press:"Shoulders",seated_db_shoulder_press:"Shoulders",cable_lateral_raise:"Shoulders",lateral_raise:"Shoulders",reverse_pec_deck:"Shoulders",face_pull:"Shoulders",
 lat_pulldown:"Back",cable_row:"Back",tbar_row:"Back",chest_supported_row:"Back",straight_arm_pulldown:"Back",back_extension:"Back",
 cable_curl:"Biceps",rope_hammer_curl:"Biceps",ez_curl:"Biceps",incline_db_curl:"Biceps",db_curl:"Biceps",hammer_curl:"Biceps",
 oh_cable_tri_ext:"Triceps",rope_pushdown:"Triceps",skull_crusher:"Triceps",oh_db_tri_ext:"Triceps",
 back_squat:"Quads",leg_press:"Quads",leg_extension:"Quads",bulgarian:"Quads",walking_lunge:"Quads",
 hip_thrust:"Glutes",glute_kickback:"Glutes",hip_abduction:"Glutes",
 rdl:"Hamstrings",lying_leg_curl:"Hamstrings",
 standing_calf:"Calves",seated_calf:"Calves",
 cable_crunch:"Core",lying_leg_raise:"Core",plank:"Core"};

/* ---------- helpers ---------- */
const $=(s,el)=>(el||document).querySelector(s), $$=(s,el)=>[...(el||document).querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtClock=s=>{s=Math.max(0,Math.round(s));const m=Math.floor(s/60),r=s%60;return m+":"+String(r).padStart(2,"0");};
const fmtDate=d=>d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
const rel=ts=>{const d=Math.floor((Date.now()-ts)/86400000);return d<=0?"today":d===1?"yesterday":d+" days ago";};
const topOfRange=r=>{const m=String(r).match(/(\d+)\s*[–-]\s*(\d+)/);if(m)return +m[2];const n=String(r).match(/^(\d+)/);return n?+n[1]:null;};
const wIndex=id=>WORKOUTS.findIndex(w=>w.id===id);
const fmtSet=(ex,x)=>{const e=EX[ex];if(e.bw||!x.w)return e.timed?x.r+" s":String(x.r);return x.w+" kg × "+x.r;};
const stepFor=ex=>{const n=EX[ex].name.toLowerCase();return (n.includes("dumbbell")||n.includes("arnold")||n.includes("hammer")||n.includes("lateral")||n.includes("cable curl"))?1:2.5;};
const defaultW=ex=>{const e=EX[ex];if(e.bw)return 0;const n=e.name.toLowerCase();
  if(n.includes("barbell")||n.includes("romanian"))return 20; if(n.includes("machine")||n.includes("press machine"))return 20;
  if(n.includes("ez-bar")||n.includes("skull"))return 10; if(n.includes("dumbbell")||n.includes("arnold")||n.includes("lateral"))return 5;
  if(n.includes("lunge")||n.includes("split squat"))return 0; return 10;};
function slots(w){const out=[];w.blocks.forEach((b,bi)=>{ if(b.ss) b.ss.forEach((e,ei)=>out.push({key:bi+"_"+ei,ex:e.ex,sets:e.sets,reps:e.reps,rest:b.rest,bi,ei,ss:true,last:ei===b.ss.length-1,hold:e.hold}));
  else out.push({key:bi+"_0",ex:b.ex,sets:b.sets,reps:b.reps,rest:b.rest,bi,ei:0,ss:false,last:true,hold:b.hold,note:b.note}); }); return out;}
const S=()=>Store.s;
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("on"),2400);}
function confirmDlg(title,text,yes){return new Promise(res=>{const d=$("#dlg");$("#dlg-title").textContent=title;$("#dlg-text").textContent=text;$("#dlg-yes").textContent=yes||"Yes";d.classList.add("on");
  const done=v=>{d.classList.remove("on");$("#dlg-yes").onclick=null;$("#dlg-no").onclick=null;res(v);};$("#dlg-yes").onclick=()=>done(true);$("#dlg-no").onclick=()=>done(false);});}
let actx=null;
function primeAudio(){try{if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state==="suspended")actx.resume();}catch(e){}}
function beep(n){n=n||3;try{if(actx){let t=actx.currentTime;for(let i=0;i<n;i++){const o=actx.createOscillator(),g=actx.createGain();o.type="sine";o.frequency.value=i===n-1?1046:880;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.5,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+.25);t+=.3;}}}catch(e){}
  try{navigator.vibrate&&navigator.vibrate([180,80,180,80,300]);}catch(e){}}
let wake=null;
async function wakeOn(){try{if("wakeLock" in navigator&&!wake){wake=await navigator.wakeLock.request("screen");wake.addEventListener("release",()=>{wake=null;});}}catch(e){}}
function wakeOff(){try{wake&&wake.release();}catch(e){}wake=null;}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&S().session)wakeOn();});

/* ---------- navigation ---------- */
let current="home";
function show(id){ current=id; $$(".screen").forEach(s=>s.classList.toggle("on",s.id==="s-"+id)); window.scrollTo(0,0);
  document.body.classList.toggle("in-workout",id==="workout");
  $$(".nav button").forEach(b=>b.classList.toggle("on",b.dataset.tab===id||(id==="detail"&&b.dataset.tab==="plan")));
}
$$(".nav button").forEach(b=>b.addEventListener("click",()=>{const t=b.dataset.tab;
  if(t==="home")renderHome(); if(t==="plan")renderPlan(); if(t==="progress")renderProgress(); if(t==="you")renderYou(); show(t);}));

/* ---------- sync pill ---------- */
function renderSync(){
  const p=$("#sync"), st=Store.status;
  if(!Store.configured()){ p.hidden=true; return; }
  p.hidden=false; p.className="sync"+(st==="busy"?" busy":st==="error"?" err":(st==="offline"||st==="signedout"||st==="local")?" off":"");
  p.innerHTML="<i></i>"+(st==="busy"?"Saving":st==="error"?"Sync problem":st==="offline"?"Offline":st==="signedout"?"Not signed in":"Saved");
}
Store.onChange(()=>{ renderSync(); if(current==="home")renderHome(); if(current==="progress")renderProgress(); if(current==="you")renderYou(); });

/* ---------- home ---------- */
function renderHome(){
  const now=new Date(); $("#home-date").textContent=fmtDate(now);
  const s=S(), inProg=s.session, wk=inProg?WORKOUTS[wIndex(inProg.workout)]:WORKOUTS[s.cycle%6];
  const h=$("#hero");
  h.innerHTML=`<div class="kicker">${inProg?"In progress":"Next up"}</div>
    <div class="display word">${esc(wk.word)}</div><div class="sub">${esc(wk.sub)}</div>
    <div class="meta">Week ${wk.week}, workout ${wIndex(wk.id)+1} of 6${inProg?" · started "+rel(inProg.started):""}</div>
    <div class="actions">
      <button class="btn btn-accent btn-block" id="hero-start">${inProg?"Continue workout":"Start workout"}</button>
      ${inProg?'<button class="btn btn-ghost btn-block" id="hero-discard">Discard and start fresh</button>':'<button class="btn btn-ghost btn-block" id="hero-preview">See what is in it</button>'}
    </div>`;
  $("#hero-start").onclick=()=>{primeAudio(); inProg?openWorkout(inProg.workout,true):startWorkout(wk.id);};
  const pv=$("#hero-preview"); if(pv) pv.onclick=()=>openDetail(wk.id);
  const dc=$("#hero-discard"); if(dc) dc.onclick=async()=>{ if(await confirmDlg("Discard this workout?","The sets you logged in it will be lost.","Discard")){ s.session=null; Store.save(); renderHome(); } };
  const dow=now.getDay();
  $("#sched").innerHTML=["Sat","Mon","Wed"].map((n,i)=>`<span class="${TRAIN_DAYS[i]===dow?"today":""}">${n}</span>`).join("");
  let next=null; for(let i=1;i<=7;i++){const d=(dow+i)%7; if(TRAIN_DAYS.includes(d)){next=DAY_NAMES[d];break;}}
  $("#schednote").textContent=TRAIN_DAYS.includes(dow)?`It's ${DAY_NAMES[dow]}, training day. The one after this is ${next}.`:`Rest day. Next session is ${next}.`;
  $("#picker").innerHTML=WORKOUTS.map((x,i)=>`<button class="wrow ${i===s.cycle%6?"next":""}" data-w="${x.id}"><span class="n">${i+1}</span><span><span class="t">${esc(x.name)}</span><span class="s">Week ${x.week}. ${esc(x.sub)}</span></span><span class="chev">›</span></button>`).join("");
  $$("#picker .wrow").forEach(b=>b.onclick=()=>openDetail(b.dataset.w));
}

/* ---------- plan ---------- */
function renderPlan(){
  const row=(x,i)=>`<button class="wrow" data-w="${x.id}"><span class="n">${i+1}</span><span><span class="t">${esc(x.name)}</span><span class="s">${esc(x.sub)}</span></span><span class="chev">›</span></button>`;
  $("#plan-a").innerHTML=WORKOUTS.filter(w=>w.week==="A").map(w=>row(w,wIndex(w.id))).join("");
  $("#plan-b").innerHTML=WORKOUTS.filter(w=>w.week==="B").map(w=>row(w,wIndex(w.id))).join("");
  $$("#s-plan .wrow").forEach(b=>b.onclick=()=>openDetail(b.dataset.w));
}
function openDetail(id){
  const w=WORKOUTS[wIndex(id)];
  $("#detail-ttl").innerHTML=`${esc(w.name)}<small>Week ${w.week}, workout ${wIndex(id)+1} of 6</small>`;
  let html=`<div class="card"><h3 style="font-size:17px;margin-bottom:6px">Warm-up, about 8 minutes</h3>`;
  html+=w.warm.map(i=>`<div class="witem"><div class="txt"><b>${esc(i.t)}</b><span>${esc(i.d)}</span></div>${i.ex?`<button class="mini play" data-v="${i.ex}">▶ Watch</button>`:""}</div>`).join("");
  html+=`</div><div class="card" style="margin-top:12px"><h3 style="font-size:17px;margin-bottom:6px">Exercises</h3>`;
  w.blocks.forEach(b=>{
    if(b.ss){ html+=`<div style="padding:10px 0;border-top:1px solid var(--line)"><span class="ss-label">Superset, rest ${b.rest} s after the pair</span>`;
      b.ss.forEach(e=>{ html+=`<div class="witem" style="border-top:0"><div class="txt"><b>${esc(EX[e.ex].name)}</b><span>${e.sets} sets of ${esc(e.reps)}</span></div><button class="mini play" data-v="${e.ex}">▶</button></div>`; });
      html+=`</div>`; }
    else html+=`<div class="witem"><div class="txt"><b>${esc(EX[b.ex].name)}</b><span>${b.sets} sets of ${esc(b.reps)}, rest ${b.rest} s</span></div><button class="mini play" data-v="${b.ex}">▶</button></div>`;
  });
  html+=`</div>`;
  $("#detail-body").innerHTML=html;
  $$("#detail-body .play").forEach(b=>b.onclick=()=>openVideo(b.dataset.v));
  $("#detail-start").onclick=async()=>{ primeAudio();
    const s=S();
    if(s.session&&s.session.workout!==id){ if(!(await confirmDlg("Start a different workout?","You have a workout in progress. Starting this one will discard it.","Start anyway"))) return; s.session=null; }
    if(s.session&&s.session.workout===id) openWorkout(id,true); else startWorkout(id); };
  show("detail");
}
$("#detail-back").onclick=()=>{ renderPlan(); show("plan"); };

/* ---------- workout ---------- */
let clockTimer=null;
function startWorkout(id){
  const w=WORKOUTS[wIndex(id)], s=S();
  s.session={id:Store.uuid(),workout:id,started:Date.now(),warm:w.warm.map(()=>false),sets:{}};
  slots(w).forEach(x=>{ s.session.sets[x.key]=Array.from({length:x.sets},()=>({w:"",r:"",done:false})); });
  Store.save(); openWorkout(id,false);
}
function openWorkout(id,resume){
  const w=WORKOUTS[wIndex(id)];
  $("#w-ttl").innerHTML=`${esc(w.name)}<small>Week ${w.week}, workout ${wIndex(id)+1} of 6</small>`;
  $("#w-word").textContent=w.word; $("#w-sub").textContent=w.sub;
  renderWorkoutBody(w); clearInterval(clockTimer); clockTimer=setInterval(tickClock,1000); tickClock();
  wakeOn(); show("workout"); if(resume) toast("Picking up where you left off");
}
function tickClock(){ const s=S(); if(!s.session)return; $("#w-clock").textContent=fmtClock((Date.now()-s.session.started)/1000); }
function lastText(slot){ const L=S().last[slot.ex]; if(!L||!L.sets||!L.sets.length) return "First time logging this one. Start light and find your weight.";
  return `Last time (${rel(L.ts)}): ${L.sets.map(x=>fmtSet(slot.ex,x)).join(", ")}`; }
function hintFor(slot){ const L=S().last[slot.ex]; if(!L||!L.sets||!L.sets.length) return ""; const top=topOfRange(slot.reps); if(!top) return "";
  if(!L.sets.every(x=>+x.r>=top)) return "";
  return EX[slot.ex].bw?"Last time you hit the top of the range on every set. Add a rep or two today.":"Last time you hit the top of the range on every set. Try 1 to 2.5 kg more today."; }
function renderWorkoutBody(w){
  const s=S(), sess=s.session, body=$("#w-body"); let html="";
  html+=`<div class="card warm"><h3>Warm-up</h3><div class="lead">About 8 minutes. Tick them off as you go.</div>`;
  w.warm.forEach((i,idx)=>{ html+=`<div class="witem ${sess.warm[idx]?"done":""}" data-i="${idx}"><button class="chk ${sess.warm[idx]?"on":""}">${sess.warm[idx]?"✓":""}</button><div class="txt"><b>${esc(i.t)}</b><span>${esc(i.d)}</span></div>${i.secs?`<button class="mini timer" data-secs="${i.secs}">${fmtClock(i.secs)}</button>`:""}${i.ex?`<button class="mini play" data-v="${i.ex}">▶</button>`:""}</div>`; });
  html+=`</div>`;
  const sl=slots(w), total=w.blocks.length;
  w.blocks.forEach((b,bi)=>{
    const n=bi+1;
    if(b.ss){ const parts=sl.filter(x=>x.bi===bi);
      html+=`<div class="ex ss" data-bi="${bi}"><div class="idx">${n} of ${total}</div><span class="ss-label">Superset</span><div class="ss-note">One set of the first, straight into one set of the second, then rest ${b.rest} s.</div>`;
      parts.forEach((x,i)=>{ html+=`<div class="sub-ex">${exHead(x,i===0?"A":"B")}${setsHtml(x)}</div>`; });
      html+=`</div>`;
    } else { const x=sl.find(y=>y.bi===bi);
      html+=`<div class="ex" data-bi="${bi}"><div class="idx">${n} of ${total}</div>${exHead(x)}${setsHtml(x)}</div>`; }
  });
  body.innerHTML=html; bindWorkout(w); updateProgress(w);
}
function exHead(s,tag){
  const e=EX[s.ex], hint=hintFor(s);
  return `<div class="head"><div style="flex:1;min-width:0">
    <div class="name">${tag?`<em>${tag}.</em> `:""}${esc(e.name)}</div>
    <div class="muscles">${esc(e.m)}</div>
    <div class="target">${s.sets} sets of ${esc(s.reps)}${s.last?`, rest ${s.rest} s`:""}</div>
    <div class="last">${esc(lastText(s))}</div>
    ${hint?`<div class="hint">${esc(hint)}</div>`:""}
    ${s.note?`<div class="last">${esc(s.note)}</div>`:""}
  </div>
  <button class="thumb" data-v="${s.ex}" aria-label="Watch form video"><img data-poster="${s.ex}" alt="" loading="lazy" onerror="this.style.display='none'"><span class="play"><i>▶</i>Watch form</span></button></div>
  <details class="cues"><summary>Form cues and alternative</summary><ul>${e.cues.map(c=>`<li>${esc(c)}</li>`).join("")}</ul><div class="alt">Machine busy? Use: ${esc(e.alt||"the closest alternative")}</div></details>`;
}
function setsHtml(s){
  const e=EX[s.ex], rows=S().session.sets[s.key], bw=!!e.bw;
  let h=`<div class="sets" data-key="${s.key}"><div class="setrow hdr"><span class="sn">Set</span>${bw?"":'<span style="flex:1">kg</span>'}<span style="flex:1">${s.hold?"seconds":"reps"}</span><span style="width:48px"></span></div>`;
  rows.forEach((r,i)=>{
    if(!bw&&r.w===""){ const prev=rows[i-1], L=S().last[s.ex]; r.w=(prev&&prev.w!=="")?prev.w:((L&&L.sets[i]&&L.sets[i].w)||(L&&L.sets[0]&&L.sets[0].w)||defaultW(s.ex)); }
    if(r.r===""&&!s.hold){ const prev=rows[i-1], L=S().last[s.ex], top=topOfRange(s.reps); r.r=(prev&&prev.r!=="")?prev.r:((L&&L.sets[i]&&L.sets[i].r)||top||0); }
    h+=`<div class="setrow ${r.done?"is-done":""}" data-i="${i}"><span class="sn">${i+1}<small>${esc(s.reps)}</small></span>`;
    if(!bw) h+=`<div class="stp" data-f="w"><button class="dec">−</button><b class="val">${esc(r.w===""?0:r.w)}<small>kg</small></b><button class="inc">+</button></div>`;
    if(s.hold) h+=`<button class="holdbtn" data-hold="${s.hold}">${r.r!==""?esc(r.r)+" s":"Start "+s.hold+" s"}</button>`;
    else h+=`<div class="stp" data-f="r"><button class="dec">−</button><b class="val">${esc(r.r===""?0:r.r)}<small>reps</small></b><button class="inc">+</button></div>`;
    h+=`<button class="done">✓</button></div>`;
  });
  return h+`</div>`;
}
function holdRepeat(btn,fn){
  let t=null,rep=null;
  const stop=()=>{clearTimeout(t);clearInterval(rep);t=null;rep=null;};
  const start=()=>{stop();btn._held=false;t=setTimeout(()=>{btn._held=true;let n=0;rep=setInterval(()=>{fn();if(++n===8){clearInterval(rep);rep=setInterval(fn,70);}},160);},450);};
  btn.addEventListener("touchstart",start,{passive:true}); btn.addEventListener("mousedown",start);
  ["touchend","touchcancel","mouseup","mouseleave"].forEach(e=>btn.addEventListener(e,stop));
  btn.addEventListener("click",()=>{ if(btn._held){btn._held=false;return;} fn(); });
}
function bindWorkout(w){
  const sl=slots(w), s=S();
  $$("#w-body .witem").forEach(el=>{ const i=+el.dataset.i;
    $(".chk",el).onclick=()=>{ s.session.warm[i]=!s.session.warm[i]; Store.save({quiet:true}); el.classList.toggle("done",s.session.warm[i]); const c=$(".chk",el); c.classList.toggle("on",s.session.warm[i]); c.textContent=s.session.warm[i]?"✓":""; };
    const t=$(".timer",el); if(t) t.onclick=()=>toggleMini(t,+t.dataset.secs,()=>{ if(!s.session.warm[i]) $(".chk",el).click(); });
  });
  $$("#w-body .play, #w-body .thumb").forEach(b=>b.onclick=()=>openVideo(b.dataset.v));
  $$("#w-body img[data-poster]").forEach(async img=>{ img.src=await clipUrl("poster",img.dataset.poster); });
  $$("#w-body .sets").forEach(box=>{
    const key=box.dataset.key, slot=sl.find(x=>x.key===key);
    $$(".setrow[data-i]",box).forEach(row=>{
      const i=+row.dataset.i, rec=s.session.sets[key][i];
      $$(".stp",row).forEach(stp=>{ const f=stp.dataset.f, step=f==="w"?stepFor(slot.ex):1;
        const bump=d=>{ if(rec.done)return; const v=Math.max(0,Math.round(((+rec[f]||0)+d*step)*10)/10); rec[f]=v; rec.touched=true; Store.save({quiet:true}); $(".val",stp).innerHTML=esc(v)+`<small>${f==="w"?"kg":"reps"}</small>`; };
        holdRepeat($(".dec",stp),()=>bump(-1)); holdRepeat($(".inc",stp),()=>bump(1)); });
      const hb=$(".holdbtn",row); if(hb) hb.onclick=()=>{ if(hb.classList.contains("run")||rec.done)return; const secs=+hb.dataset.hold, end=Date.now()+secs*1000;
        hb.classList.add("run"); hb.textContent=secs+" s";
        const t=setInterval(()=>{ const l=Math.ceil((end-Date.now())/1000); if(l<=0){ clearInterval(t); hb.classList.remove("run"); beep(2); rec.r=String(secs); rec.done=true; Store.save({quiet:true}); afterSet(w,slot,i); renderWorkoutBody(w); } else hb.textContent=l+" s"; },250); };
      $(".done",row).onclick=()=>{
        if(!rec.done){ const vw=$('.stp[data-f="w"] .val',row), vr=$('.stp[data-f="r"] .val',row);
          if(vw) rec.w=parseFloat(vw.textContent)||0; if(vr) rec.r=parseInt(vr.textContent,10)||0;
          if(slot.hold&&rec.r==="") rec.r=String(slot.hold); }
        rec.done=!rec.done;
        if(rec.done){ const all=s.session.sets[key]; for(let j=i+1;j<all.length;j++){ if(!all[j].done&&!all[j].touched){ all[j].w=rec.w; all[j].r=rec.r; } } }
        Store.save({quiet:true}); primeAudio(); if(rec.done) afterSet(w,slot,i);
        renderWorkoutBody(w);
      };
    });
  });
  $("#w-finish").onclick=()=>finishWorkout(w);
  $("#w-exit").onclick=()=>{ clearInterval(clockTimer); wakeOff(); hideRest(); renderHome(); show("home"); };
}
function toggleMini(btn,secs,onDone){ if(btn._t){clearInterval(btn._t);btn._t=null;btn.classList.remove("run");btn.textContent=fmtClock(secs);return;}
  const end=Date.now()+secs*1000; btn.classList.add("run");
  btn._t=setInterval(()=>{ const l=Math.ceil((end-Date.now())/1000); if(l<=0){clearInterval(btn._t);btn._t=null;btn.classList.remove("run");btn.textContent="Done";beep(2);onDone&&onDone();} else btn.textContent=fmtClock(l); },250); }
function afterSet(w,slot,i){
  const sl=slots(w), sess=S().session;
  if(sl.every(x=>sess.sets[x.key].every(r=>r.done))){ hideRest(); toast("That's everything. Finish when you're ready."); return; }
  if(!slot.last){ const p=sl.find(x=>x.bi===slot.bi&&x.ei===slot.ei+1); toast("Straight into "+EX[p.ex].name); return; }
  let nextName;
  if(i===slot.sets-1){ const idx=sl.findIndex(x=>x.key===slot.key); let j=idx+1; while(j<sl.length&&sess.sets[sl[j].key].every(r=>r.done)) j++; nextName=j<sl.length?EX[sl[j].ex].name:"the finish line"; }
  else nextName=`set ${i+2} of ${slot.ss?"the superset":EX[slot.ex].name}`;
  startRest(slot.rest,nextName);
}
function updateProgress(w){
  const sl=slots(w), sess=S().session; let d=0,t=0;
  sl.forEach(x=>sess.sets[x.key].forEach(r=>{t++;if(r.done)d++;}));
  $("#w-prog").style.width=(t?100*d/t:0)+"%"; $("#w-progtxt").textContent=`${d} of ${t} sets done`;
  $$("#w-body .ex").forEach(el=>{ const bi=+el.dataset.bi, parts=sl.filter(x=>x.bi===bi);
    el.classList.toggle("complete",parts.every(x=>sess.sets[x.key].every(r=>r.done))); el.classList.remove("active"); });
  const first=$$("#w-body .ex").find(el=>!el.classList.contains("complete")); if(first) first.classList.add("active");
}
async function finishWorkout(w){
  const s=S(), sess=s.session, sl=slots(w); let d=0,t=0;
  sl.forEach(x=>sess.sets[x.key].forEach(r=>{t++;if(r.done)d++;}));
  if(d===0){ if(!(await confirmDlg("Finish with no sets logged?","Nothing will be saved.","Leave workout"))) return;
    s.session=null; Store.save(); clearInterval(clockTimer); wakeOff(); renderHome(); show("home"); return; }
  if(d<t&&!(await confirmDlg("Finish workout?",`${t-d} set${t-d===1?"":"s"} still unticked. That's fine, just checking.`,"Finish"))) return;
  const ended=Date.now(), entry={id:sess.id||Store.uuid(),workout:w.id,started:sess.started,ended,dur:Math.round((ended-sess.started)/1000),sets:[],volume:0,synced:false};
  let vol=0;
  sl.forEach(x=>{ const rows=sess.sets[x.key].filter(r=>r.done); if(!rows.length) return;
    const recs=rows.map(r=>({w:+r.w||0,r:+r.r||0})); entry.sets.push({ex:x.ex,sets:recs});
    recs.forEach(r=>{ if(!EX[x.ex].bw) vol+=(r.w||0)*(r.r||0); });
    s.last[x.ex]={ts:ended,sets:recs}; });
  entry.volume=Math.round(vol);
  s.sessions.push(entry); s.cycle=wIndex(w.id)+1; s.session=null; Store.save();
  clearInterval(clockTimer); wakeOff(); hideRest(); renderSummary(w,entry,d,t); show("summary");
}
function renderSummary(w,e,d,t){
  const msgs=["Nice work, Sarah.","Strong session.","That's how it's done.","Consistency is the whole secret.","Your future self says thanks."];
  $("#sum-msg").textContent=`${msgs[S().sessions.length%msgs.length]} ${w.name} is in the books.`;
  $("#sum-stats").innerHTML=`<div><b>${fmtClock(e.dur)}</b><span>time</span></div><div><b>${d}</b><span>of ${t} sets</span></div><div><b>${e.volume.toLocaleString()}</b><span>kg lifted</span></div>`;
  $("#sum-list").innerHTML=`<h3 style="font-size:17px;margin-bottom:6px">What you did</h3>`+e.sets.map(x=>{
    const best=x.sets.reduce((a,b)=>(b.w*1000+b.r)>(a.w*1000+a.r)?b:a,x.sets[0]);
    return `<div class="exline"><div class="t"><b>${esc(EX[x.ex].name)}</b><span>${x.sets.map(y=>fmtSet(x.ex,y)).join(", ")}</span></div><span class="tiny">best ${fmtSet(x.ex,best)}</span></div>`;
  }).join("")+`<p class="small muted" style="margin-top:12px">Next time: <b>${esc(WORKOUTS[S().cycle%6].name)}</b>.</p>`;
}
$("#sum-home").onclick=()=>{ renderHome(); show("home"); };
$("#sum-progress").onclick=()=>{ renderProgress(); show("progress"); };

/* ---------- rest timer ---------- */
let rest={end:0,total:0,timer:null,on:false};
function startRest(secs,label){ rest.end=Date.now()+secs*1000; rest.total=secs; rest.on=true;
  const sh=$("#sheet"); sh.classList.remove("finished"); sh.classList.add("on");
  $("#sheet-title").textContent="Rest"; $("#sheet-sub").textContent="Next: "+label; $("#rest-skip").textContent="Skip";
  clearInterval(rest.timer); rest.timer=setInterval(tickRest,200); tickRest(); }
function tickRest(){ if(!rest.on)return; const left=(rest.end-Date.now())/1000;
  $("#ring-arc").style.strokeDashoffset=String(251.3*(1-Math.max(0,Math.min(1,left/rest.total))));
  $("#ring-num").textContent=left>0?fmtClock(Math.ceil(left)):"Go";
  if(left<=0){ clearInterval(rest.timer); rest.on=false; beep(); $("#sheet").classList.add("finished"); $("#sheet-title").textContent="Rest over"; $("#rest-skip").textContent="Ready"; setTimeout(()=>{ if(!rest.on) hideRest(); },6000); } }
function hideRest(){ clearInterval(rest.timer); rest.on=false; $("#sheet").classList.remove("on"); }
$("#rest-add").onclick=()=>{ if(!rest.on){ startRest(30,$("#sheet-sub").textContent.replace(/^Next: /,"")); return; } rest.end+=30000; rest.total+=30; $("#sheet").classList.remove("finished"); rest.on=true; clearInterval(rest.timer); rest.timer=setInterval(tickRest,200); tickRest(); };
$("#rest-skip").onclick=hideRest;

/* ---------- video ---------- */
/* Clips live in a private Supabase bucket, so they are never on a public web
   address. A signed link is fetched on demand and the file is kept in the
   browser cache afterwards, which is what makes the gym work with no signal.
   If the app is served with a local video folder, that is used instead. */
const clipUrls={};
async function clipUrl(kind,ex){
  const localPath=kind+"/"+ex+(kind==="video"?".mp4":".jpg");
  if((window.SARAH_CONFIG||{}).LOCAL_CLIPS) return localPath;
  /* Anything already on the phone wins, even if a signed link was handed out
     earlier in this session. Otherwise saving the videos and then losing signal
     would still try the network. */
  try{ const c=await caches.open("sarah-video-v1"); if(await c.match(localPath)) return localPath; }catch(e){}
  const k=kind+":"+ex, memo=clipUrls[k];
  if(memo&&memo.exp>Date.now()) return memo.url;
  const sb=Store.sb();
  if(sb&&Store.user){
    try{ const {data,error}=await sb.storage.from((window.SARAH_CONFIG||{}).CLIP_BUCKET||"clips").createSignedUrl(localPath,60*60*6);
      if(!error&&data&&data.signedUrl){ clipUrls[k]={url:data.signedUrl,exp:Date.now()+5*60*60*1000}; return data.signedUrl; } }catch(e){}
  }
  return localPath;
}
async function openVideo(ex){
  if(!ex||!EX[ex]) return;
  $("#modal-title").textContent=EX[ex].name;
  const v=$("#modal-video");
  v.poster=await clipUrl("poster",ex); v.src=await clipUrl("video",ex); v.load(); v.play().catch(()=>{});
  const c=CREDIT[ex]||{};
  $("#modal-credit").innerHTML=c.ch?`Clip by ${esc(c.ch)} on YouTube`+(c.id?` · <a href="https://www.youtube.com/watch?v=${esc(c.id)}" target="_blank" rel="noopener" style="text-decoration:underline">open the original</a>`:""):"";
  $("#modal").classList.add("on"); document.body.style.overflow="hidden";
}
function closeVideo(){ const v=$("#modal-video"); v.pause(); v.removeAttribute("src"); v.load(); $("#modal").classList.remove("on"); document.body.style.overflow=""; }
$("#modal-close").onclick=closeVideo;
$("#modal").addEventListener("click",e=>{ if(e.target.id==="modal") closeVideo(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&$("#modal").classList.contains("on")) closeVideo(); });

/* ---------- progress ---------- */
const weekKey=ts=>{ const d=new Date(ts); const day=(d.getDay()+6)%7; d.setHours(0,0,0,0); d.setDate(d.getDate()-day); return d.getTime(); };
function renderProgress(){
  const s=S(), hist=[...s.sessions].sort((a,b)=>a.ended-b.ended);
  if(!hist.length){ $("#prog-body").innerHTML=`<div class="empty"><b>Nothing to show yet</b>Finish a workout and your progress starts here.</div>`; return; }
  const now=Date.now();
  const thisWeek=hist.filter(h=>weekKey(h.ended)===weekKey(now)).length;
  const totalVol=hist.reduce((a,h)=>a+(h.volume||0),0);
  /* A run of weeks with at least one session. The current week not having started yet
     does not break the run, so it never reads zero on a Monday morning. */
  let streak=0; { const have=new Set(hist.map(h=>weekKey(h.ended))); let k=weekKey(now);
    if(!have.has(k)) k-=604800000;
    while(have.has(k)){ streak++; k-=604800000; } }
  $("#prog-body").innerHTML=`
    <div class="kpis">
      <div class="kpi"><b>${hist.length}</b><span>workouts done</span></div>
      <div class="kpi"><b>${thisWeek} of 3</b><span>this week</span></div>
      <div class="kpi"><b>${streak}</b><span>week${streak===1?"":"s"} in a row</span></div>
      <div class="kpi"><b>${Math.round(totalVol/1000)} t</b><span>lifted in total</span></div>
    </div>
    <div class="chartcard"><h3>Getting stronger</h3><div class="sub">Heaviest set each session</div>
      <select id="ex-pick"></select><div id="ch-strength"></div>
      <button class="link tablebtn" data-table="strength">Show the numbers</button><div id="tb-strength" hidden></div></div>
    <div class="chartcard"><h3>Weight lifted each week</h3><div class="sub">Every set added up, last 12 weeks</div>
      <div id="ch-volume"></div>
      <button class="link tablebtn" data-table="volume">Show the numbers</button><div id="tb-volume" hidden></div></div>
    <div class="chartcard"><h3>Sets per muscle</h3><div class="sub">Last four weeks</div><div id="ch-muscle"></div></div>
    <div class="chartcard"><h3>Turning up</h3><div class="sub">Last 12 weeks. Filled means trained.</div><div id="ch-cal"></div>
      <div class="legend"><span><i></i>Trained</span><span><i style="background:var(--cal-missed)"></i>Training day missed</span><span><i style="background:var(--cal-rest)"></i>Rest day</span></div></div>
    <div class="section"><h2>Recent workouts</h2><div id="prog-hist"></div></div>`;

  /* strength: one exercise at a time, chosen from the ones she has actually logged */
  const logged={}; hist.forEach(h=>h.sets.forEach(b=>{ (logged[b.ex]=logged[b.ex]||[]).push({t:h.ended,sets:b.sets}); }));
  const opts=Object.keys(logged).filter(k=>logged[k].length>=1&&EX[k]).sort((a,b)=>logged[b].length-logged[a].length||EX[a].name.localeCompare(EX[b].name));
  const pick=$("#ex-pick");
  pick.innerHTML=opts.map(k=>`<option value="${k}">${esc(EX[k].name)}</option>`).join("");
  const preferred=opts.find(k=>logged[k].length>1)||opts[0];
  pick.value=preferred;
  function drawStrength(){
    const ex=pick.value, e=EX[ex], bw=!!e.bw;
    const pts=logged[ex].map(r=>{ const best=r.sets.reduce((a,b)=>((bw?b.r:b.w*1000+b.r)>(bw?a.r:a.w*1000+a.r))?b:a,r.sets[0]);
      return {t:r.t,v:bw?best.r:best.w,sub:`${fmtSet(ex,best)} · ${new Date(r.t).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`}; });
    Charts.line($("#ch-strength"),pts,{fmt:v=>bw?(e.timed?v+" s":v+" reps"):v+" kg",aria:"Heaviest set of "+e.name+" over time"});
    const tb=$("#tb-strength"); tb.innerHTML="";
    Charts.table(tb,["Date",bw?(e.timed?"Seconds":"Reps"):"Heaviest set"],pts.map(p=>[new Date(p.t).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"2-digit"}),bw?p.v:p.v+" kg"]));
  }
  pick.onchange=drawStrength; drawStrength();

  /* weekly volume */
  const weeks=[]; const start=weekKey(now)-11*604800000;
  for(let i=0;i<12;i++){ const k=start+i*604800000; const d=new Date(k);
    weeks.push({k,label:"Week of "+d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}),tick:i%3===0?d.getDate()+"/"+(d.getMonth()+1):"",v:0}); }
  hist.forEach(h=>{ const w=weeks.find(x=>x.k===weekKey(h.ended)); if(w) w.v+=h.volume||0; });
  Charts.bars($("#ch-volume"),weeks,{fmt:v=>Math.round(v).toLocaleString()+" kg",axisFmt:v=>v>=1000?Math.round(v/1000)+"k":Math.round(v),aria:"Total weight lifted each week"});
  const tv=$("#tb-volume"); tv.innerHTML=""; Charts.table(tv,["Week starting","Weight lifted"],weeks.filter(w=>w.v>0).map(w=>[w.label.replace("Week of ",""),Math.round(w.v).toLocaleString()+" kg"]));

  /* sets per muscle, last 4 weeks */
  const since=now-28*86400000, byGroup={};
  hist.filter(h=>h.ended>=since).forEach(h=>h.sets.forEach(b=>{ const g=GROUP[b.ex]||"Other"; byGroup[g]=(byGroup[g]||0)+b.sets.length; }));
  const gs=Object.keys(byGroup).map(k=>({label:k,v:byGroup[k]})).sort((a,b)=>b.v-a.v);
  Charts.hbars($("#ch-muscle"),gs,{fmt:v=>v+"",aria:"Working sets per muscle group in the last four weeks"});

  /* consistency */
  const cells=[]; const d0=new Date(); d0.setHours(0,0,0,0); const back=((d0.getDay()+6)%7)+11*7;
  const trained=new Map(); hist.forEach(h=>trained.set(new Date(h.ended).toDateString(),WORKOUTS[wIndex(h.workout)].name));
  for(let i=back;i>=0;i--){ const d=new Date(d0); d.setDate(d.getDate()-i);
    cells.push({label:d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}),trained:trained.has(d.toDateString()),name:trained.get(d.toDateString()),planned:TRAIN_DAYS.includes(d.getDay())&&d<=d0}); }
  Charts.calendar($("#ch-cal"),cells,{});

  $("#prog-hist").innerHTML=[...hist].reverse().slice(0,10).map(h=>{ const w=WORKOUTS[wIndex(h.workout)], d=new Date(h.ended);
    return `<div class="hrow"><div class="h"><b>${esc(w?w.name:h.workout)}</b><span>${d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</span></div>
      <div class="d">${fmtClock(h.dur)} long, ${h.sets.reduce((a,x)=>a+x.sets.length,0)} sets, ${Math.round(h.volume||0).toLocaleString()} kg</div>
      <details><summary>Sets</summary><table class="data">${h.sets.map(x=>`<tr><td>${esc(EX[x.ex]?EX[x.ex].name:x.ex)}</td><td>${x.sets.map(y=>fmtSet(x.ex,y)).join(", ")}</td></tr>`).join("")}</table></details></div>`; }).join("");
  $$("#prog-body .tablebtn").forEach(b=>b.onclick=()=>{ const t=$("#tb-"+b.dataset.table); t.hidden=!t.hidden; b.textContent=t.hidden?"Show the numbers":"Hide the numbers"; });
}
let resizeT=null;
window.addEventListener("resize",()=>{ if(current!=="progress")return; clearTimeout(resizeT); resizeT=setTimeout(renderProgress,250); });

/* ---------- you / account ---------- */
function renderYou(){
  const box=$("#you-body"), u=Store.user, s=S();
  if(!Store.configured()){
    box.innerHTML=`<div class="card"><h3 style="font-size:18px;margin-bottom:6px">Saving on this phone only</h3>
      <p class="small muted">Cloud saving is not set up in this copy, so your workouts live in this browser. They survive closing the app, but not clearing website data.</p></div>`;
  } else if(!u){
    box.innerHTML=`<div class="card"><h3 style="font-size:18px;margin-bottom:6px">Not signed in</h3>
      <p class="small muted">Your workouts are saved on this phone. Sign in and they are backed up, so a new phone picks up exactly where you left off.</p>
      <button class="btn btn-accent btn-block" id="you-signin" style="margin-top:12px">Sign in</button></div>`;
    $("#you-signin").onclick=()=>{ show("auth"); };
  } else {
    const pending=s.sessions.filter(x=>!x.synced).length;
    box.innerHTML=`<div class="card"><h3 style="font-size:18px;margin-bottom:2px">Signed in</h3>
      <p class="small muted">${esc(u.email||"")}</p>
      <p class="small muted" style="margin-top:8px">${pending?`${pending} workout${pending===1?"":"s"} waiting to upload.`:"Everything is backed up."} ${navigator.onLine?"":"You are offline right now, it will go up when you have signal."}</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
        <button class="btn btn-ghost btn-block" id="you-sync">Back up now</button>
        <button class="btn btn-ghost btn-block" id="you-out">Sign out</button>
      </div></div>`;
    $("#you-sync").onclick=async()=>{ await Store.syncNow(); toast(Store.status==="idle"?"Backed up":"Could not reach the server"); renderYou(); };
    $("#you-out").onclick=async()=>{ if(await confirmDlg("Sign out?","Your workouts stay on this phone and upload again next time you sign in.","Sign out")){ await Store.signOut(); renderYou(); } };
  }
  box.innerHTML+=`<div class="card" style="margin-top:12px"><h3 style="font-size:18px;margin-bottom:6px">Videos for the gym</h3>
    <p class="small muted">Save every demo video onto the phone so they play with no signal.</p>
    <button class="btn btn-ghost btn-block" id="you-cache" style="margin-top:12px">Save videos on this phone</button>
    <p class="tiny" id="cache-note" style="margin-top:8px"></p></div>
    <p class="tiny center" style="margin-top:22px"><button class="link" id="you-reset" style="color:var(--ink-3)">Reset the rotation and remembered weights</button></p>`;
  $("#you-cache").onclick=cacheVideos;
  $("#you-reset").onclick=async()=>{ if(await confirmDlg("Reset progress?","The next-workout position and remembered weights are cleared. Finished workouts stay.","Reset")){ Store.reset(); renderHome(); toast("Fresh start"); renderYou(); } };
}
async function cacheVideos(){
  const note=$("#cache-note"), btn=$("#you-cache");
  if(!("caches" in window)){ note.textContent="This browser can't store videos offline."; return; }
  const ids=[...new Set(WORKOUTS.flatMap(w=>[...w.blocks.flatMap(b=>b.ss?b.ss.map(e=>e.ex):[b.ex]),...w.warm.filter(i=>i.ex).map(i=>i.ex)]))];
  btn.disabled=true; let n=0;
  const c=await caches.open("sarah-video-v1");
  for(const ex of ids){
    try{ const u=await clipUrl("video",ex); const res=await fetch(u); if(res.ok) await c.put("video/"+ex+".mp4",res); }catch(e){}
    try{ const p=await clipUrl("poster",ex); const res=await fetch(p); if(res.ok) await c.put("poster/"+ex+".jpg",res); }catch(e){}
    n++; note.textContent=`Saving… ${n} of ${ids.length}`; }
  btn.disabled=false; note.textContent=`All ${ids.length} videos are on this phone.`; toast("Videos saved for offline");
}

/* ---------- auth screen ---------- */
$("#auth-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("#auth-email").value, pw=$("#auth-pw").value;
  const err=$("#auth-err"), btn=$("#auth-submit");
  err.textContent=""; btn.disabled=true; btn.textContent="Signing in…";
  try{ await Store.signIn(email,pw); toast("Signed in"); renderHome(); show("home"); }
  catch(ex){ err.textContent=(ex&&ex.message)||"That didn't work."; }
  btn.disabled=false; btn.textContent="Sign in";
});
$("#auth-skip").onclick=()=>{ renderHome(); show("home"); };

/* ---------- boot ---------- */
(async function boot(){
  await Store.init();
  renderSync();
  if(Store.configured()&&!Store.user&&!S().sessions.length){ show("auth"); }
  else { renderHome(); show("home"); }
  if("serviceWorker" in navigator){ try{ await navigator.serviceWorker.register("sw.js"); }catch(e){} }
})();
})();
