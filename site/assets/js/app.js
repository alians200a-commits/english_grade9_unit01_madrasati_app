const CHEMISTRY_CHAPTER_02 = window.MADRASATI_BANK;
const app=document.getElementById('app');
const STORAGE_KEY='madrasati_english_grade9_unit01_v1';
const DB_NAME='madrasati_english_grade9_unit01_media_v1';
const DB_STORE='media';
const TYPE_LABELS={definition_matching:'اكتب الكلمة المناسبة للتعريف',matching:'مطابقة',fill_blank:'ملء الفراغات',embedded_choice_passage:'اختيار داخل قطعة',spelling_fill:'إكمال الكلمات',opposites_fill:'إكمال المتضادات',contractions_fill:'إكمال الاختصارات',transformation:'تحويلات',multiple_choice:'اختيار من متعدد',tell_time:'كتابة الوقت',past_continuous:'الماضي المستمر',give_reason:'تعليل',give_reason_and_choice:'تعليل واختيار',more_polite:'صياغة أكثر تهذيبًا',reading_comprehension:'استيعاب قطعة',true_false_reading:'صح وخطأ من قطعة',story_comprehension:'أسئلة القصة',written_component:'إنشاء كتابي',punctuation_rewrite:'الأحرف الكبيرة وعلامات الترقيم',textbook_reading:'أسئلة الكتاب',text:'سؤال نصي',definition:'تعريف',reason:'تعليل',short_answer:'سؤال مباشر',enumerate:'تعداد',structured_chemistry:'مسألة كيميائية',multi_branch_text:'سؤال متعدد الفروع',comparison_table:'مقارنة بجدول',choose_parentheses:'اختيار مما بين الأقواس',true_false:'صح وخطأ',correct_error:'صحح الخطأ',activity_experiment:'تجربة مصدرية',multi_branch_multiple_choice:'اختيار متعدد الفروع'};
const questions=CHEMISTRY_CHAPTER_02.questions;
const topics=CHEMISTRY_CHAPTER_02.topics;
let media={};let pendingScroll=false;let searchTimer;
function emptyState(){return{screen:'home',bank:'source',topic:'all',type:'all',status:'all',query:'',currentId:null,answers:{},branchAnswers:{},blankAnswers:{},choices:{},trueFalse:{},tables:{},numeric:{},figureAnswers:{},activityAnswers:{},branchChoices:{},groupTextAnswers:{},groupSelections:{},shownAnswers:{},ratings:{}}}
let state=emptyState();
function loadState(){try{state={...emptyState(),...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}}catch{state=emptyState()}}
function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}}
function esc(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function icon(name){const i={search:'⌕',eye:'◉',camera:'▣',trash:'×',plus:'＋',prev:'‹',next:'›'};return`<span aria-hidden="true">${i[name]||''}</span>`}
function math(tex,display=false){return`<span class="math-isolate ${display?'math-display':''}" dir="ltr">${display?'\\[':'\\('}${esc(tex)}${display?'\\]':'\\)'}</span>`}
function mixedMath(tex,display=false){const source=String(tex||'');const re=/\\text\{([^{}]*)\}/g;let cursor=0,match;const pieces=[];while((match=re.exec(source))){const before=source.slice(cursor,match.index).replace(/\\\s*$/,'').trim();if(before)pieces.push(math(before,false));pieces.push(`<span class="arabic-math-text">${esc(match[1])}</span>`);cursor=match.index+match[0].length}const after=source.slice(cursor).trim();if(after)pieces.push(math(after,false));if(!pieces.length)return math(source,display);return`<span class="mixed-math ${display?'math-display':''}">${pieces.join(' ')}</span>`}
const SUBSCRIPT_DIGITS={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
if(!window.ChemistryFormat)throw new Error('ChemistryFormat failed to load');
const {atomToken,richText,displayText}=window.ChemistryFormat;
function normalizeArabicDisplay(value=''){return String(value??'').normalize('NFC').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,'').replace(/\u00a0/g,' ').replace(/\s*[\(\[]\s*(?:ةيراوز|ةيرازو|يرازو|وزارية|وزاري|سؤال\s+وزاري)\s*[\)\]]\s*/gu,' ').replace(/^\s*علل\s*[\/\\:：\-–—]\s*/u,'علِّل: ').replace(/[ \t]{2,}/g,' ').replace(/\s+([،؛:.!?؟])/g,'$1').trim()}
function visibleQuestion(q){return normalizeArabicDisplay(q?.displayQuestion??q?.question??'')}
function isSourceGroup(q){return Array.isArray(q?.items)&&q.items.length>0}
function englishText(value=''){return`<span class="english-text" dir="ltr">${esc(value).replace(/\n/g,'<br>')}</span>`}
/* ENGLISH_ITEM_PROMPT_FORMAT_V1 START */

function splitEnglishItemRequirement(value=''){
    const source=String(value??'')
        .replace(/\s+/g,' ')
        .trim();

    if(!source){
        return{
            main:'',
            requirement:''
        };
    }

    /*
     * التقاط آخر عبارة موجودة بين قوسين فقط.
     * يحافظ على الأقواس الداخلية الموجودة داخل الجملة، مثل:
     * It (not/has) any bakeries. (Negative)
     */
    const parentheticalMatch=source.match(
        /^(.*\S)\s*\(\s*([^()]*)\s*\)\s*$/u
    );

    if(
        parentheticalMatch &&
        parentheticalMatch[1].trim() &&
        parentheticalMatch[2].trim()
    ){
        return{
            main:parentheticalMatch[1].trim(),
            requirement:parentheticalMatch[2].trim()
        };
    }

    /*
     * معالجة التعليمات التي كُتبت من دون أقواس.
     * لا تُحوّل أي كلمة عشوائية؛ بل التعليمات التعليمية المعروفة فقط.
     */
    const bareRequirementMatch=source.match(
        /^(.*?[.!?])\s+(make\s+negative|make\s+(?:a\s+)?question|negative|question|past\s+continuous(?:\s*,\s*question)?|complete|true\s*\/\s*false)\s*$/iu
    );

    if(
        bareRequirementMatch &&
        bareRequirementMatch[1].trim() &&
        bareRequirementMatch[2].trim()
    ){
        return{
            main:bareRequirementMatch[1].trim(),
            requirement:bareRequirementMatch[2].trim()
        };
    }

    return{
        main:source,
        requirement:''
    };
}

function englishItemPrompt(value=''){
    const parts=splitEnglishItemRequirement(value);

    if(!parts.requirement){
        return englishText(parts.main);
    }

    return`
        <span class="english-item-prompt" dir="ltr">
            <span class="english-item-main">
                ${englishText(parts.main)}
            </span>
            <span class="item-requirement" dir="ltr">
                (${esc(parts.requirement)})
            </span>
        </span>
    `;
}

/* ENGLISH_ITEM_PROMPT_FORMAT_V1 END */
/* STRICT_LITERAL_ENGLISH_PROMPTS_V3 START */

/**
 * يعيد نص السؤال بصيغة حرفية وآمنة.
 * يحافظ على الأقواس الداخلية مثل:
 * (wait)
 * (play)
 * (watch)
 *
 * ويحافظ على تعليمة السؤال مثل:
 * (Past Continuous)
 * (Negative)
 * (Question)
 */
function strictLiteralEnglishPrompt(value=''){
    let text=String(value??'')
        .normalize('NFC')
        .replace(/\u00a0/g,' ')
        .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,'')
        .replace(/[ \t]+/g,' ')
        .trim();

    /*
     * إصلاح الكلمات التي ربما دمجتها دالة عرض قديمة.
     */
    text=text
        .replace(/\bPastContinuous\b/giu,'Past Continuous')
        .replace(/\bPastcontinuous\b/giu,'Past Continuous')
        .replace(/\bTrueFalse\b/giu,'True/False');

    /*
     * إذا كانت التعليمة النهائية موجودة من دون أقواس،
     * نضيف الأقواس لها فقط.
     *
     * لا نمس الأقواس الموجودة أصلًا داخل الجملة.
     */
    if(!/\([^()]+\)\s*$/u.test(text)){
        const bareInstruction=text.match(
            /^(.*\S)\s+(Past Continuous(?:\s*,\s*Question)?|Negative|Question|Make negative|Make a question|Complete|True\s*\/\s*False|Choose|Rewrite|Correct)\s*$/iu
        );

        if(bareInstruction){
            const sentence=bareInstruction[1].trim();
            const instruction=bareInstruction[2]
                .replace(/\s*,\s*/g,', ')
                .replace(/[ \t]+/g,' ')
                .trim();

            text=`${sentence} (${instruction})`;
        }
    }

    return text;
}

