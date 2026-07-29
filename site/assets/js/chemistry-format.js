(function(root){
  'use strict';

  const SUBSCRIPT_DIGITS={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
  const ELEMENTS=[
    'Ac','Ag','Al','Am','Ar','As','At','Au','Ba','Be','Bh','Bi','Bk','Br','Ca','Cd','Ce','Cf','Cl','Cm','Cn','Co','Cr','Cs','Cu','Db','Ds','Dy','Er','Es','Eu','Fe','Fl','Fm','Fr','Ga','Gd','Ge','Hf','Hg','Ho','Hs','In','Ir','Kr','La','Li','Lr','Lu','Lv','Mc','Md','Mg','Mn','Mo','Mt','Na','Nb','Nd','Ne','Nh','Ni','No','Np','Os','Pa','Pb','Pd','Pm','Po','Pr','Pt','Ra','Rb','Re','Rf','Rg','Rh','Rn','Ru','Sb','Sc','Se','Sg','Si','Sm','Sn','Sr','Ta','Tb','Tc','Te','Th','Ti','Tl','Tm','Ts','Xe','Yb','Zn','Zr',
    'B','C','F','H','I','K','N','O','P','S','U','V','W','Y'
  ].sort((a,b)=>b.length-a.length);
  const ELEMENT='(?:'+ELEMENTS.join('|')+')';
  const SUB='[₀-₉0-9]*';
  const CHARGE='[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻+-]*';
  const UNIT='(?:'+ELEMENT+SUB+'|\\((?:'+ELEMENT+SUB+')+\\)'+SUB+')';
  const FORMULA='(?:\\d+)?(?:'+UNIT+')+(?:[·.]\\d*(?:'+UNIT+')+)*'+CHARGE+'[↑↓]?';
  const ATOM='[₀-₉]+'+ELEMENT;
  const ATOM_LIST=ATOM+'(?:\\s*(?:،|,|و)\\s*'+ATOM+')+';
  const ATOM_COMPARE=ATOM+'(?:\\s*[<>]\\s*'+ATOM+')+';
  const ELECTRON='(?:\\d+[spdf][⁰¹²³⁴⁵⁶⁷⁸⁹]+)(?:\\s+(?:\\d+)?[spdf][⁰¹²³⁴⁵⁶⁷⁸⁹]+)+';
  const ORBITAL='\\[[↑↓\\s]*\\]';
  const TEMP='\\d+(?:\\.\\d+)?°C';
  const GROUP_LABEL='I{1,3}A';
  const GENERIC_ION='M[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻+-]+';
  const NUMBER='[+−-]?\\d+(?:\\.\\d+)?';
  const TOKEN_RE=new RegExp('('+[ORBITAL,ELECTRON,ATOM_COMPARE,ATOM_LIST,ATOM,TEMP,GENERIC_ION,GROUP_LABEL,FORMULA,NUMBER].join('|')+')','g');

  function normalizeDisplaySource(value=''){
    return String(value||'').normalize('NFC')
      .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,'')
      .replace(/\u00a0/g,' ');
  }

  function esc(value=''){
    return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function atomToken(raw=''){
    const m=String(raw).match(new RegExp('^([₀-₉]+)('+ELEMENT+')$'));
    if(!m)return '<bdi dir="ltr" class="chem-isolate">'+esc(raw)+'</bdi>';
    const n=[...m[1]].map(ch=>SUBSCRIPT_DIGITS[ch]||ch).join('');
    return '<span class="atom-token" dir="ltr" aria-label="العدد الذري '+esc(n)+' للعنصر '+esc(m[2])+'"><sub>'+esc(n)+'</sub><strong>'+esc(m[2])+'</strong></span>';
  }

  function atomListToken(raw=''){
    const pieces=String(raw).split(/(\s*(?:،|,|و)\s*)/).filter(Boolean);
    const atomRe=new RegExp('^[₀-₉]+'+ELEMENT+'$');
    return '<span class="atom-list atom-list-v6" dir="rtl">'+pieces.map(piece=>{
      const trimmed=piece.trim();
      if(atomRe.test(trimmed))return atomToken(trimmed);
      if(trimmed==='و')return '<span class="atom-connector atom-connector-v6" dir="rtl" aria-label="و">&#1608;</span>';
      return '<span class="atom-separator" aria-hidden="true">،</span>';
    }).join('')+'</span>';
  }

  function atomComparisonToken(raw=''){
    const pieces=String(raw).split(/\s*([<>])\s*/).filter(Boolean);
    const atomRe=new RegExp('^[₀-₉]+'+ELEMENT+'$');
    return '<bdi dir="ltr" class="atom-comparison">'+pieces.map(piece=>atomRe.test(piece.trim())?atomToken(piece.trim()):'<span class="comparison-operator">'+esc(piece.trim())+'</span>').join('')+'</bdi>';
  }

  function electronSequenceToken(raw=''){
    return '<bdi dir="ltr" class="electron-config-sequence">'+esc(String(raw).replace(/\s+/g,' ').trim())+'</bdi>';
  }

  function chemicalFormulaToken(raw=''){
    return '<bdi dir="ltr" class="chemical-formula">'+esc(raw)+'</bdi>';
  }

  function renderRichCore(raw=''){
    const source=normalizeDisplaySource(raw);
    const parts=[];
    let cursor=0,m;
    const atomRe=new RegExp('^'+ATOM+'$');
    const atomListRe=new RegExp('^'+ATOM_LIST+'$');
    const atomCompareRe=new RegExp('^'+ATOM_COMPARE+'$');
    const formulaRe=new RegExp('^(?:'+FORMULA+'|'+GENERIC_ION+'|'+GROUP_LABEL+')$');
    TOKEN_RE.lastIndex=0;
    while((m=TOKEN_RE.exec(source))){
      parts.push(esc(source.slice(cursor,m.index)));
      const token=m[0];
      if(/^\[/.test(token)){
        const arrows=esc(token.slice(1,-1).trim())||'&nbsp;';
        parts.push('<span class="orbital-box" dir="ltr">'+arrows+'</span>');
      }else if(new RegExp('^'+ELECTRON+'$').test(token)){
        parts.push(electronSequenceToken(token));
      }else if(atomCompareRe.test(token)){
        parts.push(atomComparisonToken(token));
      }else if(atomListRe.test(token)){
        parts.push(atomListToken(token));
      }else if(atomRe.test(token)){
        parts.push(atomToken(token));
      }else if(new RegExp('^'+TEMP+'$').test(token)){
        parts.push('<bdi dir="ltr" class="temperature-token">'+esc(token)+'</bdi>');
      }else if(formulaRe.test(token)){
        parts.push(chemicalFormulaToken(token));
      }else{
        parts.push('<bdi dir="ltr" class="number-isolate">'+esc(token)+'</bdi>');
      }
      cursor=m.index+token.length;
    }
    parts.push(esc(source.slice(cursor)));
    return parts.join('');
  }

  function richText(value=''){
    const raw=normalizeDisplaySource(value);
    const parts=[];
    let cursor=0,m;
    const arabicParenthetical=/\(([^()\n]*[\u0600-\u06FF][^()\n]*)\)/g;
    while((m=arabicParenthetical.exec(raw))){
      parts.push(renderRichCore(raw.slice(cursor,m.index)));
      parts.push('<span class="arabic-parenthetical" dir="ltr"><span class="parenthesis-mark" aria-hidden="true">(</span><span class="arabic-parenthetical-text" dir="rtl">'+renderRichCore(m[1])+'</span><span class="parenthesis-mark" aria-hidden="true">)</span></span>');
      cursor=m.index+m[0].length;
    }
    parts.push(renderRichCore(raw.slice(cursor)));
    return parts.join('').replace(/\n/g,'<br>');
  }

  function displayText(value=''){
    const raw=normalizeDisplaySource(value);
    return raw.split(/\n/).map(line=>{
      const trimmed=line.trim();
      if(!trimmed)return'';
      const code=trimmed.match(/^(\d+-\d+)(?:\s+|$)(.*)$/);
      if(code)return '<bdi dir="ltr" class="section-code">'+esc(code[1])+'</bdi>'+(code[2]?' <span>'+richText(code[2])+'</span>':'');
      const arrowMatch=trimmed.match(/^(.*?)(?:⟶|→)(.*)$/);
      if(arrowMatch){
        const left=arrowMatch[1].trim();
        const right=arrowMatch[2].trim();
        const hasArabic=/[\u0600-\u06FF]/.test(left+right);
        if(hasArabic){
          return '<span class="chemical-word-equation" dir="ltr"><span class="word-equation-side" dir="rtl">'+richText(left)+'</span><span class="reaction-arrow" aria-label="ينتج">⟶</span><span class="word-equation-side" dir="rtl">'+richText(right)+'</span></span>';
        }
        return '<bdi dir="ltr" class="chemical-equation">'+esc(trimmed)+'</bdi>';
      }
      return richText(trimmed);
    }).join('<br>');
  }

  root.ChemistryFormat={esc,atomToken,atomListToken,atomComparisonToken,electronSequenceToken,chemicalFormulaToken,richText,displayText,patterns:{FORMULA,ATOM,ELECTRON,TEMP}};
})(typeof window!=='undefined'?window:globalThis);
