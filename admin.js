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
 '<div class="admin-special"><button id="reminder-settings" class="btn light">🔔 إدارة التذكيرات ومواقيتها</button><button id="story-invites-open" class="btn light">🕋 حسابات المعتمرين وكود الرحلة</button><button id="custom-adhkar-open" class="btn light">📿 إضافة أذكار للتطبيق</button><span class="muted">إعدادات تظهر للجميع بعد الحفظ في Supabase</span></div><div class="stats"><div class="stat"><strong>'+items.length+'</strong><span>البرامج الكل</span></div><div class="stat"><strong>'+published+'</strong><span>المنشورة</span></div><div class="stat"><strong>'+upcoming+'</strong><span>القادمة والحالية</span></div></div>'+
 '<section class="card"><h2>البرامج</h2><p class="muted">الـSauvegarde تسجّل كلّ تعديل في قاعدة Supabase. البرنامج غير المنشور ما يظهرش للزائر.</p>'+alerts()+'<div class="toolbar"><input type="search" id="search" value="'+esc(query)+'" placeholder="ابحث عن برنامج…"><button id="new" class="btn primary">+ إضافة عمرة</button></div>'+
 '<div class="tablewrap"><table><thead><tr><th>اسم العمرة</th><th>التواريخ</th><th>السعر</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody id="rows">'+(filtered.length?filtered.map(row).join(''):'<tr><td colspan="5">ما فماش برامج بعد.</td></tr>')+'</tbody></table></div></section><p class="bottom">© Walid Voyages · Espace Admin</p>';
 document.getElementById('logout').onclick=logout;
 document.getElementById('reminder-settings').onclick=loadSettings;
 document.getElementById('story-invites-open').onclick=loadStoryInvites;
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
 if(r.error)inviteError='قاعدة بيانات المعتمرين مازالت موش مفعّلة. نفّذ supabase/story-and-adhkar.sql في SQL Editor. ('+esc(r.error.code||r.error.message||'')+')';
 storyInvites=r.data||[];paint();
}
function storyInvitesPage(){
 const published=items.filter(x=>x.is_published);
 root.innerHTML='<div class="card" style="max-width:850px;margin:18px auto">'+brand+
 '<header class="head"><div><h1>🕋 حسابات المعتمرين</h1><p class="muted">إنشاء كود خاص بكل حريف وربطو ببرنامج عمرة منشور</p></div><button class="btn light" id="invites-back">رجوع</button></header>'+
 (inviteError?'<p class="alert">'+esc(inviteError)+'</p>':'')+alerts()+
 (revealedInvite?'<div class="admin-secret"><strong>الكود الخاص — انسخو توّا وابعثو للحريف بطريقة آمنة</strong><p>ما يبانش الكود هذا مرّة ثانية في الإدارة. ما تنشروش للعموم.</p><code id="invite-token" dir="ltr">'+esc(revealedInvite)+'</code><button id="copy-invite" class="btn primary" type="button">نسخ الكود</button></div>':'')+
 '<section class="card"><h2>إنشاء دعوة لحريف</h2><form id="create-story-invite" class="formgrid"><div class="group"><label>اسم المعتمر (للعرض في ملفّه)</label><input name="customer" maxlength="150" required minlength="2" placeholder="الاسم واللقب"></div>'+
 '<div class="group"><label>العمرة اللي مسجّل فيها</label><select name="program" required>'+published.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+' — '+esc(p.start_date)+'</option>').join('')+'</select></div>'+
 '<div class="span2 buttons"><button class="btn primary" type="submit" '+(!published.length||!!inviteError?'disabled':'')+'>إنشاء كود خاص</button></div></form><p class="hint">الحريف يعمل حساب Email / Mot de passe ثم يدخل الكود. الكود يتربط بأول حساب يستعملو، ومن بعد ما ينجمش شخص آخر يستعملو.</p></section>'+
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

async function logout(){await sb.auth.signOut();user=null;items=[];view='login';errorMsg('');paint()}
async function initialize(){
 paint();if(!okConfig())return;sb=window.supabase.createClient(cfg.url,cfg.anonKey);
 sb.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){recovery=true;view='recover';paint()}});
 try{const {data}=await sb.auth.getSession();if(data.session&&!recovery){if(await isAdmin())await fetchItems();else{await sb.auth.signOut();view='login';paint()}}}catch(e){console.warn('Unable to restore admin session')}
}
initialize();