/**
 * يزيل أي عنصر HTML مائل أضافته دوال العرض القديمة.
 */
function replaceItalicElementWithPlainSpan(node){
    if(!node||!node.parentNode)return;

    const span=document.createElement('span');
    span.className='strict-non-italic-text';
    span.setAttribute('dir','ltr');
    span.textContent=node.textContent||'';

    node.replaceWith(span);
}

/**
 * يفرض نصوص الفروع من المصدر بعد كل عملية render.
 *
 * هذه الخطوة هي الضمان النهائي:
 * حتى لو قامت دالة قديمة بحذف الأقواس أو جعل النص مائلًا،
 * يتم استبدال الناتج بالنص الأصلي من item.prompt.
 */
function enforceLiteralEnglishPrompts(){
    const currentQuestion=
        typeof questionById==='function'
            ? questionById(state?.currentId)
            : null;

    if(!currentQuestion||!Array.isArray(currentQuestion.items)){
        document
            .querySelectorAll(
                '.question-card i, .question-card em, .question-card cite, .question-card var'
            )
            .forEach(replaceItalicElementWithPlainSpan);

        return;
    }

    const items=currentQuestion.items;

    /*
     * بطاقات الإجابة قبل الكشف.
     */
    const inputCards=Array.from(
        app.querySelectorAll(
            '.english-branch-card, .branch-answer-card.english-branch-card'
        )
    );

    inputCards.forEach((card,index)=>{
        const item=items[index];
        if(!item)return;

        const label=
            card.querySelector('.english-branch-label > span')||
            card.querySelector('.branch-label > span');

        if(!label)return;

        label.textContent=strictLiteralEnglishPrompt(item.prompt||'');
        label.classList.add('strict-literal-english-prompt');
        label.setAttribute('dir','ltr');
        label.setAttribute('lang','en');
    });

    /*
     * بطاقات الإجابة بعد إظهار الجواب النموذجي.
     */
    const revealedCards=Array.from(
        app.querySelectorAll('.group-answer-results .group-answer-card')
    );

    revealedCards.forEach((card,index)=>{
        const item=items[index];
        if(!item)return;

        const label=
            card.querySelector('.english-branch-label > span')||
            card.querySelector('.branch-label > span');

        if(!label)return;

        label.textContent=strictLiteralEnglishPrompt(item.prompt||'');
        label.classList.add('strict-literal-english-prompt');
        label.setAttribute('dir','ltr');
        label.setAttribute('lang','en');
    });

    /*
     * عناصر List A في أسئلة المطابقة.
     */
    const matchingItems=items.filter(item=>item.mode==='matching');

    const matchingEntries=Array.from(
        app.querySelectorAll(
            '.matching-list-a .match-entry, .matching-reference .matching-list-a .match-entry'
        )
    );

    matchingEntries.forEach((entry,index)=>{
        const item=matchingItems[index];
        if(!item)return;

        entry.textContent=strictLiteralEnglishPrompt(item.prompt||'');
        entry.classList.add('strict-literal-english-prompt');
        entry.setAttribute('dir','ltr');
        entry.setAttribute('lang','en');
    });

    /*
     * منع أي عنصر مائل متبقٍ داخل السؤال.
     */
    app
        .querySelectorAll(
            '.question-card i, .question-card em, .question-card cite, .question-card var'
        )
        .forEach(replaceItalicElementWithPlainSpan);
}

/* STRICT_LITERAL_ENGLISH_PROMPTS_V3 END */
function sourceGroupAttempted(q){return Object.values(state.groupTextAnswers[q.id]||{}).some(v=>String(v||'').trim())||Object.keys(state.groupSelections[q.id]||{}).length>0}
function itemStudentValue(q,item,index){if(item.mode==='text'||item.mode==='fill_blank'||item.mode==='long_text')return state.groupTextAnswers[q.id]?.[index]||'';const selected=state.groupSelections[q.id]?.[index];if(item.mode==='choice')return Number.isInteger(selected)?item.options?.[selected]||'':'';if(item.mode==='true_false')return selected===true?'True':selected===false?'False':'';if(item.mode==='matching')return typeof selected==='string'?selected:'';return''}
function itemModelValue(item){if(item.mode==='true_false')return item.answer===true?'True':'False';return item.answerText??String(item.answer??'')}

