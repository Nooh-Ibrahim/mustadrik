// grades.js — الدرجات والمعدّل التراكمي (GPA)
// المقياس الحقيقي في الكلية. يحلّ محلّ «نسبة إنجاز المادة» المخترَعة يدوياً:
// (أ) درجات مجمّعة داخل المساق (ميدتيرم/كويز/مشروع بأوزان) → نسبة محسوبة فعلاً
// (ب) ساعات معتمدة + تقدير نهائي لكل مساق → معدّل فصلي وتراكمي على سُلّم ٤٫٠
// classic script (globals shared) — يُحمّل بعد courses قبل schedule.

// سُلّم ٤٫٠ الشائع في الجامعات المصرية (قابل للتعديل لو كليتك بتستخدم غيره)
var GRADE_SCALE=[['A',4.0],['A-',3.7],['B+',3.3],['B',3.0],['B-',2.7],['C+',2.3],['C',2.0],['C-',1.7],['D+',1.3],['D',1.0],['F',0]];
function gradePts(letter){
  for(var i=0;i<GRADE_SCALE.length;i++)if(GRADE_SCALE[i][0]===letter)return GRADE_SCALE[i][1];
  return null;   // بلا تقدير بعد
}
// تحويل نسبة مئوية إلى تقدير مقترَح (إرشادي — التقدير النهائي يبقى بيدك)
function pctToLetter(p){
  if(p>=93)return 'A'; if(p>=89)return 'A-'; if(p>=84)return 'B+'; if(p>=80)return 'B';
  if(p>=76)return 'B-'; if(p>=72)return 'C+'; if(p>=68)return 'C'; if(p>=64)return 'C-';
  if(p>=60)return 'D+'; if(p>=50)return 'D'; return 'F';
}

// ---- حقول المساق (كسولة، بلا ترحيل) ----
function courseCredits(k){
  var c=(typeof courseObj==='function')?courseObj(k):((S.subjects||{})[k]);
  if(!c)return 0;
  if(typeof c.credits!=='number')c.credits=3;   // الشائع: ٣ ساعات
  return c.credits;
}
function courseLetter(k){
  var c=(typeof courseObj==='function')?courseObj(k):((S.subjects||{})[k]);
  if(!c)return '';
  if(typeof c.letter!=='string')c.letter='';
  return c.letter;
}
function courseMarks(k){
  var c=(typeof courseObj==='function')?courseObj(k):((S.subjects||{})[k]);
  if(!c)return [];
  if(!Array.isArray(c.marks))c.marks=[];
  return c.marks;
}

// ---- الدرجات المجمّعة: نسبة موزونة ----
// كل درجة {t,score,max,weight}. لو فيه أوزان تُحسب موزونة على الوزن المرصود؛
// ولو كل الأوزان صفر تُحسب بالمجموع البسيط. تُرجع أيضاً «المرصود» ليُعرف كم بقي.
function marksTotal(marks){
  marks=marks||[];
  var wSum=0,wEarned=0,sSum=0,sMax=0,n=0;
  marks.forEach(function(m){
    var max=+m.max||0, score=+m.score||0, w=+m.weight||0;
    if(max<=0)return;
    n++; sSum+=score; sMax+=max;
    if(w>0){ wSum+=w; wEarned+=(score/max)*w; }
  });
  if(!n)return {pct:0,counted:0,weightLogged:0,earned:0,outOf:0};
  var pct=wSum>0?(wEarned/wSum*100):(sMax>0?(sSum/sMax*100):0);
  return {pct:Math.round(pct*10)/10,counted:n,weightLogged:wSum,earned:sSum,outOf:sMax};
}

// ---- المعدّل ----
// يحسب فقط المساقات اللي ليها تقدير نهائي وساعات > 0
function gpaOf(keys){
  var pts=0,cr=0,counted=0;
  (keys||[]).forEach(function(k){
    var l=courseLetter(k), p=gradePts(l), c=courseCredits(k);
    if(p===null||!(c>0))return;
    pts+=p*c; cr+=c; counted++;
  });
  return {gpa:cr>0?Math.round(pts/cr*100)/100:null,credits:cr,counted:counted};
}
function termGPA(){ return gpaOf((typeof courseActive==='function')?courseActive():Object.keys(S.subjects||{})); }
function cumGPA(){ return gpaOf(Object.keys(S.subjects||{})); }   // التراكمي يشمل المؤرشفة (الترمات السابقة)

// ---- تعديل ----
function setCourseCredits(k,v){
  var c=courseObj(k); if(!c)return;
  c.credits=Math.max(0,Math.min(12,parseInt(v,10)||0));
  save(); renderGpa(); renderCourses();
}
function setCourseLetter(k,v){
  var c=courseObj(k); if(!c)return;
  c.letter=v||'';
  save(); renderGpa(); renderCourses();
  if(v&&v!=='F'&&typeof flashDone==='function')flashDone();
}
function markAdd(k){
  var c=courseObj(k); if(!c)return;
  courseMarks(k).push({id:Date.now(),t:'تقييم',score:0,max:100,weight:0});
  save(); renderCourses();
}
function markSet(k,id,field,v){
  var m=courseMarks(k).filter(function(x){return x.id===id;})[0]; if(!m)return;
  if(field==='t')m.t=String(v).slice(0,60);
  else m[field]=Math.max(0,parseFloat(v)||0);
  save();
  var box=document.getElementById('mk-total-'+k);
  if(box){ var tt=marksTotal(courseMarks(k)); box.textContent=arN(tt.pct)+'٪'; }
  renderGpa();
}
function markDel(k,id){
  var arr=courseMarks(k), i=-1,j;
  for(j=0;j<arr.length;j++)if(arr[j].id===id)i=j;
  if(i<0)return;
  var m=arr[i]; arr.splice(i,1); save(); renderCourses();
  undoToast('حُذفت «'+esc(m.t)+'»',function(){ arr.splice(i,0,m); save(); renderCourses(); });
}

