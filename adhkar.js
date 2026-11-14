/* Walid Voyages — extensible adkhar directory.
   All texts come from adhkar-library.js. Read tracking and favorites are local only.
*/
(function(){
'use strict';
const library=window.WV_ADHKAR_LIBRARY||{categories:[],entries:[]};
const items=Array.isArray(library.entries)?library.entries.filter(x=>x&&typeof x.id==='string'&&typeof x.body==='string'):[];
const categories=Array.isArray(library.categories)?library.categories:[];
const lookup=new Map(items.map(x=>[x.id,x]));
const read=(k,d)=>{try{const s=localStorage.getItem('wv-adhkar-'+k);return s==null?d:JSON.parse(s)}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem('wv-adhkar-'+k,JSON.stringify(v))}catch{}};
let category=read('category','morning');
let searchText='';
let pageSize=24;
let marks=read('marks-v2',{});
let favorites=read('favorites-v2',[]);
if(!marks||typeof marks!=='object')marks={};
if(!Array.isArray(favorites))favorites=[];
favorites=favorites.filter(id=>lookup.has(id));
const labels=Object.fromEntries(categories.map(x=>[x.id,x.label]));
if(category!=='all'&&category!=='favorites'&&!labels[category])category='morning';
function filtered(){
 const target=searchText.trim().toLocaleLowerCase('ar');
 return items.filter(x=>(category==='all'||category==='favorites'&&favorites.includes(x.id)||x.category===category)&&
 (!target||[x.title,x.body,x.source,labels[x.category]].join(' ').toLocaleLowerCase('ar').includes(target)));
}
function resultsHtml(){
 const arr=filtered(),visible=arr.slice(0,pageSize),done=arr.filter(x=>marks[x.id]).length;
 return '<div class="azkar-count-line"><strong>'+arr.length+' ذكر ودعاء</strong><span>قريت '+done+' · المفضّلة '+favorites.length+'</span></div>'+
 (arr.length?'<div class="azkar-cards">'+visible.map(x=>{
  const isFavorite=favorites.includes(x.id),isRead=!!marks[x.id];
  return '<article class="card azkar-entry" id="azkar-'+escapeHtml(x.id)+'">'+
  '<div class="azkar-entry-top"><strong>'+escapeHtml(x.title)+'</strong><small>'+escapeHtml(x.source||'ذكر')+'</small></div>'+
  '<p>'+escapeHtml(x.body)+'</p><div class="azkar-buttons">'+
  '<button type="button" class="azkar-mark '+(isRead?'done':'')+'" data-azkar-check="'+escapeHtml(x.id)+'" aria-pressed="'+isRead+'">'+(isRead?'✓ تمّت القراءة':'◯ علّم كَمقروء')+'</button>'+
  '<button type="button" class="azkar-favorite '+(isFavorite?'on':'')+'" data-azkar-fav="'+escapeHtml(x.id)+'" aria-pressed="'+isFavorite+'" aria-label="'+(isFavorite?'إزالة من المفضلة':'إضافة للمفضلة')+'">'+(isFavorite?'♥ في المفضلة':'♡ المفضلة')+'</button>'+
  '</div></article>';
 }).join('')+'</div>':'<div class="card azkar-empty">ما لقيناش أذكار مطابقة. جرّب كلمة أخرى أو بدّل التصنيف.</div>')+
 (arr.length>visible.length?'<button type="button" class="btn ghost full azkar-load" data-azkar-more>عرض المزيد ('+(arr.length-visible.length)+' باقي)</button>':'')+
 '<p class="footnote">الأذكار والأدعية متنوعة: فيها نصوص قرآنية، وأدعية مأثورة وأدعية عامة. ذكر المصدر مختصر، ولا يدلّ وحده على التحقق من صحة حديث أو عدد تكراره. ما نعيِّنوش عدد مرات غير ثابت.</p>';
}
function pageHtml(){
 return viewTitle('مكتبة الأذكار والأدعية','مكتبة واسعة مع البحث والمفضلة')+
 '<div class="card azkar-library-head"><span>📿</span><h2>'+items.length+' ذكر ودعاء</h2><p>'+categories.length+' تصنيف: الصباح، المساء، الصلاة، النوم، السفر، العمرة، الأدعية القرآنية وأكثر</p></div>'+
 '<div class="azkar-search"><span>⌕</span><input id="azkar-search" type="search" inputmode="search" autocomplete="off" placeholder="ابحث في الذكر أو الدعاء أو المصدر…" value="'+escapeHtml(searchText)+'" aria-label="البحث في الأذكار"></div>'+
 '<div class="dhikr-tabs" role="group" aria-label="اختر نوع الأذكار">'+
 [['all','الكل','📚'],['favorites','المفضّلة','♥'],...categories.map(c=>[c.id,c.label,c.emoji])].map(([key,name,emoji])=>
 '<button type="button" data-azkar-tab="'+key+'" class="'+(category===key?'on':'')+'">'+emoji+' '+escapeHtml(name)+'</button>').join('')+'</div>'+
 '<div id="azkar-results" aria-live="polite">'+resultsHtml()+'</div>';
}
function updateResults(){
 const root=document.getElementById('azkar-results');
 if(root)root.innerHTML=resultsHtml();
}
document.addEventListener('input',event=>{
 if(event.target.id!=='azkar-search')return;
 searchText=event.target.value;
 pageSize=24;
 updateResults();
});
document.addEventListener('click',event=>{
 const tab=event.target.closest('[data-azkar-tab]');
 if(tab){
  const next=tab.dataset.azkarTab;
  if(next==='all'||next==='favorites'||labels[next]){
   category=next;write('category',category);pageSize=24;render(true);
  }
  return;
 }
 const mark=event.target.closest('[data-azkar-check]');
 if(mark){
  const id=mark.dataset.azkarCheck;
  if(lookup.has(id)){marks[id]=!marks[id];write('marks-v2',marks);updateResults();}
  return;
 }
 const favorite=event.target.closest('[data-azkar-fav]');
 if(favorite){
  const id=favorite.dataset.azkarFav;
  if(lookup.has(id)){
   favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];
   write('favorites-v2',favorites);
   updateResults();
  }
  return;
 }
 if(event.target.closest('[data-azkar-more]')){pageSize+=24;updateResults()}
});
window.WVAdhkar={pageHtml,entries:items,categories};
})();
