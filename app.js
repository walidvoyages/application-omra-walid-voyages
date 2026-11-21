'use strict';
const $=s=>document.querySelector(s);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(name,size=20)=>{const paths={
home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20"/>',
heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
more:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
arrow:'<path d="m15 18-6-6 6-6"/>',
chevron:'<path d="m9 18 6-6-6-6"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
plane:'<path d="m21 3-8 8m8-8-6 19-4-9-9-4z"/>',
check:'<path d="m5 12 4 4L19 6"/>',
refresh:'<path d="M20 7V3l-4 4 4 4M4 17v4l4-4-4-4"/><path d="M5 10a7 7 0 0 1 12-4M19 14a7 7 0 0 1-12 4"/>',
spark:'<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/>',
moon:'<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14z"/>',
quiz:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.7 1.3C13.6 11 12 11.4 12 13v.7M12 17h.01"/>',
grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
share:'<path d="M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7"/>',
map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>'
};return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.spark)+'</svg>'};
const read=(k,d)=>{try{const s=localStorage.getItem('wv-'+k);return s===null?d:JSON.parse(s)}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem('wv-'+k,JSON.stringify(v))}catch{}};
const state={tab:'home',page:'',content:null,slide:0,tripFilter:'الكل',tripSearch:'',prayerCity:read('city','Tunis'),saudiPrayerCity:read('city-sa','Makkah'),prayers:null,saudiPrayers:null,prayerDate:'',saudiPrayerDate:'',prayerError:false,saudiPrayerError:false,completed:read('rites',[]),count:read('count',0),dhikr:read('dhikr','سبحان الله'),favorites:read('favorites',[]),question:0,answer:null,score:0,finished:false,dialog:null};
const cities=['Tunis','Sousse','Sfax','Kairouan','Kasserine','Mahdia','Monastir','Nabeul','Bizerte','Gabes','Gafsa','Tozeur','Djerba','Kebili','Medenine','Tataouine','Beja','Jendouba','Zaghouan','Siliana','Kef'];
const cityAr={Tunis:'تونس',Sousse:'سوسة',Sfax:'صفاقس',Kairouan:'القيروان',Kasserine:'القصرين',Mahdia:'المهدية',Monastir:'المنستير',Nabeul:'نابل',Bizerte:'بنزرت',Gabes:'قابس',Gafsa:'قفصة',Tozeur:'توزر',Djerba:'جربة',Kebili:'قبلي',Medenine:'مدنين',Tataouine:'تطاوين',Beja:'باجة',Jendouba:'جندوبة',Zaghouan:'زغوان',Siliana:'سليانة',Kef:'الكاف'};
const rites=[
{title:'الإحرام والنيّة',description:'اغتسل إن تيسّر، والبس لباس الإحرام للرجل، ثم انوِ العمرة عند الميقات ولبِّ. المرأة تلبس لباسًا شرعيًا ساترًا دون تخصيص لون.'},
{title:'التلبية إلى الحرم',description:'ردّد: «لبّيك اللهم لبّيك، لبّيك لا شريك لك لبّيك، إنّ الحمد والنعمة لك والملك، لا شريك لك». وتوقف عن التلبية عند بدء الطواف.'},
{title:'الطواف حول الكعبة',description:'طُف سبعة أشواط تبدأ من الحجر الأسود وتنتهي عنده، واجعل الكعبة على يسارك. يُشرع الذكر والدعاء بما تيسّر.'},
{title:'ركعتا الطواف',description:'صلّ ركعتين بعد الطواف إن تيسّر، خلف مقام إبراهيم إن أمكن دون مزاحمة، وإلا في أي موضع من المسجد.'},
{title:'السعي بين الصفا والمروة',description:'ابدأ من الصفا واختم بالمروة بعد سبعة أشواط؛ الذهاب من الصفا للمروة شوط، والعودة شوط آخر.'},
{title:'الحلق أو التقصير',description:'يحلق الرجل شعر رأسه أو يقصّره (والحلق أفضل له)، وتقصّر المرأة من أطراف شعرها قدر أنملة، وبذلك تتحلّل من الإحرام.'}
];
const places=[
{id:1,name:'المسجد الحرام',city:'مكة',emoji:'🕋',text:'وجهة العمرة والطواف والصلاة حول الكعبة المشرفة.'},
{id:2,name:'غار حراء وجبل النور',city:'مكة',emoji:'⛰️',text:'موضع بداية نزول الوحي، زيارته للتعرّف على السيرة لا من مناسك العمرة.'},
{id:3,name:'غار ثور',city:'مكة',emoji:'🏔️',text:'من معالم السيرة النبوية المرتبطة بهجرة الرسول ﷺ.'},
{id:4,name:'جبل عرفات',city:'مكة',emoji:'🌄',text:'من أهم مشاعر الحج، وليس من شعائر العمرة.'},
{id:5,name:'المسجد النبوي',city:'المدينة',emoji:'🕌',text:'الصلاة في مسجد رسول الله ﷺ وزيارته بالآداب الشرعية.'},
{id:6,name:'مسجد قباء',city:'المدينة',emoji:'🌙',text:'من المساجد العظيمة، ويُشرع قصده للصلاة فيه.'},
{id:7,name:'مقبرة البقيع',city:'المدينة',emoji:'🌿',text:'موضع دفن عدد من الصحابة، وتكون زيارته وفق الآداب الشرعية.'},
{id:8,name:'بئر غرس',city:'المدينة',emoji:'💧',text:'معلم تاريخي يرتبط بالسيرة، وليس من المناسك الواجبة.'}
];
const questions=[
{q:'كم شوطًا في الطواف حول الكعبة؟',options:['خمسة أشواط','سبعة أشواط','تسعة أشواط'],correct:1,explain:'الطواف بالبيت سبعة أشواط، يبدأ كل شوط من الحجر الأسود وينتهي عنده.'},
{q:'من أين يبدأ السعي؟',options:['من الصفا','من المروة','من منى'],correct:0,explain:'يبدأ السعي من الصفا وينتهي عند المروة بعد سبعة أشواط.'},
{q:'أين تقع الكعبة المشرفة؟',options:['في المدينة المنورة','في مكة المكرمة','في الطائف'],correct:1,explain:'الكعبة المشرفة تقع في المسجد الحرام بمكة المكرمة.'},
{q:'ما الذي يتم بعد إكمال السعي؟',options:['الوقوف بعرفات','طواف الإفاضة','الحلق أو التقصير'],correct:2,explain:'بعد السعي يتم الحلق أو التقصير للتحلل من العمرة.'},
{q:'هل الوقوف بعرفة من مناسك العمرة؟',options:['لا، من مناسك الحج','نعم، فرض في العمرة','فقط في رمضان'],correct:0,explain:'الوقوف بعرفة ركن من أركان الحج، وليس من مناسك العمرة.'},
{q:'ما هو ميقات النية بالإحرام؟',options:['بعد انتهاء الطواف','عند أو قبل الميقات المحدد','بعد الوصول إلى الفندق'],correct:1,explain:'من أراد العمرة ينوي الإحرام عند الميقات المعتبر أو قبله، ولا يتجاوزه دون إحرام.'}
];
const adhkar=['سبحان الله','الحمد لله','الله أكبر','لا إله إلا الله','أستغفر الله'];
const nav=[['home','الرئيسية','home'],['programs','الرحلات','calendar'],['rites','المناسك','book'],['worship','العبادات','heart'],['more','المزيد','grid']];
const shortDate=d=>{const parts=d.split('-');return parts[2]+'/'+parts[1]+'/'+parts[0]};
function validProgram(p){return p&&typeof p.title==='string'&&/^\d{4}-\d\d-\d\d$/.test(p.start||'')&&/^\d{4}-\d\d-\d\d$/.test(p.end||'')}
function startData(){return state.content||{ticker:[],slides:[],programs:[],bookingUrl:'https://www.walidvoyages.com',notice:'يرجى التأكّد من تفاصيل الرحلات مباشرة مع الوكالة.'}}
async function loadContent(){try{const res=await fetch('./content.json?date='+Date.now(),{cache:'no-store'});if(!res.ok)throw new Error('content');const data=await res.json();if(!Array.isArray(data.programs))throw new Error('format');state.content={...data,programs:window.__omraBackendTrips||data.programs};save('content',data);render()}catch{const backup=read('content',{ticker:[],slides:[],programs:[]});state.content={...backup,programs:window.__omraBackendTrips||backup.programs};render()}}
const viewTitle=(s,d)=>'<div class="page-head"><div class="over">'+escapeHtml(d)+'</div><h1>'+escapeHtml(s)+'</h1></div>';
const selectTab=(tab,page='')=>{state.tab=tab;state.page=page;state.dialog=null;location.hash=tab+(page?'/'+page:'');render(true)};
function render(reset=false){const root=$('#app'),oldScroll=$('.scroll')?.scrollTop||0;root.innerHTML=header()+ticker()+'<main class="scroll" id="main">'+contentPage()+contactFooter()+'</main>'+bottom()+(state.dialog?modal():'')+(window.WVReminders?window.WVReminders.toastHtml():'')+(window.WVSchedule?window.WVSchedule.toastHtml():'');if(!reset)$('#main').scrollTop=oldScroll;attach();document.title='رفيق العمرة | Walid Voyages'}
function contactFooter(){return '<footer class="wv-contact-footer"><div class="wv-contact-heading">للحجز والاستفسار</div><div class="wv-contact-links" dir="ltr"><a href="tel:+21658150699"><span class="wv-phone-icon" aria-hidden="true">☎</span><bdi>58 150 699</bdi></a><a href="tel:+21673201660"><span class="wv-phone-icon" aria-hidden="true">☎</span><bdi>73 201 660</bdi></a></div><a class="wv-site-link" href="https://www.walid-voyages.com" rel="noopener noreferrer" target="_blank">🌐 www.walid-voyages.com</a><span class="footer-wave"></span></footer>'}
function header(){return '<header class="header"><a href="#home" class="brand" aria-label="الصفحة الرئيسية"><img class="app-original-logo" src="./omra-logo.webp" alt="Omra Walid Voyages"><div class="brand-copy"><div class="brand-name">Walid Voyages</div><div class="brand-sub">تطبيق العمرة 🕋</div></div></a><button class="icon-btn" data-faith="view" aria-label="التذكيرات الإيمانية">'+icon('bell',19)+(window.WVReminders&&window.WVReminders.unreadCount()?'<span class="faith-unread">'+window.WVReminders.unreadCount()+'</span>':'')+'</button></header>'}
function ticker(){
 const staticNews=(startData().ticker||[]).filter(s=>!s.includes('رحلات العمرة القادمة:'));
 // Published trips are automatically appended at the END of the news ribbon.
 // Dates are the flight departure/return dates from Supabase, not the edit date.
 const liveNews=(window.WVPublishedAnnouncements||[]).filter(validProgram).map(p=>
  '🕋 عمرة جديدة: '+p.title+' · من '+shortDate(p.start)+' إلى '+shortDate(p.end)
 );
 const all=[...staticNews,...liveNews];
 return '<div class="newsline"><div class="newslabel"><span class="live-dot"></span>آخر الأخبار</div><div class="news-move"><div class="news-track">'+all.map(s=>'<span>'+escapeHtml(s)+'</span>').join(' • ')+'</div></div></div>';
}
function bottom(){return '<nav class="bottom" aria-label="القائمة الرئيسية">'+nav.map(([tab,label,ic])=>'<button data-tab="'+tab+'" class="navitem '+(state.tab===tab?'active':'')+'" aria-label="'+label+'" aria-current="'+(state.tab===tab?'page':'false')+'">'+icon(ic,20)+'<span>'+label+'</span></button>').join('')+'</nav>'}
function contentPage(){if(state.tab==='home')return home();if(state.tab==='programs')return programs();if(state.tab==='rites')return ritesPage();if(state.tab==='worship')return worship();if(state.tab==='more')return state.page==='places'?placesPage():state.page==='quiz'?quizPage():state.page==='omra-test'&&window.WVOmraTest?window.WVOmraTest.pageHtml():state.page==='story'&&window.WVStory?window.WVStory.pageHtml():state.page==='follow'&&window.WVFamilyFollow?window.WVFamilyFollow.pageHtml():state.page==='prayer'?prayerPage():state.page==='about'?aboutPage():state.page==='notifications'&&window.WVReminders?window.WVReminders.pageHtml():state.page==='adhkar'&&window.WVAdhkar?window.WVAdhkar.pageHtml():state.page==='schedule'&&window.WVSchedule?window.WVSchedule.pageHtml():morePage();return home()}
function home(){const data=startData(),slide=data.slides?.[state.slide%Math.max(1,data.slides.length)]||{kicker:'رفيق العمرة',title:'رحلة مطمئنّة',subtitle:'كل ما تحتاجه للعمرة في مكان واحد'};const upcoming=(data.programs||[]).filter(validProgram).filter(p=>p.end>=new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Tunis'})).slice(0,4);
return '<section class="hero"><div class="hero-photo" style="background-image:linear-gradient(145deg,#1e869e,#073b55)" id="hero-photo" data-image="'+escapeHtml(slide.image||'')+'"></div><div class="hero-pattern"></div><div class="hero-body"><span class="eyebrow">'+icon('spark',13)+escapeHtml(slide.kicker)+'</span><h1>'+escapeHtml(slide.title).replace(/\n/g,'<br>')+'</h1><p>'+escapeHtml(slide.subtitle)+'</p><div class="hero-foot"><button class="hero-cta" data-tab="programs">اكتشف برامج العمرة '+icon('arrow',14)+'</button><div class="dots">'+(data.slides||[]).map((s,i)=>'<button aria-label="الصورة '+(i+1)+'" class="dot '+(i===state.slide?'on':'')+'" data-slide="'+i+'"></button>').join('')+'</div></div></div></section>'+
'<section class="section"><div class="section-head"><h2>خدمات تهمّك</h2><span class="mini-label">كل شيء في مكان واحد</span></div><div class="grid4">'+[['عمرتي حكاية','heart','more/story'],['تابع معتمر','home','more/follow'],['السبحة','heart','worship'],['المناسك','book','rites'],['تذكيراتك','bell','more/schedule'],['المزارات','pin','more/places']].map(([name,ic,tab])=>'<button class="shortcut" data-go="'+tab+'"><span class="iconbox">'+icon(ic,21)+'</span>'+name+'</button>').join('')+'</div></section>'+
'<section class="section"><button class="card mz-home-entry" data-go="more/places" type="button"><span class="mz-home-symbol">🕌</span><span class="mz-home-copy"><strong>📍 مزارات المدينة ومكة</strong><small>25 مزارًا ومعلمًا • صور • شرح تاريخي • الموقع على الخريطة</small></span><span class="mz-home-arrow">←</span></button></section>'+
'<section class="section"><div class="section-head"><h2>أوقات الصلاة</h2><button class="see-all" data-go="more/prayer">التفاصيل '+icon('arrow',14)+'</button></div>'+prayerBlock()+'</section>'+
'<section class="section"><div class="section-head"><h2>العمرات القادمة</h2><button class="see-all" data-tab="programs">عرض الكل '+icon('arrow',14)+'</button></div><div class="hscroll">'+(upcoming.length?upcoming.map(p=>'<article class="card trip-mini"><span class="pill">'+icon('calendar',12)+' '+escapeHtml(p.tag||'عمرة')+'</span><h3>'+escapeHtml(p.title)+'</h3><div class="trip-meta">'+icon('calendar',13)+' '+shortDate(p.start)+' ← '+shortDate(p.end)+'</div><div class="trip-meta">'+icon('plane',13)+' '+escapeHtml(p.airline||'حسب البرنامج')+'</div><div class="trip-bottom"><span class="mini-label">السعر والتوفّر عند الوكالة</span><button data-trip="'+escapeHtml(p.id)+'">التفاصيل</button></div></article>').join(''):'<div class="card empty">ما فماش رحلات جديدة مؤكدة في القائمة حاليًا.</div>')+'</div></section><section class="section"><div class="quote"><strong>﴿وَأَتِمُّوا الْحَجَّ وَالْعُمْرَةَ لِلَّهِ﴾</strong><p>سورة البقرة — الآية 196</p></div></section>'}
const saudiCityAr={Makkah:'مكة المكرمة',Madinah:'المدينة المنورة',Jeddah:'جدة',Riyadh:'الرياض'};
const saudiCities=['Makkah','Madinah','Jeddah','Riyadh'];
const prayerNames=[['Fajr','الفجر'],['Dhuhr','الظهر'],['Asr','العصر'],['Maghrib','المغرب'],['Isha','العشاء']];
function prayerParts(tz){
 const pieces=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 return {day:pieces.day+'-'+pieces.month+'-'+pieces.year,clock:pieces.hour+':'+pieces.minute};
}
function prayerCountryCard(country){
 const tn=country==='tn';
 const p=tn?state.prayers:state.saudiPrayers;
 const city=tn?state.prayerCity:state.saudiPrayerCity;
 const tz=tn?'Africa/Tunis':'Asia/Riyadh';
 const now=prayerParts(tz);
 const error=tn?state.prayerError:state.saudiPrayerError;
 const cityList=tn?cities:saudiCities;
 const names=tn?cityAr:saudiCityAr;
 const next=p?prayerNames.find(([key])=>String(p[key]||'').slice(0,5)>now.clock):null;
 const nextAt=next?p[next[0]].slice(0,5):(p?'غدًا':'--:--');
 const selectId=tn?'city':'saudi-city';
 return '<div class="card prayer-main prayer-country '+(tn?'prayer-tunisia':'prayer-saudi')+'">'+
 '<div class="prayer-heading"><span>'+(tn?'🇹🇳 مواقيت الصلاة في تونس':'🇸🇦 مواقيت الصلاة في السعودية')+'</span>'+
 '<select id="'+selectId+'" class="city-select" aria-label="'+(tn?'مدينة تونسية':'مدينة سعودية')+'">'+
 cityList.map(x=>'<option value="'+x+'" '+(city===x?'selected':'')+'>'+names[x]+'</option>').join('')+'</select></div>'+
 '<p class="prayer-country-time">'+(tn?'حسب توقيت تونس (UTC+1)':'حسب توقيت السعودية (UTC+3)')+' · <span dir="ltr">'+now.day.replace(/-/g,'/')+'</span></p>'+
 '<div class="next-label">'+(p&&next?'الصلاة القادمة · '+next[1]:'مواقيت الصلاة اليوم')+'</div>'+
 '<div class="next-time" dir="ltr">'+escapeHtml(nextAt)+'</div>'+
 '<div class="prayer-times">'+prayerNames.map(([key,label])=>'<div class="prayer-unit '+(next&&next[0]===key?'is-next':'')+'"><span>'+label+'</span><strong dir="ltr">'+(p?escapeHtml(p[key]||'--:--'):'--:--')+'</strong></div>').join('')+'</div>'+
 '<p class="prayer-note">'+(error?'تعذّر تحميل المواقيت. جرّب زرّ التحديث أو تأكّد من اتصال الإنترنت.':p?'أوقات حسابية من AlAdhan، قد تختلف على توقيت المسجد أو الجهة الرسمية.':'جاري تحميل المواقيت…')+'</p>'+
 (error?'<button class="prayer-retry" type="button" data-prayer-retry="'+country+'">↻ إعادة تحميل المواقيت</button>':'')+
 '</div>';
}
function prayerBlock(){return '<div class="prayer-countries">'+prayerCountryCard('tn')+prayerCountryCard('sa')+'</div>'}
async function fetchPrayerFor(country){
 const tn=country==='tn';
 const tz=tn?'Africa/Tunis':'Asia/Riyadh';
 const city=tn?state.prayerCity:state.saudiPrayerCity;
 const field=tn?'prayers':'saudiPrayers', dateField=tn?'prayerDate':'saudiPrayerDate',errorField=tn?'prayerError':'saudiPrayerError';
 const day=prayerParts(tz).day; // AlAdhan requires DD-MM-YYYY, NOT DD/MM/YYYY.
 const countryName=tn?'Tunisia':'Saudi Arabia';
 const method=tn?18:4; // Tunisia convention and Umm Al-Qura Makkah.
 const cacheKey='prayer-v2-'+country+'-'+city;
 state[errorField]=false;
 try{
  const base='https://api.aladhan.com/v1/timingsByCity/'+day;
  const params=new URLSearchParams({city,country:countryName,method:String(method)});
  const response=await fetch(base+'?'+params.toString(),{cache:'no-store',signal:AbortSignal.timeout(13000)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const json=await response.json();
  if(Number(json.code)!==200||!json.data||!json.data.timings)throw new Error('Invalid prayer times response');
  const timings={};
  for(const [key] of prayerNames){
   const found=String(json.data.timings[key]||'').match(/^\d{1,2}:\d{2}/);
   if(!found)throw new Error('Missing '+key);
   timings[key]=found[0].padStart(5,'0');
  }
  if((tn?state.prayerCity:state.saudiPrayerCity)!==city)return;
  state[field]=timings;state[dateField]=day;
  save(cacheKey,{day,timings});
 }catch(ex){
  if((tn?state.prayerCity:state.saudiPrayerCity)!==city)return;
  const cached=read(cacheKey,null);
  if(cached&&cached.day===day&&cached.timings&&prayerNames.every(([k])=>cached.timings[k])){
   state[field]=cached.timings;state[dateField]=day;
  }else{
   state[field]=null;state[dateField]='';state[errorField]=true;
  }
  console.warn('AlAdhan prayer times unavailable for '+countryName+'/'+city+': '+(ex?.message||ex));
 }
 render();
}
function loadPrayer(country){
 if(country==='tn'||country==='sa')return fetchPrayerFor(country);
 return Promise.all([fetchPrayerFor('tn'),fetchPrayerFor('sa')]);
}
function programs(){const list=(startData().programs||[]).filter(validProgram).filter(p=>p.end>=new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Tunis'}));const filters=['الكل',...new Set(list.map(p=>p.tag).filter(Boolean))];if(!filters.includes(state.tripFilter))state.tripFilter='الكل';const filtered=list.filter(p=>(state.tripFilter==='الكل'||p.tag===state.tripFilter)&&[p.title,p.airline,p.route,p.hotel].join(' ').toLowerCase().includes(state.tripSearch.toLowerCase()));return viewTitle('برامج العمرة القادمة','خطّط لرحلتك المباركة')+'<div class="note">'+icon('info',16)+'<span>'+escapeHtml(startData().notice||'يرجى تأكيد التفاصيل مع الوكالة.')+'</span></div><div class="search">'+icon('search',17)+'<input id="tripsearch" placeholder="ابحث عن رحلة أو شركة طيران" value="'+escapeHtml(state.tripSearch)+'" aria-label="البحث عن الرحلات"></div><div class="filterbar">'+filters.map(f=>'<button data-filter="'+escapeHtml(f)+'" class="'+(state.tripFilter===f?'on':'')+'">'+escapeHtml(f)+'</button>').join('')+'</div><div id="program-list">'+(filtered.length?filtered.map(programCard).join(''):'<div class="card empty">لا توجد برامج مطابقة للبحث.</div>')+'</div>'}
function programCard(p){return '<article class="card program-card"><div class="program-top"><span class="badge">'+icon('spark',12)+' رحلة روحانية</span><span class="mini-label">يُرجى تأكيد التوفّر</span></div><h3>'+escapeHtml(p.title)+'</h3><div class="program-dates">'+icon('calendar',15)+' من '+shortDate(p.start)+' إلى '+shortDate(p.end)+'</div><div class="program-line">'+icon('plane',15)+escapeHtml(p.airline||'حسب البرنامج')+'</div><div class="program-line">'+icon('pin',15)+escapeHtml(p.route||'حسب البرنامج')+'</div><div class="program-actions"><span class="price-text">الأسعار لدى الوكالة</span><button class="btn soft" data-trip="'+escapeHtml(p.id)+'">تفاصيل الرحلة '+icon('arrow',13)+'</button></div></article>'}
function ritesPage(){const done=state.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<rites.length).length,percentage=Math.round(done/rites.length*100);return viewTitle('مناسك العمرة','دليل المعتمر خطوة بخطوة')+'<div class="card progress-card"><div class="progress-row"><span>تقدّمك في تعلّم المناسك</span><span>'+percentage+'٪</span></div><div class="bar" role="progressbar" aria-valuenow="'+percentage+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+percentage+'%"></span></div><p class="muted" style="font-size:10px;margin-top:8px">أكملت '+done+' من '+rites.length+' مراحل تعلّمية</p></div>'+rites.map((s,i)=>'<article class="card step-card"><div class="step-number '+(state.completed.includes(i)?'done':'')+'">'+(i+1)+'</div><div class="step-info"><h3>'+s.title+'</h3><p>'+s.description+'</p></div><button class="step-toggle '+(state.completed.includes(i)?'done':'')+'" data-rite="'+i+'" aria-label="'+(state.completed.includes(i)?'إلغاء العلامة':'تعليم مكتمل')+'">'+icon('check',17)+'</button></article>').join('')+'<section class="section"><div class="section-head"><h2>قبل ما تسافر</h2></div><div class="card info-list"><p>✓ تأكّد من وثيقة السفر، التأشيرة والمتطلبات الرسمية السارية قبل السفر.</p><p>✓ استفسر عن المتطلبات الصحية والأدوية الشخصية اللازمة.</p><p>✓ تعلّم محظورات الإحرام وأحكام الطهارة وتواصل مع المرافق الشرعي عند الحاجة.</p><p>✓ تذكّر أنّ زيارة مزارات المدينة ليست شرطًا لصحة العمرة.</p></div></section><section class="section omra-test-entry"><div class="card omra-test-teaser"><span class="omra-test-icon">📝</span><h2>كملت قراءة المناسك؟ اختبر معلوماتك!</h2><p>اكتب اسمك ولقبك وجاوب على 12 سؤال. في الآخر تشوف النتيجة وتصحيح كل سؤال.</p><div class="omra-test-ready">تقدّمك في القراءة: '+done+' / '+rites.length+'</div><button class="btn lime full" data-go="more/omra-test">ابدأ اختبار العمرة '+icon('arrow',16)+'</button></div></section><p class="credits">هذا دليل مبسّط للتعلّم، وليس فتوى تفصيلية. في الحالات الخاصة اسأل مرافقك الشرعي أو أهل العلم.</p>'}
function worship(){return viewTitle('أذكار وعبادات','طمأنينة ترافقك كل يوم')+'<div class="tasbih"><p class="top">السبحة الإلكترونية</p><h2>'+escapeHtml(state.dhikr)+'</h2><button class="counter" data-action="count" aria-label="زد التسبيح"><strong>'+state.count+'</strong><span>اضغط للتسبيح</span></button><div class="tasbih-actions"><button data-action="reset">'+icon('refresh',14)+' إعادة العدّ</button><button data-action="switch">'+icon('spark',14)+' تغيير الذكر</button></div></div><section class="section"><div class="section-head"><h2>اختر ذكرك</h2></div><div class="azkar-list">'+adhkar.map(s=>'<button class="zikr" data-dhikr="'+s+'"><span>'+s+'</span><small>'+(state.dhikr===s?'✓ الذكر الحالي':'اختر')+'</small></button>').join('')+'</div></section><div class="card worship-card"><h3>💚 فائدة اليوم</h3><p>الذكر عبادة متاحة في كل وقت، والسبحة هنا وسيلة للمساعدة على العدّ. لا يشترط استخدام تطبيق للذكر.</p></div>'}
function placesPage(){return window.WVMazarat?window.WVMazarat.pageHtml():viewTitle('المزارات والمعالم','دليل المدينة المنورة ومكة المكرمة')+'<div class="card info-list">جاري تحميل دليل المزارات المصوّر…</div>'}

function quizPage(){if(state.finished)return viewTitle('اختبر معلوماتك','مسابقة العمرة')+'<div class="card result">🏆<h2>أحسنت!</h2><div class="big">'+state.score+'/'+questions.length+'</div><p>هذه نتيجتك في اختبار معلومات العمرة. تابع التعلّم وعاود الاختبار وقت تحبّ.</p><button class="btn lime" data-action="restart">إعادة الاختبار '+icon('refresh',16)+'</button></div>';const q=questions[state.question];return viewTitle('اختبارات إيمانية','تعلّم بطريقة تفاعلية')+'<div class="card progress-card"><div class="progress-row"><span>السؤال '+(state.question+1)+' من '+questions.length+'</span><span>'+Math.round(state.question/questions.length*100)+'٪</span></div><div class="bar"><span style="width:'+Math.round(state.question/questions.length*100)+'%"></span></div></div><div class="card quiz-box"><span class="number">سؤال '+(state.question+1)+'</span><h3>'+q.q+'</h3>'+q.options.map((opt,i)=>'<button class="option '+(state.answer!==null?(i===q.correct?'correct':i===state.answer?'wrong':''):'')+'" data-answer="'+i+'" '+(state.answer!==null?'disabled':'')+'>'+String.fromCharCode(65+i)+'. '+opt+'</button>').join('')+(state.answer!==null?'<div class="quiz-feedback">'+icon('info',15)+' '+q.explain+'</div><button class="btn full lime" data-action="next">'+(state.question+1===questions.length?'عرض النتيجة':'السؤال التالي')+' '+icon('arrow',15)+'</button>':'')+'</div>'}
function prayerPage(){return viewTitle('مواقيت الصلاة','تونس والسعودية: اختر المدينة في كل بلاد')+prayerBlock()+'<div class="card worship-card"><h3>مصدر المواقيت</h3><p>نستعمل AlAdhan API مباشرة: طريقة حساب تونس (18) وطريقة أم القرى لمكة والسعودية (4). المواقيت تقريبية ويمكن تختلف بدقائق عن التوقيت الرسمي أو المسجد.</p></div>'}
function aboutPage(){return viewTitle('عن التطبيق','Walid Voyages')+'<div class="card worship-card"><h3>رفيق العمرة</h3><p>تطبيق ويب مخصّص لمعتمري Walid Voyages. يساعدك في الاطّلاع على الرحلات القادمة وتعلّم المناسك والذكر والمزارات.</p><p style="margin-top:10px">التطبيق معلوماتي ولا يؤكّد تذكرة أو حجزًا. الحجز النهائي يتمّ عبر الوكالة.</p></div><div class="card worship-card"><h3>مصادر الصور</h3><p>تعتمد صور الواجهة على Wikimedia Commons: Masjid al-Haram (Zainichi Gaikokujin, CC BY 3.0)، Al Masjid an Nabawi (Aymanzaid2, CC BY-SA 4.0)، Masjid-Al-Nabawi Madinah (HUTA Group, CC BY-SA 4.0).</p><a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#167fa0;text-decoration:underline">Wikimedia Commons</a></div>'}
function morePage(){return viewTitle('اكتشف أكثر','المزيد من رفيق العمرة')+[['🕌 مزارات المدينة ومكة','دليل مصوّر لـ 25 مزارًا ومعلمًا مع مواقعها وتاريخها','pin','places'],['عمرتي حكاية · ملفّي','حسابي الشخصي، رحلتي وذكرياتي نقطة بنقطة','heart','story'],['👨‍👩‍👧 تابع معتمر','تابع صور ومحطات عمرة عايلتك بكود FM فقط وبدون حساب','home','follow'],['الأذكار اليومية','أذكار الصباح والمساء وما بعد الصلاة','moon','adhkar'],['تذكيرات المعتمر','قبل السفر وخلال العمرة حسب اختيارك','bell','schedule'],['التذكيرات الإيمانية','آيات قرآنية، أذكار وصلاة على النبي ﷺ','bell','notifications'],['اختبار المناسك بالاسم واللقب','12 سؤال مع النتيجة والتصحيح','quiz','omra-test'],['اختبارات العمرة','أسئلة تفاعلية لقياس معلوماتك','quiz','quiz'],['أوقات الصلاة','المواقيت حسب المدن التونسية','clock','prayer'],['عن التطبيق','المصادر والمعلومات العامة','info','about']].map(([h,p,ic,pg])=>'<button class="card more-card" style="width:100%;text-align:right;border-radius:16px" data-go="more/'+pg+'"><span class="roundicon">'+icon(ic,20)+'</span><span><h3>'+h+'</h3><p>'+p+'</p></span><span class="right">'+icon('arrow',17)+'</span></button>').join('')+'<div class="quote" style="margin-top:18px"><strong>سفرٌ مبارك وعُمرةٌ مقبولة بإذن الله</strong><p>Walid Voyages — معاك في كلّ خطوة</p></div><p class="footnote">© Walid Voyages · 2026</p>'}
function modal(){const p=(startData().programs||[]).find(x=>x.id===state.dialog);if(!p)return '<div class="dialog-shell" data-action="close"><div class="dialog"><button class="btn ghost" data-action="close">إغلاق</button></div></div>';return '<div class="dialog-shell" data-action="close"><div class="dialog" role="dialog" aria-modal="true" aria-label="تفاصيل الرحلة"><div class="dialog-top"><span class="pill">🕋 معلومات الرحلة</span><button class="icon-btn" data-action="close" aria-label="إغلاق">✕</button></div><h2>'+escapeHtml(p.title)+'</h2><p>التفاصيل استرشادية ويجب تأكيدها من الوكالة.</p><div class="data-row">'+icon('calendar',17)+' '+shortDate(p.start)+' — '+shortDate(p.end)+'</div><div class="data-row">'+icon('plane',17)+' '+escapeHtml(p.airline||'عند الوكالة')+'</div><div class="data-row">'+icon('pin',17)+' '+escapeHtml(p.route||'حسب البرنامج')+'</div><div class="data-row">'+icon('home',17)+' '+escapeHtml(p.hotel||'حسب البرنامج')+'</div><p>للتثبّت من السعر والمقاعد والإقامة وبرنامج الرحلة، اتصل مباشرة بـ Walid Voyages.</p><a class="btn full lime" target="_blank" rel="noopener noreferrer" href="'+escapeHtml(startData().bookingUrl||'https://www.walidvoyages.com')+'">زيارة موقع Walid Voyages '+icon('arrow',16)+'</a></div></div>'}
function attach(){document.querySelectorAll('[data-tab]').forEach(e=>e.onclick=()=>selectTab(e.dataset.tab));document.querySelectorAll('[data-go]').forEach(e=>e.onclick=()=>{const [t,p]=e.dataset.go.split('/');selectTab(t,p||'')});document.querySelectorAll('[data-slide]').forEach(e=>e.onclick=()=>{state.slide=Number(e.dataset.slide);render()});const hero=$('#hero-photo');if(hero?.dataset.image){const allowed=hero.dataset.image;if(allowed.startsWith('https://commons.wikimedia.org/')||allowed.startsWith('./hero-kaaba.svg'))hero.style.backgroundImage='linear-gradient(180deg,rgba(14,73,95,.12),rgba(4,46,62,.25)),url("'+allowed.replace(/"/g,'')+'")'}document.querySelectorAll('[data-trip]').forEach(e=>e.onclick=()=>{state.dialog=e.dataset.trip;render()});document.querySelectorAll('[data-filter]').forEach(e=>e.onclick=()=>{state.tripFilter=e.dataset.filter;render()});const search=$('#tripsearch');if(search)search.oninput=()=>{state.tripSearch=search.value;const filtered=(startData().programs||[]).filter(validProgram).filter(p=>p.end>=new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Tunis'})).filter(p=>(state.tripFilter==='الكل'||p.tag===state.tripFilter)&&[p.title,p.airline,p.route,p.hotel].join(' ').toLowerCase().includes(state.tripSearch.toLowerCase()));$('#program-list').innerHTML=filtered.length?filtered.map(programCard).join(''):'<div class="card empty">لا توجد برامج مطابقة للبحث.</div>';document.querySelectorAll('[data-trip]').forEach(e=>e.onclick=()=>{state.dialog=e.dataset.trip;render()})};const city=$('#city');if(city)city.onchange=()=>{state.prayerCity=city.value;state.prayers=null;save('city',city.value);render();loadPrayer('tn')};
const saudi=$('#saudi-city');if(saudi)saudi.onchange=()=>{state.saudiPrayerCity=saudi.value;state.saudiPrayers=null;save('city-sa',saudi.value);render();loadPrayer('sa')};
document.querySelectorAll('[data-prayer-retry]').forEach(e=>e.onclick=()=>loadPrayer(e.dataset.prayerRetry));document.querySelectorAll('[data-rite]').forEach(e=>e.onclick=()=>{const i=Number(e.dataset.rite);state.completed=state.completed.includes(i)?state.completed.filter(x=>x!==i):[...state.completed,i];save('rites',state.completed);render()});document.querySelectorAll('[data-fav]').forEach(e=>e.onclick=()=>{const i=Number(e.dataset.fav);state.favorites=state.favorites.includes(i)?state.favorites.filter(x=>x!==i):[...state.favorites,i];save('favorites',state.favorites);render()});document.querySelectorAll('[data-dhikr]').forEach(e=>e.onclick=()=>{state.dhikr=e.dataset.dhikr;save('dhikr',state.dhikr);render()});document.querySelectorAll('[data-answer]').forEach(e=>e.onclick=()=>{if(state.answer!==null)return;state.answer=Number(e.dataset.answer);if(state.answer===questions[state.question].correct)state.score++;render()});document.querySelectorAll('[data-action]').forEach(e=>e.onclick=ev=>{const action=e.dataset.action;if(action==='close'){if(ev.target.closest('.dialog')&&ev.target===e)return;state.dialog=null;render()}if(action==='count'){state.count++;save('count',state.count);const c=$('.counter strong');if(c)c.textContent=String(state.count)}if(action==='reset'){if(confirm('تحبّ تصفّر عدّاد السبحة؟')){state.count=0;save('count',0);render()}}if(action==='switch'){state.dhikr=adhkar[(adhkar.indexOf(state.dhikr)+1)%adhkar.length];save('dhikr',state.dhikr);render()}if(action==='next'){state.question++;state.answer=null;if(state.question>=questions.length)state.finished=true;render(true)}if(action==='restart'){state.question=0;state.score=0;state.answer=null;state.finished=false;render(true)}if(action==='news'){state.tab='home';state.page='';render();alert((startData().ticker||[]).join('\n\n')||'لا توجد أخبار جديدة')}})}
function fromHash(){const [t,p]=location.hash.replace('#','').split('/');state.tab=nav.some(x=>x[0]===t)?t:'home';state.page=p||'';state.dialog=null;render(true)}
window.addEventListener('hashchange',fromHash);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.dialog){state.dialog=null;render()}});
fromHash();loadContent();loadPrayer();setInterval(()=>{if(state.tab==='home'&&!state.page&&!document.hidden&&!state.dialog){const slides=startData().slides||[];if(slides.length>1){state.slide=(state.slide+1)%slides.length;render();}}},7000);setInterval(()=>{const dayTn=prayerParts('Africa/Tunis').day,daySa=prayerParts('Asia/Riyadh').day;if(state.prayerDate!==dayTn||state.saudiPrayerDate!==daySa){loadPrayer()}else if(state.tab==='home'||state.page==='prayer')render()},60000);
if('serviceWorker'in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));