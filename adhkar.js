(function(){
'use strict';
const entries={
 morning:[
  ['ذكر الصباح','أصبحنا وأصبح الملك لله، والحمد لله.','ذكر الصباح'],
  ['ذكر الصباح','اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.','دعاء الصباح'],
  ['التوحيد','لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير.','ذكر'],
  ['الاستغفار','أستغفر الله وأتوب إليه.','استغفار'],
  ['الصلاة على النبي ﷺ','اللهم صلِّ وسلِّم على نبينا محمد.','صلاة على النبي ﷺ'],
  ['آية من القرآن','﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾','الرعد: 28']
 ],
 evening:[
  ['ذكر المساء','أمسينا وأمسى الملك لله، والحمد لله.','ذكر المساء'],
  ['ذكر المساء','اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.','دعاء المساء'],
  ['الاستغفار','أستغفر الله العظيم وأتوب إليه.','استغفار'],
  ['ذكر لطيف','سبحان الله وبحمده، سبححان الله العظيم.','ذكر'],
  ['الصلاة على النبي ﷺ','اللهم صلِّ وسلِّم على نبينا محمد.','صلاة على النبي ﷺ'],
  ['آية من القرآن','﴿فَإِنَّ مَعَ الْعُسْرِ يُسْرًا﴾','الشرح: 5']
 ],
 prayer:[
  ['بعد الصلاة','أستغفر الله.','من أذكار ما بعد الصلاة، يُقال ثلاثًا'],
  ['بعد الصلاة','اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام.','من أذكار ما بعد الصلاة'],
  ['التسبيح','سبحان الله.','من الذكر بعد الصلاة'],
  ['التحميد','الحمد لله.','من الذكر بعد الصلاة'],
  ['التكبير','الله أكبر.','من الذكر بعد الصلاة']
 ],
 travel:[
  ['قبل السفر','راجع جواز السفر والتأشيرة والتذاكر والمتطلبات الرسمية قبل السفر.','نصيحة تنظيمية'],
  ['قبل السفر','تعرّف على أحكام الإحرام والميقات وأمتعتك الضرورية للعمرة.','نصيحة للمعتمر'],
  ['أثناء العمرة','احرص على الرفق بالناس، واتباع تنظيمات الحرم، والسؤال عند الحاجة.','نصيحة للمعتمر'],
  ['أثناء العمرة','الطواف سبعة أشواط، والسعي سبعة أشواط، واحرص على الطمأنينة.','مناسك العمرة']
 ],
 other:[
  ['الصلاة على النبي ﷺ','اللهم صلِّ وسلِّم على نبينا محمد.','صلاة على النبي ﷺ'],
  ['الذكر','سبحان الله وبحمده، سبحان الله العظيم.','ذكر'],
  ['الذكر','لا حول ولا قوة إلا بالله.','ذكر'],
  ['الدعاء','ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار.','البقرة: 201'],
  ['التوكل','﴿إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ﴾','آل عمران: 159'],
  ['الاستغفار','أستغفر الله وأتوب إليه.','ذكر']
 ]
};
entries.evening[3][1]='سبحان الله وبحمده، سبحان الله العظيم.';
const labels={morning:'أذكار الصباح',evening:'أذكار المساء',prayer:'أذكار بعد الصلاة',travel:'أذكار ونصائح السفر',other:'أذكار متنوعة'};
const read=(k,d)=>{try{const s=localStorage.getItem('wv-adhkar-'+k);return s==null?d:JSON.parse(s)}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem('wv-adhkar-'+k,JSON.stringify(v))}catch{}};
let category=read('category','morning');
let marks=read('marks',{});
if(!entries[category])category='morning';
function pageHtml(){
 const arr=entries[category];
 return viewTitle('الأذكار والأدعية','صباحًا ومساءً وبعد الصلاة')+
 '<div class="dhikr-tabs" role="group" aria-label="اختر نوع الأذكار">'+Object.keys(labels).map(k=>'<button type="button" data-azkar-tab="'+k+'" class="'+(category===k?'on':'')+'">'+labels[k]+'</button>').join('')+'</div>'+
 '<div class="card azkar-intro"><span>📿</span><strong>'+labels[category]+'</strong><p>اقرأ الأذكار على راحتك. العلامات هنا لمتابعتك الشخصية فقط، وما تعوّضش الذكر نفسه.</p></div>'+
 '<div class="azkar-cards">'+arr.map(([title,body,source],i)=>'<article class="card azkar-entry"><div class="azkar-entry-top"><strong>'+title+'</strong><small>'+source+'</small></div><p>'+body+'</p><button type="button" class="azkar-mark '+(marks[category+'-'+i]?'done':'')+'" data-azkar-check="'+i+'" aria-pressed="'+Boolean(marks[category+'-'+i])+'">'+(marks[category+'-'+i]?'✓ قريتو':'◯ تمّت القراءة')+'</button></article>').join('')+'</div>'+
 '<p class="footnote">تنبيه: الأذكار المذكورة أمثلة مختارة، وليست حصرًا لكل الأذكار الثابتة ولا بديلاً عن المرجع الشرعي.</p>';
}
document.addEventListener('click',e=>{
 const tab=e.target.closest('[data-azkar-tab]');
 if(tab&&entries[tab.dataset.azkarTab]){
  category=tab.dataset.azkarTab;write('category',category);render(true);return;
 }
 const check=e.target.closest('[data-azkar-check]');
 if(check){const key=category+'-'+check.dataset.azkarCheck;marks[key]=!marks[key];write('marks',marks);render();}
});
window.WVAdhkar={pageHtml,entries};
})();