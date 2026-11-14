/* Walid Voyages – family following with no registration or email confirmation.
   Supabase anonymous Auth is a hidden guest session, not a public database. */
(function(){
'use strict';
const cfg=window.WALID_SUPABASE_CONFIG||{};
if(!window.supabase||!cfg.url||!cfg.anonKey)return;
const db=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{storageKey:'wv-family-guest-v1',autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let guest=null,invite=null,stops=[],photos=[],imageUrls={},avatarUrl='',busy=false,error='',notice='',loaded=false;
const dateText=d=>d?new Date(d).toLocaleDateString('fr-TN'):'';
const mapUrl=s=>'https://www.google.com/maps?q='+encodeURIComponent(s.latitude+','+s.longitude);
function update(){if(window.state?.tab==='more'&&window.state.page==='follow')window.render?.()}
function pageHtml(){
 const title='<section class="card ff-header"><div class="ff-symbol">👨‍👩‍👧</div><h2>تابع معتمر من عايلتك</h2><p>بكود المتابعة برك، من غير Email، من غير Mot de passe ومن غير تأكيد حساب.</p></section>';
 const feedback=error?'<p class="story-feedback bad" role="alert">'+esc(error)+'</p>':notice?'<p class="story-feedback good" role="status">'+esc(notice)+'</p>':'';
 if(!loaded)return title+'<section class="card ff-panel"><p>جاري تحميل المتابعة الخاصة…</p></section>';
 if(!invite)return title+'<section class="card ff-panel">'+feedback+
  '<form id="ff-code-form" class="ff-form"><label for="ff-code">🔑 كود المعتمر اللي بعثهولك</label><input id="ff-code" name="code" dir="ltr" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="FM-XXXX-XXXX-XXXX-XXXX-XXXX" required minlength="22" maxlength="32"><button type="submit" class="btn lime full" '+(busy?'disabled':'')+'>📍 تابع المعتمر مباشرة</button></form><p class="ff-note">المتابعة خاصّة. تنجم ترجع لنفس الصفحة من نفس المتصفح من غير ما تعاود تدخل الكود، مادام الدخول صالح.</p></section>';
 return title+'<section class="card ff-person"><div class="ff-person-head">'+(avatarUrl?'<img class="ff-avatar" src="'+esc(avatarUrl)+'" alt="صورة المعتمر">':'<span class="ff-avatar-placeholder">👤</span>')+'<div><small>🕋 عمرة العائلة</small><h3>'+esc(invite.customer_name)+'</h3><p>'+esc(invite.omra_programs?.title||'رحلة العمرة')+'</p></div></div><p class="ff-note">تظهر كان الصور والمواقع والمحطات اللي اختار المعتمر يشاركها. الموقع المسجّل موش GPS مباشر.</p>'+feedback+'<button type="button" class="btn light" data-ff-action="refresh">تحديث الذكريات</button></section>'+
 '<section class="ff-timeline">'+(stops.length?stops.map(s=>'<article class="card ff-stop"><h3>📍 '+esc(s.title)+'</h3>'+(s.visited_at?'<small>✓ زار المحطة بتاريخ '+dateText(s.visited_at)+'</small>':'')+(s.note?'<p>'+esc(s.note)+'</p>':'')+(s.latitude!=null?'<a class="ff-map" target="_blank" rel="noopener noreferrer" href="'+esc(mapUrl(s))+'">🗺️ شوف المكان على Google Maps</a><small>الموقع متسجّل وقت الزيارة'+(s.location_accuracy_m!=null?'، دقّته تقريباً '+Math.round(s.location_accuracy_m)+' متر':'')+'</small>':'')+album(s.id)+'</article>').join(''):'<section class="card ff-panel"><p>المعتمر ما شارك حتى محطة إلى حد توّا.</p></section>')+'</section>';
}
function album(id){
 const matches=photos.filter(p=>p.stop_id===id);
 return matches.length?'<div class="ff-gallery">'+matches.map(p=>imageUrls[p.id]?'<img src="'+esc(imageUrls[p.id])+'" alt="ذكرى من العمرة" loading="lazy">':'').join('')+'</div>':'';
}
async function refresh(){
 if(busy)return;
 const res=await db.auth.getSession();
 guest=res.data?.session?.user||null;
 if(!guest){invite=null;stops=[];loaded=true;update();return}
 const grant=await db.from('omra_family_viewers').select('invite_id').eq('viewer_user_id',guest.id).is('revoked_at',null).limit(1);
 if(grant.error){invite=null;error='المتابعة تحتاج تفعيل إعدادات Supabase الخاصة بالعائلة.';loaded=true;update();return}
 const id=grant.data?.[0]?.invite_id;
 if(!id){invite=null;stops=[];photos=[];imageUrls={};avatarUrl='';loaded=true;update();return}
 try{
  const [i,s,p]=await Promise.all([
   db.from('omra_story_invites').select('id,customer_name,avatar_path,omra_programs(title,start_date,end_date)').eq('id',id).maybeSingle(),
   db.from('omra_story_stops').select('id,title,visited_at,note,latitude,longitude,location_accuracy_m,location_shared_at').eq('invite_id',id).order('sequence').limit(150),
   db.from('omra_story_photos').select('id,stop_id,storage_path').eq('invite_id',id).limit(120)
  ]);
  if(i.error)throw i.error;if(s.error)throw s.error;if(p.error)throw p.error;
  invite=i.data;stops=s.data||[];photos=p.data||[];
  if(!invite)throw Error('انتهت صلاحية المتابعة');
  const result=await Promise.all(photos.map(async row=>{
   const url=await db.storage.from('wv-omra-private').createSignedUrl(row.storage_path,600);
   return[row.id,url.data?.signedUrl||''];
  }));
  imageUrls=Object.fromEntries(result.filter(x=>x[1]));
  avatarUrl='';
  if(invite.avatar_path){
   const a=await db.storage.from('wv-omra-private').createSignedUrl(invite.avatar_path,600);
   avatarUrl=a.data?.signedUrl||'';
  }
  notice='';error='';
 }catch(e){invite=null;error='تعذّر تحميل الذكريات: '+String(e.message||e).slice(0,150)}
 finally{loaded=true;update()}
}
async function submit(e){
 e.preventDefault();if(busy)return;
 const code=String(new FormData(e.target).get('code')||'').trim();
 if(!/^fm[0-9a-f]{20}$/i.test(code.replace(/[\s-]/g,''))){error='تثبّت من كود FM اللي عطاهولك المعتمر.';update();return}
 busy=true;error='';update();
 try{
  const session=await db.auth.getSession();
 if(!session.data?.session){
   const a=await db.auth.signInAnonymously();
   if(a.error)throw a.error;
 }
 const r=await db.rpc('omra_claim_family_code',{p_code:code});
 if(r.error)throw r.error;
 busy=false;await refresh();
 notice='تربطت بذكريات المعتمر ✅';update();
 }catch(e){
  error=/anonymous|disabled/i.test(String(e.message||''))?'لازم إدارة التطبيق تفعّل Anonymous Sign-ins في Supabase، ما يلزمكش تعمل حساب.':'ما نجّمش نربط الكود: '+String(e.message||e).slice(0,160);
  busy=false;update();
 }
}
document.addEventListener('submit',e=>{if(e.target.id==='ff-code-form')submit(e)});
document.addEventListener('click',e=>{if(e.target.closest('[data-ff-action="refresh"]'))refresh()});
window.WVFamilyFollow={pageHtml,refresh};
refresh();
})();
