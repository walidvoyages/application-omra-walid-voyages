/* Walid Voyages — My Omra Story v1: secure client login and itinerary.
   Each saved stop belongs to the authenticated user and a claimed invitation.
   Run supabase/story-and-adhkar.sql before enabling this feature.
*/
(function(){
'use strict';
const cfg=window.WALID_SUPABASE_CONFIG||{};
const configured=/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/.test(cfg.url||'')&&!!cfg.anonKey&&!!window.supabase;
const db=configured?window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{storageKey:'wv-client-auth'}}):null;
const safe=(x)=>escapeHtml(x??'');
const defaults=[
 ['depart','✈️','الانطلاق من تونس'],
 ['arrival-medina','🌴','الوصول إلى المدينة المنورة'],
 ['nabawi','🕌','زيارة المسجد النبوي'],
 ['quba','🌿','زيارة مسجد قباء'],
 ['ihram','🤍','الإحرام والتلبية'],
 ['arrival-makkah','🕋','الوصول إلى مكة المكرمة'],
 ['tawaf','🕋','الطواف حول الكعبة'],
 ['sai','👣','السعي بين الصفا والمروة'],
 ['tahallul','✂️','التحلّل من الإحرام'],
 ['return','🏠','العودة إلى تونس']
];
let user=null,invite=null,trip=null,stops=[],busy=false,error='',message='',editKey='',loading=false;
const dateText=d=>{if(!d)return '—';const p=String(d).slice(0,10).split('-');return p.length===3?p.reverse().join('/'):String(d)};
const official=key=>defaults.find(x=>x[0]===key);
const steps=()=>{
 const customized=stops.filter(x=>x.stop_key.startsWith('custom-')).map(x=>[x.stop_key,'📍',x.title]);
 const order=[...defaults,...customized];
 return order.map(([key,emoji,title],idx)=>({key,emoji,title,order:idx,stored:stops.find(x=>x.stop_key===key)||null}));
};
const notify=(s,isError=false)=>{error=isError?s:'';message=isError?'':s;update()};
function update(){if(state.tab==='more'&&state.page==='story'&&document.getElementById('app'))render()}
async function reload(){
 if(!db||!user)return;
 loading=true;update();
 try{
  const r=await db.from('omra_story_invites').select('id,customer_name,program_id,omra_programs(id,title,start_date,end_date,airline,route,hotel)').eq('linked_user_id',user.id).is('revoked_at',null).order('claimed_at',{ascending:false}).limit(1);
  if(r.error)throw r.error;
  invite=r.data?.[0]||null;
  trip=invite?.omra_programs||null;
  if(invite){
   const records=await db.from('omra_story_stops').select('id,stop_key,title,sequence,visited_at,note,photo_path').eq('invite_id',invite.id).eq('owner_id',user.id).order('sequence');
   if(records.error)throw records.error;
   stops=records.data||[];
  }else{stops=[]}
 }catch(e){error='تعذّر تحميل رحلتك: '+String(e.message||e).slice(0,160);invite=null;trip=null;stops=[]}
 finally{loading=false;update()}
}
async function boot(){
 if(!db)return;
 try{
  const result=await db.auth.getUser();
  user=result.data?.user||null;
  if(user)await reload();
  db.auth.onAuthStateChange((event,session)=>{
   // Never refresh synchronously inside the auth callback.
   const next=session?.user||null;
   if(next?.id!==user?.id){user=next;invite=null;trip=null;stops=[];update();if(user)Promise.resolve().then(reload)}
  });
 }catch(e){console.warn('Story auth unavailable:',e?.message||e)}
 update();
}
function badge(){return error?'<p class="story-feedback bad" role="alert">'+safe(error)+'</p>':message?'<p class="story-feedback good" role="status">'+safe(message)+'</p>':''}
function loginPage(){
 if(!db)return '<div class="card story-panel">إعدادات Supabase غير متاحة. تواصل مع الإدارة.</div>';
 return '<section class="card story-panel"><div class="story-symbol">🕋</div><h2>مرحبا بيك في عمرتي حكاية</h2><p>كل معتمر ينجم يعمل حساب خاص ويشوف غير رحلتو وذكرياتو.</p>'+badge()+
 '<form id="story-login-form" class="story-form"><label>البريد الإلكتروني</label><input type="email" autocomplete="email" name="email" dir="ltr" required placeholder="client@example.com">'+
 '<label>كلمة السر</label><input type="password" name="password" autocomplete="current-password" minlength="8" required placeholder="8 caractères minimum">'+
 '<div class="story-form-actions"><button class="btn lime" name="action" value="login" type="submit">دخول</button><button class="btn light" name="action" value="signup" type="submit">إنشاء حساب</button></div></form>'+
 '<p class="story-hint">إذا أنشأت حسابًا جديدًا، يمكن Supabase يطلب تأكيد البريد قبل الدخول. ما يلزمكش تبعث كلمة السر للوكالة.</p></section>';
}
function linkPage(){
 return '<section class="card story-panel"><div class="story-symbol">🎟️</div><h2>اربط رحلتك بملفّك</h2><p>مرحبًا '+safe(user.email||'')+'. اطلب Code privé من Walid Voyages، أدخلو مرّة واحدة، وتظهرلك عمرتك المسجّلة.</p>'+badge()+
 '<form id="story-code-form" class="story-form"><label>الكود الخاص اللي عطاتهولك الوكالة</label><input name="invite" dir="ltr" inputmode="text" autocomplete="off" minlength="64" maxlength="64" pattern="[A-Fa-f0-9]{64}" required placeholder="64 caractères"><button type="submit" class="btn lime full">ربط عمرتي</button></form>'+
 '<button type="button" class="story-link" data-story="logout">الخروج من حسابي</button></section>';
}
function journeyPage(){
 const name=invite.customer_name||user.email;
 const done=steps().filter(s=>s.stored?.visited_at).length,total=steps().length;
 let selected=steps().find(s=>s.key===editKey);
 return '<section class="card story-profile"><div class="story-profile-head"><span>👤</span><div><p class="story-hint">ملفّي الشخصي</p><h2>'+safe(name)+'</h2><small>'+safe(user.email||'')+'</small></div></div>'+
 '<div class="story-trip"><span>🕋 عمرتي الخاصة</span><strong>'+safe(trip?.title||'برنامج العمرة')+'</strong><small>من '+dateText(trip?.start_date)+' إلى '+dateText(trip?.end_date)+'</small>'+
 '<small>'+safe(trip?.airline||'')+(trip?.hotel?' · '+safe(trip.hotel):'')+'</small></div>'+
 '<div class="story-progress"><strong>تقدّم الرحلة: '+done+' من '+total+' محطة</strong><div class="bar"><span style="width:'+Math.round(done*100/total)+'%"></span></div></div></section>'+
 badge()+
 '<section class="section"><div class="section-head"><h2>مخطّط عمرتي نقطة بنقطة</h2></div><p class="story-intro">إضغط على أي محطة، علّمها زرتها واكتب ذكرى باش تلقاها وقت ترجع.</p>'+
 '<div class="story-timeline">'+steps().map(s=>'<button class="card story-stop '+(s.stored?.visited_at?'visited':'')+'" data-story-stop="'+safe(s.key)+'"><span class="story-stop-icon">'+s.emoji+'</span><span class="story-stop-info"><strong>'+safe(s.title)+'</strong><small>'+(s.stored?.visited_at?'✓ زرتها بتاريخ '+dateText(s.stored.visited_at):'لم تُسجّل الزيارة بعد')+'</small>'+(s.stored?.note?'<small class="story-note-preview">'+safe(s.stored.note.slice(0,100))+'</small>':'')+'</span><span>›</span></button>').join('')+'</div>'+
 '<form id="story-add-form" class="story-new-stop"><label>📍 زرت بلاصة أخرى؟ زيدها لمخطّطك</label><input name="newStop" maxlength="150" minlength="2" required placeholder="مثال: جبل أحد، بئر غرس، متحف…"><button type="submit" class="btn light">+ إضافة محطة</button></form></section>'+
 (selected?'<div class="story-edit-overlay" role="dialog" aria-label="تعديل ذكرى المحطة"><form id="story-stop-form" class="card story-edit-card"><h3>'+selected.emoji+' '+safe(selected.title)+'</h3><label class="story-checkbox"><input type="checkbox" name="visited" '+(selected.stored?.visited_at?'checked':'')+'> زرت هالمحطة</label><label>شنوّة تحب تتذكّر من اللحظة هاذي؟</label><textarea name="note" rows="5" maxlength="4000" placeholder="اكتب شنوّة صار أو دعوة تحب تتذكّرها…">'+safe(selected.stored?.note||'')+'</textarea><div class="story-form-actions"><button class="btn lime" type="submit">حفظ الذكرى</button><button class="btn light" type="button" data-story="close">إغلاق</button></div></form></div>':'')+
 '<section class="section"><div class="card story-bottom"><strong>🔐 خصوصيتك</strong><p>الذكريات والمراحل تظهر كان لحسابك. التطبيق ما يأكّدش الحجز، وما ينشرش ذكرياتك للعموم.</p><button type="button" data-story="logout" class="btn light">خروج من حسابي</button></div></section>';
}
function pageHtml(){
 return viewTitle('عمرتي حكاية','رحلتي، مراحلي وذكرياتي الخاصة')+
 (!configured?'<div class="card story-panel">خدمة حسابات المعتمرين غير متاحة حاليًا.</div>':!user?loginPage():loading?'<div class="card story-panel">جاري تحميل رحلتك الخاصة…</div>':!invite?linkPage():journeyPage());
}
async function handleLogin(event){
 event.preventDefault();if(busy)return;busy=true;
 const button=event.submitter,mode=button?.value||'login';
 const form=new FormData(event.target),email=String(form.get('email')||'').trim(),password=String(form.get('password')||'');
 try{
  if(mode==='signup'){
   const result=await db.auth.signUp({email,password});
   if(result.error)throw result.error;
   if(!result.data.session){notify('تسجّل الحساب. افتح البريد الإلكتروني وأكّد الحساب وبعد اعمل Login.');return}
   user=result.data.user;await reload();notify('مرحبا بيك! توا اربط كود العمرة متاعك.');
  }else{
   const r=await db.auth.signInWithPassword({email,password});
   if(r.error)throw r.error;
   user=r.data.user;await reload();notify('تمّ الدخول بنجاح.');
  }
 }catch(e){notify('تعذّر الدخول: '+String(e.message||e).slice(0,180),true)}
 finally{busy=false}
}
async function handleCode(event){
 event.preventDefault();if(busy||!user)return;busy=true;
 const token=String(new FormData(event.target).get('invite')||'').trim();
 try{
  const result=await db.rpc('omra_claim_story_invite',{p_token:token});
  if(result.error)throw result.error;
  await reload();notify('ربطنا عمرتك بملفك الشخصي ✅');
 }catch(e){notify('ما نجّمش نربط الكود: '+String(e.message||e).slice(0,180),true)}
 finally{busy=false}
}
async function addStop(event){
 event.preventDefault();if(busy||!invite)return;
 const title=String(new FormData(event.target).get('newStop')||'').trim();
 if(title.length<2||title.length>150)return;
 busy=true;
 const stop_key='custom-'+(crypto.randomUUID?crypto.randomUUID():String(Date.now()));
 const payload={invite_id:invite.id,owner_id:user.id,stop_key,title,sequence:steps().length+1,note:''};
 try{
  const r=await db.from('omra_story_stops').insert(payload);
  if(r.error)throw r.error;await reload();notify('تزادَت محطة جديدة في مخطّطك ✅');
 }catch(e){notify('تعذّر إضافة المحطة: '+String(e.message||e).slice(0,160),true)}
 finally{busy=false}
}
async function saveStop(event){
 event.preventDefault();if(busy||!invite)return;
 const step=steps().find(s=>s.key===editKey);if(!step)return;
 const form=new FormData(event.target);
 const note=String(form.get('note')||'').trim().slice(0,4000);
 const visited=!!form.get('visited');
 const payload={invite_id:invite.id,owner_id:user.id,stop_key:step.key,title:step.title,sequence:step.order,visited_at:visited?(step.stored?.visited_at||new Date().toISOString()):null,note,updated_at:new Date().toISOString()};
 busy=true;
 try{
  const req=step.stored?db.from('omra_story_stops').update(payload).eq('id',step.stored.id):db.from('omra_story_stops').insert(payload);
  const r=await req;if(r.error)throw r.error;
  editKey='';await reload();notify('تسجّلت الذكرى في حسابك ✅');
 }catch(e){notify('فشل حفظ المحطة: '+String(e.message||e).slice(0,160),true)}
 finally{busy=false}
}
document.addEventListener('submit',e=>{
 if(e.target.id==='story-login-form')handleLogin(e);
 else if(e.target.id==='story-code-form')handleCode(e);
 else if(e.target.id==='story-add-form')addStop(e);
 else if(e.target.id==='story-stop-form')saveStop(e);
});
document.addEventListener('click',e=>{
 const step=e.target.closest('[data-story-stop]');
 if(step){editKey=step.dataset.storyStop;error='';message='';update();return}
 const b=e.target.closest('[data-story]');
 if(!b)return;
 if(b.dataset.story==='close'){editKey='';update()}
 if(b.dataset.story==='logout'){if(db)db.auth.signOut().then(()=>{user=null;invite=null;trip=null;stops=[];editKey='';message='';error='';update()})}
});
window.WVStory={pageHtml,hasAccount:()=>!!user,hasJourney:()=>!!invite};
boot();
})();