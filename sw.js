/* Offline support. The app shell is cached on install so the gym's dead spots
   never stop a workout; videos are cached the first time they are watched. */
const SHELL="sarah-shell-v13", VIDEO="sarah-video-v1";
const FILES=["./","index.html","manifest.webmanifest","css/app.css","js/config.js","js/supabase.umd.js","js/data.js","js/charts.js","js/trophies.js","js/store.js","js/app.js","fonts/Bricolage-400.ttf","fonts/Bricolage-700.ttf","fonts/Bricolage-800.ttf","icons/icon-180.png","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(SHELL).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k!==VIDEO).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{
  const r=e.request, u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin) return;                 /* Supabase calls go straight to the network */
  if(u.pathname.includes("/video/")||u.pathname.includes("/poster/")){
    e.respondWith(caches.open(VIDEO).then(async c=>{ const hit=await c.match(r,{ignoreVary:true,ignoreSearch:true}); if(hit) return hit;
      try{ const res=await fetch(r); if(res.ok&&res.status===200) c.put(r,res.clone()); return res; }catch(err){ return hit||Response.error(); } }));
    return;
  }
  e.respondWith((async()=>{ try{ const res=await fetch(r); if(res.ok){ const c=await caches.open(SHELL); c.put(r,res.clone()); } return res; }
    catch(err){ const hit=await caches.match(r,{ignoreSearch:true}); return hit||caches.match("index.html"); } })());
});
