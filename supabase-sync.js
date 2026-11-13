(function(){
'use strict';
const cfg=window.WALID_SUPABASE_CONFIG||{};
if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/.test(cfg.url||'')||!cfg.anonKey||!window.supabase)return;
const client=window.supabase.createClient(cfg.url,cfg.anonKey);
const map=p=>({id:p.id,title:p.title,start:p.start_date,end:p.end_date,airline:p.airline||'',route:p.route||'',hotel:p.hotel||'',description:p.description||'',image_url:p.image_url||'',price:p.price_tnd==null?null:Number(p.price_tnd),tag:p.tag||'عمرة',published_at:p.published_at||null});
let refreshing=false;
async function refresh(){
 if(refreshing)return;refreshing=true;
 try{
  // published_at is added by supabase/reminder-settings.sql.
  // Backward compatible fallback while SQL migration is awaiting execution.
  let result=await client.from('omra_programs').select('id,title,start_date,end_date,airline,route,hotel,description,image_url,price_tnd,tag,published_at').eq('is_published',true).order('start_date').limit(200);
  let hasPublicationColumn=true;
  if(result.error&&(/published_at|PGRST204|42703|schema cache/i.test(result.error.message+' '+result.error.code))){
   hasPublicationColumn=false;
   result=await client.from('omra_programs').select('id,title,start_date,end_date,airline,route,hotel,description,image_url,price_tnd,tag').eq('is_published',true).order('start_date').limit(200);
  }
  if(result.error)throw result.error;
  const trips=(result.data||[]).map(map);
  window.__omraBackendTrips=trips;
  // Only name something "latest published" if we have genuine publication timestamps.
  const dated=trips.filter(t=>t.published_at).sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
  window.WVLatestPublished=hasPublicationColumn&&dated.length?dated[0]:null;
  window.WVProgramSourceConnected=true;
  try{localStorage.setItem('wv-db-trips',JSON.stringify({at:Date.now(),trips}))}catch{}
  state.content={...(state.content||read('content',{ticker:[],slides:[],programs:[]})),programs:trips};
  render();
  if(window.WVSchedule)window.WVSchedule.onTrips(trips);
 }catch(error){
  console.warn('Omra programs sync unavailable:',error.message);
  if(!window.__omraBackendTrips)try{
   const cache=JSON.parse(localStorage.getItem('wv-db-trips')||'null');
   if(cache&&Array.isArray(cache.trips)){
    window.__omraBackendTrips=cache.trips;
    state.content={...(state.content||read('content',{ticker:[],slides:[],programs:[]})),programs:cache.trips};
    render();
   }
  }catch{}
 }finally{refreshing=false}
}
async function settings(){
 try{
  const {data,error}=await client.from('omra_reminder_settings').select('*').eq('id',1).maybeSingle();
  if(error)throw error;
  if(data&&window.WVSchedule)window.WVSchedule.configure(data);
 }catch(e){console.info('Using built-in reminder timetable until reminder-settings.sql is installed.')}
}
refresh();settings();
window.addEventListener('pageshow',()=>{refresh();settings()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();settings()}});
setInterval(()=>{if(!document.hidden){refresh();settings()}},60000);
})();
