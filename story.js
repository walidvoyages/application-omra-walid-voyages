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
let authMode='login',authEmail='',pendingConfirmation=false;
let accountStatus='loading',accountActivated=false;
let recoveryActive=false,recoveryReady=false;
const recoveryFragment=new URLSearchParams(location.hash.slice(1));
const recoveryQuery=new URLSearchParams(location.search);
const recoveryLinkError=recoveryFragment.get('error_code')||recoveryQuery.get('error_code')||'';
const recoveryLinkDescription=recoveryFragment.get('error_description')||recoveryQuery.get('error_description')||'';
const recoveryCallback=(recoveryFragment.get('type')==='recovery');
function showStoryFromAuthLink(){
 state.tab='more';state.page='story';state.dialog=null;
 // Only replace the URL after Supabase has consumed its recovery tokens.
 history.replaceState(null,'',location.pathname+'#more/story');
 render(true);
}
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
 if(!db||!user||accountStatus!=='approved'||!accountActivated)return;
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
 }catch(e){const m=String(e.message||e);error=/PGRST205|PGRST204|schema cache|Could not find the table/i.test(m)?'خدمة ربط العمرة مازالت موش مفعّلة في قاعدة البيانات. إدارة Walid Voyages يلزمها تفعّل إعدادات الرحلات في Supabase.':'تعذّر تحميل رحلتك: '+m.slice(0,160);invite=null;trip=null;stops=[]}
 finally{loading=false;update();if(window.WVStoryExtras?.reload)Promise.resolve().then(()=>window.WVStoryExtras.reload())}
}
async function loadAccountStatus(){
 if(!user){accountStatus='loading';accountActivated=false;return false}
 const r=await db.from('omra_account_requests').select('status,activated_at').eq('user_id',user.id).maybeSingle();
 if(r.error){accountStatus='error';accountActivated=false;notify('فشل تحميل حالة التسجيل: '+r.error.message,true);return false}
 accountStatus=r.data?.status||'pending';accountActivated=!!r.data?.activated_at;
 return accountStatus==='approved'&&accountActivated;
}
function approvalPage(){
 const waiting=accountStatus==='pending',accepted=accountStatus==='approved'&&!accountActivated;
 return '<section class="card story-panel"><div class="story-symbol">'+(waiting?'⏳':accepted?'🔑':'🚫')+'</div><h2>'+
 (waiting?'طلبك في انتظار موافقة الإدارة':accepted?'تمّ قبول طلبك':'حسابك غير مفعل')+'</h2><p>'+
 (waiting?'طلبك وصل إلى Partie Admin. بعد الموافقة تاخو كود تفعيل من الوكالة، بلا تأكيد إيميل.':accepted?'أدخل كود التفعيل اللي تعطيهولك الوكالة عبر WhatsApp.':'اتصل بوكالة Walid Voyages لمراجعة طلبك.')+'</p>'+
 (accepted?'<form id="story-activate" class="story-form"><label>كود تفعيل الحساب</label><input name="code" dir="ltr" autocomplete="off" placeholder="WV-ACT-..." minlength="39" required><button class="btn lime full" type="submit">تفعيل الحساب</button></form>':'')+
 '<button class="btn light full" type="button" data-story="check-approval">🔄 تحديث حالة الطلب</button><button class="btn light full" type="button" data-story="logout">خروج</button></section>';
}
async function activate(e){
 e.preventDefault();if(!user)return;
 const code=String(new FormData(e.target).get('code')||'');
 try{const r=await db.rpc('omra_activate_signup',{p_code:code});if(r.error)throw r.error;
  if(!r.data)throw Error('الكود غير صحيح أو انتهى');
  if(await loadAccountStatus())await reload();
  notify('✅ حسابك تفعّل');
 }catch(e){notify('خطأ التفعيل: '+String(e.message||e).slice(0,150),true)}
 update();
}
async function checkApproval(){if(user){if(await loadAccountStatus())await reload();update()}}
async function boot(){
 if(!db)return;
 try{
  // Register first. PASSWORD_RECOVERY can fire while Supabase reads the email link.
  db.auth.onAuthStateChange((event,session)=>{
   if(event==='PASSWORD_RECOVERY'){
    user=session?.user||user;recoveryActive=true;recoveryReady=true;authMode='set-password';
    error='';message='رابط الإيميل صحيح. اختار كلمة سر جديدة.';
    Promise.resolve().then(showStoryFromAuthLink);
    return;
   }
   const next=session?.user||null;
   if(next?.id!==user?.id){
    user=next;invite=null;trip=null;stops=[];accountStatus='loading';accountActivated=false;update();
    if(user&&!recoveryActive)Promise.resolve().then(async()=>{if(await loadAccountStatus())await reload();update()});
   }
  });
  const result=await db.auth.getUser();
  user=result.data?.user||null;
  if(recoveryLinkError){
   recoveryActive=true;recoveryReady=false;authMode='recover';
   error=/expired|invalid|otp_expired/i.test(recoveryLinkError+' '+recoveryLinkDescription)
    ?'رابط الاسترجاع انتهت صلاحيته أو استُعمل قبل. اطلب رابط جديد من هنا.'
    :'تعذّر التثبّت من رابط الاسترجاع. اطلب رابط جديد.';
   message='';
   Promise.resolve().then(showStoryFromAuthLink);
  }else if(recoveryCallback&&user){
   // Handles recovery links processed before the listener became active.
   recoveryActive=true;recoveryReady=true;authMode='set-password';
   error='';message='تم التثبّت من رابط الإيميل. اختار كلمة سر جديدة.';
   Promise.resolve().then(showStoryFromAuthLink);
  }else if(user&&!recoveryActive){if(await loadAccountStatus())await reload()}
 }catch(e){console.warn('Story auth unavailable:',e?.message||e)}
 update();
}
function badge(){return error?'<p class="story-feedback bad" role="alert">'+safe(error)+'</p>':message?'<p class="story-feedback good" role="status">'+safe(message)+'</p>':''}
function loginPage(){
 if(!db)return '<div class="card story-auth-card" role="alert">إعدادات Supabase غير متاحة. تواصل مع إدارة Walid Voyages.</div>';
 const signup=authMode==='signup',recover=authMode==='recover',newPassword=authMode==='set-password';
 const title=newPassword?'كلمة سر جديدة':recover?'استرجاع كلمة السر':signup?'أنشئ حسابك الخاص':'مرحبًا بيك في عمرتي حكاية';
 const desc=newPassword?'اختار كلمة سر جديدة باش ترجع تدخل لحسابك.':recover?'اكتب إيميلك ونبعثولك رابط استرجاع كلمة السر.':signup?'اعمل حساب مجاني واستعمل التطبيق بلا كود. ربط رحلة العمرة اختياري.':'ادخل بحسابك الشخصي باش ترجع لرحلتك وذكرياتك في أي وقت.';
 const header='<section class="card story-auth-card" aria-label="حساب المعتمر"><div class="story-auth-visual"><div class="story-auth-emblem">🕋</div><span class="story-auth-eyebrow">WALID VOYAGES · OMRA STORY</span><h2>'+title+'</h2><p>'+desc+'</p></div>'+badge();
 if(newPassword){
  return header+
   '<form id="story-reset-form" class="story-auth-form" autocomplete="on">'+
   '<div class="story-auth-field"><label for="story-new-password">كلمة السر الجديدة</label><div class="story-auth-input-wrap"><input id="story-new-password" type="password" name="newPassword" autocomplete="new-password" minlength="8" required placeholder="8 أحرف على الأقل"></div></div>'+
   '<div class="story-auth-field"><label for="story-confirm-password">تأكيد كلمة السر الجديدة</label><div class="story-auth-input-wrap"><input id="story-confirm-password" type="password" name="confirmPassword" autocomplete="new-password" minlength="8" required placeholder="عاود اكتب كلمة السر"></div></div>'+
   '<button type="submit" class="story-auth-submit" '+(busy?'disabled':'')+'>تغيير كلمة السر</button></form>'+
   '<p class="story-auth-privacy">ما تشاركش كلمة السر أو رابط الاسترجاع مع أي حد.</p></section>';
 }
 return header+
 
 '<div class="story-auth-tabs" role="tablist" aria-label="نوع الحساب">'+
 '<button type="button" data-story-auth-mode="login" class="'+(authMode==='login'?'active':'')+'" aria-selected="'+(authMode==='login')+'">دخول</button>'+
 '<button type="button" data-story-auth-mode="signup" class="'+(authMode==='signup'?'active':'')+'" aria-selected="'+(authMode==='signup')+'">إنشاء حساب</button></div>'+
 '<form id="story-login-form" class="story-auth-form" autocomplete="on">'+
 (signup?'<div class="story-auth-field"><label>الاسم واللقب</label><input name="full_name" minlength="2" maxlength="120" required placeholder="اسمك ولقبك"></div><div class="story-auth-field"><label>رقم WhatsApp</label><input name="phone" dir="ltr" type="tel" minlength="8" maxlength="25" required placeholder="+216 XX XXX XXX"></div>':'')+
 '<div class="story-auth-field"><label for="story-email">البريد الإلكتروني</label><div class="story-auth-input-wrap"><span class="story-auth-input-icon" aria-hidden="true">✉</span><input id="story-email" type="email" inputmode="email" autocomplete="email" name="email" dir="ltr" required placeholder="exemple@gmail.com" value="'+safe(authEmail)+'"></div></div>'+
 (!recover?'<div class="story-auth-field"><label for="story-password">كلمة السر</label><div class="story-auth-input-wrap"><span class="story-auth-input-icon" aria-hidden="true">♧</span><input id="story-password" type="password" name="password" autocomplete="'+(signup?'new-password':'current-password')+'" minlength="'+(signup?'8':'6')+'" required placeholder="كلمة السر متاعك"><button type="button" class="story-password-toggle" data-story-auth="toggle-pass">إظهار</button></div></div>':'')+
 '<button type="submit" id="story-auth-submit" class="story-auth-submit" '+(busy?'disabled':'')+'>'+(busy?'جاري التثبّت…':recover?'إرسال رابط الاسترجاع':signup?'إنشاء حسابي':'دخول إلى عمرتي')+'</button></form>'+
 '<div class="story-auth-support">'+
 (!recover?'<button type="button" data-story-auth-mode="recover">نسيت كلمة السر؟</button>':'<button type="button" data-story-auth-mode="login">رجوع للدخول</button>')+
 
 '</div><p class="story-auth-privacy">🔒 التسجيل يحتاج موافقة الإدارة. بعد القبول تتسلّم كود تفعيل الحساب، ثم تنجم تربط حجز العمرة بكود آخر.</p></section>';
}

