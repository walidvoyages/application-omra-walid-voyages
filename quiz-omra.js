/* Walid Voyages — Omra rites knowledge check
   Names and answers remain in this browser tab's memory only (no DB upload).
*/
(function(){
'use strict';
const qs=[
 {q:'كم عدد أشواط الطواف حول الكعبة؟',a:['5 أشواط','7 أشواط','9 أشواط'],ok:1,why:'الطواف سبعة أشواط، كل شوط يبدأ من الحجر الأسود وينتهي عنده.'},
 {q:'من أين يبدأ الطواف؟',a:['من الحجر الأسود','من مقام إبراهيم','من باب الصفا'],ok:0,why:'يبدأ كل شوط من جهة الحجر الأسود.'},
 {q:'أين تكون الكعبة بالنسبة لك أثناء الطواف؟',a:['على اليمين','على اليسار','أمامك دائمًا'],ok:1,why:'في الطواف تجعل الكعبة على يسارك.'},
 {q:'متى ينوي المعتمر الدخول في الإحرام؟',a:['عند الميقات أو قبله','بعد بدء الطواف','بعد السعي'],ok:0,why:'ينوي العمرة ويلبّي عند الميقات المعتبر، أو قبله؛ ولا يتجاوز الميقات دون إحرام.'},
 {q:'بماذا يبدأ السعي بين الصفا والمروة؟',a:['بالمروة','بالصفا','بمنى'],ok:1,why:'يبدأ السعي من الصفا.'},
 {q:'كم عدد أشواط السعي؟',a:['4 أشواط','6 أشواط','7 أشواط'],ok:2,why:'السعي سبعة أشواط، الذهاب من الصفا للمروة شوط واحد والعودة شوط آخر.'},
 {q:'أين ينتهي الشوط السابع من السعي؟',a:['بالصفا','بالمروة','بمقام إبراهيم'],ok:1,why:'يبدأ الشوط الأول من الصفا، فينتهي السابع عند المروة.'},
 {q:'ما العمل بعد الطواف وقبل السعي إن تيسّر؟',a:['ركعتا الطواف','رمي الجمرات','الوقوف بعرفات'],ok:0,why:'يصلّي المعتمر ركعتَي الطواف إن تيسّر بعد الطواف وقبل السعي.'},
 {q:'بماذا يكتمل التحلّل من العمرة للرجل؟',a:['رمي الجمرات','الحلق أو التقصير','الوقوف بالمزدلفة'],ok:1,why:'بعد الطواف والسعي يحلق الرجل رأسه أو يقصّره.'},
 {q:'ماذا تفعل المرأة للتحلّل بعد السعي؟',a:['تقصّ من أطراف شعرها قدر أنملة','تحلق رأسها كلّه','تطوف من جديد'],ok:0,why:'تقصّر المرأة من أطراف شعرها قدر أنملة ولا تحلق رأسها.'},
 {q:'هل الوقوف بعرفات من مناسك العمرة؟',a:['نعم، من أركان العمرة','لا، من أعمال الحج','واجب في رمضان فقط'],ok:1,why:'الوقوف بعرفة من أركان الحج وليس من أعمال العمرة.'},
 {q:'هل زيارة مسجد قباء شرط لصحة العمرة؟',a:['نعم','لا','فقط إذا وصل المعتمر إلى المدينة'],ok:1,why:'زيارة مسجد قباء مستحبّة لفضل الصلاة فيه، لكنها ليست شرطًا لصحة العمرة.'}
];
let step='entry',first='',last='',i=0,answers=Array(qs.length).fill(null);
const total=qs.length;
const score=()=>answers.reduce((sum,a,j)=>sum+(a===qs[j].ok?1:0),0);
function pageHtml(){
 let lead=viewTitle('اختبار مناسك العمرة','راجع معلوماتك بعد قراءة المناسك');
 if(step==='entry')return lead+
 '<section class="card omra-exam-intro"><div class="omra-exam-mark">🕋</div><h2>اختبر معلوماتك في العمرة</h2><p>اقرأ المناسك، وبعد اكتب اسمك ولقبك وجاوب على '+total+' سؤال. في الآخر تشوف النتيجة وتصحيح إجاباتك.</p><form id="omra-exam-start"><label for="omra-first">الاسم</label><input id="omra-first" name="first" autocomplete="given-name" maxlength="60" required value="'+escapeHtml(first)+'" placeholder="اكتب اسمك"><label for="omra-last">اللقب</label><input id="omra-last" name="last" autocomplete="family-name" maxlength="60" required value="'+escapeHtml(last)+'" placeholder="اكتب لقبك"><p class="omra-exam-privacy">🔒 الاسم واللقب والنتيجة يظهروا في جهازك فقط، وما نبعثوهمش لقاعدة بيانات الوكالة.</p><button class="btn lime full" type="submit">ابدأ اختبار العمرة '+icon('arrow',15)+'</button></form></section>';
 if(step==='question'){
  const q=qs[i],percent=Math.round(i/total*100);
  return lead+'<div class="card progress-card"><div class="progress-row"><span>السؤال '+(i+1)+' من '+total+'</span><span>'+percent+'٪</span></div><div class="bar"><span style="width:'+percent+'%"></span></div></div>'+
  '<div class="card quiz-box omra-exam-question"><span class="number">المعتمر: '+escapeHtml(first+' '+last)+'</span><h3>'+escapeHtml(q.q)+'</h3>'+
  q.a.map((x,n)=>'<button class="option" type="button" data-omra-answer="'+n+'">'+String.fromCharCode(65+n)+'. '+escapeHtml(x)+'</button>').join('')+
  '<p class="omra-exam-hint">اختار إجابة واحدة، وينقلك التطبيق للسؤال اللي بعدو.</p>'+
  (i>0?'<button type="button" class="btn ghost" data-omra-back>السؤال السابق</button>':'')+'</div>';
 }
 const n=score(),pct=Math.round(n*100/total);
 const level=pct>=85?'ممتاز، ما شاء الله!':pct>=65?'نتيجة باهية، كمّل المراجعة!':'راجع المناسك وعاود الاختبار';
 return lead+'<div class="card omra-exam-result"><div class="omra-exam-mark">'+(pct>=65?'🏆':'📖')+'</div><p class="omra-exam-person">نتيجة '+escapeHtml(first+' '+last)+'</p><div class="omra-exam-score" dir="ltr">'+n+' / '+total+'</div><strong>'+pct+'٪ · '+level+'</strong><p>إجابات صحيحة: '+n+' · أخطاء: '+(total-n)+'</p><small>هذه نتيجة تدريبية، وليست شهادة اجتياز رسمية أو إثباتًا للحجز.</small><div class="omra-exam-actions"><button type="button" class="btn lime" data-omra-restart>إعادة الاختبار</button><button type="button" class="btn ghost" data-omra-rename>تغيير الاسم</button></div></div>'+
 '<section class="section"><div class="section-head"><h2>تصحيح إجاباتك</h2></div><div class="omra-exam-corrections">'+qs.map((q,j)=>{
 const right=answers[j]===q.ok;
 return '<div class="card omra-exam-correction"><span class="omra-correct-status '+(right?'ok':'miss')+'">'+(right?'✓ صحيحة':'✕ تحتاج مراجعة')+'</span><h3>'+(j+1)+'. '+escapeHtml(q.q)+'</h3><p>إجابتك: <strong>'+escapeHtml(q.a[answers[j]])+'</strong></p>'+(!right?'<p>الإجابة الصحيحة: <strong>'+escapeHtml(q.a[q.ok])+'</strong></p>':'')+'<small>'+escapeHtml(q.why)+'</small></div>'
 }).join('')+'</div></section>';
}
document.addEventListener('submit',event=>{
 if(event.target.id!=='omra-exam-start')return;
 event.preventDefault();
 const data=new FormData(event.target);
 const a=String(data.get('first')||'').trim().replace(/\s+/g,' '),b=String(data.get('last')||'').trim().replace(/\s+/g,' ');
 if(!a||!b)return;
 first=a.slice(0,60);last=b.slice(0,60);i=0;answers=Array(total).fill(null);step='question';render(true);
});
document.addEventListener('click',event=>{
 const answer=event.target.closest('[data-omra-answer]');
 if(answer&&step==='question'){
  answers[i]=Number(answer.dataset.omraAnswer);
  if(i+1===total)step='result';else i++;
  render(true);
  return;
 }
 if(event.target.closest('[data-omra-back]')&&step==='question'){i=Math.max(0,i-1);render(true);return}
 if(event.target.closest('[data-omra-restart]')){i=0;answers=Array(total).fill(null);step='question';render(true);return}
 if(event.target.closest('[data-omra-rename]')){i=0;answers=Array(total).fill(null);step='entry';render(true)}
});
window.WVOmraTest={pageHtml};
})();