// ---- الواجهة: لوحة الدرجات داخل بطاقة المساق ----
function courseGradeHtml(k){
  var marks=courseMarks(k), tt=marksTotal(marks), letter=courseLetter(k);
  var rows=marks.map(function(m){
    return '<div class="mk-row">'+
      '<input class="mk-t" value="'+esc(m.t)+'" onchange="markSet(\''+k+'\','+m.id+',\'t\',this.value)" placeholder="اسم التقييم">'+
      '<input class="mk-n" type="number" min="0" step="0.5" value="'+(+m.score||0)+'" onchange="markSet(\''+k+'\','+m.id+',\'score\',this.value)" title="درجتك">'+
      '<span class="mk-sep">/</span>'+
      '<input class="mk-n" type="number" min="1" step="0.5" value="'+(+m.max||0)+'" onchange="markSet(\''+k+'\','+m.id+',\'max\',this.value)" title="الدرجة العظمى">'+
      '<input class="mk-n" type="number" min="0" max="100" value="'+(+m.weight||0)+'" onchange="markSet(\''+k+'\','+m.id+',\'weight\',this.value)" title="الوزن من الدرجة النهائية (٪) — اتركه صفراً لو مش عارفه">'+
      '<span class="mk-pc">٪</span>'+
      '<button class="cu-x" onclick="markDel(\''+k+'\','+m.id+')" title="حذف"><i data-lucide="x"></i></button>'+
      '</div>';
  }).join('');
  var suggest=tt.counted?('<span class="mk-suggest" title="تقدير مقترَح من درجاتك — النهائي بيدك">≈ '+pctToLetter(tt.pct)+'</span>'):'';
  return '<div class="mk-box">'+
    '<div class="mk-head"><i data-lucide="clipboard-check"></i> الدرجات المجمّعة'+
      (tt.counted?('<span class="mk-total" id="mk-total-'+k+'">'+arN(tt.pct)+'٪</span>'+suggest+
        (tt.weightLogged>0&&tt.weightLogged<100?('<span class="mk-left">مرصود '+arN(tt.weightLogged)+'٪ من الدرجة</span>'):'')):'')+
    '</div>'+
    (rows||'<div class="cu-empty">سجّل الميدتيرم والكويزات بأوزانها — النسبة تتحسب لوحدها بدل ما تقدّرها</div>')+
    '<div class="mk-add"><button class="btn sm" onclick="markAdd(\''+k+'\')"><i data-lucide="plus"></i> تقييم</button>'+
      '<span class="cu-sp"></span>'+
      '<label class="mk-lbl">ساعات معتمدة</label>'+
      '<input class="mk-n" type="number" min="0" max="12" value="'+courseCredits(k)+'" onchange="setCourseCredits(\''+k+'\',this.value)">'+
      '<label class="mk-lbl">التقدير النهائي</label>'+
      '<select class="mk-sel" onchange="setCourseLetter(\''+k+'\',this.value)">'+
        '<option value="">—</option>'+
        GRADE_SCALE.map(function(g){ return '<option value="'+g[0]+'"'+(letter===g[0]?' selected':'')+'>'+g[0]+'</option>'; }).join('')+
      '</select>'+
    '</div></div>';
}

// ---- الواجهة: بطاقة المعدّل في «مسار العلم» ----
function renderGpa(){
  var el=document.getElementById('gpa-card'); if(!el)return;
  var t=termGPA(), c=cumGPA();
  var keys=Object.keys(S.subjects||{}).filter(function(k){ return gradePts(courseLetter(k))!==null; })
    .sort(function(a,b){ return (S.subjects[a].order||0)-(S.subjects[b].order||0); });
  var graded=keys.map(function(k){
    var l=courseLetter(k), p=gradePts(l), arch=!!S.subjects[k].archived;
    return '<div class="gp-row'+(arch?' arch':'')+'">'+
      '<span class="cr-dot" style="background:'+subjColor(k)+'"></span>'+
      '<span class="gp-n">'+esc(subjLabel(k))+'</span>'+
      (arch?'<i class="gp-ar" data-lucide="archive"></i>':'')+
      '<span class="cu-sp"></span>'+
      '<span class="gp-cr">'+arN(courseCredits(k))+' س</span>'+
      '<span class="gp-l gp-'+(p>=3?'hi':p>=2?'mid':'lo')+'">'+l+'</span>'+
      '<span class="gp-p">'+p.toFixed(1)+'</span></div>';
  }).join('');

  var big=function(lbl,g,sub){
    return '<div class="gp-big">'+
      '<div class="gp-big-n">'+(g.gpa===null?'—':g.gpa.toFixed(2))+'</div>'+
      '<div class="gp-big-l">'+lbl+'</div>'+
      '<div class="gp-big-s">'+sub+'</div></div>';
  };
  el.innerHTML='<div class="card-title"><i data-lucide="award"></i> الدرجات والمعدّل</div>'+
    '<div class="gp-tops">'+
      big('المعدّل الفصلي',t,t.counted?(arN(t.credits)+' ساعة · '+arN(t.counted)+' مساق'):'حدّد تقديراً لمساق')+
      big('التراكمي',c,c.counted?(arN(c.credits)+' ساعة مكتسبة'):'يشمل الترمات السابقة')+
    '</div>'+
    (graded?('<div class="gp-list">'+graded+'</div>')
           :'<div class="cu-empty">افتح أي مساق من «مساقاتي» وحدّد ساعاته وتقديره النهائي — المعدّل يتحسب لوحده.</div>');
  icons();
}
