'use strict';
const root=document.getElementById('root');
const cfg=window.WALID_SUPABASE_CONFIG||{};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const secureUrl=s=>{try{return new URL(s).protocol==='https:'}catch{return false}};
const brand='<div class="logo"><span>W<b>V</b></span>Walid Voyages · Espace Admin 🕋</div>';
const okConfig=()=>/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/.test(cfg.url||'')&&typeof cfg.anonKey==='string'&&cfg.anonKey.length>15&&!!window.supabase;
let sb=null,user=null,items=[],view='login',editing=null,info='',error='',query='',recovery=false;
const alerts=()=>error?'<p role="alert" class="alert">'+esc(error)+'</p>':info?'<p role="status" class="alert good">'+esc(info)+'</p>':'';
function setMessage(s,isError=false){
 error=isError?s:'';info=isError?'':s;
 // Do not destroy an unsaved program when showing a validation or API error.
 const editorNotice=view==='edit'?document.getElementById('edit-feedback'):null;
 if(editorNotice){
  editorNotice.innerHTML=alerts();
  editorNotice.scrollIntoView({block:'nearest',behavior:'smooth'});
  return;
 }
 paint();
}
function field(label,name,type='text',extra=''){return '<div class="group '+extra+'"><label for="'+name+'">'+label+'</label><input name="'+name+'" id="'+name+'" type="'+type+'" value="'+esc(editing?.[name]??'')+'" '+(['title','start_date','end_date'].includes(name)?'required':'')+'></div>'}
function paint(){
 if(!okConfig()){
  const validUrl=/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/.test(cfg.url||'');
  const validKey=typeof cfg.anonKey==='string'&&cfg.anonKey.length>15;
  const detail=!validUrl||!validKey
    ? 'إعدادات الربط غير موجودة في النسخة المحمّلة من config.js. يمكن المتصفح مازال يستعمل Cache قديم.'
    : 'الإعدادات موجودة لكن مكتبة Supabase ما تحمّلتش. جرّب تتثبّت من الاتصال أو مانع الإعلانات.';
  root.innerHTML='<div class="login"><div class="card">'+brand+'<h1>الربط مازال ما كمّلش في المتصفح</h1><p class="muted">'+detail+'</p><p class="hint">جرّب Ctrl + Shift + R لتحديث الصفحة بالقوة. إذا ما يصلحش، تأكّد من تفعيل JavaScript وعدم حجب cdn.jsdelivr.net.</p><button class="btn primary" id="retry">إعادة تحميل الصفحة</button> <a href="./">العودة للتطبيق</a></div></div>';
  document.getElementById('retry').onclick=()=>location.reload();
  return;
 }
 if(view==='login'){root.innerHTML='<div class="login"><div class="card">'+brand+'<h1>دخول المسؤول</h1><p class="muted">برامج العمرات، الأسعار، الفنادق، الصور والنشر.</p>'+alerts()+'<form id="login"><div class="group"><label for="email">البريد الإلكتروني</label><input type="email" autocomplete="username" id="email" required dir="ltr" placeholder="admin@example.com"></div><div class="group"><label for="password">Mot de passe</label><input type="password" autocomplete="current-password" required minlength="8" id="password" dir="ltr"></div><button id="loginBtn" class="btn primary full" type="submit">دخول آمن</button></form><button id="forgot" class="link">نسيت كلمة السر؟</button><p class="hint">الدخول للمسؤولين المعتمدين فقط. ما تشاركش كلمة السر.</p></div></div>';document.getElementById('login').onsubmit=login;document.getElementById('forgot').onclick=forgot;return}
 if(view==='recover'){root.innerHTML='<div class="login"><div class="card">'+brand+'<h1>كلمة سر جديدة</h1>'+alerts()+'<form id="recover"><div class="group"><label for="pass1">كلمة السر الجديدة</label><input id="pass1" type="password" required minlength="12" autocomplete="new-password"></div><div class="group"><label for="pass2">تأكيد كلمة السر</label><input id="pass2" type="password" required minlength="12" autocomplete="new-password"></div><button class="btn primary full" type="submit">تغيير كلمة السر</button></form></div></div>';document.getElementById('recover').onsubmit=resetPassword;return}
 if(view==='edit'){editPage();return}
 if(view==='settings'){settingsPage();return}
 if(view==='story-invites'){storyInvitesPage();return}
 if(view==='signups'){signupRequestsPage();return}
  if(view==='monitor'){monitorPage();return}
 if(view==='custom-adhkar'){customAdhkarPage();return}
 dashboard()
}
async function isAdmin(){
 const {data,error}=await sb.auth.getUser();if(error||!data?.user)return false;
 const {data:grant,error:grantError}=await sb.from('omra_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
 if(grantError||!grant)return false;user=data.user;return true
}
async function login(e){e.preventDefault();const btn=document.getElementById('loginBtn');btn.disabled=true;const email=document.getElementById('email').value.trim(),password=document.getElementById('password').value;
 try{const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw Error('البريد الإلكتروني أو كلمة السر غير صحيحين.');
 if(!await isAdmin()){await sb.auth.signOut();throw Error('الحساب هذا ما عندوش صلاحية Admin.')}
 errorMsg('');await fetchItems()
 }catch(err){setMessage(err.message||'تعذّر الدخول.',true)}finally{btn.disabled=false}}
function errorMsg(s){error=s;info=''}
async function forgot(){const email=document.getElementById('email').value.trim();if(!email){setMessage('اكتب البريد الإلكتروني أولًا.',true);return}
 const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
 setMessage(error?'فشل إرسال الطلب، تأكد من إعدادات البريد الإلكتروني.':'إذا كان البريد مسجّلًا، تصلك رسالة استرجاع كلمة السر.',!!error)
}
async function resetPassword(e){e.preventDefault();const p=document.getElementById('pass1').value;if(p!==document.getElementById('pass2').value){setMessage('كلمات السر ماهمش متطابقين.',true);return}
 const {error}=await sb.auth.updateUser({password:p});if(error){setMessage('فشل تغيير كلمة السر.',true);return}
 recovery=false;await sb.auth.signOut();view='login';setMessage('تمّ تغيير كلمة السرّ. تنجم تدخل توّا.')
}
async function fetchItems(){const {data,error}=await sb.from('omra_programs').select('*').order('start_date',{ascending:true}).limit(500);if(error){setMessage('فشل جلب البرامج. راجع صلاحيات Supabase RLS.',true);return}
 items=data||[];view='dashboard';paint()}
function dashboard(){
 const published=items.filter(x=>x.is_published).length;
 const today=new Date().toISOString().slice(0,10);
 const upcoming=items.filter(x=>x.end_date>=today).length;
 const filtered=items.filter(x=>[x.title,x.airline,x.hotel,x.tag].join(' ').toLowerCase().includes(query.toLowerCase()));
 root.innerHTML='<header class="head"><div>'+brand+'<h1>إدارة برامج العمرة</h1><p class="muted">'+esc(user?.email||'')+'</p></div><div class="buttons"><a href="./" target="_blank" rel="noopener">فتح التطبيق</a><button id="logout" class="btn light">خروج</button></div></header>'+
 '<div class="admin-special"><button id="reminder-settings" class="btn light">🔔 إدارة التذكيرات ومواقيتها</button><button id="story-invites-open" class="btn light">🕋 حسابات المعتمرين وكود الرحلة</button><button id="signups-open" class="btn primary">📝 طلبات التسجيل — قبول / رفض</button><button id="monitor-open" class="btn primary">👥 متابعة جميع المعتمرين</button><button id="custom-adhkar-open" class="btn light">📿 إضافة أذكار للتطبيق</button><span class="muted">إعدادات تظهر للجميع بعد الحفظ في Supabase</span></div><div class="stats"><div class="stat"><strong>'+items.length+'</strong><span>البرامج الكل</span></div><div class="stat"><strong>'+published+'</strong><span>المنشورة</span></div><div class="stat"><strong>'+upcoming+'</strong><span>القادمة والحالية</span></div></div>'+
 '<section class="card"><h2>البرامج</h2><p class="muted">الـSauvegarde تسجّل كلّ تعديل في قاعدة Supabase. البرنامج غير المنشور ما يظهرش للزائر.</p>'+alerts()+'<div class="toolbar"><input type="search" id="search" value="'+esc(query)+'" placeholder="ابحث عن برنامج…"><button id="new" class="btn primary">+ إضافة عمرة</button></div>'+
 '<div class="tablewrap"><table><thead><tr><th>اسم العمرة</th><th>التواريخ</th><th>السعر</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody id="rows">'+(filtered.length?filtered.map(row).join(''):'<tr><td colspan="5">ما فماش برامج بعد.</td></tr>')+'</tbody></table></div></section><p class="bottom">© Walid Voyages · Espace Admin</p>';
 document.getElementById('logout').onclick=logout;
 document.getElementById('reminder-settings').onclick=loadSettings;
 document.getElementById('story-invites-open').onclick=loadStoryInvites;
 document.getElementById('signups-open').onclick=loadSignupRequests;
  document.getElementById('monitor-open').onclick=loadMonitor;
 document.getElementById('custom-adhkar-open').onclick=loadCustomAdhkar;
 document.getElementById('new').onclick=()=>{editing=null;view='edit';errorMsg('');paint()};
 document.getElementById('search').oninput=e=>{query=e.target.value;const list=items.filter(x=>[x.title,x.airline,x.hotel,x.tag].join(' ').toLowerCase().includes(query.toLowerCase()));document.getElementById('rows').innerHTML=list.length?list.map(row).join(''):'<tr><td colspan="5">ما فماش نتائج.</td></tr>';attachRows()};
 attachRows();
}
function row(p){return '<tr><td><strong>'+esc(p.title)+'</strong><br><span class="muted">'+esc(p.airline)+'</span></td><td dir="ltr">'+esc(p.start_date)+' → '+esc(p.end_date)+'</td><td>'+(p.price_tnd==null?'عند الوكالة':Number(p.price_tnd).toLocaleString('fr-TN')+' DT')+'</td><td><span class="status '+(p.is_published?'on':'')+'">'+(p.is_published?'منشورة':'Brouillon')+'</span></td><td><div class="actions"><button class="btn light small" data-edit="'+esc(p.id)+'">تعديل</button><button class="btn danger small" data-del="'+esc(p.id)+'">حذف</button></div></td></tr>'}
function attachRows(){document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=items.find(x=>x.id===b.dataset.edit)||null;view='edit';errorMsg('');paint()});document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>delItem(b.dataset.del))}
function editPage(){root.innerHTML='<div class="card" style="max-width:800px;margin:20px auto"><header class="head"><div>'+brand+'<h1>'+(editing?'تعديل برنامج':'إضافة عمرة جديدة')+'</h1></div><button id="back" class="btn light">رجوع</button></header><p class="muted">إختار Publier كان التواريخ والأسعار والفنادق تأكّدت منهم.</p><div id="edit-feedback" aria-live="assertive">'+alerts()+'</div><form id="form"><div class="formgrid">'+
 field('اسم العمرة *','title','text','span2')+
 field('تاريخ الذهاب *','start_date','date')+
 field('تاريخ العودة *','end_date','date')+
 field('شركة الطيران','airline')+
 field('التصنيف (نوفمبر، ديسمبر، رمضان...)','tag')+
 field('مسار الرحلة','route','text','span2')+
 field('الفنادق','hotel','text','span2')+
 field('السعر بالدينار التونسي (اختياري)','price_tnd','number')+
 field('رابط صورة HTTPS','image_url','url')+
 '<div class="group span2"><label for="description">تفاصيل البرنامج</label><textarea id="description" name="description">'+esc(editing?.description||'')+'</textarea></div>'+
 '<label class="check span2"><input type="checkbox" id="is_published" name="is_published" '+(editing?.is_published?'checked':'')+'> Publier — إظهار الرحلة للزوار</label></div>'+
 '<p class="hint">مبدئيًا البرامج تتسجّل Brouillon بدون نشر.</p><div class="buttons"><button type="submit" id="save" class="btn primary">حفظ في قاعدة البيانات</button><button type="button" id="cancel" class="btn light">إلغاء</button></div></form></div>';
 document.getElementById('back').onclick=document.getElementById('cancel').onclick=()=>{view='dashboard';paint()};
 document.getElementById('form').onsubmit=saveItem;
}
async function saveItem(e){
 e.preventDefault();const form=new FormData(e.target),get=k=>String(form.get(k)||'').trim();
 const title=get('title'),start=get('start_date'),end=get('end_date'),image=get('image_url'),price=get('price_tnd');
 if(title.length<3||title.length>160){setMessage('اسم العمرة لازم يكون بين 3 و160 حرف.',true);return}
 if(!/^\d{4}-\d\d-\d\d$/.test(start)||!/^\d{4}-\d\d-\d\d$/.test(end)||end<start){setMessage('تواريخ الرحلة غير صحيحة.',true);return}
 if(image&&!secureUrl(image)){setMessage('رابط الصورة لازم يبدأ بـ https://',true);return}
 if(price&&(!Number.isFinite(Number(price))||Number(price)<0)){setMessage('السعر غير صحيح.',true);return}
 const payload={title,start_date:start,end_date:end,airline:get('airline'),route:get('route'),hotel:get('hotel'),description:get('description'),tag:get('tag')||'عمرة',image_url:image||null,price_tnd:price?Number(price):null,is_published:form.get('is_published')==='on'};
 const btn=document.getElementById('save');btn.disabled=true;
 try{
  const request=editing?sb.from('omra_programs').update(payload).eq('id',editing.id):sb.from('omra_programs').insert(payload);
  // Supabase v2: a write succeeds without a trailing SELECT/RETURNING.
  // Avoid a misleading failure when the write is allowed but row-return is not.
  const {saveError}=await request;
  if(saveError)throw saveError;
  editing=null;error='';info='تمّ حفظ البرنامج بنجاح في قاعدة البيانات.';await fetchItems()
 }catch(err){
  console.error('Omra save failed:',err);
  const code=String(err?.code||'');
  const message=String(err?.message||'Erreur inconnue').slice(0,350);
  let hint='راجِع البيانات واتصال Supabase.';
  if(code==='42501'||/permission denied|row-level security/i.test(message))hint='صلاحيات RLS: راجع ارتباط User UID بجدول omra_admins وسياسات INSERT/UPDATE.';
  else if(code==='PGRST204'||/column|schema cache/i.test(message))hint='فمّا عمود ناقص في قاعدة البيانات. شغّل SQL schema.sql وتثبّت من أسماء الأعمدة.';
  else if(/jwt|token|not authenticated|session/i.test(message))hint='الجلسة انتهت، أعمل Logout وبعد Login من جديد.';
  else if(/Failed to fetch|NetworkError|fetch failed/i.test(message))hint='المتصفح ما قدرش يوصل إلى Supabase. راجع الاتصال.';
  setMessage('فشل الحفظ ('+(code||'بدون رمز')+'): '+message+' — '+hint,true);
 }finally{btn.disabled=false}
}
async function delItem(id){const p=items.find(x=>x.id===id);if(!p||!confirm('متأكّد تحب تحذف «'+p.title+'» نهائيًا؟'))return;
 const {error:deleteError}=await sb.from('omra_programs').delete().eq('id',id);if(deleteError){setMessage('فشل حذف الرحلة ('+(deleteError.code||'غير معروف')+').',true);return}
 error='';info='تم حذف الرحلة.';await fetchItems();
}

