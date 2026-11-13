(function(){
 "use strict";
 const c=window.WALID_SUPABASE_CONFIG||{};
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/.test(c.url||'')||!c.anonKey||!window.supabase)return;
 const db=window.supabase.createClient(c.url,c.anonKey);
 const map=x=>({id:x.id,title:x.title,start:x.start_date,end:x.end_date,airline:x.airline,route:x.route,hotel:x.hotel,description:x.description,image_url:x.image_url,price:x.price_tnd==null?null:Number(x.price_tnd),tag:x.tag});
 async function refresh(){
  try{
   const {data,error}=await db.from('omra_programs').select('id,title,start_date,end_date,airline,route,hotel,description,image_url,price_tnd,tag').eq('is_published',true).order('start_date').limit(200);
   if(error)throw error;
   const trips=(data||[]).map(map);window.__omraBackendTrips=trips;
   try{localStorage.setItem('wv-db-trips',JSON.stringify({at:Date.now(),trips}))}catch{}
   state.content={...(state.content||read('content',{ticker:[],slides:[],programs:[]})),programs:trips};render();
  }catch(e){console.warn('Omra sync unavailable:',e.message);if(window.__omraBackendTrips)return;
   try{const x=JSON.parse(localStorage.getItem('wv-db-trips')||'null');if(x&&Array.isArray(x.trips)){window.__omraBackendTrips=x.trips;state.content={...(state.content||read('content',{ticker:[],slides:[],programs:[]})),programs:x.trips};render()}}catch{}
  }
 }
 refresh();window.addEventListener('pageshow',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 setInterval(()=>{if(!document.hidden)refresh()},60000);
})();
