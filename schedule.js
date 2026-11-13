/* Walid Voyages — scheduled guidance, not a Push server.
   All clocks use Africa/Tunis. Pilgrimage notices require explicit trip selection.
*/
(function(){
'use strict';
const defaults={enabled:true,morning_enabled:true,morning_time:'08:00',evening_enabled:true,evening_time:'18:30',after_prayer_enabled:true,after_prayer_delay_minutes:10,before_travel_enabled:true,before_travel_days:3,before_travel_time:'10:00',during_travel_enabled:true,during_travel_time:'09:00',general_enabled:true,general_interval_minutes:120,quiet_from:'23:00',quiet_until:'07:00'};
let settings={...defaults};
let trips=[];
let chosen=read('selected-trip',null);
let dismissed={},toast=null,timer=null,enabled=read('journey-alerts-enabled',true)!==false;
const nowParts=()=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Tunis',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return {date:parts.year+'-'+parts.month+'-'+parts.day,clock:parts.hour+':'+parts.minute,minutes:Number(parts.hour)*60+Number(parts.minute)}};
const minutes=s=>{const x=String(s||'00:00').split(':');return Number(x[0])*60+Number(x[1])};
const within=(current,start,end)=>start<=end?current>=start&&current<end:current>=start||current<end;
const dateDiff=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);
const dayKey=key=>nowParts().date+':'+key;
const done=key=>read('schedule-done-'+key,false);
const remember=key=>save('schedule-done-'+key,true);
function quiet(clock){const time=minutes(clock);return within(time,minutes(settings.quiet_from),minutes(settings.quiet_until))}
function allowedTime(clock,start,windowMins=85){
 const m=minutes(clock),s=minutes(start);
 return ((m-s+1440)%1440)<windowMins;
}
function show(item,key){
 if(!enabled||!settings.enabled||document.hidden||done(key)||quiet(nowParts().clock))return;
 remember(key);toast=item;
 if(timer)clearTimeout(timer);
 render();
 timer=setTimeout(()=>{toast=null;render()},12500);
}
function toastHtml(){if(!toast)return '';return '<aside class="faith-toast scheduled-toast" role="status"><div class="faith-toast-icon">'+toast.emoji+'</div><div class="faith-toast-body"><span class="faith-kicker">تذكير من Walid Voyages</span><strong>'+escapeHtml(toast.title)+'</strong><p>'+escapeHtml(toast.body)+'</p><small>'+escapeHtml(toast.source)+'</small><button type="button" class="faith-toast-more" data-schedule="open">تفاصيل التذكيرات '+icon('arrow',13)+'</button></div><button type="button" class="faith-toast-close" data-schedule="dismiss" aria-label="إغلاق">×</button></aside>'}
function upcoming(){
 const x=trips.find(p=>p.id===chosen&&p.start&&p.end);return x||null;
}
function perform(){
 if(!enabled||!settings.enabled||document.hidden)return;
 const n=nowParts();if(quiet(n.clock))return;
 if(settings.morning_enabled&&allowedTime(n.clock,settings.morning_time,100)){
  show({emoji:'☀️',title:'أذكار الصباح',body:'اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.',source:'صباح الخير وذكر الله'},dayKey('morning'));return;
 }
 if(settings.evening_enabled&&allowedTime(n.clock,settings.evening_time,100)){
  show({emoji:'🌙',title:'أذكار المساء',body:'اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.',source:'مساء الخير وذكر الله'},dayKey('evening'));return;
 }
 if(settings.after_prayer_enabled&&state.prayers){
  for(const [name,label] of [['Fajr','الفجر'],['Dhuhr','الظهر'],['Asr','العصر'],['Maghrib','المغرب'],['Isha','العشاء']]){
   const t=String(state.prayers[name]||'').slice(0,5);
   if(/^\d{2}:\d{2}$/.test(t)&&allowedTime(n.clock,minutesToClock((minutes(t)+settings.after_prayer_delay_minutes)%1440),35)){
    show({emoji:'📿',title:'ذكر بعد صلاة '+label,body:'أستغفر الله ثلاثًا، اللهم أنت السلام ومنك السلام تباركت يا ذا الجلال والإكرام.',source:'التوقيت حسب مدينة الصلاة المختارة'},dayKey('prayer-'+name));return;
   }
  }
 }
 const journey=upcoming();
 if(!journey)return;
 const days=dateDiff(journey.start,n.date);
 if(settings.before_travel_enabled&&days>=0&&days<=settings.before_travel_days&&allowedTime(n.clock,settings.before_travel_time,120)){
  show({emoji:'✈️',title:'الاستعداد لـ '+journey.title,body:'تبقّى '+days+' يوم على موعد الانطلاق المُعلن. تثبّت من الحجز والتذاكر والمتطلبات الرسمية مع الوكالة.',source:'برنامج اخترته للمتابعة، لا يعني تأكيد الحجز'},dayKey('before-'+journey.id));return;
 }
 if(settings.during_travel_enabled&&days<0&&dateDiff(journey.end,n.date)>=0&&allowedTime(n.clock,settings.during_travel_time,120)){
  show({emoji:'🕋',title:'رافقك الله في '+journey.title,body:'احرص على الذكر والرفق بالناس والالتزام بتعليمات المرافقين داخل الحرم.',source:'رسالة تذكير أثناء فترة الرحلة المعلنة'},dayKey('during-'+journey.id));return;
 }
}
function minutesToClock(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function pageHtml(){
 const trip=upcoming();
 return viewTitle('تذكيرات المعتمر','برنامجك وتذكيراتك الشخصية')+
 '<div class="card schedule-settings"><div class="section-head"><h2>الرحلة اللي تحب تتابعها</h2><span class="mini-label">اختيار شخصي</span></div><p class="muted" style="font-size:11px">اختيار عمرتك هنا ما يعملش حجز. الإشعارات الخاصة بالسفر تظهر كان للرحلة اللي تختارها.</p>'+
 '<select class="journey-select" id="journey-choice" aria-label="اختر الرحلة"><option value="">من غير رحلة محدّدة</option>'+
 trips.filter(p=>p.end>=nowParts().date).map(p=>'<option value="'+escapeHtml(p.id)+'" '+(p.id===chosen?'selected':'')+'>'+escapeHtml(p.title)+' · '+escapeHtml(p.start)+'</option>').join('')+'</select>'+
 (trip?'<p class="schedule-selected">🕋 '+escapeHtml(trip.title)+' · من '+escapeHtml(trip.start)+' إلى '+escapeHtml(trip.end)+'</p>':'<p class="faith-note">اختار الرحلة من البرامج المنشورة في الإدارة باش يظهرلك تذكير ما قبل الانطلاق وأثناء الإقامة.</p>')+
 '<label class="journey-switch-line"><input type="checkbox" id="journey-alerts" '+(enabled?'checked':'')+'> تفعيل تذكيرات المعتمر</label></div>'+
 '<section class="section"><div class="section-head"><h2>برنامج التذكيرات</h2></div>'+
 '<div class="schedule-list">'+[
 ['☀️','أذكار الصباح',settings.morning_enabled?settings.morning_time:'متوقفة'],
 ['🌙','أذكار المساء',settings.evening_enabled?settings.evening_time:'متوقفة'],
 ['📿','بعد الصلاة',settings.after_prayer_enabled?'بعد '+settings.after_prayer_delay_minutes+' دق':'متوقفة'],
 ['✈️','قبل السفر',settings.before_travel_enabled?'قبل '+settings.before_travel_days+' يوم':'متوقفة'],
 ['🕋','أثناء العمرة',settings.during_travel_enabled?settings.during_travel_time:'متوقفة']
 ].map(([emoji,label,time])=>'<div class="card schedule-item"><span>'+emoji+'</span><strong>'+label+'</strong><small>'+escapeHtml(time)+'</small></div>').join('')+'</div></section>'+
 '<div class="card worship-card"><h3>🔔 إشعارات التطبيق</h3><p>الأوقات يحدّدها المسؤول في Espace Admin بتوقيت تونس. التذكيرات تظهر أثناء تشغيل التطبيق، أما إرسال Push والهاتف مغلق يحتاج خادم إرسال مستقل وموافقة المستخدم.</p></div>';
}
document.addEventListener('change',e=>{
 if(e.target.id==='journey-choice'){chosen=e.target.value||null;save('selected-trip',chosen);render();perform()}
 if(e.target.id==='journey-alerts'){enabled=e.target.checked;save('journey-alerts-enabled',enabled);render()}
});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-schedule]');
 if(!b)return;
 if(b.dataset.schedule==='dismiss'){toast=null;if(timer)clearTimeout(timer);render()}
 if(b.dataset.schedule==='open'){toast=null;selectTab('more','schedule')}
});
window.WVSchedule={
 configure(v){settings={...defaults,...v};perform()},
 onTrips(arr){trips=Array.isArray(arr)?arr:[];perform()},
 pageHtml,toastHtml,
 getSettings(){return settings},
 getChosen(){return chosen}
};
setTimeout(perform,2800);
setInterval(perform,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)perform()});
})();