const reminderDefaults={
 id:1,enabled:true,morning_enabled:true,morning_time:'08:00',
 evening_enabled:true,evening_time:'18:30',after_prayer_enabled:true,
 after_prayer_delay_minutes:10,before_travel_enabled:true,before_travel_days:3,
 before_travel_time:'10:00',during_travel_enabled:true,during_travel_time:'09:00',
 general_enabled:true,general_interval_minutes:120,quiet_from:'23:00',quiet_until:'07:00'
};
let reminderSettings={...reminderDefaults},settingsError='',settingsAvailable=false;
async function loadSettings(){
 settingsError='';errorMsg('');view='settings';
 try{
  const {data,error:e}=await sb.from('omra_reminder_settings').select('*').eq('id',1).maybeSingle();
  if(e)throw e;
  if(!data)throw new Error('Settings row missing');
  reminderSettings={...reminderDefaults,...data};
  settingsAvailable=true;
 }catch(e){
  settingsAvailable=false;
  settingsError='جدول التذكيرات مازال ما تركّبش في Supabase، أو ما عندكش صلاحية. افتح supabase/reminder-settings.sql في GitHub ونفّذ الكود في SQL Editor. ('+String(e.code||e.message||'').slice(0,80)+')';
 }
 paint();
}
const settingsFields=[
 ['enabled','النظام الكل مفعّل','checkbox'],
 ['morning_enabled','أذكار الصباح','checkbox'],
 ['morning_time','الساعة الصباحية (توقيت تونس)','time'],
 ['evening_enabled','أذكار المساء','checkbox'],
 ['evening_time','الساعة المسائية (توقيت تونس)','time'],
 ['after_prayer_enabled','أذكار ما بعد الصلاة','checkbox'],
 ['after_prayer_delay_minutes','بعد الصلاة بـ كم دقيقة؟ (0–120)','number'],
 ['before_travel_enabled','تذكير قبل السفر','checkbox'],
 ['before_travel_days','قبل السفر بـ كم يوم؟ (1–30)','number'],
 ['before_travel_time','ساعة تذكير قبل السفر','time'],
 ['during_travel_enabled','رسالة أثناء العمرة','checkbox'],
 ['during_travel_time','ساعة التذكير أثناء العمرة','time'],
 ['general_enabled','تذكيرات عامة متنوعة','checkbox'],
 ['general_interval_minutes','الفترة بين التذكيرات بالدقائق (30–1440)','number'],
 ['quiet_from','بداية ساعات الراحة','time'],
 ['quiet_until','نهاية ساعات الراحة','time']
];
function settingsPage(){
 root.innerHTML='<div class="card" style="max-width:840px;margin:18px auto">'+brand+
 '<header class="head"><div><h1>🔔 إدارة التذكيرات</h1><p class="muted">مواعيد بتوقيت تونس — Africa/Tunis. التذكيرات داخل التطبيق، موش Push كي يتسكر.</p></div><button id="back-settings" class="btn light">رجوع</button></header>'+
 (settingsError?'<p class="alert">'+esc(settingsError)+'</p>':'')+alerts()+
 '<p class="hint">اختيارات المعتمر المحلية تنجم توقف التذكيرات. رسائل السفر ما تظهر كان للي يختار عمرتو من التطبيق.</p>'+
 '<form id="settings-form"><div class="formgrid">'+settingsFields.map(([key,label,type])=>type==='checkbox'?
 '<label class="check span2"><input type="checkbox" name="'+key+'" '+(reminderSettings[key]?'checked':'')+' '+(!settingsAvailable?'disabled':'')+'>'+esc(label)+'</label>':
 '<div class="group"><label for="setting-'+key+'">'+esc(label)+'</label><input id="setting-'+key+'" name="'+key+'" type="'+type+'" '+(!settingsAvailable?'disabled':'')+' value="'+esc(type==='time'?String(reminderSettings[key]||'').slice(0,5):reminderSettings[key])+'"></div>').join('')+
 '</div><div class="buttons"><button type="submit" id="save-settings" class="btn primary" '+(!settingsAvailable?'disabled':'')+'>حفظ إعدادات التذكيرات</button><button id="back-settings2" type="button" class="btn light">إلغاء</button></div></form><p class="hint">بعد حفظ الإعدادات تتحدّث تلقائيًا لكل مستخدم عند فتح التطبيق. الإشعارات ما يتمّش إرسالها من الخادم في النسخة هاذي.</p></div>';
 document.getElementById('back-settings').onclick=document.getElementById('back-settings2').onclick=()=>{view='dashboard';paint()};
 document.getElementById('settings-form').onsubmit=saveSettings;
}
async function saveSettings(e){
 e.preventDefault();if(!settingsAvailable)return;
 const form=new FormData(e.target),payload={};
 for(const [key,label,type] of settingsFields){
  if(type==='checkbox')payload[key]=form.get(key)==='on';
  else if(type==='number')payload[key]=Number(form.get(key));
  else payload[key]=String(form.get(key)||'').slice(0,5);
 }
 if(payload.before_travel_days<1||payload.before_travel_days>30||payload.after_prayer_delay_minutes<0||payload.after_prayer_delay_minutes>120||payload.general_interval_minutes<30||payload.general_interval_minutes>1440){
  setMessage('راجع حدود أيام السفر وتأخير الصلاة والفاصل بين الإشعارات.',true);return;
 }
 const submit=document.getElementById('save-settings');submit.disabled=true;
 const {error:saveError}=await sb.from('omra_reminder_settings').update(payload).eq('id',1);
 submit.disabled=false;
 if(saveError){setMessage('فشل حفظ الإعدادات: '+String(saveError.message).slice(0,180)+' ('+(saveError.code||'')+')',true);return}
 reminderSettings={...reminderSettings,...payload};
 setMessage('تمّ حفظ إعدادات التذكيرات في Supabase بنجاح.');
}


