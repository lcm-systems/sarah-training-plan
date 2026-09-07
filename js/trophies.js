/* Trophies are worked out from her finished workouts every time, never stored.
   That means they survive a new phone, and they can never drift out of step
   with the history the way a saved flag would. */
(function(){
"use strict";
const WEEK=604800000;
const weekKey=ts=>{const d=new Date(ts);const day=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-day);return d.getTime();};

const DEFS=[
 {id:"first",  icon:"🌱", name:"First one down",   blurb:"You showed up and finished. That is the hardest part of the whole thing.",
  test:s=>s.count>=1,      have:s=>Math.min(s.count,1), need:1, unit:"workout finished"},
 {id:"week",   icon:"📅", name:"A full week",      blurb:"Three sessions inside one week. That is the plan working exactly as it should.",
  test:s=>s.bestWeek>=3,   have:s=>s.bestWeek,          need:3, unit:"sessions in one week"},
 {id:"stronger",icon:"💪", name:"Stronger already", blurb:"You put more weight on a lift than last time. That is the whole point.",
  test:s=>!!s.strongerAt,  have:s=>s.strongerAt?1:0,    need:1, unit:""},
 {id:"cycle1", icon:"🔁", name:"Full circle",      blurb:"All six workouts done. You have now trained every muscle the plan covers.",
  test:s=>s.cycles>=1,     have:s=>s.cycles?6:s.inCycle, need:6, unit:"of the six workouts"},
 {id:"ten",    icon:"⭐", name:"Ten in the bank",  blurb:"Ten workouts finished. This is starting to look like a habit.",
  test:s=>s.count>=10,     have:s=>s.count,             need:10, unit:"workouts"},
 {id:"month",  icon:"🔥", name:"A month of turning up", blurb:"Four weeks in a row without dropping off. Consistency beats everything.",
  test:s=>s.streak>=4,     have:s=>s.streak,            need:4, unit:"weeks in a row"},
 {id:"t10",    icon:"🏋️", name:"Ten tonnes",       blurb:"Ten thousand kilos lifted, added up over everything you have done.",
  test:s=>s.volume>=10000, have:s=>Math.round(s.volume/1000), need:10, unit:"tonnes"},
 {id:"cycle2", icon:"🌙", name:"Twice round",      blurb:"Two full cycles of the plan, ya amaar.",
  test:s=>s.cycles>=2,     have:s=>s.cycles,            need:2, unit:"cycles"},
 {id:"twentyfive",icon:"🥇",name:"Twenty-five strong", blurb:"Twenty-five workouts. Most people never get this far.",
  test:s=>s.count>=25,     have:s=>s.count,             need:25, unit:"workouts"},
 {id:"cycle4", icon:"👑", name:"Four times round", blurb:"Four full cycles. This is not a phase any more, it is just what you do.",
  test:s=>s.cycles>=4,     have:s=>s.cycles,            need:4, unit:"cycles"},
 {id:"t50",    icon:"🚀", name:"Fifty tonnes",     blurb:"Fifty thousand kilos moved. That is a lot of quiet work.",
  test:s=>s.volume>=50000, have:s=>Math.round(s.volume/1000), need:50, unit:"tonnes"},
 {id:"season", icon:"🌸", name:"A whole season",   blurb:"Twelve weeks in a row. Three months of showing up.",
  test:s=>s.streak>=12,    have:s=>s.streak,            need:12, unit:"weeks in a row"},
 {id:"fifty",  icon:"💎", name:"Fifty club",       blurb:"Fifty workouts finished. Look back at where you started.",
  test:s=>s.count>=50,     have:s=>s.count,             need:50, unit:"workouts"},
 {id:"hundred",icon:"🏆", name:"One hundred",      blurb:"A hundred workouts. Genuinely rare. Be proud of this one.",
  test:s=>s.count>=100,    have:s=>s.count,             need:100, unit:"workouts"}
];

function compute(sessions){
  const sorted=(sessions||[]).slice().sort((a,b)=>a.ended-b.ended);
  const st={count:0,volume:0,perWeek:{},bestWeek:0,streak:0,cycles:0,seen:new Set(),inCycle:0,best:{},strongerAt:null};
  const out=DEFS.map(d=>({id:d.id,icon:d.icon,name:d.name,blurb:d.blurb,need:d.need,unit:d.unit,earned:false,earnedAt:null,have:0}));
  sorted.forEach(s=>{
    st.count++; st.volume+=s.volume||0;
    const wk=weekKey(s.ended);
    st.perWeek[wk]=(st.perWeek[wk]||0)+1;
    st.bestWeek=Math.max(st.bestWeek,st.perWeek[wk]);
    let run=0,k=wk; while(st.perWeek[k]){ run++; k-=WEEK; }
    st.streak=Math.max(st.streak,run);
    st.seen.add(s.workout);
    if(st.seen.size>=6){ st.cycles++; st.seen.clear(); }
    st.inCycle=st.seen.size;
    (s.sets||[]).forEach(b=>{
      const top=Math.max.apply(null,b.sets.map(x=>+x.w||0).concat(0));
      if(st.best[b.ex]!==undefined && top>st.best[b.ex] && !st.strongerAt) st.strongerAt=s.ended;
      st.best[b.ex]=Math.max(st.best[b.ex]||0,top);
    });
    DEFS.forEach((d,i)=>{ if(!out[i].earned && d.test(st)){ out[i].earned=true; out[i].earnedAt=s.ended; } });
  });
  DEFS.forEach((d,i)=>{ out[i].have=Math.min(d.have(st),d.need); });
  return out;
}
window.Trophies={
  all:compute,
  earnedIds:sessions=>compute(sessions).filter(t=>t.earned).map(t=>t.id)
};
})();
