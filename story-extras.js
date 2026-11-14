/* Walid Voyages: opt-in family memories, private photos, one-time location check-ins. */
(function(){
'use strict';
const cfg=window.WALID_SUPABASE_CONFIG||{};
if(!window.supabase||!cfg.url||!cfg.anonKey)return;
const sb=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{storageKey:'wv-client-auth'}});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user=null,owner=null,viewer=null,stops=[],shared=[],viewers=[],photos=[],urls={},ready=false,loading=false,busy=false,warning='',notice='',issued='',selected='',rev=0;
const isMissing=e=>/PGRST205|PGRST202|schema cache|Could not find the (table|function)/i.test(e?.message||'');
const locationUrl=s=>'https://www.google.com/maps?q='+encodeURIComponent(s.latitude+','+s.longitude);
const stamp=d=>d?new Date(d).toLocaleString('fr-TN'):'';
const notify=(text,bad=false)=>{warning=bad?text:'';notice=bad?'':text;update()};
function update(){if(window.WVStory?.refreshView)window.WVStory.refreshView()}
const alert=()=>warning?'<p class="story-feedback bad" role="alert">'+esc(warning)+'</p>':notice?'<p class="story-feedback good" role="status">'+esc(notice)+'</p>':'';
function album(id){
 const pics=photos.filter(p=>p.stop_id===id);
 return pics.length?'<div class="story-extra-photos">'+pics.map(p=>'<div class="story-extra-photo">'+(urls[p.id]?'<img loading="lazy" alt="صورة ذكرى" src="'+esc(urls[p.id])+'">':'<span>📷</span>')+(owner?'<button type="button" data-extra-delete="'+esc(p.id)+'" aria-label="حذف الصورة">×</button>':'')+'</div>').join('')+'</div>':'';
}
async function readPhotos(inviteId){
 const p=await sb.from('omra_story_photos').select('id,stop_id,storage_path,caption').eq('invite_id',inviteId).order('created_at',{ascending:false}).limit(120);
 if(p.error)throw p.error;photos=p.data||[];
 const signed=await Promise.all(photos.map(async p=>{
  const r=await sb.storage.from('wv-omra-private').createSignedUrl(p.storage_path,900);
  return [p.id,r.data?.signedUrl||''];
 }));
 urls=Object.fromEntries(signed.filter(x=>x[1]));
}
async function reload(){
 if(loading)return;
 loading=true;ready=false;warning='';owner=null;viewer=null;stops=[];shared=[];viewers=[];photos=[];urls={};
 try{
  const a=await sb.auth.getUser();user=a.data?.user||null;
  if(!user){ready=true;return}
  const own=await sb.from('omra_story_invites').select('id,customer_name,program_id').eq('linked_user_id',user.id).is('revoked_at',null).limit(1);
  if(own.error)throw own.error;
  owner=own.data?.[0]||null;
  if(owner){
   const [s,v]=await Promise.all([
    sb.from('omra_story_stops').select('id,stop_key,title,sequence,visited_at,note,share_with_family,latitude,longitude,location_accuracy_m,location_shared_at').eq('invite_id',owner.id).order('sequence'),
    sb.from('omra_family_viewers').select('viewer_user_id,revoked_at').eq('invite_id',owner.id)
   ]);
   if(s.error)throw s.error;if(v.error)throw v.error;
   stops=s.data||[];viewers=v.data||[];await readPhotos(owner.id);
   if(!selected||!stops.some(s=>s.id===selected))selected=stops[0]?.id||'';
  }else{
   const grants=await sb.from('omra_family_viewers').select('invite_id').eq('viewer_user_id',user.id).is('revoked_at',null).limit(1);
   if(grants.error)throw grants.error;
   const id=grants.data?.[0]?.invite_id;
   if(id){
    const [i,s]=await Promise.all([
     sb.from('omra_story_invites').select('id,customer_name,omra_programs(title,start_date,end_date)').eq('id',id).maybeSingle(),
     sb.from('omra_story_stops').select('id,title,visited_at,note,latitude,longitude,location_accuracy_m,location_shared_at').eq('invite_id',id).order('sequence')
    ]);
    if(i.error)throw i.error;if(s.error)throw s.error;
    viewer=i.data;shared=s.data||[];
    if(viewer)await readPhotos(id);
   }
  }
  ready=true;
 }catch(e){warning=isMissing(e)?'خاصية مشاركة الذكريات تحتاج تفعيل ملف SQL الجديد في Supabase.':'تعذّر تحميل الذكريات: '+String(e.message||e).slice(0,120)}
 finally{loading=false;rev++;update()}
}
function render(){
 if(!user)return '';
 if(warning&&!owner&&!viewer)return '<section class="card story-extra-panel">'+alert()+'</section>';
 if(!ready)return '';
 if(viewer&&!owner){
  return '<section class="story-extra-panel card"><h2>👨‍👩‍👧 ذكريات من العائلة</h2><p>رحلة '+esc(viewer.customer_name)+' · '+esc(viewer.omra_programs?.title||'العمرة')+'</p><p class="story-extra-hint">المعتمر يختار شنوّة تشوف. الموقع موش مباشر ويظهر كان وقت يضغط هو على المشاركة.</p>'+alert()+
  (shared.length?shared.map(s=>'<article class="story-extra-feed"><h3>📍 '+esc(s.title)+'</h3>'+(s.visited_at?'<small>الزيارة: '+esc(stamp(s.visited_at))+'</small>':'')+(s.note?'<p>'+esc(s.note)+'</p>':'')+(s.latitude!=null?'<a href="'+esc(locationUrl(s))+'" target="_blank" rel="noopener noreferrer">🗺️ شوف الموقع على الخريطة</a><small>مشاركة اختيارية بتاريخ '+esc(stamp(s.location_shared_at))+' · دقّة تقريبية '+Math.round(s.location_accuracy_m||0)+' متر</small>':'')+album(s.id)+'</article>').join(''):'<p>ما فماش محطات مشتركة حتى توّا.</p>')+'</section>';
 }
 if(!owner){
  return '<section class="story-extra-panel card"><h2>👨‍👩‍👧 متابعة عمرة أحد أفراد العائلة</h2><p>إذا واحد من عايلتك بعثلك كود متابعة FM، أدخلو بحسابك الخاص. ما تنجمش تعدّل ذكرياتو.</p>'+alert()+
   '<form id="extra-claim" class="story-extra-form"><input dir="ltr" name="code" required placeholder="FM-XXXX-XXXX-XXXX-XXXX-XXXX"><button class="btn lime" type="submit">متابعة عمرة عائلتي</button></form></section>';
 }
 const chosen=stops.find(x=>x.id===selected);
 return '<section class="story-extra-panel card"><h2>📸 صور ومواقع ذكريات عمرتي</h2><p class="story-extra-hint">أوّل حاجة، إضغط على محطة من المخطّط وسجّل الزيارة أو ذكرى، وبعد اختارها هنا لإضافة صور أو مشاركة المكان. الموقع يتسجّل كان بموافقتك.</p>'+alert()+
 (stops.length?'<label>المحطة اللي تحب تضيفلها ذكريات</label><select id="extra-stop-select">'+stops.map(s=>'<option value="'+esc(s.id)+'" '+(s.id===selected?'selected':'')+'>'+esc(s.title)+'</option>').join('')+'</select>'+
 (chosen?'<div class="story-extra-selected"><strong>📍 '+esc(chosen.title)+'</strong><label class="story-extra-toggle"><input type="checkbox" id="extra-share" '+(chosen.share_with_family?'checked':'')+'> نسمح لعائلتي تشوف هالمحطة والصور والموقع المسجّل فيها</label><label class="story-extra-upload">📸 اختار صور من تليفونك<input type="file" id="extra-upload" accept="image/jpeg,image/png,image/webp" multiple></label><button type="button" class="btn light" data-extra-action="location">📍 سجّل موقعي الحالي في هالمحطة</button>'+(chosen.latitude!=null?'<a href="'+esc(locationUrl(chosen))+'" target="_blank" rel="noopener noreferrer">🗺️ شوف المكان على Google Maps</a><button type="button" class="btn light" data-extra-action="share-location">📤 مشاركة موقع هالمحطة عبر الهاتف / WhatsApp</button><small>الموقع اللي سجلتو · دقّة تقريبية '+Math.round(chosen.location_accuracy_m||0)+' متر</small><button class="btn light" type="button" data-extra-action="clear-location">حذف الموقع المسجّل</button>':'')+album(chosen.id)+'</div>':''):'<p>سجّل أوّل زيارة في مخطّط العمرة، باش تظهر المحطات هنا.</p>')+
 '</section><section class="story-extra-panel card"><h2>👨‍👩‍👧 مشاركة خاصة مع عائلتي</h2><p>تنجم تعطي كل فرد من العائلة كود متابعة مستقل؛ كل واحد يعمل حساب خاص. تظهرلهم كان المحطات اللي تسمح بمشاركتها. تنجم تلغي وصولهم وقت تحب.</p><button type="button" class="btn lime" data-extra-action="issue">إنشاء كود متابعة خاص</button>'+(issued?'<strong class="story-extra-code" dir="ltr">'+esc(issued)+'</strong><button type="button" class="btn light" data-extra-action="copy">نسخ الكود</button><small>كود واحد لكل فرد، صالح 14 يوم، يستعمل مرّة واحدة.</small>':'')+
 viewers.filter(v=>!v.revoked_at).map(v=>'<div class="story-extra-viewer"><span>حساب عائلي ···'+esc(v.viewer_user_id.slice(-6))+'</span><button class="btn light" type="button" data-extra-revoke="'+esc(v.viewer_user_id)+'">إلغاء المتابعة</button></div>').join('')+'</section>';
}
async function call(action){
 if(!user||busy)return;busy=true;warning='';notice='';
 try{
  if(action==='issue'){
   const r=await sb.rpc('omra_issue_family_code',{p_invite_id:owner.id});
   if(r.error)throw r.error;issued=r.data;notify('هذا كود سري، ابعثه وحده للشخص اللي تحبّو يتابع الرحلة.');
  }else if(action==='copy'){
   if(!issued)throw Error('ما فماش كود');await navigator.clipboard.writeText(issued);notify('تنسخ الكود ✅');
  }else if(action==='location'){
   if(!chosenStop())throw Error('اختار محطة أوّل');
   if(!navigator.geolocation)throw Error('الـGPS موش متاح؛ لازم HTTPS وتسمح للموقع من المتصفح.');
   if(!confirm('تحب تسجّل موقعك الحالي في المحطة؟ يظهر للعائلة فقط إذا سمحت بمشاركة المحطة. الموقع موش تتبّع متواصل.'))return;
   const pos=await new Promise((yes,no)=>navigator.geolocation.getCurrentPosition(yes,no,{enableHighAccuracy:true,timeout:18000,maximumAge:0}));
   const p=pos.coords;
   const r=await sb.from('omra_story_stops').update({latitude:p.latitude,longitude:p.longitude,location_accuracy_m:p.accuracy,location_shared_at:new Date(pos.timestamp).toISOString()}).eq('id',selected).eq('owner_id',user.id);
   if(r.error)throw r.error;await reload();notify('تسجّل موقعك الحالي ✅ (دقّة تقريبية: '+Math.round(p.accuracy)+' متر).');
  }else if(action==='share-location'){
   const s=chosenStop();if(!s||s.latitude==null)throw Error('سجّل موقعك أوّل');
   const text='أنا في محطة '+s.title+' من عمرتي 🕋\nالموقع اللي سجلتو: '+locationUrl(s);
   if(!confirm('تحب تشارك موقع هالمحطة مع شخص تختارو؟ هذا موقع مسجّل، موش بث مباشر.'))return;
   if(navigator.share){await navigator.share({title:'موقع من عمرتي',text,url:locationUrl(s)})}
   else{await navigator.clipboard.writeText(text);notify('تنسخ رابط الموقع. تنجم تبعثه عبر WhatsApp ✅')}
  }else if(action==='clear-location'){
   if(!confirm('تحب تحذف موقع هالمحطة؟'))return;
   const r=await sb.from('omra_story_stops').update({latitude:null,longitude:null,location_accuracy_m:null,location_shared_at:null}).eq('id',selected).eq('owner_id',user.id);
   if(r.error)throw r.error;await reload();notify('تحذف الموقع ✅');
  }
 }catch(e){notify('ما كملتش العملية: '+String(e.message||e).slice(0,160),true)}
 finally{busy=false}
}
const chosenStop=()=>stops.find(s=>s.id===selected);
async function changeShare(value){
 const s=chosenStop();if(!s||busy)return;
 busy=true;
 try{
  const r=await sb.from('omra_story_stops').update({share_with_family:value}).eq('id',s.id).eq('owner_id',user.id);
  if(r.error)throw r.error;await reload();notify(value?'تسمحت مشاركة هالمحطة مع العائلة ✅':'توقفت مشاركة هالمحطة ✅');
 }catch(e){notify(String(e.message||e),true)}
 finally{busy=false}
}
async function upload(files){
 const s=chosenStop();if(!s||busy||!files?.length)return;
 busy=true;let saved=0;
 try{
  for(const file of [...files].slice(0,5)){
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>6*1024*1024)throw Error('نقبل JPG / PNG / WEBP وأقل من 6 ميغا للصورة.');
   const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
   const path=user.id+'/'+owner.id+'/'+crypto.randomUUID()+'.'+ext;
   const up=await sb.storage.from('wv-omra-private').upload(path,file,{contentType:file.type,upsert:false});
   if(up.error)throw up.error;
   const ins=await sb.from('omra_story_photos').insert({invite_id:owner.id,stop_id:s.id,owner_id:user.id,storage_path:path});
   if(ins.error){await sb.storage.from('wv-omra-private').remove([path]);throw ins.error}
   saved++;
  }
  await reload();notify('تزادوا '+saved+' صور ✅');
 }catch(e){await reload();notify('تزادوا '+saved+' صور. المشكلة: '+String(e.message||e).slice(0,140),true)}
 finally{busy=false}
}
async function removePhoto(id){
 const p=photos.find(p=>p.id===id);
 if(!p||!owner||busy||!confirm('تحب تحذف الصورة نهائياً؟'))return;
 busy=true;
 try{
  const del=await sb.from('omra_story_photos').delete().eq('id',id).eq('owner_id',user.id);
  if(del.error)throw del.error;
  const rm=await sb.storage.from('wv-omra-private').remove([p.storage_path]);
  if(rm.error)throw rm.error;
  await reload();notify('تحذفت الصورة ✅');
 }catch(e){notify(String(e.message||e),true)}
 finally{busy=false}
}
async function revoke(uid){
 if(!owner||busy||!confirm('تلغي متابعة هالحساب؟'))return;
 busy=true;
 try{
  const r=await sb.rpc('omra_revoke_family_viewer',{p_invite_id:owner.id,p_viewer_user_id:uid});
  if(r.error)throw r.error;await reload();notify('تلغت صلاحية المتابعة ✅');
 }catch(e){notify(String(e.message||e),true)}
 finally{busy=false}
}
async function claim(e){
 e.preventDefault();if(!user||busy)return;
 const code=String(new FormData(e.target).get('code')||'').trim();
 if(!/^fm[0-9a-f]{20}$/i.test(code.replace(/[\s-]/g,''))){notify('كود المتابعة لازم يبدأ بـ FM.',true);return}
 busy=true;
 try{
  const r=await sb.rpc('omra_claim_family_code',{p_code:code});
  if(r.error)throw r.error;await reload();notify('تربط حساب العائلة ✅');
 }catch(e){notify(String(e.message||e).slice(0,170),true)}
 finally{busy=false}
}
document.addEventListener('submit',e=>{if(e.target.id==='extra-claim')claim(e)});
document.addEventListener('change',e=>{
 if(e.target.id==='extra-stop-select'){selected=e.target.value;update()}
 if(e.target.id==='extra-share')changeShare(e.target.checked);
 if(e.target.id==='extra-upload')upload(e.target.files);
});
document.addEventListener('click',e=>{
 const action=e.target.closest('[data-extra-action]');
 if(action){call(action.dataset.extraAction);return}
 const del=e.target.closest('[data-extra-delete]');
 if(del){removePhoto(del.dataset.extraDelete);return}
 const rv=e.target.closest('[data-extra-revoke]');
 if(rv)revoke(rv.dataset.extraRevoke);
});
sb.auth.onAuthStateChange(()=>{Promise.resolve().then(reload)});
window.WVStoryExtras={render,reload};
reload();
})();