/* Secure client invitation + dynamic adhkar management.
   Requires supabase/story-and-adhkar.sql (no secret key on client). */
let storyInvites=[],revealedInvite='',inviteError='',customAdhkar=[],adhkarError='';
const availableAdhkarCategories=[
 ['morning','أذكار الصباح'],['evening','أذكار المساء'],['prayer','بعد الصلاة'],
 ['sleep','النوم'],['waking','الاستيقاظ'],['travel','السفر'],['umra','العمرة'],
 ['home','البيت'],['mosque','المسجد'],['food','الطعام'],['stress','الهم والفرج'],
 ['healing','الشفاء'],['rain','المطر'],['istighfar','الاستغفار'],['salawat','الصلاة على النبي'],
 ['quran','أدعية من القرآن'],['other','متنوعة'],['fasting','الصيام']
];
async function loadStoryInvites(){
 view='story-invites';inviteError='';revealedInvite='';errorMsg('');
 const r=await sb.from('omra_story_invites').select('id,program_id,customer_name,linked_user_id,claimed_at,issued_at,expires_at,revoked_at').order('issued_at',{ascending:false}).limit(150);
 if(r.error)inviteError='قاعدة بيانات المعتمرين مازالت موش مفعّلة. افتح ملف supabase/story-and-adhkar.sql في GitHub، انسخ محتواه ونفّذو في Supabase → SQL Editor → Run. ('+esc(r.error.code||r.error.message||'')+')';
 storyInvites=r.data||[];paint();
}
function storyInvitesPage(){
 const published=items.filter(x=>x.is_published);
 root.innerHTML='<div class="card" style="max-width:850px;margin:18px auto">'+brand+
 '<header class="head"><div><h1>🕋 حسابات المعتمرين</h1><p class="muted">إنشاء كود خاص بكل حريف وربطو ببرنامج عمرة منشور</p></div><button class="btn light" id="invites-back">رجوع</button></header>'+
 (inviteError?'<p class="alert">'+esc(inviteError)+'</p>':'')+alerts()+
 (revealedInvite?'<div class="admin-secret"><strong>كود العمرة الخاص — انسخو توّا وابعثو للحريف عبر WhatsApp أو Email بطريقة آمنة</strong><p>ما يبانش الكود هذا مرّة ثانية في الإدارة. ما تنشروش للعموم.</p><code id="invite-token" dir="ltr">'+esc(revealedInvite)+'</code><button id="copy-invite" class="btn primary" type="button">نسخ الكود</button></div>':'')+
 '<section class="card"><h2>إنشاء دعوة لحريف</h2><form id="create-story-invite" class="formgrid"><div class="group"><label>اسم المعتمر (للعرض في ملفّه)</label><input name="customer" maxlength="150" required minlength="2" placeholder="الاسم واللقب"></div>'+
 '<div class="group"><label>العمرة اللي مسجّل فيها</label><select name="program" required>'+published.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+' — '+esc(p.start_date)+'</option>').join('')+'</select></div>'+
 '<div class="span2 buttons"><button class="btn primary" type="submit" '+(!published.length||!!inviteError?'disabled':'')+'>إنشاء كود خاص</button></div></form><p class="hint">الحريف يعمل حساب Email / Mot de passe ثم يدخل الكود القصير متاعو في «عمرتي حكاية». الكود يتربط بأول حساب يستعملو، ومن بعد ما ينجمش شخص آخر يستعملو.</p></section>'+
 '<section class="card"><h2>الدعوات والحرفاء</h2><div class="tablewrap"><table><thead><tr><th>المعتمر</th><th>الرحلة</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>'+
 (storyInvites.length?storyInvites.map(i=>'<tr><td>'+esc(i.customer_name)+'</td><td>'+esc(items.find(p=>p.id===i.program_id)?.title||'برنامج')+'</td><td>'+ (i.revoked_at?'ملغاة':i.linked_user_id?'حساب مرتبط':'لم يستعمل الكود بعد')+'</td><td>'+(i.revoked_at?'—':'<button class="btn danger small" data-revoke-invite="'+esc(i.id)+'">إلغاء الدعوة</button>')+'</td></tr>').join(''):'<tr><td colspan="4">ما فماش دعوات بعد.</td></tr>')+
 '</tbody></table></div></section></div>';
 document.getElementById('invites-back').onclick=()=>{view='dashboard';paint()};
 document.getElementById('create-story-invite').onsubmit=createStoryInvite;
 document.getElementById('copy-invite')?.addEventListener('click',()=>{navigator.clipboard.writeText(revealedInvite).then(()=>{document.getElementById('copy-invite').textContent='تم النسخ ✓'}).catch(()=>{})});
 document.querySelectorAll('[data-revoke-invite]').forEach(b=>b.onclick=()=>revokeStoryInvite(b.dataset.revokeInvite));
}
async function createStoryInvite(e){
 e.preventDefault();const b=e.submitter;b.disabled=true;
 const f=new FormData(e.target),id=String(f.get('program')),name=String(f.get('customer')||'').trim();
 try{
  const r=await sb.rpc('omra_issue_story_invite',{p_program_id:id,p_customer_name:name});
  if(r.error)throw r.error;
  const token=r.data;
  await loadStoryInvites();revealedInvite=token;info='تم إنشاء دعوة خاصة للمعتمر.';paint();
 }catch(e){inviteError='تعذّر إنشاء الدعوة: '+String(e.message||e).slice(0,180);paint()}
 finally{b.disabled=false}
}
async function revokeStoryInvite(id){
 if(!confirm('متأكد من إلغاء دعوة المعتمر؟ هذا ينجم يمنع صاحبها من عرض الرحلة والذكريات.'))return;
 const r=await sb.rpc('omra_revoke_story_invite',{p_invite_id:id});
 if(r.error){inviteError='تعذّر إلغاء الدعوة: '+String(r.error.message).slice(0,180);paint();return}
 await loadStoryInvites();info='تم إلغاء الدعوة.';paint();
}
async function loadCustomAdhkar(){
 view='custom-adhkar';adhkarError='';errorMsg('');
 const r=await sb.from('omra_adhkar_custom').select('*').order('created_at',{ascending:false}).limit(300);
 if(r.error)adhkarError='لازم تنفّذ supabase/story-and-adhkar.sql لإضافة الأذكار عبر الإدارة. ('+esc(r.error.code||r.error.message||'')+')';
 customAdhkar=r.data||[];paint();
}
function customAdhkarPage(){
 root.innerHTML='<div class="card" style="max-width:880px;margin:18px auto">'+brand+
 '<header class="head"><div><h1>📿 إدارة أذكار التطبيق</h1><p class="muted">ما يتنشر حتى ذكر جديد إلاّ بعد مراجعة النص والمصدر من المسؤول.</p></div><button class="btn light" id="adhkar-admin-back">رجوع</button></header>'+
 (adhkarError?'<p class="alert">'+esc(adhkarError)+'</p>':'')+alerts()+
 '<form id="custom-adhkar-form"><div class="formgrid"><div class="group"><label>عنوان الذكر</label><input name="title" required maxlength="120" minlength="2"></div>'+
 '<div class="group"><label>التصنيف</label><select name="category">'+availableAdhkarCategories.map(([v,n])=>'<option value="'+v+'">'+n+'</option>').join('')+'</select></div>'+
 '<div class="group span2"><label>نصّ الذكر</label><textarea name="body" required minlength="5" maxlength="3500" rows="4"></textarea></div>'+
 '<div class="group span2"><label>المصدر / اسم السورة ورقم الآية / مرجع الحديث</label><input name="source" maxlength="250" required placeholder="مثال: سورة البقرة: 201"></div>'+
 '<label class="check span2"><input type="checkbox" name="is_published"> Publier — بعد مراجعة صحة النص والمصدر</label></div>'+
 '<div class="buttons"><button class="btn primary" type="submit" '+(adhkarError?'disabled':'')+'>حفظ الذكر</button></div></form>'+
 '<section class="card"><h2>الأذكار الإضافية ('+customAdhkar.length+')</h2><div class="tablewrap"><table><thead><tr><th>الذكر</th><th>التصنيف</th><th>الحالة</th><th>التحكّم</th></tr></thead><tbody>'+
 (customAdhkar.length?customAdhkar.map(x=>'<tr><td><strong>'+esc(x.title)+'</strong><br><small>'+esc(x.source)+'</small></td><td>'+esc(availableAdhkarCategories.find(c=>c[0]===x.category)?.[1]||x.category)+'</td><td>'+(x.is_published?'منشور':'Brouillon')+'</td><td><button class="btn light small" data-adhkar-publish="'+esc(x.id)+'">'+(x.is_published?'إخفاء':'Publier')+'</button> <button class="btn danger small" data-adhkar-delete="'+esc(x.id)+'">حذف</button></td></tr>').join(''):'<tr><td colspan="4">ما فماش أذكار إضافية بعد.</td></tr>')+
 '</tbody></table></div></section></div>';
 document.getElementById('adhkar-admin-back').onclick=()=>{view='dashboard';paint()};
 document.getElementById('custom-adhkar-form').onsubmit=createCustomAdhkar;
 document.querySelectorAll('[data-adhkar-publish]').forEach(b=>b.onclick=()=>toggleCustomAdhkar(b.dataset.adhkarPublish));
 document.querySelectorAll('[data-adhkar-delete]').forEach(b=>b.onclick=()=>deleteCustomAdhkar(b.dataset.adhkarDelete));
}
async function createCustomAdhkar(e){
 e.preventDefault();const f=new FormData(e.target);
 const payload={category:String(f.get('category')),title:String(f.get('title')||'').trim(),body:String(f.get('body')||'').trim(),source:String(f.get('source')||'').trim(),is_published:f.get('is_published')==='on'};
 const button=e.submitter;button.disabled=true;
 const r=await sb.from('omra_adhkar_custom').insert(payload);
 button.disabled=false;
 if(r.error){adhkarError='فشل حفظ الذكر: '+String(r.error.message).slice(0,180);paint();return}
 await loadCustomAdhkar();info='تم حفظ الذكر بنجاح.';paint();
}
async function toggleCustomAdhkar(id){
 const item=customAdhkar.find(x=>x.id===id);if(!item)return;
 const r=await sb.from('omra_adhkar_custom').update({is_published:!item.is_published,updated_at:new Date().toISOString()}).eq('id',id);
 if(r.error){adhkarError='فشل تحديث حالة الذكر: '+String(r.error.message);paint();return}
 await loadCustomAdhkar();info='تم تحديث حالة النشر.';paint();
}
async function deleteCustomAdhkar(id){
 if(!confirm('متأكد من حذف الذكر نهائيًا؟'))return;
 const r=await sb.from('omra_adhkar_custom').delete().eq('id',id);
 if(r.error){adhkarError='فشل حذف الذكر: '+String(r.error.message);paint();return}
 await loadCustomAdhkar();info='تم حذف الذكر.';paint();
}