function topicById(id){return topics.find(t=>t.id===id)}function questionById(id){return questions.find(q=>q.id===id)}function mediaItems(id){return media[id]?.files||[]}function bankQuestions(bank=state.bank){return questions.filter(q=>q.questionOrigin===bank)}function activityFields(q){const saved=state.activityAnswers[q.id]?.fields;if(saved)return saved;return (q.activityDefaultFields||[]).map(label=>({label,value:''}))}function numericBranches(q){return q.numericBranches||[{label:'الناتج النهائي',unit:''}]}
/* EQUATION BRANCH IMAGE UPLOAD V1 */
function equationBranchText(branch){return String(typeof branch==='string'?branch:(branch?.prompt||branch?.label||''))}
function isEquationImageQuestion(q){const branches=q?.branches||[];return q?.questionType==='structured_chemistry'&&branches.length>0&&branches.every(branch=>/(?:⟶|→|->)/.test(equationBranchText(branch)))}
function equationMediaKey(questionId,index){return questionId+'::equation::'+index}
function equationBranchHasImage(q,index){return mediaItems(equationMediaKey(q.id,index)).length>0}
function allEquationBranchesHaveImages(q){return(q.branches||[]).length>0&&(q.branches||[]).every((_,index)=>equationBranchHasImage(q,index))}
function attempted(q){
if(isSourceGroup(q))return sourceGroupAttempted(q);
if(q.questionType==='multiple_choice'||q.questionType==='choose_parentheses')return Number.isInteger(state.choices[q.id]);
if(q.questionType==='multi_branch_multiple_choice')return Object.keys(state.branchChoices[q.id]||{}).length>0;
if(q.questionType==='true_false')return typeof state.trueFalse[q.id]==='boolean';
if(q.questionType==='fill_blank')return(state.blankAnswers[q.id]||[]).some(v=>String(v||'').trim());
if(q.questionType==='comparison_table')return Object.values(state.tables[q.id]||{}).some(v=>String(v||'').trim());
if(isEquationImageQuestion(q))return allEquationBranchesHaveImages(q);
if(q.questionType==='multi_branch_text'||q.questionType==='structured_chemistry')return Object.values(state.branchAnswers[q.id]||{}).some(v=>String(v||'').trim());
if(q.questionType==='figure_labeling')return Object.values(state.figureAnswers[q.id]||{}).some(v=>String(v||'').trim());
if(q.questionType==='numeric_problem'||q.questionType==='drawing_upload')return mediaItems(q.id).length>0;
if(q.questionType==='activity_experiment'||q.questionType==='experiment')return activityFields(q).some(f=>String(f.value||'').trim())||mediaItems(q.id).length>0;
return Boolean(String(state.answers[q.id]||'').trim())}
function progress(list){const total=list.length,done=list.filter(attempted).length;return{total,done,percent:total?Math.round(done*100/total):0}}
function availableTypes(){return[...new Set(bankQuestions().map(q=>q.questionType))].sort()}
function filteredQuestions(){const needle=state.query.trim().toLowerCase();return bankQuestions().filter(q=>{if(state.topic!=='all'&&q.topicId!==state.topic)return false;if(state.type!=='all'&&q.questionType!==state.type)return false;if(state.status==='unanswered'&&attempted(q))return false;if(state.status==='unrated'&&state.ratings[q.id]!==undefined)return false;if(state.status==='rated'&&state.ratings[q.id]===undefined)return false;const haystack=`${q.searchText||''} ${q.question||''} ${q.answer||''} ${topicById(q.topicId)?.title||''}`.toLowerCase();if(needle&&!haystack.includes(needle))return false;return true})}
function shell(content){return`<header class="topbar"><div class="topbar-inner"><div class="brand"><span class="brand-mark">م</span><span class="brand-copy">تطبيق مدرسي<small>${esc(CHEMISTRY_CHAPTER_02.subject||'اسم المادة')} — ${esc(CHEMISTRY_CHAPTER_02.grade||'اسم الصف')}</small></span></div><nav class="nav"><button data-action="home" class="${state.screen==='home'?'active':''}">الموضوعات</button><button data-action="open-all-questions" class="${state.screen==='questions'?'active':''}">الأسئلة</button><button data-action="report" class="${state.screen==='report'?'active':''}">التقرير</button></nav></div></header><main class="page">${content}</main>`}
function topicCounts(id){return{source:questions.filter(q=>q.topicId===id&&q.questionOrigin==='source').length,enrichment:questions.filter(q=>q.topicId===id&&q.questionOrigin==='enrichment').length}}
function homeView(){const p=progress(questions);const cards=topics.map((t,i)=>{const c=topicCounts(t.id);return`<article class="lesson-card"><div class="lesson-index">${i+1}</div><div class="lesson-main"><span class="section-name">${esc(CHEMISTRY_CHAPTER_02.chapterLabel||'الفصل أو الوحدة')}</span><h3>${esc(t.title)}</h3></div><div class="lesson-counts"><span class="count-chip source">المصدر: ${c.source}</span>${c.enrichment?`<span class="count-chip enrichment">الإثرائي: ${c.enrichment}</span>`:''}</div><div class="lesson-actions ${c.enrichment?'':'single-action'}"><button data-open-topic="${t.id}" data-bank="source">أسئلة المصدر</button>${c.enrichment?`<button class="enrichment" data-open-topic="${t.id}" data-bank="enrichment">الأسئلة الإثرائية</button>`:''}</div></article>`}).join('');const empty=!topics.length&&!questions.length?`<section class="empty blank-template-state"><h2>القالب محفوظ من دون أسئلة</h2><p>عدّل بيانات المادة والموضوعات والأسئلة داخل <bdi dir="ltr">assets/js/questions.js</bdi>، واحتفظ بالمصدر الأصلي داخل مجلد <bdi dir="ltr">source/</bdi>.</p></section>`:'';return shell(`<section class="hero"><span class="hero-kicker">${esc(CHEMISTRY_CHAPTER_02.chapterLabel||'الفصل أو الوحدة')}</span><h1>${esc(CHEMISTRY_CHAPTER_02.chapterTitle||'عنوان الفصل أو الوحدة')}</h1><p>${esc(CHEMISTRY_CHAPTER_02.heroDescription||'بنك أسئلة تفاعلي للمراجعة الذاتية.')}</p></section><section class="stats"><div><strong>${topics.length}</strong><span>موضوعًا</span></div><div><strong>${CHEMISTRY_CHAPTER_02.counts.source}</strong><span>أسئلة المصدر</span></div><div><strong>${CHEMISTRY_CHAPTER_02.counts.enrichment}</strong><span>أسئلة إثرائية</span></div><div><strong>${p.percent}%</strong><span>نسبة الإنجاز</span></div></section>${empty}<div class="section-head"><div><h2>موضوعات الفصل</h2><p>اختر الموضوع ثم بنك الأسئلة.</p></div></div><section class="lessons-grid">${cards}</section>`)}
function filtersHtml(list){const typeOptions=availableTypes().map(t=>`<option value="${t}" ${state.type===t?'selected':''}>${TYPE_LABELS[t]||t}</option>`).join('');const topicOptions=topics.map(t=>`<option value="${t.id}" ${state.topic===t.id?'selected':''}>${esc(t.title)}</option>`).join('');const enrichmentCount=Number(CHEMISTRY_CHAPTER_02.counts.enrichment||0);return`<section class="filters"><div class="bank-tabs ${enrichmentCount?'':'single-bank'}"><button data-bank="source" class="${state.bank==='source'?'active':''}">أسئلة المصدر (${CHEMISTRY_CHAPTER_02.counts.source})</button>${enrichmentCount?`<button data-bank="enrichment" class="enrichment ${state.bank==='enrichment'?'active':''}">الأسئلة الإثرائية (${enrichmentCount})</button>`:''}</div><div class="filter-grid"><label class="search">${icon('search')}<input data-filter="query" value="${esc(state.query)}" placeholder="ابحث في السؤال أو الجواب..."></label><select data-filter="topic"><option value="all">كل الموضوعات</option>${topicOptions}</select><select data-filter="type"><option value="all">كل أنواع الأسئلة</option>${typeOptions}</select></div><div class="status-row"><div class="status-pills"><button data-status="all" class="${state.status==='all'?'active':''}">الكل</button><button data-status="unanswered" class="${state.status==='unanswered'?'active':''}">غير مجاب</button><button data-status="unrated" class="${state.status==='unrated'?'active':''}">غير مقيّم</button><button data-status="rated" class="${state.status==='rated'?'active':''}">مقيّم</button></div><strong>النتائج: ${list.length} سؤالًا</strong></div></section>`}
function typeLabel(q){if(q.questionTypeLabel)return q.questionTypeLabel;if(q.questionType!=='structured_chemistry')return TYPE_LABELS[q.questionType]||q.questionType;const n=q.notation||'';if(n==='lewis_symbols')return'رمز لويس';if(n.includes('orbital'))return'مخطط أوربيتالات';if(n.includes('electron_configuration'))return'ترتيب إلكتروني';return'مسألة كيميائية'}
function metaHtml(q,index,total){const t=topicById(q.topicId);return`<div class="question-head"><span class="q-number">السؤال ${index+1}</span><span class="q-counter">${index+1} من ${total}</span></div><div class="meta-row"><span class="meta-chip ${q.questionOrigin}">${q.questionOrigin==='source'?'أسئلة المصدر':'سؤال إثرائي'}</span><span class="meta-chip">${esc(t?.title||'')}</span><span class="meta-chip type">${typeLabel(q)}</span>${q.isMinisterial?'<span class="meta-chip ministerial">وزاري</span>':''}</div>`}
function assetsHtml(paths=[],klass='question-figure'){return paths.length?`<div class="asset-grid">${paths.map(p=>`<img class="${klass}" src="${esc(p)}" alt="رسم تعليمي من المصدر">`).join('')}</div>`:''}
function splitPromptParts(value=''){const raw=String(value||'').trim();for(const re of [/(^|\s)(\d+)-\s*/g,/(^|\s)([أ-ي])-\s*/g]){const marks=[];let m;while((m=re.exec(raw)))marks.push({marker:m[2],markerStart:m.index+m[1].length,contentStart:re.lastIndex});if(marks.length>=2){return{lead:raw.slice(0,marks[0].markerStart).trim().replace(/[:：]\s*$/,''),parts:marks.map((x,i)=>({marker:x.marker,text:raw.slice(x.contentStart,i+1<marks.length?marks[i+1].markerStart:raw.length).trim()}))}}}return null}
function listOnlyTargets(value=''){const raw=String(value||'').trim();const tokens=raw.match(/[₀-₉]+[A-Z][a-z]?|(?:\d+)?[spdf][⁰¹²³⁴⁵⁶⁷⁸⁹]+/g)||[];if(!tokens.length)return[];const remainder=raw.replace(/[₀-₉]+[A-Z][a-z]?|(?:\d+)?[spdf][⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,'').replace(/[\s،,؛;:.؟?و]/g,'');return remainder?[]:tokens}
function structuredPromptHtml(q){const shownQuestion=visibleQuestion(q);const split=splitPromptParts(shownQuestion);if(split){return`<section class="structured-prompt"><div class="prompt-lead">${displayText(split.lead)}</div><ol class="prompt-steps">${split.parts.map(part=>`<li><span class="prompt-step-number">${esc(part.marker)}</span><div>${displayText(part.text)}</div></li>`).join('')}</ol></section>`}const raw=String(shownQuestion||'').trim();const colon=raw.indexOf(':');if(colon>0){const lead=raw.slice(0,colon).trim(),tail=raw.slice(colon+1).trim(),targets=listOnlyTargets(tail);if(targets.length){return`<section class="structured-prompt compact"><div class="prompt-lead">${displayText(lead)}</div><div class="chem-targets">${targets.map(t=>`<span class="chem-target">${richText(t)}</span>`).join('')}</div></section>`}return`<section class="structured-prompt"><div class="prompt-lead">${displayText(lead)}</div><div class="prompt-body">${displayText(tail)}</div></section>`}return`<section class="structured-prompt plain"><div class="prompt-lead">${displayText(raw)}</div></section>`}
function promptHtml(q){if(isSourceGroup(q))return sourceGroupPromptHtml(q);if(q.questionType==='correct_error')return`<section class="correct-error-prompt"><h2>صحّح الخطأ في العبارة التالية، دون تغيير ما تحته خط</h2><p><span class="fixed-part">${richText(q.correctUnderlinedText||'')}</span> ${richText(q.incorrectText||'')}</p></section>`;const assets=q.questionAssets||(q.questionFigure?[q.questionFigure]:[]);if(q.questionType==='multi_branch_text'||q.questionType==='structured_chemistry')return`${structuredPromptHtml(q)}${assetsHtml(assets)}`;return`<h2>${displayText(visibleQuestion(q))}</h2>${assetsHtml(assets)}`}

function sourceGroupPromptHtml(q){const bank=q.wordBank?.length?`<section class="word-bank" dir="ltr"><strong>Word box</strong><div>${q.wordBank.map(word=>`<span>${englishText(word)}</span>`).join('')}</div></section>`:'';const passage=q.context?`<details class="source-passage" open><summary>Reading passage</summary><div dir="ltr">${String(q.context).split(/\n\s*\n/).map(part=>`<p>${englishText(part)}</p>`).join('')}</div></details>`:'';return`<h2 class="english-question-prompt" dir="ltr">${englishText(visibleQuestion(q))}</h2>${bank}${passage}`}
function groupedChoiceButtons(q,item,index){const selected=state.groupSelections[q.id]?.[index];return`<div class="choice-list english-choice-list">${(item.options||[]).map((option,optionIndex)=>`<button class="choice-btn ${Number(selected)===optionIndex?'selected':''}" data-group-choice="${q.id}" data-group-index="${index}" data-value="${optionIndex}" data-group-kind="choice"><span>${englishText(option)}</span><small>${Number(selected)===optionIndex?'Selected':'Choose'}</small></button>`).join('')}</div>`}
function groupedTrueFalseButtons(q,item,index){const selected=state.groupSelections[q.id]?.[index];return`<div class="choice-list english-choice-list"><button class="choice-btn ${selected===true?'selected':''}" data-group-choice="${q.id}" data-group-index="${index}" data-value="true" data-group-kind="true_false"><span>${englishText('True')}</span><small>${selected===true?'Selected':'Choose'}</small></button><button class="choice-btn ${selected===false?'selected':''}" data-group-choice="${q.id}" data-group-index="${index}" data-value="false" data-group-kind="true_false"><span>${englishText('False')}</span><small>${selected===false?'Selected':'Choose'}</small></button></div>`}
/* ENGLISH_MATCHING_LAYOUT_V2 */
function matchingReferenceHtml(q){
    const matchingItems=(q.items||[]).filter(item=>item.mode==='matching');
    if(!matchingItems.length)return'';

    const options=[
        ...new Set(
            matchingItems
                .flatMap(item=>item.options||[])
                .map(option=>String(option))
        )
    ];

    const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    return`
        <section class="matching-reference" dir="ltr" aria-label="List A and List B">
            <div class="matching-reference-column matching-list-a">
                <h3>List A</h3>
                <ol>
                    ${matchingItems.map((item,index)=>`
                        <li>
                            <span class="match-marker">${esc(item.displayNumber??index+1)}</span>
                            <span class="match-entry">${englishItemPrompt(item.prompt||'')}</span>
                        </li>
                    `).join('')}
                </ol>
            </div>

            <div class="matching-reference-column matching-list-b">
                <h3>List B</h3>
                <ol>
                    ${options.map((option,index)=>`
                        <li>
                            <span class="match-marker">${esc(letters[index]||index+1)}</span>
                            <span class="match-entry">${englishText(option)}</span>
                        </li>
                    `).join('')}
                </ol>
            </div>
        </section>

        <h3 class="matching-answer-heading" dir="ltr">
            Match each item in List A with the correct item from List B:
        </h3>
    `;
}

function groupedMatchingSelect(q,item,index){
    const selected=state.groupSelections[q.id]?.[index]||'';
    const allSelections=state.groupSelections[q.id]||{};

    const usedByOtherItems=new Set(
        Object.entries(allSelections)
            .filter(([key,value])=>
                Number(key)!==index &&
                String(value||'').trim()
            )
            .map(([,value])=>String(value))
    );

    const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    return`
        <label class="matching-field" dir="ltr">
            <span>Choose the matching item from List B</span>

            <select
                data-group-select="${q.id}"
                data-group-index="${index}"
                aria-label="Answer for item ${index+1}"
                dir="ltr"
            >
                <option value="">Choose...</option>

                ${(item.options||[]).map((option,optionIndex)=>`
                    <option
                        value="${esc(option)}"
                        ${selected===option?'selected':''}
                        ${usedByOtherItems.has(String(option))&&selected!==option?'disabled':''}
                    >
                        ${esc(letters[optionIndex]||optionIndex+1)}. ${esc(option)}
                    </option>
                `).join('')}
            </select>
        </label>
    `;
}

function sourceGroupInput(q){
    const values=state.groupTextAnswers[q.id]||{};
    const matchingReference=matchingReferenceHtml(q);

    return`
        ${matchingReference}

        <div class="branch-grid structured-branches english-group-branches" dir="ltr">
            ${q.items.map((item,i)=>{
                let control='';

                if(item.mode==='choice'){
                    control=groupedChoiceButtons(q,item,i);
                }
                else if(item.mode==='true_false'){
                    control=groupedTrueFalseButtons(q,item,i);
                }
                else if(item.mode==='matching'){
                    control=groupedMatchingSelect(q,item,i);
                }
                else if(item.mode==='fill_blank'){
                    control=`
                        <input
                            type="text"
                            data-group-text="${q.id}"
                            data-group-index="${i}"
                            aria-label="Answer for item ${i+1}"
                            value="${esc(values[i]||'')}"
                            placeholder="Type the missing word"
                            dir="ltr"
                        >
                    `;
                }
                else{
                    control=`
                        <textarea
                            data-group-text="${q.id}"
                            data-group-index="${i}"
                            aria-label="Answer for item ${i+1}"
                            placeholder="Write your answer here..."
                            dir="ltr"
                        >${esc(values[i]||'')}</textarea>
                    `;
                }

                return`
                    <section class="branch-answer-card english-branch-card" dir="ltr">
                        <div class="branch-label english-branch-label" dir="ltr">
                            <b>${esc(item.displayNumber??i+1)}</b>
                            <span>${englishItemPrompt(item.prompt||'')}</span>
                        </div>

                        ${control}
                    </section>
                `;
            }).join('')}
        </div>
    `;
}function sourceGroupRevealedHtml(q){return`<div class="group-answer-results">${q.items.map((item,i)=>`<section class="group-answer-card"><div class="branch-label english-branch-label"><b>${esc(item.displayNumber??i+1)}</b><span>${englishItemPrompt(item.prompt||'')}</span></div><div class="group-answer-columns"><div class="student-summary"><div class="answer-title">محاولتك</div><p>${englishText(itemStudentValue(q,item,i)||'—')}</p></div><div class="model-answer"><div class="answer-title">الجواب النموذجي</div><p>${englishText(itemModelValue(item)||'—')}</p></div></div></section>`).join('')}</div>${ratingHtml(q)}`}
function textInput(q){return`<textarea data-text="${q.id}" placeholder="اكتب إجابتك هنا...">${esc(state.answers[q.id]||'')}</textarea>`}
function equationImageInput(q){return`<div class="equation-image-upload-grid">${(q.branches||[]).map((branch,index)=>{const key=equationMediaKey(q.id,index),files=mediaItems(key),file=files[0];return`<section class="equation-image-upload-card"><div class="summary-branch-title equation-upload-title"><b>${index+1}</b><span>${displayText(equationBranchText(branch))}</span></div><div class="equation-upload-body"><label class="upload-btn equation-image-upload-btn">${icon('camera')} ${file?'استبدال صورة الحل':'رفع صورة حل المعادلة'}<input type="file" data-equation-media-input="${q.id}" data-index="${index}" accept="image/png,image/jpeg,image/webp"></label><p class="media-limit">صورة واحدة مطلوبة لهذه المعادلة.</p>${file?`<figure class="equation-image-preview"><img src="${file.dataUrl}" alt="صورة حل الطالب للمعادلة ${index+1}"><button class="small-danger" data-delete-equation-media="${q.id}" data-index="${index}">${icon('trash')} حذف الصورة</button></figure>`:''}</div></section>`}).join('')}</div>`}
function equationImageStudentSummary(q){return`<div class="equation-image-summary-grid">${(q.branches||[]).map((branch,index)=>{const file=mediaItems(equationMediaKey(q.id,index))[0];return`<section class="equation-image-summary-card"><div class="summary-branch-title"><b>${index+1}</b><span>${displayText(equationBranchText(branch))}</span></div>${file?`<img src="${file.dataUrl}" alt="صورة حل الطالب للمعادلة ${index+1}">`:'<p>لا توجد صورة مرفوعة.</p>'}</section>`}).join('')}</div>`}
function equationImageRevealedHtml(q){const answers=Array.isArray(q.branchModelAnswers)?q.branchModelAnswers:[];return`<div class="equation-branch-comparison">${(q.branches||[]).map((branch,index)=>{const file=mediaItems(equationMediaKey(q.id,index))[0],answer=answers[index]||'';return`<section class="equation-branch-result"><div class="summary-branch-title"><b>${index+1}</b><span>${displayText(equationBranchText(branch))}</span></div><div class="equation-result-columns"><div class="student-equation-image"><h4>صورة حل الطالب</h4>${file?`<img src="${file.dataUrl}" alt="صورة حل الطالب للمعادلة ${index+1}">`:'<p>لا توجد صورة مرفوعة.</p>'}</div><div class="model-equation-answer"><h4>الجواب النموذجي</h4><p>${displayText(answer)}</p>${q.branchSourceNotes?.[index]?`<p class="source-note">${richText(q.branchSourceNotes[index])}</p>`:''}</div></div></section>`}).join('')}</div>${ratingHtml(q)}`}
function branchInput(q){const vals=state.branchAnswers[q.id]||{};return`<div class="branch-grid structured-branches">${(q.branches||[]).map((b,i)=>`<section class="branch-answer-card"><div class="branch-label"><b>${i+1}</b><span>${displayText(typeof b==='string'?b:(b.prompt||b.label||''))}</span></div><textarea data-branch="${q.id}" data-index="${i}" aria-label="إجابة الفرع ${i+1}" placeholder="اكتب إجابة هذا الفرع هنا...">${esc(vals[i]||'')}</textarea></section>`).join('')}</div>`}
function multiBranchChoiceInput(q){const values=state.branchChoices[q.id]||{};return`<div class="multi-branch-choice">${(q.branches||[]).map((b,bi)=>`<section class="branch-choice-card"><div class="branch-choice-title"><b>${bi+1}</b><span>${displayText(b.prompt||'')}</span></div><div class="choice-list">${(b.choices||[]).map((o,oi)=>`<button class="choice-btn ${Number(values[bi])===oi?'selected':''}" data-branch-choice="${q.id}" data-branch-index="${bi}" data-value="${oi}"><span>${richText(o)}</span><small>${Number(values[bi])===oi?'تم الاختيار':'اختر'}</small></button>`).join('')}</div></section>`).join('')}</div>`}
function fillInput(q){const vals=state.blankAnswers[q.id]||[],items=Array.isArray(q.blanks)?q.blanks:Array.from({length:Number(q.blanks)||1},()=>({}));return`<div class="blank-grid">${items.map((_,i)=>`<label><span>الفراغ ${i+1}</span><input type="text" data-blank="${q.id}" data-index="${i}" value="${esc(vals[i]||'')}" placeholder="اكتب الإجابة"></label>`).join('')}</div>`}
function choiceInput(q,kind){const opts=kind==='tf'?['صح','خطأ']:(q.choices||[]);const current=kind==='tf'?state.trueFalse[q.id]:state.choices[q.id];return`<div class="choice-list">${opts.map((o,i)=>{const val=kind==='tf'?(i===0):i;return`<button class="choice-btn ${String(current)===String(val)?'selected':''}" data-choice-kind="${kind}" data-id="${q.id}" data-value="${val}"><span>${q.choiceLatex?.[i]?mixedMath(q.choiceLatex[i],false):richText(o)}</span><small>${String(current)===String(val)?'تم الاختيار':'اختر'}</small></button>`}).join('')}</div>`}
function comparisonInput(q){const vals=state.tables[q.id]||{},subs=q.comparisonSubjects||[];return`<div class="table-wrap"><table class="comparison-table"><thead><tr><th>وجه المقارنة</th>${subs.map(s=>`<th>${richText(s)}</th>`).join('')}</tr></thead><tbody>${(q.rows||[]).map((r,i)=>`<tr><td class="criterion">${richText(r.criterion)}</td>${subs.map((_,j)=>`<td><textarea data-table="${q.id}" data-cell="${i}:${j}">${esc(vals[`${i}:${j}`]||'')}</textarea></td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function figureInput(q){const vals=state.figureAnswers[q.id]||{};return`<div class="figure-fields">${(q.fields||[]).map((f,i)=>`<label><span>${esc(f)}</span><input type="text" data-figure="${q.id}" data-index="${i}" value="${esc(vals[i]||'')}" placeholder="اكتب التأشير"></label>`).join('')}</div>`}
function mediaPreview(q){const files=mediaItems(q.id);return files.length?`<div class="preview-grid">${files.map(f=>`<figure><img src="${f.dataUrl}" alt="محاولة الطالب"></figure>`).join('')}</div>`:'<p>لا توجد صورة مرفوعة.</p>'}
function mediaControls(q,label='رفع صورة المحاولة'){const files=mediaItems(q.id),max=q.maxImages||2;return`<div class="media-box"><label class="upload-btn">${icon('camera')} ${files.length?'إضافة صورة أخرى':label}<input type="file" data-media-input="${q.id}" accept="image/png,image/jpeg,image/webp" multiple></label><p class="media-limit">الحد الأقصى: ${max===1?'صورة واحدة':`${max} صورتين`}</p>${files.length?`<div class="preview-grid">${files.map((f,i)=>`<figure><img src="${f.dataUrl}" alt="محاولة الطالب"><button class="small-danger" data-delete-media="${q.id}" data-index="${i}">${icon('trash')} حذف الصورة</button></figure>`).join('')}</div>`:''}</div>`}
function drawingInput(q){return`<div class="drawing-attempt"><p>ارسم المطلوب على ورقة ثم ارفع صورة رسمك.</p>${mediaControls(q,'رفع صورة الرسم')}</div>`}
function activityInput(q){const fields=activityFields(q);return`<div class="activity-attempt"><p class="activity-note">أضف حقلاً للأدوات أو خطوات النشاط أو التجربة.</p><div class="activity-fields">${fields.map((f,i)=>`<section class="dynamic-field"><div><input type="text" data-activity="${q.id}" data-index="${i}" data-part="label" value="${esc(f.label||'')}" placeholder="اسم الحقل، مثل: الأدوات"><button data-remove-activity="${q.id}" data-index="${i}" aria-label="حذف الحقل">×</button></div><textarea data-activity="${q.id}" data-index="${i}" data-part="value" placeholder="اكتب هنا...">${esc(f.value||'')}</textarea></section>`).join('')}</div><button class="add-field" data-add-activity="${q.id}">${icon('plus')} أضف حقلًا</button><p class="experiment-image-note">${esc(q.experimentImageNote||'إذا تضمّن النشاط أو التجربة رسمًا منهجيًا، ارسمه وأرفق صورته.')}</p>${mediaControls(q,'رفع صورة اختيارية')}</div>`}
function inputFor(q){if(isSourceGroup(q))return sourceGroupInput(q);if(q.questionType==='multiple_choice'||q.questionType==='choose_parentheses')return choiceInput(q,'mcq');if(q.questionType==='multi_branch_multiple_choice')return multiBranchChoiceInput(q);if(q.questionType==='true_false')return choiceInput(q,'tf');if(q.questionType==='fill_blank')return fillInput(q);if(q.questionType==='comparison_table')return comparisonInput(q);if(q.questionType==='multi_branch_text'||q.questionType==='structured_chemistry')return isEquationImageQuestion(q)?equationImageInput(q):branchInput(q);if(q.questionType==='numeric_problem'||q.questionType==='drawing_upload')return drawingInput(q);if(q.questionType==='activity_experiment'||q.questionType==='experiment')return activityInput(q);if(q.questionType==='figure_labeling')return figureInput(q);return textInput(q)}
function modelTable(q,values={},student=false){const subs=q.comparisonSubjects||[];return`<div class="table-wrap"><table class="comparison-table model-table"><thead><tr><th>وجه المقارنة</th>${subs.map(s=>`<th>${richText(s)}</th>`).join('')}</tr></thead><tbody>${(q.rows||[]).map((r,i)=>`<tr><td class="criterion">${richText(r.criterion)}</td>${subs.map((_,j)=>`<td>${richText(student?values[`${i}:${j}`]||'—':r.answers?.[j]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function studentSummary(q){
if(q.questionType==='multiple_choice'||q.questionType==='choose_parentheses'){const i=state.choices[q.id];return`<p>${q.choiceLatex?.[i]?mixedMath(q.choiceLatex[i],false):richText(q.choices?.[i]||'')}</p>`}
if(q.questionType==='multi_branch_multiple_choice'){const v=state.branchChoices[q.id]||{};return`<div class="summary-branches">${(q.branches||[]).map((b,i)=>`<section><div class="summary-branch-title"><b>${i+1}</b><span>${displayText(b.prompt||'')}</span></div><p>${Number.isInteger(v[i])?richText(b.choices?.[v[i]]||''):'—'}</p></section>`).join('')}</div>`}
if(q.questionType==='true_false')return`<p>${state.trueFalse[q.id]?'صح':'خطأ'}</p>`;
if(q.questionType==='fill_blank'){const v=state.blankAnswers[q.id]||[],items=Array.isArray(q.blanks)?q.blanks:Array.from({length:Number(q.blanks)||1});return`<ol>${items.map((_,i)=>`<li>${richText(v[i]||'—')}</li>`).join('')}</ol>`}
if(isEquationImageQuestion(q))return equationImageStudentSummary(q);
if(q.questionType==='multi_branch_text'||q.questionType==='structured_chemistry'){const v=state.branchAnswers[q.id]||{};return`<div class="summary-branches">${(q.branches||[]).map((b,i)=>`<section><div class="summary-branch-title"><b>${i+1}</b><span>${displayText(typeof b==='string'?b:(b.prompt||b.label||''))}</span></div><p>${richText(v[i]||'—')}</p></section>`).join('')}</div>`}
if(q.questionType==='comparison_table')return modelTable(q,state.tables[q.id]||{},true);
if(q.questionType==='numeric_problem'||q.questionType==='drawing_upload')return mediaPreview(q);
if(q.questionType==='activity_experiment'||q.questionType==='experiment'){const f=activityFields(q);return`<div>${f.map(x=>`<h4>${esc(x.label||'حقل')}</h4><p>${richText(x.value||'—')}</p>`).join('')}${mediaPreview(q)}</div>`}
if(q.questionType==='figure_labeling'){const v=state.figureAnswers[q.id]||{};return`<ol>${(q.fields||[]).map((f,i)=>`<li><strong>${esc(f)}:</strong> ${richText(v[i]||'—')}</li>`).join('')}</ol>`}
return`<p>${richText(state.answers[q.id]||'')}</p>`}
function answerRows(value=''){const lines=String(value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);if(lines.length<2)return`<p class="answer-text">${richText(lines[0]||'')}</p>`;return`<div class="model-answer-rows">${lines.map((line,i)=>{const m=line.match(/^\s*(\d+|[أ-ي])-\s*(.*)$/);const marker=m?m[1]:String(i+1),body=m?m[2]:line;return`<div class="model-answer-row"><span>${esc(marker)}</span><p>${displayText(body)}</p></div>`}).join('')}</div>`}
function atomicSubscript(n){const rev=Object.fromEntries(Object.entries(SUBSCRIPT_DIGITS).map(([k,v])=>[v,k]));return String(n).split('').map(x=>rev[x]||x).join('')}
function lewisHtml(q){if(!Array.isArray(q.lewisSymbols)||!q.lewisSymbols.length)return'';return`<div class="lewis-grid">${q.lewisSymbols.map(item=>{const copy={...item};copy.atomicNumber=Number(copy.atomicNumber);const raw=atomicSubscript(copy.atomicNumber)+copy.symbol;const e=Math.max(0,Math.min(8,Number(copy.electrons)||0));const sides=[0,0,0,0];for(let i=0;i<Math.min(e,4);i++)sides[i]=1;for(let i=4;i<e;i++)sides[i-4]++;const dots=n=>'•'.repeat(n);return`<figure class="lewis-card"><div class="lewis-atom"><span class="lewis-side lewis-top">${dots(sides[3])}</span><span class="lewis-side lewis-right">${dots(sides[0])}</span><span class="lewis-center">${atomToken(raw)}</span><span class="lewis-side lewis-bottom">${dots(sides[1])}</span><span class="lewis-side lewis-left">${dots(sides[2])}</span></div><figcaption>رمز لويس لـ ${esc(copy.symbol)}</figcaption></figure>`}).join('')}</div>`}
function modelAnswer(q){
if(q.questionType==='comparison_table')return `${modelTable(q)}${q.sourceAnswerNote?`<p class="source-note">${richText(q.sourceAnswerNote)}</p>`:''}`;
if(q.questionType==='multiple_choice'||q.questionType==='choose_parentheses')return`<p>${q.choiceLatex?.[q.correctChoiceIndex]?mixedMath(q.choiceLatex[q.correctChoiceIndex],false):richText(q.choices?.[q.correctChoiceIndex]||q.answer)}</p>${q.sourceExplanation?`<p class="source-note">${richText(q.sourceExplanation)}</p>`:''}`;
if(q.questionType==='multi_branch_multiple_choice')return`<div class="summary-branches model-branch-choices">${(q.branches||[]).map((b,i)=>`<section><div class="summary-branch-title"><b>${i+1}</b><span>${displayText(b.prompt||'')}</span></div><p><strong>${richText(b.choices?.[b.correctChoiceIndex]||b.correctOption||'')}</strong></p>${b.modelAnswer&&b.modelAnswer!==(b.correctOption||'')?`<p class="source-note">${richText(b.modelAnswer)}</p>`:''}</section>`).join('')}</div>`;
if(q.questionType==='true_false')return`<p><strong>${q.correctAnswer?'صح':'خطأ'}</strong></p><p>${richText(q.answer)}</p>`;
if(q.questionType==='fill_blank'){const items=Array.isArray(q.blanks)?q.blanks:[];return items.length?`<ol>${items.map(b=>`<li>${richText(b.answer||'')}</li>`).join('')}</ol>`:`<p class="answer-text">${displayText(q.answer)}</p>`}
if(q.questionType==='multi_branch_text'||q.questionType==='structured_chemistry'){if(Array.isArray(q.branchModelAnswers)&&q.branchModelAnswers.length)return`<div class="summary-branches model-branch-answers">${q.branchModelAnswers.map((a,i)=>`<section><div class="summary-branch-title"><b>${i+1}</b><span>${richText(q.branches?.[i]||'')}</span></div><p>${displayText(a)}</p>${q.branchSourceNotes?.[i]?`<p class="source-note">${richText(q.branchSourceNotes[i])}</p>`:''}</section>`).join('')}</div>${lewisHtml(q)}${assetsHtml(q.modelAnswerAssets,'model-figure')}`;return`${answerRows(q.answer)}${lewisHtml(q)}${assetsHtml(q.modelAnswerAssets,'model-figure')}`}
if(q.questionType==='activity_experiment'||q.questionType==='experiment'){if(Array.isArray(q.activityModelFields)&&q.activityModelFields.length)return`<div class="activity-model-grid">${q.activityModelFields.map((f,i)=>`<section><div class="summary-branch-title"><b>${i+1}</b><span>${richText(f.label||'حقل')}</span></div><p>${displayText(f.value||'')}</p></section>`).join('')}</div>${assetsHtml(q.modelAnswerAssets,'model-figure')}`;return`${answerRows(q.answer)}${assetsHtml(q.modelAnswerAssets,'model-figure')}`}
return`<p class="answer-text">${displayText(q.answer)}</p>${q.sourceAnswerNote?`<p class="source-note">${richText(q.sourceAnswerNote)}</p>`:''}${lewisHtml(q)}${assetsHtml(q.modelAnswerAssets,'model-figure')}`}
function ratingHtml(q){const current=state.ratings[q.id],locked=current!==undefined;return`<div class="rating"><h3>${locked?`تم تثبيت تقييمك: ${current} من 10`:'قيّم إجابتك من 1 إلى 10'}</h3><div>${Array.from({length:10},(_,i)=>i+1).map(n=>`<button data-rating="${q.id}" data-value="${n}" class="${current===n?'selected':''}" ${locked?'disabled':''}>${n}</button>`).join('')}</div></div>`}
function revealedHtml(q){if(isSourceGroup(q))return sourceGroupRevealedHtml(q);if(isEquationImageQuestion(q))return equationImageRevealedHtml(q);const mode=q.questionType==='comparison_table'?' comparison-mode':'';return`<div class="answer-comparison${mode}"><section class="student-summary"><div class="answer-title">محاولتك</div>${studentSummary(q)}</section><section class="model-answer"><div class="answer-title">الجواب النموذجي</div>${modelAnswer(q)}</section></div>${ratingHtml(q)}`}
function questionCard(q,index,list){const shown=Boolean(state.shownAnswers[q.id]);return`<article class="question-card" id="question-card">${metaHtml(q,index,list.length)}${promptHtml(q)}<div class="student-input">${shown?revealedHtml(q):inputFor(q)}</div>${shown?'':`<button class="reveal-btn" data-reveal="${q.id}" ${attempted(q)?'':'disabled'}>${icon('eye')} إظهار الجواب النموذجي</button>`}</article><div class="prev-next"><button data-move="prev" ${index===0?'disabled':''}>${icon('prev')} السؤال السابق</button><button data-move="next" ${index===list.length-1?'disabled':''}>السؤال التالي ${icon('next')}</button></div>`}
function numbersHtml(list,current){return`<div class="number-pager">${list.map((q,i)=>`<button data-open-question="${q.id}" class="${q.id===current?'active':''} ${attempted(q)?'attempted':''}" title="السؤال ${i+1}">${i+1}</button>`).join('')}</div>`}
function questionsView(){const list=filteredQuestions();if(!list.length)return shell(`${filtersHtml(list)}<div class="empty">لا توجد أسئلة مطابقة للفلاتر الحالية.</div>`);let current=list.find(q=>q.id===state.currentId)||list[0];state.currentId=current.id;saveState();const index=list.indexOf(current);return shell(`${filtersHtml(list)}<div class="question-nav"><strong>${state.bank==='source'?'أسئلة المصدر':'الأسئلة الإثرائية'} · ${list.length} سؤالًا</strong>${numbersHtml(list,current.id)}</div>${questionCard(current,index,list)}`)}
function reportView(){const rows=topics.map(t=>{const list=questions.filter(q=>q.topicId===t.id),p=progress(list),rated=list.filter(q=>state.ratings[q.id]!==undefined);const avg=rated.length?(rated.reduce((s,q)=>s+state.ratings[q.id],0)/rated.length).toFixed(1):'—';return`<tr><td>${esc(t.title)}</td><td>${p.done}/${p.total}</td><td><div class="mini-progress"><span style="width:${p.percent}%"></span></div></td><td>${avg}</td></tr>`}).join('');return shell(`<section class="report-hero"><h1>تقرير المراجعة</h1><p>يعرض تقدمك وتقييمك الذاتي، من دون تصحيح آلي.</p></section><section class="report-table"><div class="table-wrap"><table><thead><tr><th>الموضوع</th><th>المحاولات</th><th>الإنجاز</th><th>متوسط التقييم</th></tr></thead><tbody>${rows}</tbody></table></div></section>`)}
function render(){app.innerHTML=state.screen==='home'?homeView():state.screen==='report'?reportView():questionsView();enforceLiteralEnglishPrompts();queueMath();if(pendingScroll){pendingScroll=false;requestAnimationFrame(()=>document.getElementById('question-card')?.scrollIntoView({behavior:'instant',block:'start'}))}}
function queueMath(){if(window.MathJax?.typesetPromise){window.MathJax.typesetClear?.([app]);window.MathJax.typesetPromise([app]).catch(()=>{})}}
function ensureActivity(id){if(!state.activityAnswers[id]){const q=questionById(id);state.activityAnswers[id]={fields:(q?.activityDefaultFields||[]).map(label=>({label,value:''}))}}return state.activityAnswers[id]}function updateAndRender(){saveState();render()}
app.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.action==='home'){state.screen='home';updateAndRender();return}if(b.dataset.action==='open-all-questions'){state.screen='questions';state.topic='all';state.currentId=null;updateAndRender();return}if(b.dataset.action==='report'){state.screen='report';updateAndRender();return}if(b.dataset.openTopic){state.screen='questions';state.topic=b.dataset.openTopic;state.bank=b.dataset.bank;state.currentId=null;pendingScroll=true;updateAndRender();return}if(b.dataset.bank){state.bank=b.dataset.bank;state.currentId=null;state.type='all';updateAndRender();return}if(b.dataset.status){state.status=b.dataset.status;state.currentId=null;updateAndRender();return}if(b.dataset.openQuestion){state.currentId=b.dataset.openQuestion;pendingScroll=true;updateAndRender();return}if(b.dataset.groupChoice){const id=b.dataset.groupChoice;if(state.shownAnswers[id])return;state.groupSelections[id]||={};const index=Number(b.dataset.groupIndex);state.groupSelections[id][index]=b.dataset.groupKind==='true_false'?b.dataset.value==='true':Number(b.dataset.value);updateAndRender();return}if(b.dataset.choiceKind){const id=b.dataset.id;if(state.shownAnswers[id])return;if(b.dataset.choiceKind==='tf')state.trueFalse[id]=b.dataset.value==='true';else state.choices[id]=Number(b.dataset.value);updateAndRender();return}if(b.dataset.branchChoice){const id=b.dataset.branchChoice;if(state.shownAnswers[id])return;state.branchChoices[id]||={};state.branchChoices[id][Number(b.dataset.branchIndex)]=Number(b.dataset.value);updateAndRender();return}if(b.dataset.reveal){state.shownAnswers[b.dataset.reveal]=true;updateAndRender();return}if(b.dataset.rating){if(state.ratings[b.dataset.rating]!==undefined)return;state.ratings[b.dataset.rating]=Number(b.dataset.value);updateAndRender();return}if(b.dataset.move){const list=filteredQuestions(),i=list.findIndex(q=>q.id===state.currentId),ni=b.dataset.move==='next'?i+1:i-1;if(list[ni]){state.currentId=list[ni].id;pendingScroll=true;updateAndRender()}return}if(b.dataset.addActivity){ensureActivity(b.dataset.addActivity).fields.push({label:'',value:''});updateAndRender();return}if(b.dataset.removeActivity){ensureActivity(b.dataset.removeActivity).fields.splice(Number(b.dataset.index),1);updateAndRender();return}if(b.dataset.deleteEquationMedia){deleteEquationMedia(b.dataset.deleteEquationMedia,Number(b.dataset.index));return}if(b.dataset.deleteMedia){deleteMedia(b.dataset.deleteMedia,Number(b.dataset.index));return}})
app.addEventListener('input',e=>{const t=e.target;if(t.dataset.groupText){state.groupTextAnswers[t.dataset.groupText]||={};state.groupTextAnswers[t.dataset.groupText][Number(t.dataset.groupIndex)]=t.value;saveState();document.querySelector('[data-reveal]')?.toggleAttribute('disabled',!attempted(questionById(t.dataset.groupText)));return}if(t.dataset.text){state.answers[t.dataset.text]=t.value;saveState();document.querySelector('[data-reveal]')?.toggleAttribute('disabled',!attempted(questionById(t.dataset.text)));return}if(t.dataset.branch){state.branchAnswers[t.dataset.branch]||={};state.branchAnswers[t.dataset.branch][t.dataset.index]=t.value;saveState();document.querySelector('[data-reveal]')?.toggleAttribute('disabled',!attempted(questionById(t.dataset.branch)));return}if(t.dataset.blank){state.blankAnswers[t.dataset.blank]||=[];state.blankAnswers[t.dataset.blank][Number(t.dataset.index)]=t.value;saveState();document.querySelector('[data-reveal]')?.toggleAttribute('disabled',!attempted(questionById(t.dataset.blank)));return}if(t.dataset.table){state.tables[t.dataset.table]||={};state.tables[t.dataset.table][t.dataset.cell]=t.value;saveState();document.querySelector('[data-reveal]')?.toggleAttribute('disabled',!attempted(questionById(t.dataset.table)));return}if(t.dataset.figure){state.figureAnswers[t.dataset.figure]||={};state.figureAnswers[t.dataset.figure][t.dataset.index]=t.value;saveState();document.querySelector('[data-reveal]')?.toggleAttribute('disabled',!attempted(questionById(t.dataset.figure)));return}if(t.dataset.activity){const a=ensureActivity(t.dataset.activity);a.fields[Number(t.dataset.index)]||={label:'',value:''};a.fields[Number(t.dataset.index)][t.dataset.part]=t.value;saveState();document.querySelector('[data-reveal]')?.toggleAttribute('disabled',!attempted(questionById(t.dataset.activity)));return}if(t.dataset.filter==='query'){clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.query=t.value;state.currentId=null;updateAndRender()},180)}})
app.addEventListener('change',e=>{const t=e.target;if(t.dataset.groupSelect){state.groupSelections[t.dataset.groupSelect]||={};const index=Number(t.dataset.groupIndex);if(t.value)state.groupSelections[t.dataset.groupSelect][index]=t.value;else delete state.groupSelections[t.dataset.groupSelect][index];saveState();document.querySelector('[data-reveal]')?.toggleAttribute('disabled',!attempted(questionById(t.dataset.groupSelect)));return}if(t.dataset.filter==='topic'){state.topic=t.value;state.currentId=null;updateAndRender();return}if(t.dataset.filter==='type'){state.type=t.value;state.currentId=null;updateAndRender();return}if(t.dataset.equationMediaInput){handleEquationMedia(t.dataset.equationMediaInput,Number(t.dataset.index),[...t.files]);return}if(t.dataset.mediaInput){handleMedia(t.dataset.mediaInput,[...t.files]);return}})
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(DB_STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function loadMedia(){try{const db=await openDb();const tx=db.transaction(DB_STORE,'readonly'),store=tx.objectStore(DB_STORE);const keys=await new Promise((res,rej)=>{const r=store.getAllKeys();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});for(const k of keys){media[k]=await new Promise((res,rej)=>{const r=store.get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}db.close()}catch{media={}}}
async function saveMedia(id){const db=await openDb();await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(media[id],id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close()}
function fileToDataUrl(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(file)})}
async function handleMedia(id,files){if(state.shownAnswers[id])return;const q=questionById(id),max=q.maxImages||2,existing=mediaItems(id),remaining=max-existing.length;if(remaining<=0){alert(`يمكنك رفع ${max===1?'صورة واحدة':`${max} صورتين`} كحد أقصى لهذا السؤال`);return}const chosen=files.slice(0,remaining);if(files.length>remaining)alert(`يمكنك رفع ${max===1?'صورة واحدة':`${max} صورتين`} كحد أقصى لهذا السؤال`);media[id]||={files:[]};for(const f of chosen)media[id].files.push({name:f.name,type:f.type,dataUrl:await fileToDataUrl(f)});await saveMedia(id);render()}
async function deleteMedia(id,index){if(state.shownAnswers[id])return;media[id]||={files:[]};media[id].files.splice(index,1);await saveMedia(id);render()}
async function handleEquationMedia(questionId,index,files){if(state.shownAnswers[questionId])return;const q=questionById(questionId);if(!q||!isEquationImageQuestion(q))return;const file=files.find(item=>['image/png','image/jpeg','image/webp'].includes(String(item.type||'').toLowerCase()));if(!file){alert('اختر صورة بصيغة PNG أو JPG أو WEBP.');return}const key=equationMediaKey(questionId,index);media[key]={files:[{name:file.name,type:file.type,dataUrl:await fileToDataUrl(file)}]};await saveMedia(key);render()}
async function deleteEquationMedia(questionId,index){if(state.shownAnswers[questionId])return;const key=equationMediaKey(questionId,index);media[key]={files:[]};await saveMedia(key);render()}
window.__MADRASATI_TEST__={getState:()=>state,getQuestion:questionById,attempted,clear:async()=>{try{localStorage.removeItem(STORAGE_KEY)}catch{}state=emptyState();media={};render()}};
(async()=>{loadState();await loadMedia();render()})();
