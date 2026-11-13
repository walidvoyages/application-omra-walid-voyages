/* Walid Voyages · Gentle faith reminders
   In-app notifications work without a backend. Device notifications are optional,
   user-initiated and best effort while this page/PWA is running, NOT Web Push.
*/
(function(){
'use strict';
const reminders=[
 {kind:'salawat',emoji:'🕊️',title:'هل صلّيت على النبي ﷺ اليوم؟',body:'اللهم صلِّ وسلِّم على نبينا محمد.',source:'تذكير بالصلاة على النبي ﷺ'},
 {kind:'quran',emoji:'📖',title:'آية تطمئنّ قلبك',body:'﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾',source:'سورة الرعد · الآية 28'},
 {kind:'dhikr',emoji:'📿',title:'دقيقة ذكر',body:'سبحان الله وبحمده، سبحان الله العظيم.',source:'ذكر'},
 {kind:'quran',emoji:'🌿',title:'تذكير من القرآن',body:'﴿فَإِنَّ مَعَ الْعُسْرِ يُسْرًا﴾',source:'سورة الشرح · الآية 5'},
 {kind:'dhikr',emoji:'🤲',title:'استغفار',body:'أستغفر الله وأتوب إليه.',source:'ذكر'},
 {kind:'quran',emoji:'✨',title:'دعاء من القرآن',body:'﴿وَقُلْ رَبِّ زِدْنِي عِلْمًا﴾',source:'سورة طه · الآية 114'},
 {kind:'salawat',emoji:'🕊️',title:'صلّ على الحبيب ﷺ',body:'اللهم صلِّ على محمد وعلى آل محمد.',source:'صلاة على النبي ﷺ'},
 {kind:'quran',emoji:'🌙',title:'آية تذكّرك بالصبر',body:'﴿إِنَّ اللَّهَ مَعَ الصَّابِرِينَ﴾',source:'سورة البقرة · الآية 153'},
 {kind:'dhikr',emoji:'📿',title:'لا تنس الذكر',body:'لا حول ولا قوة إلا بالله.',source:'ذكر'},
 {kind:'quran',emoji:'🌸',title:'توكل على الله',body:'﴿إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ﴾',source:'سورة آل عمران · الآية 159'},
 {kind:'dhikr',emoji:'💚',title:'ذكر خفيف',body:'الحمد لله، سبحان الله، الله أكبر.',source:'ذكر'},
 {kind:'dua',emoji:'🤲',title:'دعاء جميل',body:'اللهم اغفر لي وارحمني واهدني وارزقني.',source:'دعاء'}
];
const storageRead=(key,defaultValue)=>{try{const raw=localStorage.getItem('wv-'+key);return raw===null?defaultValue:JSON.parse(raw)}catch{return defaultValue}};
const storageSave=(key,val)=>{try{localStorage.setItem('wv-'+key,JSON.stringify(val))}catch{}};
let enabled=storageRead('reminders-enabled',true)!==false;
let cadence=[30,60,120].includes(Number(storageRead('reminders-frequency',60)))?Number(storageRead('reminders-frequency',60)):60;
let deviceEnabled=storageRead('reminders-device',false)===true;
let history=storageRead('reminders-history',[]);
if(!Array.isArray(history))history=[];
history=history.filter(i=>typeof i?.index==='number'&&i.index>=0&&i.index<reminders.length&&Number.isFinite(i.at)).slice(0,25);
let lastIndex=Number(storageRead('reminders-index',-1));
let lastAutomatic=Number(storageRead('reminders-last-time',0));
let seenAt=Number(storageRead('reminders-seen-at',0));
let visibleToast=null;
let closeTimer=null;
let pageMessage='';
let tickTimer=null;
const shortTime=time=>new Intl.DateTimeFormat('ar-TN',{hour:'2-digit',minute:'2-digit'}).format(new Date(time));
const latest=()=>history.length?reminders[history[0].index]:reminders[0];
function unreadCount(){return Math.min(9,history.filter(entry=>entry.at>seenAt).length)}
function markRead(){seenAt=Date.now();storageSave('reminders-seen-at',seenAt)}
function toastHtml(){
 if(!visibleToast)return '';
 const item=reminders[visibleToast.index];
 return '<aside class="faith-toast" role="status" aria-label="تذكير إيماني">'+
 '<div class="faith-toast-icon">'+item.emoji+'</div><div class="faith-toast-body">'+
 '<span class="faith-kicker">تذكير لطيف من Walid Voyages</span>'+
 '<strong>'+escapeHtml(item.title)+'</strong><p>'+escapeHtml(item.body)+'</p>'+
 '<small>'+escapeHtml(item.source)+'</small>'+
 '<button type="button" class="faith-toast-more" data-faith="view">شوف التذكيرات '+icon('arrow',13)+'</button></div>'+
 '<button class="faith-toast-close" type="button" data-faith="dismiss" aria-label="إغلاق التذكير">×</button></aside>';
}
function dismiss(){visibleToast=null;if(closeTimer){clearTimeout(closeTimer);closeTimer=null}render()}
function showToast(index){
 if(closeTimer)clearTimeout(closeTimer);
 visibleToast={index};
 render();
 closeTimer=setTimeout(()=>{if(visibleToast&&visibleToast.index===index)dismiss()},13000);
}
const isQuiet=()=>{const hour=new Date().getHours();return hour>=23||hour<7};
async function showDevice(item){
 if(!deviceEnabled||!('Notification' in window)||Notification.permission!=='granted')return;
 // Device notifications here only happen when the app remains active in a browser.
 if(!document.hidden)return;
 try{
  const details={body:item.body,tag:'wv-faith-reminder',icon:'./icon.svg',badge:'./icon.svg'};
  const worker=('serviceWorker' in navigator)?await navigator.serviceWorker.getRegistration():null;
  if(worker&&typeof worker.showNotification==='function')await worker.showNotification(item.title,details);
  else new Notification(item.title,details);
 }catch(err){console.warn('Device reminder unavailable:',err?.message)}
}
function showNext(automatic=false){
 if(automatic&&(!generalAllowed()||isQuiet()))return false;
 const next=(Number.isInteger(lastIndex)?lastIndex:-1)+1;
 lastIndex=next%reminders.length;
 const now=Date.now();
 history=[{index:lastIndex,at:now},...history].slice(0,25);
 storageSave('reminders-index',lastIndex);
 storageSave('reminders-history',history);
 if(automatic){lastAutomatic=now;storageSave('reminders-last-time',now)}
 const item=reminders[lastIndex];
 if(document.hidden){if(automatic)showDevice(item)}
 else showToast(lastIndex);
 return true;
}
function setEnabled(value){
 enabled=value;
 storageSave('reminders-enabled',value);
 if(!value){visibleToast=null;if(closeTimer){clearTimeout(closeTimer);closeTimer=null}}
 pageMessage=value?'التذكيرات مفعّلة، وتظهر وقت تستعمل التطبيق.':'توقّفت التذكيرات التلقائية. تنجم تطالع الأذكار وقت تحب.';
 render();
}
function pageHtml(){
 const curr=latest();
 const cards=history.length?history.slice(0,12).map(({index,at})=>({item:reminders[index],time:shortTime(at)})):reminders.slice(0,6).map(item=>({item,time:'من التذكيرات'}));
 const support=typeof window.Notification!=='undefined'&&window.isSecureContext;
 const permission=support?Notification.permission:'unsupported';
 return viewTitle('التذكيرات الإيمانية','صلّ على النبي ﷺ · قرآن · أذكار')+
 '<div class="faith-feature"><span class="faith-feature-icon">'+curr.emoji+'</span><p class="faith-kicker">تذكيرك الإيماني</p><h2>'+escapeHtml(curr.title)+'</h2><p>'+escapeHtml(curr.body)+'</p><small>'+escapeHtml(curr.source)+'</small><button class="btn lime" data-faith="next">تذكير آخر '+icon('refresh',15)+'</button></div>'+
 '<section class="section"><div class="section-head"><h2>إعدادات التذكيرات</h2></div>'+
 '<div class="card faith-settings">'+
 '<div class="faith-setting-row"><div><strong>تذكيرات وقت استعمال التطبيق</strong><p>تذكير عند الفتح، وبعدها بالوتيرة اللي تختارها.</p></div><button type="button" class="faith-switch '+(enabled?'on':'')+'" data-faith="toggle" role="switch" aria-checked="'+enabled+'" aria-label="تفعيل تذكيرات التطبيق"><span></span></button></div>'+
 '<div class="faith-setting-row"><div><strong>كل قدّاش نذكّروك؟</strong><p>الفترة بين التذكيرات والتطبيق محلول.</p></div><select class="faith-select" data-faith="cadence" aria-label="تواتر التذكيرات" '+(!enabled?'disabled':'')+'>'+
 [30,60,120].map(n=>'<option value="'+n+'" '+(cadence===n?'selected':'')+'>'+(n===30?'كل 30 دقيقة':n===60?'كل ساعة':'كل ساعتين')+'</option>').join('')+'</select></div>'+
 '<div class="faith-setting-row"><div><strong>إشعارات الجهاز</strong><p>اختيارية، فقط والتطبيق مازال شغّال. ما توصلش والتطبيق مسكّر.</p></div>'+
 (support?
 '<button type="button" class="btn soft faith-system-button" data-faith="system">'+
 (permission==='granted'?(deviceEnabled?'إيقاف':'تفعيل'):permission==='denied'?'محجوبة من المتصفح':'السماح')+'</button>':
 '<span class="faith-unsupported">غير مدعومة هنا</span>')+'</div>'+
 '<p class="faith-note">نراعي أوقات الراحة من 11 ليلًا حتى 7 صباحًا في التذكيرات التلقائية. الإشعارات الفعلية بعد غلق التطبيق تحتاج خدمة Push مستقلّة.</p>'+
 (pageMessage?'<p class="faith-message" role="status">'+escapeHtml(pageMessage)+'</p>':'')+
 '</div></section><section class="section"><div class="section-head"><h2>تذكيرات سابقة</h2><span class="mini-label">قرآن وأذكار وصلاة على النبي</span></div>'+
 '<div class="faith-history">'+cards.map(({item,time})=>'<article class="card faith-history-item"><span class="faith-history-emoji">'+item.emoji+'</span><div><strong>'+escapeHtml(item.title)+'</strong><p>'+escapeHtml(item.body)+'</p><small>'+escapeHtml(item.source)+' · '+escapeHtml(time)+'</small></div></article>').join('')+'</div></section>'+
 '<p class="footnote">Walid Voyages · رفيقك في العمرة 🕋</p>';
}
function openInbox(){
 visibleToast=null;
 if(closeTimer){clearTimeout(closeTimer);closeTimer=null}
 markRead();pageMessage='';
 selectTab('more','notifications');
}
async function requestDevicePermission(){
 if(!('Notification' in window)||!window.isSecureContext){pageMessage='إشعارات الجهاز غير مدعومة في المتصفح هذا.';render();return}
 if(Notification.permission==='granted'){
  deviceEnabled=!deviceEnabled;storageSave('reminders-device',deviceEnabled);
  pageMessage=deviceEnabled?'تفعّلت إشعارات الجهاز حين يكون التطبيق شغّالًا في الخلفية.':'توقّفت إشعارات الجهاز.';render();return;
 }
 if(Notification.permission==='denied'){pageMessage='الإشعارات محجوبة. يلزم السماح من إعدادات المتصفح.';render();return}
 try{
  const result=await Notification.requestPermission();
  deviceEnabled=result==='granted';
  storageSave('reminders-device',deviceEnabled);
  pageMessage=deviceEnabled?'تفعّل إذن إشعارات الجهاز.':'الإشعارات غير مفعّلة في إعدادات المتصفح.';
 }catch{pageMessage='المتصفح ما نجّمش يعطي إذن الإشعارات.'}
 render();
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-faith]');
 if(!b)return;
 const action=b.dataset.faith;
 if(action==='dismiss')dismiss();
 else if(action==='view')openInbox();
 else if(action==='next'){showNext(false);if(state.page==='notifications')markRead()}
 else if(action==='toggle')setEnabled(!enabled);
 else if(action==='system')requestDevicePermission();
});
document.addEventListener('change',event=>{
 if(event.target.matches('[data-faith="cadence"]')){
  const value=Number(event.target.value);
  if([30,60,120].includes(value)){cadence=value;storageSave('reminders-frequency',value);pageMessage='تغيّرت الوتيرة حسب اختيارك.';render()}
 }
});
window.WVReminders={toastHtml,pageHtml,unreadCount,markRead,openInbox};
function generalAllowed(){
 const cfg=window.WVSchedule?.getSettings?.()||{};
 return enabled&&cfg.enabled!==false&&cfg.general_enabled!==false;
}
function effectiveCadence(){
 const globalMinutes=Number(window.WVSchedule?.getSettings?.()?.general_interval_minutes||0);
 return Math.max(cadence,Number.isFinite(globalMinutes)?globalMinutes:0);
}
function automaticTick(){
 if(!generalAllowed()||isQuiet())return;
 const elapsed=Date.now()-lastAutomatic;
 if(elapsed>=effectiveCadence()*60*1000)showNext(true);
}
// Once on launch, avoid repeated popups on rapid reloads.
setTimeout(()=>{
 if(generalAllowed()&&!isQuiet()&&Date.now()-lastAutomatic>=15*60*1000)showNext(true);
},1800);
tickTimer=setInterval(automaticTick,60*1000);
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden&&Date.now()-lastAutomatic>=effectiveCadence()*60*1000)automaticTick();
});
})();