/* Agency-wide, admin-only overview. The security gate is enforced in Supabase
   and the pilgrim's per-stop share_with_agency setting is OFF by default. */
let monitorState={configured:false,unlocked:false},monitorInvites=[],monitorStops=[],monitorPhotos=[],monitorUrls={},monitorError='',monitorInfo='',monitorBusy=false,monitorSearch='';
const monitorMap=s=>'https://www.google.com/maps?q='+encodeURIComponent(s.latitude+','+s.longitude);
const monitorDate=d=>d?new Date(d).toLocaleString('fr-TN'):'';
async function loadMonitor(){
  view='monitor';monitorError='';monitorInfo='';monitorBusy=true;paint();
  try{
    const r=await sb.rpc('omra_monitor_status');
    if(r.error)throw r.error;
    monitorState=r.data||{configured:false,unlocked:false};
    if(monitorState.unlocked)await fetchMonitorData();
  }catch(e){monitorError='خاصية المتابعة تحتاج تفعيل SQL في Supabase: '+String(e.message||e).slice(0,180)}
  finally{monitorBusy=false;paint()}
}
async function fetchMonitorData(){
  const [i,s,p]=await Promise.all([
    sb.from('omra_story_invites').select('id,customer_name,program_id,linked_user_id,revoked_at,omra_programs(title,start_date,end_date)').is('revoked_at',null).order('issued_at',{ascending:false}).limit(300),
    sb.from('omra_story_stops').select('id,invite_id,title,visited_at,note,latitude,longitude,location_shared_at,updated_at,share_with_agency').eq('share_with_agency',true).order('updated_at',{ascending:false}).limit(600),
    sb.from('omra_story_photos').select('id,invite_id,stop_id,storage_path,caption,created_at').order('created_at',{ascending:false}).limit(500)
  ]);
  if(i.error||s.error||p.error)throw (i.error||s.error||p.error);
  monitorInvites=i.data||[];monitorStops=s.data||[];monitorPhotos=p.data||[];
  monitorUrls={};
  // Restrict expensive signed-URL requests; the full photo count is still visible.
  const rows=monitorPhotos.slice(0,120);
  const urls=await Promise.all(rows.map(async photo=>{
    try{
      const r=await sb.storage.from('wv-omra-private').createSignedUrl(photo.storage_path,600);
      return [photo.id,r.data?.signedUrl||''];
    }catch{return [photo.id,'']}
  }));
  monitorUrls=Object.fromEntries(urls.filter(([,url])=>url));
}
function monitorPage(){
  const header='<header class="head"><div>'+brand+'<h1>👥 متابعة جميع المعتمرين</h1><p class="muted">إدارة Walid Voyages · محتوى يشاركه المعتمر بموافقته فقط</p></div><div class="buttons"><button id="monitor-back" class="btn light">رجوع للإدارة</button></div></header>';
  const alert=(monitorError?'<p class="alert" role="alert">'+esc(monitorError)+'</p>':'')+(monitorInfo?'<p class="alert good">'+esc(monitorInfo)+'</p>':'');
  let body='';
  if(monitorBusy){
    body='<section class="card"><p>جاري تحميل لوحة المتابعة…</p></section>';
  }else if(!monitorState.configured){
    body='<section class="card monitor-gate"><h2>🔐 إنشاء كود إشراف موحّد</h2><p>هذا الكود للإدارة فقط، ويخدم مع حساب Admin متاعك. اختار كود قوي من 16 حرف على الأقل، واحفظه في بلاصة آمنة. الكود ما يتخزّنش في GitHub.</p><form id="monitor-set-code"><div class="group"><label for="monitor-new-code">كود الإشراف الجديد</label><input id="monitor-new-code" name="code" type="password" required minlength="16" maxlength="120" autocomplete="new-password" dir="ltr"></div><div class="group"><label for="monitor-confirm-code">تأكيد الكود</label><input id="monitor-confirm-code" name="confirm" type="password" required minlength="16" maxlength="120" autocomplete="new-password" dir="ltr"></div><button class="btn primary" type="submit">حفظ الكود الموحّد</button></form></section>';
  }else if(!monitorState.unlocked){
    body='<section class="card monitor-gate"><h2>🔑 كود متابعة الإدارة</h2><p>بعد دخولك بحساب Admin، أدخل كود الإشراف الموحّد لفتح قائمة المعتمرين المصرّحين بالمشاركة. جلسة المتابعة مدتها ساعة وتتقفل تلقائيًا.</p><form id="monitor-unlock"><div class="group"><label for="monitor-code">الكود الموحّد</label><input id="monitor-code" type="password" name="code" required minlength="16" autocomplete="off" dir="ltr"></div><button class="btn primary full" type="submit">فتح المتابعة</button></form><p class="hint">إذا ضيّعت الكود، مسؤول Admin مخوّل ينجم يغيّرو، وبعدها تتلغى جلسات المتابعة القديمة.</p><button type="button" id="monitor-change-code" class="btn light">تغيير كود الإشراف</button><div id="monitor-change-area"></div></section>';
  }else{
    const active=monitorInvites.filter(i=>i.linked_user_id);
    const sharedIds=new Set(monitorStops.map(s=>s.invite_id));
    const filter=monitorSearch.trim().toLocaleLowerCase();
    const visible=monitorInvites.filter(i=>!filter||[i.customer_name,i.omra_programs?.title||''].join(' ').toLocaleLowerCase().includes(filter));
    body='<div class="stats"><div class="stat"><strong>'+active.length+'</strong><span>معتمرين عندهم حسابات</span></div><div class="stat"><strong>'+sharedIds.size+'</strong><span>معتمرين شاركوا محتوى</span></div><div class="stat"><strong>'+monitorStops.length+'</strong><span>محطات مشتركة</span></div></div>'+
    '<section class="card"><div class="toolbar"><h2>ذكريات المعتمرين</h2><div class="buttons"><button id="monitor-refresh" class="btn light">🔄 تحديث</button><button id="monitor-lock" class="btn danger">🔒 قفل المتابعة</button></div></div><p class="hint">تظهر فقط المحطات والصور والمواقع اللي سمح المعتمر للوكالة تشوفها. المواقع موش مباشرة؛ هي نقاط سجّلها المعتمر بنفسه.</p>'+
    '<div class="toolbar"><input type="search" id="monitor-search" value="'+esc(monitorSearch)+'" placeholder="ابحث باسم المعتمر أو البرنامج…"></div>'+
    (visible.length?visible.map(inv=>{
      const recs=monitorStops.filter(s=>s.invite_id===inv.id);
      const program=inv.omra_programs?.title||'برنامج العمرة';
      return '<article class="monitor-pilgrim"><div class="monitor-pilgrim-head"><div><strong>👤 '+esc(inv.customer_name)+'</strong><p class="muted">'+esc(program)+'</p></div><span class="status '+(recs.length?'on':'')+'">'+(recs.length?'شارك '+recs.length+' محطة':inv.linked_user_id?'لا توجد مشاركة':'لم يُفعّل الحساب')+'</span></div>'+
      (recs.length?recs.map(s=>{
        const pics=monitorPhotos.filter(p=>p.stop_id===s.id);
        return '<div class="monitor-stop"><strong>📍 '+esc(s.title)+'</strong>'+(s.visited_at?'<small>زيارة: '+esc(monitorDate(s.visited_at))+'</small>':'')+
        (s.note?'<p>'+esc(s.note)+'</p>':'')+
        (s.latitude!=null&&s.longitude!=null?'<a target="_blank" rel="noopener noreferrer" href="'+esc(monitorMap(s))+'">🗺️ الموقع اللي سجّلو المعتمر ('+esc(monitorDate(s.location_shared_at))+')</a>':'')+
        (pics.length?'<div class="monitor-gallery">'+pics.map(p=>monitorUrls[p.id]?'<a target="_blank" rel="noopener noreferrer" href="'+esc(monitorUrls[p.id])+'" aria-label="افتح صورة مشتركة"><img loading="lazy" alt="صورة مشتركة من المعتمر" src="'+esc(monitorUrls[p.id])+'"></a>':'<span class="monitor-photo-placeholder">📷</span>').join('')+'</div>':'')+
        '</div>';
      }).join(''):'<p class="muted">ما فماش ذكريات متاحة للوكالة من هذا المعتمر.</p>')+'</article>';
    }).join(''):'<p class="muted">ما فماش معتمرين مطابقين للبحث.</p>')+'</section>';
  }
  root.innerHTML=header+alert+body+'<p class="bottom">© Walid Voyages · متابعة بموافقة المعتمر</p>';
  document.getElementById('monitor-back').onclick=()=>{view='dashboard';paint()};
  document.getElementById('monitor-set-code')?.addEventListener('submit',monitorSetCode);
  document.getElementById('monitor-unlock')?.addEventListener('submit',monitorUnlock);
  document.getElementById('monitor-refresh')?.addEventListener('click',()=>loadMonitor());
  document.getElementById('monitor-lock')?.addEventListener('click',monitorLock);
  document.getElementById('monitor-search')?.addEventListener('input',e=>{
    const cursor=e.target.selectionStart;monitorSearch=e.target.value;monitorPage();
    const next=document.getElementById('monitor-search');next?.focus();next?.setSelectionRange(cursor,cursor);
  });
  document.getElementById('monitor-change-code')?.addEventListener('click',()=>{
    const target=document.getElementById('monitor-change-area');
    target.innerHTML='<form id="monitor-set-code"><div class="group"><label>كود جديد (16 حرف على الأقل)</label><input type="password" name="code" required minlength="16" maxlength="120" autocomplete="new-password"></div><div class="group"><label>تأكيد الكود الجديد</label><input type="password" name="confirm" required minlength="16" maxlength="120" autocomplete="new-password"></div><button type="submit" class="btn primary">تغيير الكود وإلغاء الجلسات القديمة</button></form>';
    target.querySelector('form').addEventListener('submit',monitorSetCode);
  });
}
async function monitorSetCode(e){
  e.preventDefault();
  if(monitorBusy)return;
  const f=new FormData(e.currentTarget),code=String(f.get('code')||''),confirmCode=String(f.get('confirm')||'');
  if(code.length<16||code!==confirmCode){monitorError='الكود يلزم يكون 16 حرف على الأقل ومتطابق في الخانتين.';paint();return}
  monitorBusy=true;monitorError='';paint();
  try{
    const r=await sb.rpc('omra_monitor_set_code',{p_code:code});if(r.error)throw r.error;
    monitorInfo='تسجّل الكود بنجاح. استعمله توّا لفتح المتابعة.';monitorState={configured:true,unlocked:false};
  }catch(e){monitorError='تعذّر حفظ الكود: '+String(e.message||e).slice(0,150)}
  finally{monitorBusy=false;paint()}
}
async function monitorUnlock(e){
  e.preventDefault();if(monitorBusy)return;
  const code=String(new FormData(e.currentTarget).get('code')||'');
  monitorBusy=true;monitorError='';paint();
  try{
    const r=await sb.rpc('omra_monitor_unlock',{p_code:code});if(r.error)throw r.error;
    if(!r.data){monitorError='الكود موش صحيح أو برشا محاولات فاشلة. إذا تعاود تغلط استنى 15 دقيقة.'}
    else{monitorState.unlocked=true;await fetchMonitorData();monitorInfo='اللوحة محلولة لمدة ساعة.'}
  }catch(e){monitorState.unlocked=false;monitorError='تعذّر فتح المتابعة: '+String(e.message||e).slice(0,160)}
  finally{monitorBusy=false;paint()}
}
async function monitorLock(){
  if(monitorBusy)return;monitorBusy=true;paint();
  try{
    const r=await sb.rpc('omra_monitor_lock');if(r.error)throw r.error;
    monitorState.unlocked=false;monitorStops=[];monitorPhotos=[];monitorUrls={};monitorInfo='تسكّرت المتابعة.';
  }catch(e){monitorError=String(e.message||e)}
  finally{monitorBusy=false;paint()}
}