function linkPage(){
 return '<section class="card story-profile"><div class="story-profile-head">'+
  (window.WVStoryExtras?.profileAvatarHtml?.()||'<span>👤</span>')+
  '<div><p class="story-hint">ملفّي الشخصي</p><h2>'+safe(window.WVStoryExtras?.profileName?.()||'مرحبا بيك')+'</h2><small>'+safe(user?.email||'')+'</small></div></div>'+
  (window.WVStoryExtras?.avatarMessage?.()?'<p class="story-feedback">'+safe(window.WVStoryExtras.avatarMessage())+'</p>':'')+
  '<form id="wv-profile-form" class="story-form" autocomplete="on"><label for="wv-profile-name">اسمي في التطبيق</label><input id="wv-profile-name" name="full_name" maxlength="120" minlength="2" required value="'+safe(window.WVStoryExtras?.profileName?.()||'')+'" placeholder="الاسم واللقب"><button type="submit" class="btn light">حفظ الاسم</button></form>'+
  '<p class="story-intro">✅ حسابك مفتوح بلا كود عمرة. تنجم تستعمل الأدعية، الأذكار، المناسك، المواقيت، والمزارات. تصويرتك واسمك يتحفظوا في حسابك الخاص.</p></section>'+
  '<section class="card story-panel"><div class="story-symbol">🎟️</div><h2>عندك حجز عمرة مع Walid Voyages؟</h2><p>اختياري: كان الوكالة عطتك كود الرحلة، ادخلو باش تربط برنامجك ومخطط الرحلة وذكريات المعتمر بحسابك. ما تستحقش الكود باش تعمل حساب أو تستعمل باقي التطبيق.</p>'+badge()+
  '<form id="story-code-form" class="story-form"><label for="story-invite">كود ربط الرحلة (اختياري)</label><input id="story-invite" name="invite" dir="ltr" inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" minlength="22" maxlength="80" required placeholder="WV-XXXX-XXXX-XXXX-XXXX-XXXX"><button type="submit" class="btn lime full">ربط رحلتي</button></form>'+
  '<button type="button" class="story-link" data-story="logout">الخروج من حسابي</button></section>';
}
function journeyPage(){
 const name=window.WVStoryExtras?.profileName?.()||invite.customer_name||user.email;
 const done=steps().filter(s=>s.stored?.visited_at).length,total=steps().length;
 let selected=steps().find(s=>s.key===editKey);
 return '<section class="card story-profile"><div class="story-profile-head">'+(window.WVStoryExtras?.profileAvatarHtml?.()||'<span>👤</span>')+'<div><p class="story-hint">ملفّي الشخصي</p><h2>'+safe(name)+'</h2><small>'+safe(user.email||'')+'</small></div></div>'+
 (window.WVStoryExtras?.avatarMessage?.()?'<p class="story-feedback">'+safe(window.WVStoryExtras.avatarMessage())+'</p>':'')+
  '<form id="wv-profile-form" class="story-form" autocomplete="on"><label for="wv-profile-name">اسمي في التطبيق</label><input id="wv-profile-name" name="full_name" maxlength="120" minlength="2" required value="'+safe(window.WVStoryExtras?.profileName?.()||'')+'" placeholder="الاسم واللقب"><button type="submit" class="btn light">حفظ الاسم</button></form>'+
  '<div class="story-trip"><span>🕋 عمرتي الخاصة</span><strong>'+safe(trip?.title||'برنامج العمرة')+'</strong><small>من '+dateText(trip?.start_date)+' إلى '+dateText(trip?.end_date)+'</small>'+
 '<small>'+safe(trip?.airline||'')+(trip?.hotel?' · '+safe(trip.hotel):'')+'</small></div>'+
 '<div class="story-progress"><strong>تقدّم الرحلة: '+done+' من '+total+' محطة</strong><div class="bar"><span style="width:'+Math.round(done*100/total)+'%"></span></div></div></section>'+
 badge()+
 '<section class="section"><div class="section-head"><h2>مخطّط عمرتي نقطة بنقطة</h2></div><p class="story-intro">إضغط على أي محطة، علّمها زرتها واكتب ذكرى باش تلقاها وقت ترجع.</p>'+
 '<div class="story-timeline">'+steps().map(s=>'<div class="story-stop-row"><button class="card story-stop '+(s.stored?.visited_at?'visited':'')+'" data-story-stop="'+safe(s.key)+'"><span class="story-stop-icon">'+s.emoji+'</span><span class="story-stop-info"><strong>'+safe(s.title)+'</strong><small>'+(s.stored?.visited_at?'✓ زرتها بتاريخ '+dateText(s.stored.visited_at):'لم تُسجّل الزيارة بعد')+'</small>'+(s.stored?.note?'<small class="story-note-preview">'+safe(s.stored.note.slice(0,100))+'</small>':'')+'</span><span>›</span></button><button class="story-photo-shortcut" type="button" data-story-media-open="'+safe(s.key)+'">📸 إضافة صور لهذه المحطة</button></div>').join('')+'</div>'+
 '<form id="story-add-form" class="story-new-stop"><label>📍 زرت بلاصة أخرى؟ زيدها لمخطّطك</label><input name="newStop" maxlength="150" minlength="2" required placeholder="مثال: جبل أحد، بئر غرس، متحف…"><button type="submit" class="btn light">+ إضافة محطة</button></form></section>'+
 (selected?'<div class="story-edit-overlay" role="dialog" aria-label="تعديل ذكرى المحطة"><form id="story-stop-form" class="card story-edit-card"><h3>'+selected.emoji+' '+safe(selected.title)+'</h3><label class="story-checkbox"><input type="checkbox" name="visited" '+(selected.stored?.visited_at?'checked':'')+'> زرت هالمحطة</label><label>شنوّة تحب تتذكّر من اللحظة هاذي؟</label><textarea name="note" rows="5" maxlength="4000" placeholder="اكتب شنوّة صار أو دعوة تحب تتذكّرها…">'+safe(selected.stored?.note||'')+'</textarea><div class="story-media-inline"><strong>📸 صوري من هالمحطة</strong><p>اختار صور من تليفونك، وتتحفظ في حسابك الخاص.</p><label class="story-photo-picker" for="story-photo-upload">📷 إضافة صور من الهاتف<input id="story-photo-upload" data-story-photo-upload="'+safe(selected.key)+'" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><small>JPG / PNG / WEBP، أقصى 6 ميغا للصورة. يلزم تفعيل مشاركة الصور في Supabase.</small>'+(window.WVStoryExtras?.renderPhotosForKey?.(selected.key)||'')+'</div><div class="story-form-actions"><button class="btn lime" type="submit">حفظ الذكرى</button><button class="btn light" type="button" data-story="close">إغلاق</button></div></form></div>':'')+
 '<section class="section"><div class="card story-bottom"><strong>🔐 خصوصيتك</strong><p>الذكريات والمراحل خاصة بحسابك. تنجم تختار مشاركة محطة معيّنة مع عائلتك أو مع وكالة Walid Voyages، وتوقف المشاركة في أي وقت. التطبيق ما يأكّدش الحجز وما ينشرش ذكرياتك للعموم.</p><button type="button" data-story="logout" class="btn light">خروج من حسابي</button></div></section>';
}
function pageHtml(){
 return viewTitle('عمرتي حكاية','رحلتي، مراحلي وذكرياتي الخاصة')+
 (!configured?'<div class="card story-panel">خدمة حسابات المعتمرين غير متاحة حاليًا.</div>':recoveryActive||!user?loginPage():accountStatus==='loading'?'<div class="card story-panel">جاري التثبّت من الطلب…</div>':!(accountStatus==='approved'&&accountActivated)?approvalPage():loading?'<div class="card story-panel">جاري تحميل رحلتك الخاصة…</div>':!invite?linkPage():journeyPage())+(window.WVStoryExtras?.render?.()||'');
}
async function handleLogin(event){
 event.preventDefault();if(busy||!db)return;
 const form=new FormData(event.target),email=String(form.get('email')||'').trim().toLowerCase(),password=String(form.get('password')||''),fullName=String(form.get('full_name')||'').trim(),phone=String(form.get('phone')||'').trim();
 authEmail=email;busy=true;error='';message='';
 const submit=document.getElementById('story-auth-submit');
 if(submit){submit.disabled=true;submit.textContent='جاري التثبّت…'}
 try{
  if(authMode==='recover'){
   const r=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
   if(r.error)throw r.error;
   notify('إذا الإيميل مسجّل، تصلك رسالة باش تبدّل كلمة السر. تفقّد صندوق الوارد والـSpam.');
  }else if(authMode==='signup'){
   if(fullName.length<2||phone.length<8)throw Error('لازم الاسم ورقم WhatsApp.');
   const r=await db.auth.signUp({email,password,options:{data:{full_name:fullName,phone},emailRedirectTo:location.origin+location.pathname+'#more/story'}});
   if(r.error)throw r.error;
   if(!r.data?.session){
    notify('طلبك تسجّل، أما خيار تأكيد الإيميل مازال مفعّل في Supabase. لازم الإدارة تعطّلو.',true);
   }else{
    user=r.data.user;
    await loadAccountStatus();
    notify('✅ طلبك وصل إلى الإدارة. تستنى الموافقة وكود التفعيل.');
   }
  }else{
   const r=await db.auth.signInWithPassword({email,password});
   if(r.error){
    const raw=String(r.error.message||'').toLowerCase();
    const translation=/email not confirmed|email_not_confirmed/.test(raw)
      ?'تأكيد الإيميل مازال مفعّل في Supabase. يلزم الإدارة تعطل الخيار هذا.'
      :/invalid login credentials|invalid_credentials/.test(raw)
      ?'الإيميل أو كلمة السر غير صحيحين، أو الحساب مازال ما تفعّلش. تأكد من الحساب واسترجع كلمة السر إذا لزم.'
      :/rate limit|too many/.test(raw)
      ?'محاولات كثيرة. جرّب بعد شوية أو استعمل استرجاع كلمة السر.'
      :r.error.message;
    if(/email not confirmed|email_not_confirmed/.test(raw))pendingConfirmation=true;
    throw new Error(translation);
   }
   user=r.data.user;pendingConfirmation=false;
   if(await loadAccountStatus())await reload();
   notify('✅ تمّ الدخول. الحسابات الجديدة تستنّى موافقة الإدارة.');
  }
 }catch(e){notify('تعذّر إكمال العملية: '+String(e.message||e).slice(0,220),true)}
 finally{busy=false;const b=document.getElementById('story-auth-submit');if(b){b.disabled=false;if(b.textContent==='جاري التثبّت…')b.textContent=authMode==='signup'?'إنشاء حسابي':authMode==='recover'?'إرسال رابط الاسترجاع':'دخول إلى عمرتي'}}
}
async function handleResetPassword(e){
 e.preventDefault();if(busy||!db)return;
 if(!recoveryReady){notify('رابط الاسترجاع غير صالح. اطلب رابط جديد.',true);return}
 const f=new FormData(e.target),pass=String(f.get('newPassword')||''),repeated=String(f.get('confirmPassword')||'');
 if(pass.length<8){notify('كلمة السر لازم فيها 8 أحرف على الأقل.',true);return}
 if(pass!==repeated){notify('كلمة السر وتأكيدها موش متطابقين.',true);return}
 busy=true;
 const btn=e.target.querySelector('[type="submit"]');
 if(btn){btn.disabled=true;btn.textContent='جاري تغيير كلمة السر…'}
 try{
  const session=await db.auth.getSession();
  if(session.error||!session.data?.session)throw new Error('رابط الاسترجاع انتهى. اطلب رابط جديد.');
  const r=await db.auth.updateUser({password:pass});
  if(r.error)throw r.error;
  recoveryActive=false;recoveryReady=false;authMode='login';pendingConfirmation=false;
  user=null;invite=null;trip=null;stops=[];
  await db.auth.signOut();
  notify('تبدّلت كلمة السر بنجاح ✅ توا ادخل بالإيميل وكلمة السر الجديدة.');
 }catch(err){notify('تعذّر تغيير كلمة السر: '+String(err.message||err).slice(0,180),true)}
 finally{busy=false;if(btn){btn.disabled=false;btn.textContent='تغيير كلمة السر'}}
}
async function resendConfirmation(){
 if(!db||!authEmail){notify('اكتب البريد الإلكتروني متاعك الأول.',true);return}
 if(busy)return;busy=true;
 try{
  const r=await db.auth.resend({type:'signup',email:authEmail,options:{emailRedirectTo:location.origin+location.pathname+'#more/story'}});
  if(r.error)throw r.error;
  notify('إذا الحساب يستحق تأكيد، تتبعثلك رسالة جديدة على الإيميل. تأكد من Spam أيضًا.');
 }catch(e){notify('تعذّر إعادة الإرسال: '+String(e.message||e).slice(0,200),true)}
 finally{busy=false}
}
async function handleCode(event){
 event.preventDefault();if(busy||!user)return;busy=true;
 const token=String(new FormData(event.target).get('invite')||'').trim();
 const normalized=token.replace(/[\s-]/g,'');
 if(!/^(wv[0-9a-f]{20}|[0-9a-f]{64})$/i.test(normalized)){busy=false;notify('الكود موش صحيح. انسخ الكود كامل كيف ما بعثتهولك الوكالة.',true);return}
 try{
  const result=await db.rpc('omra_claim_story_invite',{p_token:token});
  if(result.error)throw result.error;
  await reload();notify('ربطنا عمرتك بملفك الشخصي ✅');
 }catch(e){const m=String(e.message||e);notify(/PGRST202|schema cache|Could not find the function/i.test(m)?'خدمة الربط مازالت موش مفعّلة في Supabase. اتصل بوكالة Walid Voyages.':/Invitation unavailable or expired/i.test(m)?'الكود موش موجود، منتهي الصلاحية، أو تلغى. اطلب كود جديد من الوكالة.':/already been used/i.test(m)?'الكود هذا مربوط بحساب آخر. اتصل بالوكالة.':'ما نجّمش نربط الكود: '+m.slice(0,180),true)}
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
 else if(e.target.id==='story-reset-form')handleResetPassword(e);
  else if(e.target.id==='story-activate')activate(e);
 else if(e.target.id==='story-code-form')handleCode(e);
 else if(e.target.id==='story-add-form')addStop(e);
 else if(e.target.id==='story-stop-form')saveStop(e);
});
document.addEventListener('click',e=>{
 const tab=e.target.closest('[data-story-auth-mode]');
 if(tab){
  authMode=tab.dataset.storyAuthMode;
  if(recoveryLinkError)recoveryActive=false;
  const email=document.getElementById('story-email');
  if(email)authEmail=email.value.trim();
  error='';message='';update();return;
 }
 const control=e.target.closest('[data-story-auth]');
 if(control){
  const action=control.dataset.storyAuth;
  if(action==='toggle-pass'){
   const input=document.getElementById('story-password');
   if(input){input.type=input.type==='password'?'text':'password';control.textContent=input.type==='password'?'إظهار':'إخفاء'}
  }
  if(action==='resend')resendConfirmation();
  return;
 }
 const media=e.target.closest('[data-story-media-open]');
 if(media){editKey=media.dataset.storyMediaOpen;error='';message='';update();return}
 const step=e.target.closest('[data-story-stop]');
 if(step){editKey=step.dataset.storyStop;error='';message='';update();return}
 const b=e.target.closest('[data-story]');
 if(!b)return;
 if(b.dataset.story==='close'){editKey='';update()}
 if(b.dataset.story==='check-approval'){checkApproval();return}
 if(b.dataset.story==='logout'){if(db)db.auth.signOut().then(()=>{user=null;invite=null;trip=null;stops=[];accountStatus='loading';accountActivated=false;editKey='';message='';error='';update()})}
});
window.WVStory={pageHtml,hasAccount:()=>!!user,hasJourney:()=>!!invite,refresh:reload,refreshView:update,getMediaContext:(key)=>{const step=steps().find(s=>s.key===key);return step&&user&&invite?{userId:user.id,inviteId:invite.id,step:{key:step.key,title:step.title,order:step.order,storedId:step.stored?.id||null}}:null}};
boot();
})();