/* Small hand-rolled SVG charts. No library, so they work offline and stay fast.
   Every chart is one series, so the heading names it and no legend box is needed.
   Each one ships a hover tooltip and a "Show the numbers" table for accessibility. */
(function(){
"use strict";
const NS="http://www.w3.org/2000/svg";
const el=(n,a)=>{const e=document.createElementNS(NS,n); for(const k in (a||{})) e.setAttribute(k,a[k]); return e;};
const fmtNum=n=>Math.round(n).toLocaleString();
const fmtDay=ts=>{const d=new Date(ts);return d.getDate()+" "+["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];};

function shell(mount){
  mount.innerHTML="";
  const box=document.createElement("div"); box.className="chart";
  const tip=document.createElement("div"); tip.className="tip";
  mount.appendChild(box); box.appendChild(tip);
  return {box,tip};
}
function showTip(box,tip,x,y,html){ tip.innerHTML=html; tip.style.left=x+"px"; tip.style.top=y+"px"; tip.classList.add("on"); }
function hideTip(tip){ tip.classList.remove("on"); }
/* "nice" axis top so the gridlines land on round numbers */
function niceMax(v){ if(v<=0) return 1; const p=Math.pow(10,Math.floor(Math.log10(v))); const f=v/p; const n=f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10; return n*p; }

/* ---- line: a value over time. Points are few and irregular, so dots are shown. ---- */
function line(mount,pts,opts){
  opts=opts||{}; const {box,tip}=shell(mount);
  if(pts.length<2){ box.innerHTML='<p class="tiny" style="padding:18px 0">Two sessions are needed before a trend can be drawn.</p>'; return; }
  const W=box.clientWidth||320, H=opts.height||190, P={t:14,r:14,b:26,l:38};
  const iw=W-P.l-P.r, ih=H-P.t-P.b;
  const vals=pts.map(p=>p.v), lo=Math.min(...vals), hi=Math.max(...vals);
  const pad=(hi-lo)||Math.max(1,hi*0.1); const ymin=Math.max(0,lo-pad*0.35), ymax=hi+pad*0.35;
  const xs=i=>P.l+(pts.length===1?iw/2:iw*i/(pts.length-1));
  const ys=v=>P.t+ih-((v-ymin)/(ymax-ymin||1))*ih;
  const svg=el("svg",{viewBox:`0 0 ${W} ${H}`,role:"img","aria-label":opts.aria||"Trend over time"});
  for(let g=0;g<=3;g++){ const v=ymin+(ymax-ymin)*g/3, y=ys(v);
    svg.appendChild(el("line",{class:"gridline",x1:P.l,x2:W-P.r,y1:y,y2:y}));
    const t=el("text",{class:"axis",x:0,y:y+4}); t.textContent=Math.round(v); svg.appendChild(t); }
  const d=pts.map((p,i)=>(i?"L":"M")+xs(i)+" "+ys(p.v)).join(" ");
  svg.appendChild(el("path",{class:"linepath",d}));
  pts.forEach((p,i)=>svg.appendChild(el("circle",{class:"dot",cx:xs(i),cy:ys(p.v),r:5})));
  [0,pts.length-1].forEach(i=>{ if(pts[i]){ const t=el("text",{class:"axis",x:xs(i),y:H-6,"text-anchor":i?"end":"start"}); t.textContent=fmtDay(pts[i].t); svg.appendChild(t); }});
  const cross=el("line",{class:"cross",y1:P.t,y2:P.t+ih,x1:0,x2:0,opacity:0}); svg.appendChild(cross);
  const hit=el("rect",{class:"hit",x:0,y:0,width:W,height:H}); svg.appendChild(hit);
  function at(ev){
    const r=svg.getBoundingClientRect(); const cx=((ev.touches?ev.touches[0].clientX:ev.clientX)-r.left)*(W/r.width);
    let best=0,bd=1e9; pts.forEach((p,i)=>{const dd=Math.abs(xs(i)-cx); if(dd<bd){bd=dd;best=i;}});
    const p=pts[best]; cross.setAttribute("x1",xs(best)); cross.setAttribute("x2",xs(best)); cross.setAttribute("opacity",1);
    showTip(box,tip,xs(best)*(r.width/W),ys(p.v)*(r.height/H)-4,`${opts.fmt?opts.fmt(p.v):fmtNum(p.v)}<small>${p.sub||fmtDay(p.t)}</small>`);
  }
  ["mousemove","touchstart","touchmove"].forEach(e=>hit.addEventListener(e,at,{passive:true}));
  ["mouseleave","touchend"].forEach(e=>hit.addEventListener(e,()=>{hideTip(tip);cross.setAttribute("opacity",0);}));
  box.appendChild(svg);
}

/* ---- columns: one bar per period. Rounded top, flat bottom on the baseline. ---- */
function bars(mount,items,opts){
  opts=opts||{}; const {box,tip}=shell(mount);
  if(!items.length){ box.innerHTML='<p class="tiny" style="padding:18px 0">Nothing logged yet.</p>'; return; }
  const W=box.clientWidth||320, H=opts.height||180, P={t:12,r:6,b:24,l:38};
  const iw=W-P.l-P.r, ih=H-P.t-P.b;
  const ymax=niceMax(Math.max(...items.map(i=>i.v),1));
  const step=iw/items.length, bw=Math.max(6,Math.min(38,step-4)); /* 4px keeps a 2px surface gap each side */
  const svg=el("svg",{viewBox:`0 0 ${W} ${H}`,role:"img","aria-label":opts.aria||"Totals by period"});
  for(let g=0;g<=2;g++){ const v=ymax*g/2, y=P.t+ih-(v/ymax)*ih;
    svg.appendChild(el("line",{class:"gridline",x1:P.l,x2:W-P.r,y1:y,y2:y}));
    const t=el("text",{class:"axis",x:0,y:y+4}); t.textContent=opts.axisFmt?opts.axisFmt(v):fmtNum(v); svg.appendChild(t); }
  items.forEach((it,i)=>{
    const x=P.l+step*i+(step-bw)/2, h=Math.max(it.v>0?2:0,(it.v/ymax)*ih), y=P.t+ih-h;
    if(h>0) svg.appendChild(el("rect",{class:"mark",x,y,width:bw,height:h,rx:Math.min(4,bw/2)}));
    if(it.tick){ const t=el("text",{class:"axis",x:x+bw/2,y:H-6,"text-anchor":"middle"}); t.textContent=it.tick; svg.appendChild(t); }
    const hit=el("rect",{class:"hit",x:P.l+step*i,y:P.t,width:step,height:ih});
    const r=()=>svg.getBoundingClientRect();
    const enter=()=>{ const b=r(); showTip(box,tip,(x+bw/2)*(b.width/W),(y)*(b.height/H)-2,`${opts.fmt?opts.fmt(it.v):fmtNum(it.v)}<small>${it.label}</small>`); };
    ["mouseenter","touchstart"].forEach(e=>hit.addEventListener(e,enter,{passive:true}));
    ["mouseleave","touchend"].forEach(e=>hit.addEventListener(e,()=>hideTip(tip)));
    svg.appendChild(hit);
  });
  box.appendChild(svg);
}

/* ---- horizontal bars: long category names, value labelled at the end of each bar ---- */
function hbars(mount,items,opts){
  opts=opts||{}; const {box,tip}=shell(mount);
  if(!items.length){ box.innerHTML='<p class="tiny" style="padding:18px 0">Nothing logged yet.</p>'; return; }
  const W=box.clientWidth||320, rowH=30, P={t:4,r:34,l:108,b:4};
  const H=P.t+P.b+items.length*rowH, iw=W-P.l-P.r;
  const vmax=Math.max(...items.map(i=>i.v),1);
  const svg=el("svg",{viewBox:`0 0 ${W} ${H}`,role:"img","aria-label":opts.aria||"Totals by category"});
  items.forEach((it,i)=>{
    const y=P.t+i*rowH, bh=18, w=Math.max(it.v>0?2:0,(it.v/vmax)*iw);
    const lab=el("text",{class:"axis",x:0,y:y+bh/2+4}); lab.textContent=it.label; svg.appendChild(lab);
    if(w>0) svg.appendChild(el("rect",{class:"mark",x:P.l,y,width:w,height:bh,rx:4}));
    const v=el("text",{class:"vlabel",x:P.l+w+6,y:y+bh/2+4}); v.textContent=opts.fmt?opts.fmt(it.v):fmtNum(it.v); svg.appendChild(v);
    const hit=el("rect",{class:"hit",x:0,y,width:W,height:rowH});
    ["mouseenter","touchstart"].forEach(e=>hit.addEventListener(e,()=>{ const b=svg.getBoundingClientRect(); showTip(box,tip,(P.l+w/2)*(b.width/W),(y)*(b.height/H),`${opts.fmt?opts.fmt(it.v):fmtNum(it.v)}<small>${it.label}</small>`); },{passive:true}));
    ["mouseleave","touchend"].forEach(e=>hit.addEventListener(e,()=>hideTip(tip)));
    svg.appendChild(hit);
  });
  box.appendChild(svg);
}

/* ---- consistency: one cell per day, newest column on the right ---- */
function calendar(mount,days,opts){
  opts=opts||{}; const {box,tip}=shell(mount);
  const wrap=document.createElement("div"); wrap.className="cal";
  const weeks=[]; for(let i=0;i<days.length;i+=7) weeks.push(days.slice(i,i+7));
  weeks.forEach(w=>{ const col=document.createElement("div"); col.className="calcol";
    w.forEach(d=>{ const c=document.createElement("div"); c.className="calcell"+(d.trained?" on":(d.planned?" rest":""));
      c.title=`${d.label}: ${d.trained?"trained":(d.planned?"training day, missed":"rest day")}`;
      c.addEventListener("mouseenter",()=>{ const r=c.getBoundingClientRect(), b=box.getBoundingClientRect();
        showTip(box,tip,r.left-b.left+r.width/2,r.top-b.top,`${d.trained?(d.name||"Trained"):(d.planned?"Missed":"Rest day")}<small>${d.label}</small>`); });
      c.addEventListener("mouseleave",()=>hideTip(tip));
      col.appendChild(c); });
    wrap.appendChild(col); });
  box.appendChild(wrap);
  wrap.scrollLeft=wrap.scrollWidth;
}

function table(mount,cols,rows){
  const t=document.createElement("table"); t.className="data";
  t.innerHTML="<thead><tr>"+cols.map(c=>`<th>${c}</th>`).join("")+"</tr></thead><tbody>"+
    rows.map(r=>"<tr>"+r.map(c=>`<td>${c}</td>`).join("")+"</tr>").join("")+"</tbody>";
  mount.appendChild(t);
}
window.Charts={line,bars,hbars,calendar,table};
})();