let signupRows=[],signupError='',signupMessage='',signupSecret='',signupBusy=false;
async function loadSignupRequests(){
 view='signups';signupBusy=true;signupError='';signupMessage='';paint();
 const r=await sb.from('omra_account_requests')
  .select('user_id,email,full_name,phone,status,requested_at,reviewed_at,activated_at')
  .order('requested_at',{ascending:false}).limit(350);
 if(r.error)signupError='تعذّر تحميل طلبات التسجيل: '+String(r.error.message).slice(0,130);
 else signupRows=r.data||[];
 signupBusy=false;paint();
}
function signupRequestsPage(){
 const pending=signupRows.filter(x=>x.status==='pending').length;
 const waiting=signupRows.filter(x=>x.status==='approved'&&!x.activated_at).length;
 root.innerHTML='<header class="head"><div>'+brand+'<h1>📝 طلبات تسجيل الحسابات</h1><p class="muted">الطلبات الجديدة تظهر هنا؛ لازم إيقاف Confirm email في Supabase.</p></div><button id="signup-back" class="btn light">رجوع</button></header>'+
 (signupError?'<p class="alert">'+esc(signupError)+'</p>':'')+
 (signupMessage?'<p class="alert good">'+esc(signupMessage)+'</p>':'')+
 (signupSecret?'<section class="card admin-secret"><h2>🔑 كود تفعيل الحساب</h2><p>انسخو توّا: الكود يظهر مرّة واحدة فقط. ابعثه للحريف في WhatsApp، ما تنشروش للعموم.</p><code dir="ltr" id="signup-code">'+esc(signupSecret)+'</code><button class="btn primary" type="button" id="signup-copy">نسخ الكود</button><button class="btn light" type="button" id="signup-close-secret">إخفاء الكود</button></section>':'')+
 '<div class="stats"><div class="stat"><strong>'+pending+'</strong><span>طلبات جديدة</span></div><div class="stat"><strong>'+waiting+'</strong><span>في انتظار التفعيل</span></div><div class="stat"><strong>'+signupRows.length+'</strong><span>جميع الحسابات</span></div></div>'+
 '<section class="card"><div class="toolbar"><h2>طلبات الحرفاء</h2><button id="signup-reload" class="btn light">🔄 تحديث</button></div>'+
 (signupBusy?'<p>جاري تحميل الطلبات…</p>':'<div class="tablewrap"><table><thead><tr><th>الحريف</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>'+
 (signupRows.length?signupRows.map(x=>'<tr><td><strong>'+esc(x.full_name||'مستخدم')+'</strong><p dir="ltr">'+esc(x.email)+'</p><small dir="ltr">'+esc(x.phone||'—')+'</small></td><td>'+
 (x.status==='pending'?'⏳ انتظار':x.status==='rejected'?'❌ مرفوض':x.activated_at?'✅ مفعّل':'🔑 مقبول — يستنى الكود')+
 '</td><td><div class="buttons">'+
 ((!x.activated_at)?'<button class="btn primary small" data-signup-user="'+esc(x.user_id)+'" data-signup-decision="approved">'+(x.status==='approved'?'إعادة إصدار كود':'✅ Accept + Code')+'</button>':'')+
 ((!x.activated_at&&x.status!=='rejected')?'<button class="btn danger small" data-signup-user="'+esc(x.user_id)+'" data-signup-decision="rejected">❌ Refuser</button>':'')+
 '</div></td></tr>').join(''):'<tr><td colspan="3">ما فماش طلبات حتى توّا.</td></tr>')+'</tbody></table></div>')+
 '<p class="hint">كود تفعيل الحساب WV-ACT مختلف عن كود ربط حجز العمرة WV.</p></section>';
 document.getElementById('signup-back').onclick=()=>{view='dashboard';paint()};
 document.getElementById('signup-reload').onclick=()=>{signupSecret='';loadSignupRequests()};
 document.getElementById('signup-copy')?.addEventListener('click',()=>navigator.clipboard.writeText(signupSecret).then(()=>{document.getElementById('signup-copy').textContent='تم النسخ ✓'}));
 document.getElementById('signup-close-secret')?.addEventListener('click',()=>{signupSecret='';paint()});
 document.querySelectorAll('[data-signup-decision]').forEach(b=>b.onclick=()=>reviewSignup(b.dataset.signupUser,b.dataset.signupDecision));
}
async function reviewSignup(id,decision){
 if(signupBusy||!id||!['approved','rejected'].includes(decision))return;
 if(decision==='rejected'&&!confirm('متأكد تحب ترفض الحساب؟'))return;
 signupBusy=true;signupError='';signupMessage='';signupSecret='';paint();
 try{
  // Server-side Edge Function verifies the Admin session and confirms the email
  // in Supabase Auth before exposing the single-use activation code.
  const {data,error}=await sb.functions.invoke('omra-review-account',{body:{userId:id,decision}});
  if(error)throw Error(data?.error||error.message||'تعذّر الاتصال بخدمة مراجعة الحساب');
  if(data?.error)throw Error(data.error);
  if(decision==='approved'){
   if(!data?.approved||!data?.code)throw Error('ما نجّمتش نولّد كود التفعيل. عاود جرّب.');
   signupSecret=String(data.code);
   signupMessage='تم قبول الحساب وتأكيده في Supabase. انسخ كود التفعيل وابعثه عبر WhatsApp.';
  }else signupMessage='تم رفض الحساب.';
 }catch(err){signupError='تعذّر معالجة الطلب: '+String(err?.message||err).slice(0,185)}
 const rows=await sb.from('omra_account_requests')
  .select('user_id,email,full_name,phone,status,requested_at,reviewed_at,activated_at')
  .order('requested_at',{ascending:false}).limit(350);
 if(!rows.error)signupRows=rows.data||[];
 signupBusy=false;paint();
}

async function logout(){await sb.auth.signOut();user=null;items=[];view='login';monitorState={configured:false,unlocked:false};monitorInvites=[];monitorStops=[];monitorPhotos=[];monitorUrls={};errorMsg('');paint()}
async function initialize(){
 paint();if(!okConfig())return;sb=window.supabase.createClient(cfg.url,cfg.anonKey);
 sb.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){recovery=true;view='recover';paint()}});
 try{const {data}=await sb.auth.getSession();if(data.session&&!recovery){if(await isAdmin())await fetchItems();else{await sb.auth.signOut();view='login';paint()}}}catch(e){console.warn('Unable to restore admin session')}
}
initialize();
