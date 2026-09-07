/* State, saving, and syncing.
   The phone is always the working copy: every tap writes to localStorage first, so the
   app keeps working with no signal. Supabase is the safety net that survives a lost
   phone, a cleared browser, or a new device. */
(function(){
"use strict";
const KEY="sarah_v2", LEGACY="sarah_training_v1";
const cfg=window.SARAH_CONFIG||{};
const uuid=()=> (crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==="x"?r:(r&0x3|0x8)).toString(16);}));

function defaults(){ return {v:2,rev:0,cycle:0,session:null,last:{},sessions:[],stateDirty:false}; }
let S=defaults(), sb=null, user=null, listeners=[], status="local", pulling=false;

/* ---------- local ---------- */
function loadLocal(){
  try{ const j=localStorage.getItem(KEY); if(j){ S=Object.assign(defaults(),JSON.parse(j)); return; } }catch(e){}
  try{ /* carry over anything the older single-file version had */
    const j=localStorage.getItem(LEGACY); if(j){ const o=JSON.parse(j); S=Object.assign(defaults(),{cycle:o.cycle||0,last:o.last||{},session:o.session||null}); }
  }catch(e){}
}
function persist(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
function emit(){ listeners.forEach(f=>{ try{ f(); }catch(e){} }); }
function setStatus(s){ status=s; emit(); }

function save(opts){
  S.rev=(S.rev||0)+1; S.stateDirty=true; persist();
  if(!(opts&&opts.quiet)) emit();
  scheduleSync();
}

/* ---------- supabase ---------- */
function ready(){ return !!(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&window.supabase); }
function client(){
  if(sb||!ready()) return sb;
  sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:"sarah_auth"}});
  return sb;
}
async function initAuth(){
  if(!client()){ setStatus("local"); return null; }
  try{
    const {data}=await sb.auth.getSession();
    user=data&&data.session?data.session.user:null;
    sb.auth.onAuthStateChange((_e,s)=>{ user=s?s.user:null; emit(); if(user) syncNow(); });
  }catch(e){ user=null; }
  setStatus(user?"idle":"signedout");
  return user;
}
async function signIn(email,password){ if(!client()) throw new Error("Cloud saving is not set up yet."); const {data,error}=await sb.auth.signInWithPassword({email:email.trim(),password}); if(error) throw error; user=data.user; await syncNow(); return user; }
async function signUp(email,password){ if(!client()) throw new Error("Cloud saving is not set up yet."); const {data,error}=await sb.auth.signUp({email:email.trim(),password}); if(error) throw error; user=data.user; if(user) await syncNow(); return user; }
async function signOut(){ if(sb) await sb.auth.signOut(); user=null; setStatus("signedout"); }

/* ---------- sync ---------- */
let syncTimer=null, syncing=false, again=false;
function scheduleSync(){ if(!user) return; clearTimeout(syncTimer); syncTimer=setTimeout(syncNow,1200); }
async function syncNow(){
  if(!user||!sb){ return; }
  if(syncing){ again=true; return; }
  if(!navigator.onLine){ setStatus("offline"); return; }
  syncing=true; setStatus("busy");
  try{
    await push();
    await pull();
    setStatus("idle");
  }catch(e){ console.warn("sync",e); setStatus(navigator.onLine?"error":"offline"); }
  syncing=false;
  if(again){ again=false; scheduleSync(); }
}
async function push(){
  const pending=S.sessions.filter(s=>!s.synced);
  for(const s of pending){
    const {error}=await sb.from("sessions").upsert({id:s.id,user_id:user.id,workout_id:s.workout,started_at:new Date(s.started).toISOString(),ended_at:new Date(s.ended).toISOString(),duration_s:s.dur,volume_kg:s.volume,set_count:(s.sets||[]).reduce((a,x)=>a+x.sets.length,0)});
    if(error) throw error;
    const rows=[];
    (s.sets||[]).forEach(block=>block.sets.forEach((x,i)=>rows.push({id:uuid(),session_id:s.id,user_id:user.id,exercise_id:block.ex,set_index:i,weight_kg:x.w||null,reps:x.r||null,seconds:x.s||null,performed_at:new Date(s.ended).toISOString()})));
    if(rows.length){ await sb.from("set_logs").delete().eq("session_id",s.id); const r2=await sb.from("set_logs").insert(rows); if(r2.error) throw r2.error; }
    s.synced=true; persist();
  }
  if(S.stateDirty){
    const {error}=await sb.from("app_state").upsert({user_id:user.id,cycle:S.cycle,active_session:S.session,last_weights:S.last,updated_at:new Date().toISOString()});
    if(error) throw error;
    S.stateDirty=false; persist();
  }
}
async function pull(){
  pulling=true;
  const {data:rows,error}=await sb.from("sessions").select("id,workout_id,started_at,ended_at,duration_s,volume_kg").order("started_at",{ascending:true});
  if(error) throw error;
  const {data:logs,error:e2}=await sb.from("set_logs").select("session_id,exercise_id,set_index,weight_kg,reps,seconds");
  if(e2) throw e2;
  const bySession={};
  (logs||[]).forEach(l=>{ (bySession[l.session_id]=bySession[l.session_id]||[]).push(l); });
  const remote=(rows||[]).map(r=>{
    const grouped={};
    (bySession[r.id]||[]).sort((a,b)=>a.set_index-b.set_index).forEach(l=>{ (grouped[l.exercise_id]=grouped[l.exercise_id]||[]).push({w:l.weight_kg==null?0:+l.weight_kg,r:l.reps==null?0:+l.reps,s:l.seconds==null?undefined:+l.seconds}); });
    return {id:r.id,workout:r.workout_id,started:Date.parse(r.started_at),ended:Date.parse(r.ended_at),dur:r.duration_s,volume:+r.volume_kg,sets:Object.keys(grouped).map(ex=>({ex,sets:grouped[ex]})),synced:true};
  });
  const localOnly=S.sessions.filter(s=>!s.synced);
  const ids=new Set(remote.map(r=>r.id));
  S.sessions=remote.concat(localOnly.filter(s=>!ids.has(s.id))).sort((a,b)=>a.ended-b.ended);
  if(!S.stateDirty){
    const {data:st}=await sb.from("app_state").select("cycle,active_session,last_weights").eq("user_id",user.id).maybeSingle();
    if(st){ S.cycle=st.cycle||0; if(!S.session&&st.active_session) S.session=st.active_session; S.last=Object.assign({},st.last_weights||{},S.last); }
  }
  persist(); pulling=false; emit();
}

window.addEventListener("online",()=>{ if(user) syncNow(); else emit(); });
window.addEventListener("offline",()=>setStatus("offline"));
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"&&user) syncNow(); });

window.Store={
  get s(){ return S; },
  get user(){ return user; },
  get status(){ return status; },
  configured:()=>ready(), sb:()=>client(),
  uuid, save, persist,
  onChange:f=>listeners.push(f),
  init:async()=>{ loadLocal(); await initAuth(); if(user) syncNow(); return S; },
  signIn, signUp, signOut, syncNow,
  reset:()=>{ const keep=S.sessions; S=Object.assign(defaults(),{sessions:keep}); save(); }
};
})();
