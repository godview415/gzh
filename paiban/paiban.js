/*!
 * paiban.js — 公眾號雜誌排版台的排版核心
 * 把排版台標記（Markdown 風格的純文字）轉成微信公眾號可直接貼上的內聯樣式 HTML。
 * 與 index.html 中的排版邏輯完全相同，可在 Node.js 或瀏覽器中直接呼叫。
 *
 *   const paiban = require('./paiban.js');
 *   const html = paiban.render(markup, {style:'memphis', memphis:'classic', column:'市場筆記'}, '2026.11.18');
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.paiban = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const SANS = "-apple-system,BlinkMacSystemFont,'PingFang TC','PingFang SC','Microsoft JhengHei','Microsoft YaHei','Helvetica Neue',sans-serif";
const SERIF = "'Songti TC','Songti SC',STSong,'Noto Serif CJK TC','Source Han Serif TC',PMingLiU,serif";
const NUM = "'DIN Alternate','Helvetica Neue',Arial,sans-serif";
const QUOTE = "Georgia,'Times New Roman',serif";
// Futura: the face on the Apollo 11 plaque. Built into iOS; Android falls back to its sans.
const FUT = "Futura,'Futura PT','Century Gothic','Avenir Next','Trebuchet MS',sans-serif";
const INK = '#1E2226', TEXT = '#333A40', SUB = '#5C636A', RULE = '#E6E8EB', HAIR = '#D3D7DB', FAINT = '#9AA0A6';

const PRESETS = [
  {id:'ledger',   name:'帳本藍', accent:'#1F4E8C', muted:'#7A8593'},
  {id:'pine',     name:'松墨綠', accent:'#2C6350', muted:'#7B8882'},
  {id:'claret',   name:'酒紅',   accent:'#8C2443', muted:'#8A7D83'},
  {id:'graphite', name:'石墨',   accent:'#34404D', muted:'#7F8791'}
];
// Retro-future palettes: C = the four stripes (outer to inner), A = accent, ink = headings,
// screen + phos = CRT readout background and phosphor colour.
const RETRO = [
  {id:'sunset',  name:'日落', C:['#7A2E1C','#C8391F','#F07A22','#F5B12A'], A:'#C8391F', ink:'#1F2A4A', screen:'#1F2A4A', phos:'#F8B640'},
  {id:'atomic',  name:'原子', C:['#0E5E63','#1F9A8E','#EE6B57','#F2BF3E'], A:'#0E7C7B', ink:'#21323D', screen:'#0F3A3E', phos:'#9BEBCB'},
  {id:'mission', name:'太空', C:['#122C64','#2557B8','#D8352A','#F08A2C'], A:'#D8352A', ink:'#122C64', screen:'#0F1D3D', phos:'#8FD3FF'}
];
// Minimal palettes: A = the one colour (numerals, subheads, quotes, figures), wash = flat pale fields.
const MINI = [
  {id:'dai',      name:'黛', A:'#36607F', wash:'#EAF1F6'},
  {id:'cinnabar', name:'朱', A:'#B23A2E', wash:'#F8EDE9'},
  {id:'bamboo',   name:'竹', A:'#3A6E52', wash:'#EAF3ED'},
  {id:'ink',      name:'墨', A:'#262626', wash:'#F3F3F3'}
];
// Space palettes: bg = the plate, A = accent (rings, figures, subheads), A2 = warm starlight,
// limb = the planet's atmosphere glow under the title.
const SPACE = [
  {id:'deep',   name:'深空', bg:'#0B1026', A:'#7CD3FF', A2:'#FFD98A', limb:'#7CD3FF'},
  {id:'nebula', name:'星雲', bg:'#170E31', A:'#FF96D2', A2:'#9BE7FF', limb:'#B9A2FF'},
  {id:'mars',   name:'火星', bg:'#1C110D', A:'#FFA06A', A2:'#FFD68E', limb:'#FF7C4C'}
];
// Renaissance palettes, named for the pigments of a fifteenth-century scriptorium and print shop.
// A = rubric, the second ink after black (chapter numbers, figures, rules); B = the other pigment,
// used on every second illuminated initial, as scribes alternated red and blue; gold = leaf and
// hairlines; paper = the vellum plate; ink = iron-gall black for headings.
const RENAI = [
  {id:'vermilion', name:'朱砂', A:'#A3301F', B:'#2A4A86', gold:'#A8822E', paper:'#F4EAD4', ink:'#2B221B'},
  {id:'lapis',     name:'群青', A:'#24427E', B:'#A3301F', gold:'#A8822E', paper:'#F1ECDF', ink:'#1F2431'},
  {id:'verdigris', name:'銅綠', A:'#2B6657', B:'#A3301F', gold:'#9C7C32', paper:'#F0EAD5', ink:'#21271F'},
  {id:'sepia',     name:'棕墨', A:'#6E4127', B:'#9A3A28', gold:'#9A7A3A', paper:'#F3E7D0', ink:'#2D2119'}
];
// Macaron flavours. MAC holds the five flavours every palette cycles through: bg = the pale card
// ground, shell / foot = the macaron's shell and its ruffled foot, fg = the deep tone for text on bg.
// A palette picks its own flavour (start), the ink for headings and the highlighter colour (hl).
const MAC = [
  {name:'草莓',   bg:'#FFE1E8', shell:'#FFC3D2', foot:'#F3A2B7', fg:'#C8466F'},
  {name:'開心果', bg:'#D9F4E8', shell:'#B6E8D2', foot:'#8FD6B8', fg:'#1E8C66'},
  {name:'檸檬',   bg:'#FFF4C2', shell:'#FFE68A', foot:'#F2CF5C', fg:'#9C7400'},
  {name:'薰衣草', bg:'#ECE5FF', shell:'#D7C9FF', foot:'#BCA8F5', fg:'#6B52C8'},
  {name:'藍莓',   bg:'#DDEEFF', shell:'#BFDDFF', foot:'#9CC6F5', fg:'#2F6EC0'}
];
const POEM = [
  {id:'strawberry', name:'草莓',   start:0, paper:'#FFFFFF', ink:'#3A2430', hl:'#FFD3DE'},
  {id:'pistachio',  name:'開心果', start:1, paper:'#FFFFFF', ink:'#173A33', hl:'#C6EFDC'},
  {id:'lavender',   name:'薰衣草', start:3, paper:'#FFFFFF', ink:'#2A2245', hl:'#E3DAFF'},
  {id:'lemon',      name:'檸檬',   start:2, paper:'#FFFFFF', ink:'#3A3220', hl:'#FFEB8A'}
];
// Tech-future palettes. Each sets its plate in full, since one of them (電路) is a dark
// solder-mask green: bg + dot = the plate and its dot grid; A = signal colour (frames, figures,
// traces); A2 = status lights; chip / chipText / pin = the IC package used for chapter numbers.
const TECH = [
  {id:'wafer', name:'晶圓', bg:'#F3F5F8', dot:'#D3DAE3', ink:'#0B0F14', text:'#2C333C', muted:'#646E7A', line:'#D5DCE4', panel:'#FFFFFF', A:'#2F5BFF', A2:'#00A3B5', chip:'#121820', chipText:'#E8EDF3', pin:'#9AA4AF'},
  {id:'laser', name:'雷射', bg:'#F4F4F1', dot:'#D9D9D3', ink:'#111111', text:'#2E2E2B', muted:'#696964', line:'#DADAD4', panel:'#FFFFFF', A:'#D6301A', A2:'#111111', chip:'#151515', chipText:'#F4F4F1', pin:'#A3A39C'},
  {id:'pcb',   name:'電路', bg:'#0F2C23', dot:'#1E473A', ink:'#ECF4EF', text:'#C2D3CB', muted:'#88A497', line:'#28503F', panel:'#13362B', A:'#E3B45A', A2:'#7EDDB4', chip:'#09201A', chipText:'#E3B45A', pin:'#C9A055'},
  {id:'titan', name:'鈦金', bg:'#E8EAEC', dot:'#CDD1D5', ink:'#14171A', text:'#30353A', muted:'#5F666D', line:'#CDD2D7', panel:'#F5F6F7', A:'#E0540C', A2:'#3E4A55', chip:'#1B1F23', chipText:'#F59A5E', pin:'#8E959C'}
];
const DEFAULTS = {style:'space', preset:'ledger', retro:'sunset', minimal:'dai', minimalV:2, space:'deep', renai:'vermilion', poem:'strawberry', tech:'wafer', memphis:'classic', custom:'#6A4C93', column:'市場筆記', head:'sans', view:'phone'};

const SAMPLE = `# 示例｜把一篇研究筆記排得清楚好讀

::: 卡片 本文要點
- 左邊寫內容，右邊即時預覽
- 按「複製到公眾號」，到後台直接貼上
- 圖片貼上後在後台上傳替換
:::

## 正文 | BODY
### 段落、粗體與標記
每一行就是一個段落，行與行之間空不空行都可以。正文 16 號字、1.8 倍行高，段落之間留 20 像素，手機上讀起來不擠。
想強調一句話，用兩個星號包起來，會變成 **這樣的粗體**；想劃重點，用兩個等號包起來，會變成 ==這樣的底色標記==。
章節標題的下一行如果是小標題，會自動變成這一章的副標，就像上面「段落、粗體與標記」這一行。
### 章節內的小標題
其他位置的三個井號，是章節內的小標題。

## 數據 | DATA
以 [數據] 開頭的連續幾行會排成一條數據列，一排最多三格。每行依序寫數值、名稱、口徑，用豎線分隔。
[數據] 16px | 正文字號 | 手機閱讀的舒適大小
[數據] 1.8 | 正文行高 | 中文長文的常用值
[數據] 8 | 版式 | 研究簡報、復古未來、極簡、太空、文藝復興、馬卡龍、科技未來、孟菲斯

## 表格 | TABLES
表格用豎線分隔欄位，第二行寫分隔線。第一欄會加粗，全是數字的欄位會自動靠右對齊，換成數字字體。
| 元件 | 字號 | 行高 |
|---|---|---|
| 正文 | 16px | 1.8 |
| 章節標題 | 21px | 1.5 |
| 數據 | 22px | 1.2 |
| 圖說 | 12px | 1.6 |
^ 表格或圖片下方，以 ^ 開頭的一行會變成圖說或資料來源。

## 引文與清單 | QUOTES
> 好的版式不搶內容的風頭，只讓讀者順利讀到最後一段。
> —— 排版台使用說明
- 短橫線開頭是項目清單
- 清單裡同樣可以用 **粗體**
1. 數字加點開頭是編號清單
2. 編號會用主色顯示
---
單獨一行三條短橫線，會畫一條細線，用來隔開同一章裡的兩段內容。

[完]

::: 資料來源與聲明
- 底部小字區適合放資料來源、風險提示和免責聲明
- 本文僅供參考，不構成任何投資建議
:::
`;

const SNIPS = [
  ['章節', '## 章節標題 | ENGLISH\n### 這一章的副標\n'],
  ['小標題', '### 小標題\n'],
  ['引文', '> 引用的句子\n> —— 出處\n'],
  ['數據列', '[數據] 4.2% | 指標名稱 | 日期或口徑\n[數據] 1.8 倍 | 指標名稱 | 日期或口徑\n'],
  ['表格', '| 項目 | 數值 | 變動 |\n|---|---|---|\n| 項目一 | 12.5% | +0.8 |\n^ 資料來源：\n'],
  ['清單', '- 第一點\n- 第二點\n'],
  ['要點框', '::: 卡片 本文要點\n- 要點一\n- 要點二\n:::\n'],
  ['小字區', '::: 資料來源\n- 來源一\n:::\n'],
  ['細線', '---\n'],
  ['結尾符', '[完]\n']
];

const CHEAT = [
  ['# 標題', '主標題，上方顯示欄目名和日期'],
  ['## 中文 | ENGLISH', '章節頭，自動編號；英文可省略'],
  ['### 小標題', '緊跟章節頭時是副標，其他位置是小標題'],
  ['> 句子\n> —— 出處', '引文'],
  ['[數據] 值 | 名稱 | 口徑', '數據列，連續幾行並排'],
  ['| 欄 | 欄 |\n|---|---|', '表格'],
  ['![說明](圖片網址)', '圖片；網址以 https:// 開頭，沒有網址就不顯示'],
  ['^ 文字', '圖說或資料來源'],
  ['- 項目 / 1. 項目', '清單'],
  ['**粗體**  ==標記==', '行內強調'],
  ['::: 卡片 標題\n…\n:::', '要點框，清單自動編號'],
  ['::: 標題\n…\n:::', '底部小字區'],
  ['---', '細分隔線'],
  ['[完]', '結尾符']
];

// ---------- color helpers ----------
function hx(h){h=String(h||'').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16)||0;return [n>>16&255,n>>8&255,n&255]}
function toHex(a){return '#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('').toUpperCase()}
function mix(a,b,t){const A=hx(a),B=hx(b);return toHex(A.map((v,i)=>v+(B[i]-v)*t))}
function rgba(h,a){const c=hx(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function theme(s){
  const p = s.preset==='custom'
    ? {accent:s.custom, muted:mix(s.custom,'#8A8F94',.75)}
    : (PRESETS.find(x=>x.id===s.preset)||PRESETS[0]);
  return {A:p.accent, muted:p.muted, mark:rgba(p.accent,.13), panel:mix(p.accent,'#FFFFFF',.955),
          panelLine:mix(p.accent,'#FFFFFF',.82), head:s.head==='serif'?SERIF:SANS};
}

function retroTheme(s){
  const p = RETRO.find(x=>x.id===s.retro)||RETRO[0];
  return Object.assign({}, p, {
    tint: mix(p.C[3],'#FFFFFF',.86), zebra: mix(p.C[3],'#FFFFFF',.9), mark: rgba(p.C[3],.32),
    bezel: mix(p.ink,'#FFFFFF',.84), muted: mix(p.ink,'#FFFFFF',.3),
    dim: mix(p.phos,p.screen,.25), dimmer: mix(p.phos,p.screen,.36), rule: mix(p.phos,p.screen,.68),
    head: s.head==='serif'?SERIF:SANS
  });
}

function spaceTheme(s){
  const p = SPACE.find(x=>x.id===s.space)||SPACE[0];
  const w = t => mix('#FFFFFF',p.bg,t);
  return Object.assign({}, p, {
    white:w(.04), text:w(.2), muted:w(.42), dim:w(.62), star:w(.08), line:w(.86),
    panel:mix(p.A,p.bg,.9), panelLine:mix(p.A,p.bg,.76), orbit:mix(p.A,p.bg,.55),
    mark:rgba(p.A,.28), haze:mix(p.A,p.bg,.86), planet:mix(p.limb,p.bg,.72),
    head:s.head==='serif'?SERIF:SANS
  });
}
function miniTheme(s){
  const p = MINI.find(x=>x.id===s.minimal)||MINI[0];
  return Object.assign({}, p, {mark: rgba(p.A, p.id==='ink'?.08:.14), head: s.head==='serif'?SERIF:SANS});
}

// ---------- renderer: source text -> WeChat-safe inline-styled HTML ----------
// ---------- shared parser: source text -> blocks; the active skin draws each block ----------
const NUMRE=/^[-+−]?[\d,]*\.?\d+\s*(%|px|pt|bp|x|倍|億|萬|元|美元|港元|日圓)?$/;
function parse(src,K){
  const L = String(src).replace(/\r/g,'').split('\n');
  const tt = k => (L[k]===undefined?'':L[k]).trim();
  const nextNB = k => {while(k<L.length&&!tt(k))k++;return k;};
  const capNext = k => /^\^/.test(tt(nextNB(k)));
  const out=[]; let i=0, ch=0, m;
  function take(re){const a=[];while(i<L.length&&re.test(tt(i))){a.push(tt(i));i++;}return a;}

  while(i<L.length){
    const t = tt(i);
    if(!t){i++;continue;}
    if((m=t.match(/^#\s+(.+)/))){i++;out.push(K.title(m[1]));continue;}
    if((m=t.match(/^##\s+(.+)/))){
      i++; ch++;
      const parts=m[1].split('|'); const zh=parts.shift().trim(); const en=parts.join('|').trim();
      const k=nextNB(i); const dm=tt(k).match(/^###\s+(.+)/); let deck='';
      if(dm){deck=dm[1];i=k+1;}
      out.push(K.chapter(ch,zh,en,deck,!out.length));
      continue;
    }
    if((m=t.match(/^###\s+(.+)/))){i++;out.push(K.sub(m[1]));continue;}
    if(t.startsWith('>')){
      const ls=take(/^>/).map(x=>x.replace(/^>\s?/,'').trim()).filter(Boolean);
      const q=[],at=[]; ls.forEach(x=>(/^(——|—|--)/.test(x)?at:q).push(x));
      out.push(K.quote(q,at));
      continue;
    }
    if(/^\[(數據|数据)\]/.test(t)){
      const ls=take(/^\[(數據|数据)\]/).map(x=>x.replace(/^\[(數據|数据)\]\s*/,'').split('|').map(v=>v.trim()));
      out.push(K.data(ls));
      continue;
    }
    if(t.startsWith('|')){
      const rows=take(/^\|/).map(l=>l.replace(/^\|/,'').replace(/\|\s*$/,'').split('|').map(c=>c.trim()));
      let head=null, body=rows;
      if(rows.length>1 && rows[1].every(c=>/^:?-{2,}:?$/.test(c))){head=rows[0];body=rows.slice(2);}
      const cols=Math.max.apply(null,rows.map(r=>r.length));
      const idx=Array.from({length:cols},(_,j)=>j);
      const isNum=idx.map(c=>body.length>0&&body.every(r=>!r[c]||NUMRE.test(r[c])));
      out.push(K.table(head,body,idx,isNum,capNext(i)?10:24));
      continue;
    }
    // Images need a real address; a line without one is dropped instead of leaving an empty box
    if((m=t.match(/^!\[(.*?)\]\((.*?)\)/))){i++;if(/^https?:\/\//i.test(m[2].trim()))out.push(K.image(m[1].trim(),m[2].trim(),capNext(i)?10:24));continue;}
    if((m=t.match(/^\^\s*(.+)/))){i++;out.push(K.caption(m[1]));continue;}
    if(/^[-*•]\s+/.test(t)){out.push(K.ul(take(/^[-*•]\s+/).map(x=>x.replace(/^[-*•]\s+/,''))));continue;}
    if(/^\d+(\.\s+|、)/.test(t)){out.push(K.ol(take(/^\d+(\.\s+|、)/).map(x=>x.replace(/^\d+(\.\s+|、)/,''))));continue;}
    if(/^(-{3,}|\*{3,})$/.test(t)){i++;out.push(K.hr());continue;}
    if(/^\[(完|完結|END)\]$/i.test(t)){i++;out.push(K.end());continue;}
    if(t.startsWith(':::')){
      const head=t.replace(/^:::\s*/,''); i++;
      const body=[]; while(i<L.length&&tt(i)!==':::'){if(tt(i))body.push(tt(i));i++;} if(i<L.length)i++;
      const card=/^(卡片|card)(\s|$)/i.test(head);
      out.push(card?K.card(head.replace(/^(卡片|card)\s*/i,''),body):K.small(head,body));
      continue;
    }
    i++;
    out.push(K.para(t));
  }
  return K.wrap(out.join(''));
}

// Inline-styled lists shared by both skins. Each skin passes its own marker drawing.
function makeList(inl){
  return function(items,o){
    return items.map((t,k)=>`<p style="margin:0 0 ${k===items.length-1?o.last:o.mb}px;padding-left:${o.W}px;text-indent:-${o.W}px;font-family:${o.ff||SANS};font-size:${o.fs}px;line-height:${o.lh};letter-spacing:0.5px;color:${o.color};">${o.marker(k)}${inl(t)}</p>`).join('');
  };
}

// ---------- skin 1: research brief (unchanged output) ----------
function briefSkin(s,date){
  const T = theme(s);
  const P = `margin:0 0 20px;font-family:${SANS};font-size:16px;line-height:1.8;letter-spacing:0.6px;color:${TEXT};text-align:justify;`;
  const inl = x => esc(x)
    .replace(/\*\*(.+?)\*\*/g,`<strong style="font-weight:700;color:${INK};">$1</strong>`)
    .replace(/==(.+?)==/g,`<span style="background-color:${T.mark};padding:0 2px;">$1</span>`);
  const line = (color,h,m) => `<section style="height:${h}px;background-color:${color};margin:${m};overflow:hidden;line-height:${h}px;font-size:0;"><br></section>`;
  const lst = makeList(inl);

  function list(items,kind,o){
    const W={square:18,dot:12,ol:24,num2:28}[kind];
    return lst(items,Object.assign({W,marker:k=>{
      if(kind==='square') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-size:9px;line-height:1;vertical-align:3px;color:${o.mark};">■</span>`;
      if(kind==='dot') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-weight:700;color:${o.mark};">·</span>`;
      return `<span style="display:inline-block;width:${W}px;text-indent:0;font-family:${NUM};font-weight:700;color:${o.mark};">${kind==='num2'?String(k+1).padStart(2,'0'):(k+1)+'.'}</span>`;
    }},o));
  }
  function boxBody(lines,o,bullet){
    const html=[]; let k=0;
    while(k<lines.length){
      const t=lines[k];
      if(/^[-*•]\s+/.test(t)){const a=[];while(k<lines.length&&/^[-*•]\s+/.test(lines[k])){a.push(lines[k].replace(/^[-*•]\s+/,''));k++;}html.push(list(a,bullet,o));continue;}
      if(/^\d+(\.\s+|、)/.test(t)){const a=[];while(k<lines.length&&/^\d+(\.\s+|、)/.test(lines[k])){a.push(lines[k].replace(/^\d+(\.\s+|、)/,''));k++;}html.push(list(a,'ol',o));continue;}
      html.push(`<p style="margin:0 0 ${o.mb}px;font-family:${SANS};font-size:${o.fs}px;line-height:${o.lh};letter-spacing:0.5px;color:${o.color};">${inl(t)}</p>`);k++;
    }
    return html.join('');
  }

  return {
    // Title: accent band on top, column name + date, then the headline
    title(h){
      const meta=[s.column?`<span style="color:${T.A};font-weight:700;">${esc(s.column)}</span>`:'', date?esc(date):'']
        .filter(Boolean).join(`<span style="color:${HAIR};">　|　</span>`);
      return `<section style="margin:0 0 30px;padding-top:14px;border-top:4px solid ${T.A};">`
        + (meta?`<p style="margin:0 0 12px;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:1px;color:${T.muted};">${meta}</p>`:'')
        + `<h1 style="margin:0;font-family:${T.head};font-size:25px;line-height:1.45;font-weight:700;letter-spacing:0.5px;color:${INK};">${inl(h)}</h1></section>`;
    },
    // Chapter: numbered tab + title (+ English), optional deck, hairline below
    chapter(n,zh,en,deck,first){
      const nn=String(n).padStart(2,'0');
      return `<section style="margin:${first?0:44}px 0 20px;padding-bottom:12px;border-bottom:1px solid ${HAIR};">`
        + `<h2 style="margin:0;font-family:${T.head};font-size:21px;line-height:1.5;font-weight:700;letter-spacing:1px;color:${INK};">`
        + `<span style="display:inline-block;margin-right:10px;padding:1px 7px;background-color:${T.A};color:#FFFFFF;font-family:${NUM};font-size:13px;line-height:1.6;font-weight:700;letter-spacing:0.5px;vertical-align:2px;">${nn}</span>`
        + inl(zh)
        + (en?`<span style="margin-left:8px;font-family:${SANS};font-size:11px;font-weight:400;letter-spacing:1.5px;color:${T.muted};">${esc(en.toUpperCase())}</span>`:'')
        + `</h2>`
        + (deck?`<p style="margin:6px 0 0;font-family:${SANS};font-size:14px;line-height:1.6;letter-spacing:0.5px;color:${SUB};">${inl(deck)}</p>`:'')
        + `</section>`;
    },
    sub(t){
      return `<h3 style="margin:28px 0 12px;padding-left:10px;border-left:3px solid ${T.A};font-family:${T.head};font-size:17px;line-height:1.45;font-weight:700;letter-spacing:0.5px;color:${INK};">${inl(t)}</h3>`;
    },
    // Quote: large accent quotation mark, bold text, no box
    quote(q,at){
      return `<section style="margin:8px 0 28px;">`
        + `<p style="margin:0;height:26px;overflow:hidden;font-family:${QUOTE};font-size:46px;line-height:1;color:${T.A};">“</p>`
        + (q.length?`<p style="margin:0;font-family:${T.head};font-size:17px;line-height:1.75;font-weight:700;letter-spacing:0.5px;color:${INK};">${q.map(inl).join('<br>')}</p>`:'')
        + at.map(a=>`<p style="margin:10px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:0.5px;color:${T.muted};">${inl(a)}</p>`).join('')
        + `</section>`;
    },
    // Data strip: label above the figure, columns split by hairlines, heavy rule on top
    data(ls){
      let h='';
      for(let k=0;k<ls.length;k+=3){
        const row=ls.slice(k,k+3), n=row.length, fs=n===1?34:n===2?28:22, lastRow=k+3>=ls.length;
        h+=`<section style="display:flex;margin:4px 0 ${lastRow?24:12}px;border-top:2px solid ${INK};border-bottom:1px solid ${HAIR};">` + row.map((c,j)=>
          `<section style="flex:1;min-width:0;padding:12px ${j<n-1?12:0}px 12px ${j?12:0}px;${j?`border-left:1px solid ${RULE};`:''}">`
          + (c[1]?`<p style="margin:0 0 4px;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:0.5px;color:${SUB};">${inl(c[1])}</p>`:'')
          + `<p style="margin:0;font-family:${NUM};font-size:${fs}px;line-height:1.2;font-weight:700;letter-spacing:0;color:${T.A};">${inl(c[0]||'')}</p>`
          + (c[2]?`<p style="margin:4px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${FAINT};">${inl(c[2])}</p>`:'')
          + `</section>`).join('') + `</section>`;
      }
      return h;
    },
    // Table: three-line (booktabs) style, first column bold, numeric columns right-aligned
    table(head,body,idx,isNum,mb){
      const thead=head?`<tr>${idx.map(j=>`<th style="padding:8px;border-bottom:1px solid ${INK};font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:0.5px;line-height:1.5;color:${SUB};text-align:${isNum[j]?'right':'left'};vertical-align:bottom;">${inl(head[j]||'')}</th>`).join('')}</tr>`:'';
      const tbody=body.map((r,k)=>`<tr>${idx.map(j=>`<td style="padding:9px 8px;border-bottom:1px solid ${k===body.length-1?INK:RULE};font-family:${isNum[j]?NUM:SANS};font-size:13.5px;line-height:1.55;font-weight:${j===0?700:400};color:${j===0?INK:TEXT};text-align:${isNum[j]?'right':'left'};vertical-align:top;">${inl(r[j]||'')}</td>`).join('')}</tr>`).join('');
      return `<section style="margin:4px 0 ${mb}px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;border-top:2px solid ${INK};"><tbody>${thead}${tbody}</tbody></table></section>`;
    },
    image(alt,url,mb){
      if(/^https?:\/\//i.test(url)){
        return `<section style="margin:0 0 ${mb}px;"><img src="${esc(url)}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;"></section>`;
      }
      return `<section style="margin:0 0 ${mb}px;padding:44px 16px;border:1px dashed ${HAIR};background-color:${T.panel};text-align:center;"><p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${T.muted};">圖片位置${alt?'：'+esc(alt):''}</p><p style="margin:4px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${FAINT};">貼到後台後，在這裡上傳圖片替換</p></section>`;
    },
    caption(t){
      return `<p style="margin:0 0 24px;font-family:${SANS};font-size:12px;line-height:1.6;letter-spacing:0.3px;color:${T.muted};">${inl(t)}</p>`;
    },
    ul(a){return list(a,'square',{fs:16,lh:1.8,color:TEXT,mark:T.A,mb:10,last:20});},
    ol(a){return list(a,'ol',{fs:16,lh:1.8,color:TEXT,mark:T.A,mb:10,last:20});},
    hr(){return line(HAIR,1,'8px 0 28px');},
    end(){return `<section style="margin:36px auto;width:8px;height:8px;background-color:${T.A};overflow:hidden;line-height:8px;font-size:0;"><br></section>`;},
    // Key-points box: pale panel, accent label tab, items numbered 01 02 …
    card(title,body){
      return `<section style="margin:0 0 30px;padding:16px 16px 10px;background-color:${T.panel};border:1px solid ${T.panelLine};">`
        + (title?`<p style="margin:0 0 12px;line-height:1.5;"><span style="display:inline-block;padding:2px 8px;background-color:${T.A};color:#FFFFFF;font-family:${SANS};font-size:12px;line-height:1.6;font-weight:700;letter-spacing:1.5px;">${inl(title)}</span></p>`:'')
        + boxBody(body,{fs:14.5,lh:1.7,color:INK,mark:T.A,mb:8,last:6},'num2') + `</section>`;
    },
    // Small print: hairline on top, grey type, no fill
    small(title,body){
      return `<section style="margin:28px 0 20px;padding-top:12px;border-top:1px solid ${HAIR};">`
        + (title?`<p style="margin:0 0 8px;font-family:${SANS};font-size:12px;line-height:1.5;font-weight:700;letter-spacing:1px;color:${SUB};">${inl(title)}</p>`:'')
        + boxBody(body,{fs:12,lh:1.7,color:'#80868B',mark:'#A3A9AE',mb:4,last:4},'dot') + `</section>`;
    },
    para(t){return `<p style="${P}">${inl(t)}</p>`;},
    wrap(h){return `<section style="font-family:${SANS};font-size:16px;color:${TEXT};">${h}</section>`;}
  };
}

// ---------- skin 2: retro-future ----------
// The 1970s idea of tomorrow's market report: racing stripes that bend round a corner,
// capsule numbers with speed trails, CRT readouts in phosphor colours, computer-paper tables.
// Everything is borders, radii and filled boxes, so it survives WeChat's inline-style filter.
function retroSkin(s,date){
  const R = retroTheme(s);
  const INKR = R.ink;
  const P = `margin:0 0 20px;font-family:${SANS};font-size:16px;line-height:1.8;letter-spacing:0.6px;color:${TEXT};text-align:justify;`;
  const inl = x => esc(x)
    .replace(/\*\*(.+?)\*\*/g,`<strong style="font-weight:700;color:${INKR};">$1</strong>`)
    .replace(/==(.+?)==/g,`<span style="background-color:${R.mark};padding:0 2px;">$1</span>`);
  const bar = (color,h,extra) => `<section style="height:${h}px;background-color:${color};${extra||''}overflow:hidden;line-height:${h}px;font-size:0;"><br></section>`;
  const lst = makeList(inl);

  function list(items,kind,o){
    const W={dot:20,small:12,ol:26,num2:32}[kind];
    return lst(items,Object.assign({W,marker:k=>{
      if(kind==='dot') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-size:10px;line-height:1;vertical-align:2px;color:${o.mark};">●</span>`;
      if(kind==='small') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-weight:700;color:${o.mark};">·</span>`;
      return `<span style="display:inline-block;width:${W}px;text-indent:0;font-family:${FUT};font-weight:700;color:${o.mark};">${kind==='num2'?String(k+1).padStart(2,'0'):(k+1)+'.'}</span>`;
    }},o));
  }
  function boxBody(lines,o,bullet){
    const html=[]; let k=0;
    while(k<lines.length){
      const t=lines[k];
      if(/^[-*•]\s+/.test(t)){const a=[];while(k<lines.length&&/^[-*•]\s+/.test(lines[k])){a.push(lines[k].replace(/^[-*•]\s+/,''));k++;}html.push(list(a,bullet,o));continue;}
      if(/^\d+(\.\s+|、)/.test(t)){const a=[];while(k<lines.length&&/^\d+(\.\s+|、)/.test(lines[k])){a.push(lines[k].replace(/^\d+(\.\s+|、)/,''));k++;}html.push(list(a,'ol',o));continue;}
      html.push(`<p style="margin:0 0 ${o.mb}px;font-family:${SANS};font-size:${o.fs}px;line-height:${o.lh};letter-spacing:0.5px;color:${o.color};">${inl(t)}</p>`);k++;
    }
    return html.join('');
  }

  return {
    // Title: four racing stripes run along the top and bend down the left side.
    // Nested boxes with concentric top-left radii draw the curve.
    title(h){
      const bw=5, gap=4; let r=46, open='', close='';
      R.C.forEach(c=>{
        open+=`<section style="border-top:${bw}px solid ${c};border-left:${bw}px solid ${c};border-top-left-radius:${r}px;padding:${gap}px 0 0 ${gap}px;">`;
        close+='</section>'; r-=bw+gap;
      });
      const meta=(s.column||date)
        ? `<section style="display:flex;justify-content:space-between;align-items:baseline;margin:0 0 12px;">`
          + `<span style="font-family:${SANS};font-size:13px;line-height:1.5;font-weight:700;letter-spacing:2px;color:${R.A};">${esc(s.column||'')}</span>`
          + `<span style="font-family:${FUT};font-size:13px;line-height:1.5;font-weight:500;letter-spacing:1px;color:${R.muted};">${esc(date||'')}</span></section>`
        : '';
      return `<section style="margin:0 0 36px;">${open}<section style="padding:18px 0 8px 14px;">${meta}`
        + `<h1 style="margin:0;font-family:${R.head};font-size:24px;line-height:1.45;font-weight:700;letter-spacing:1px;color:${INKR};">${inl(h)}</h1>`
        + `</section>${close}</section>`;
    },
    // Chapter: capsule number trailing four tapering speed lines, then the title
    chapter(n,zh,en,deck,first){
      const nn=String(n).padStart(2,'0');
      const trail=R.C.map((c,k)=>bar(c,3,`margin:0 ${k*14}% ${k<R.C.length-1?2:0}px 0;`)).join('');
      return `<section style="margin:${first?0:52}px 0 20px;">`
        + `<section style="display:flex;align-items:center;margin:0 0 12px;">`
        + `<span style="flex-shrink:0;display:inline-block;padding:0 13px;border-radius:999px;background-color:${R.A};color:#FFFFFF;font-family:${FUT};font-size:14px;line-height:24px;font-weight:700;letter-spacing:1.5px;">${nn}</span>`
        + `<section style="flex:1;min-width:0;margin-left:8px;">${trail}</section></section>`
        + `<h2 style="margin:0;font-family:${R.head};font-size:22px;line-height:1.45;font-weight:700;letter-spacing:1px;color:${INKR};">${inl(zh)}`
        + (en?`<span style="margin-left:10px;font-family:${FUT};font-size:13px;font-weight:500;letter-spacing:1px;color:${R.muted};">${esc(en)}</span>`:'')
        + `</h2>`
        + (deck?`<p style="margin:6px 0 0;font-family:${SANS};font-size:14.5px;line-height:1.6;letter-spacing:0.5px;color:${SUB};">${inl(deck)}</p>`:'')
        + `</section>`;
    },
    sub(t){
      return `<h3 style="margin:30px 0 12px;font-family:${R.head};font-size:17px;line-height:1.5;font-weight:700;letter-spacing:0.5px;color:${INKR};"><span style="margin-right:8px;font-family:${SANS};font-size:15px;font-weight:400;color:${R.A};">✦</span>${inl(t)}</h3>`;
    },
    // Quote: a porthole-round panel in the palette's pale tint
    quote(q,at){
      return `<section style="margin:8px 0 28px;padding:16px 20px 18px;border-radius:24px;background-color:${R.tint};">`
        + `<p style="margin:0 0 2px;height:28px;overflow:hidden;font-family:${FUT};font-size:46px;line-height:1;font-weight:700;color:${R.A};">“</p>`
        + (q.length?`<p style="margin:0;font-family:${R.head};font-size:17px;line-height:1.75;font-weight:700;letter-spacing:0.5px;color:${INKR};">${q.map(inl).join('<br>')}</p>`:'')
        + at.map(a=>`<p style="margin:10px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:0.5px;color:${R.muted};">${inl(a)}</p>`).join('')
        + `</section>`;
    },
    // Data strip: a CRT screen in a pale bezel, figures glowing in the phosphor colour
    data(ls){
      let h='';
      for(let k=0;k<ls.length;k+=3){
        const row=ls.slice(k,k+3), n=row.length, fs=n===1?36:n===2?30:24, lastRow=k+3>=ls.length;
        h+=`<section style="margin:4px 0 ${lastRow?24:12}px;padding:6px;border-radius:22px;background-color:${R.bezel};">`
          + `<section style="display:flex;padding:14px 4px;border-radius:16px;background-color:${R.screen};">`
          + row.map((c,j)=>`<section style="flex:1;min-width:0;padding:2px 12px;${j?`border-left:1px dashed ${R.rule};`:''}">`
            + (c[1]?`<p style="margin:0 0 4px;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:0.5px;color:${R.dim};">${inl(c[1])}</p>`:'')
            + `<p style="margin:0;font-family:${FUT};font-size:${fs}px;line-height:1.2;font-weight:700;letter-spacing:0.5px;color:${R.phos};text-shadow:0 0 10px ${rgba(R.phos,.45)};">${inl(c[0]||'')}</p>`
            + (c[2]?`<p style="margin:4px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${R.dimmer};">${inl(c[2])}</p>`:'')
            + `</section>`).join('')
          + `</section></section>`;
      }
      return h;
    },
    // Table: ink header with rounded top corners, body rows banded like computer printout paper
    table(head,body,idx,isNum,mb){
      const last=idx.length-1;
      const thead=head?`<tr>${idx.map(j=>`<th style="padding:9px 8px;background-color:${INKR};${j===0?'border-top-left-radius:10px;':''}${j===last?'border-top-right-radius:10px;':''}font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:0.5px;line-height:1.5;color:#FFFFFF;text-align:${isNum[j]?'right':'left'};vertical-align:bottom;">${inl(head[j]||'')}</th>`).join('')}</tr>`:'';
      const tbody=body.map((r,k)=>`<tr>${idx.map(j=>`<td style="padding:9px 8px;background-color:${k%2?'#FFFFFF':R.zebra};${k===body.length-1?`border-bottom:2px solid ${INKR};`:''}font-family:${isNum[j]?NUM:SANS};font-size:13.5px;line-height:1.55;font-weight:${j===0?700:400};color:${j===0?INKR:TEXT};text-align:${isNum[j]?'right':'left'};vertical-align:top;">${inl(r[j]||'')}</td>`).join('')}</tr>`).join('');
      return `<section style="margin:4px 0 ${mb}px;overflow-x:auto;"><table style="width:100%;border-collapse:separate;border-spacing:0;${head?'':`border-top:2px solid ${INKR};`}"><tbody>${thead}${tbody}</tbody></table></section>`;
    },
    image(alt,url,mb){
      if(/^https?:\/\//i.test(url)){
        return `<section style="margin:0 0 ${mb}px;"><img src="${esc(url)}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;border-radius:14px;"></section>`;
      }
      return `<section style="margin:0 0 ${mb}px;padding:44px 16px;border-radius:22px;border:2px dashed ${R.C[2]};background-color:${R.tint};text-align:center;"><p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${R.muted};">圖片位置${alt?'：'+esc(alt):''}</p><p style="margin:4px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${R.muted};">貼到後台後，在這裡上傳圖片替換</p></section>`;
    },
    caption(t){
      return `<p style="margin:0 0 24px;font-family:${SANS};font-size:12px;line-height:1.6;letter-spacing:0.3px;color:${R.muted};">${inl(t)}</p>`;
    },
    ul(a){return list(a,'dot',{fs:16,lh:1.8,color:TEXT,mark:R.A,mb:10,last:20});},
    ol(a){return list(a,'ol',{fs:16,lh:1.8,color:TEXT,mark:R.A,mb:10,last:20});},
    // Divider: three lamps in the palette colours
    hr(){
      return `<p style="margin:8px 0 28px;padding-left:12px;text-align:center;font-size:9px;line-height:1;letter-spacing:12px;">${[1,2,3].map(k=>`<span style="color:${R.C[k]};">●</span>`).join('')}</p>`;
    },
    // End mark: a half sun on two horizon lines
    end(){
      return `<section style="margin:44px 0 36px;">`
        + `<section style="width:44px;height:22px;margin:0 auto;border-radius:22px 22px 0 0;background-color:${R.C[2]};overflow:hidden;line-height:22px;font-size:0;"><br></section>`
        + bar(R.C[1],3,'width:64px;margin:3px auto 0;')
        + bar(R.C[0],2,'width:86px;margin:3px auto 0;')
        + `</section>`;
    },
    // Key-points box: the four stripes as a band across the top of a rounded tinted panel
    card(title,body){
      return `<section style="margin:0 0 30px;border-radius:18px;overflow:hidden;background-color:${R.tint};">`
        + R.C.map(c=>bar(c,4,'')).join('')
        + `<section style="padding:16px 18px 10px;">`
        + (title?`<p style="margin:0 0 12px;font-family:${R.head};font-size:16px;line-height:1.5;font-weight:700;letter-spacing:1px;color:${INKR};">${inl(title)}</p>`:'')
        + boxBody(body,{fs:14.5,lh:1.7,color:INKR,mark:R.A,mb:8,last:6},'num2')
        + `</section></section>`;
    },
    small(title,body){
      return `<section style="margin:28px 0 20px;padding-top:12px;border-top:1px dashed ${R.muted};">`
        + (title?`<p style="margin:0 0 8px;font-family:${SANS};font-size:12px;line-height:1.5;font-weight:700;letter-spacing:1px;color:${SUB};">${inl(title)}</p>`:'')
        + boxBody(body,{fs:12,lh:1.7,color:'#80868B',mark:'#A3A9AE',mb:4,last:4},'small') + `</section>`;
    },
    para(t){return `<p style="${P}">${inl(t)}</p>`;},
    wrap(h){return `<section style="font-family:${SANS};font-size:16px;color:${TEXT};">${h}</section>`;}
  };
}

// ---------- skin 3: minimal ----------
// Still no frames or rules: structure comes from size, weight and space. Colour enters in two
// ways only: the palette's one ink colour on small marks (numerals, subheads, quotes, figures),
// and a pale flat wash behind the key points and the figures. Chapters use the financial
// numerals written on cheques and invoices (壹 貳 參).
const DX='零壹貳參肆伍陸柒捌玖';
function daxie(n){
  if(n<10)return DX[n];
  if(n===10)return '拾';
  if(n<20)return '拾'+DX[n-10];
  const u=n%10; return DX[Math.floor(n/10)]+'拾'+(u?DX[u]:'');
}
function minimalSkin(s,date){
  const M = miniTheme(s);
  const H='#262626', BODY='#3A3A3A', MID='#5C5C5C', GREY='#666666', LINE='#EBEBEB';
  const LIGHT = "-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang TC','PingFang SC','Microsoft JhengHei',sans-serif";
  const P = `margin:0 0 22px;font-family:${SANS};font-size:16px;line-height:1.9;letter-spacing:0.6px;color:${BODY};text-align:justify;`;
  const inl = x => esc(x)
    .replace(/\*\*(.+?)\*\*/g,`<strong style="font-weight:600;color:${H};">$1</strong>`)
    .replace(/==(.+?)==/g,`<span style="background-color:${M.mark};padding:0 2px;">$1</span>`);
  const lst = makeList(inl);
  const rule = (w,h,color,m) => `<section style="width:${w}px;height:${h}px;margin:${m};background-color:${color};overflow:hidden;line-height:${h}px;font-size:0;"><br></section>`;

  function list(items,kind,o){
    const W=kind==='dash'?18:22;
    return lst(items,Object.assign({W,marker:k=>kind==='dash'
      ? `<span style="display:inline-block;width:${W}px;text-indent:0;color:${o.mark};">–</span>`
      : `<span style="display:inline-block;width:${W}px;text-indent:0;font-family:${LIGHT};font-weight:400;color:${o.mark};">${k+1}${kind==='ol'?'.':''}</span>`},o));
  }
  function boxBody(lines,o,bullet){
    const html=[]; let k=0;
    while(k<lines.length){
      const t=lines[k];
      if(/^[-*•]\s+/.test(t)){const a=[];while(k<lines.length&&/^[-*•]\s+/.test(lines[k])){a.push(lines[k].replace(/^[-*•]\s+/,''));k++;}html.push(list(a,bullet,o));continue;}
      if(/^\d+(\.\s+|、)/.test(t)){const a=[];while(k<lines.length&&/^\d+(\.\s+|、)/.test(lines[k])){a.push(lines[k].replace(/^\d+(\.\s+|、)/,''));k++;}html.push(list(a,'n',o));continue;}
      html.push(`<p style="margin:0 0 ${o.mb}px;font-family:${SANS};font-size:${o.fs}px;line-height:${o.lh};letter-spacing:0.5px;color:${o.color};">${inl(t)}</p>`);k++;
    }
    return html.join('');
  }

  return {
    // Title: a short colour bar, the headline, then column (in colour) and date underneath
    title(h){
      const meta=(s.column?`<span style="font-weight:600;color:${M.A};">${esc(s.column)}</span>`:'')
        + (s.column&&date?'　　':'') + (date?esc(date):'');
      return `<section style="margin:12px 0 56px;">`
        + rule(28,3,M.A,'0 0 22px')
        + `<h1 style="margin:0;font-family:${M.head};font-size:26px;line-height:1.5;font-weight:600;letter-spacing:1px;color:${H};">${inl(h)}</h1>`
        + (meta?`<p style="margin:18px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:2px;color:${GREY};">${meta}</p>`:'')
        + `</section>`;
    },
    // Chapter: financial numeral in colour (English word in grey beside it), title below
    chapter(n,zh,en,deck,first){
      return `<section style="margin:${first?0:68}px 0 26px;">`
        + `<p style="margin:0 0 10px;font-family:${SANS};font-size:15px;line-height:1.5;font-weight:500;letter-spacing:2px;color:${M.A};">${daxie(n)}`
        + (en?`<span style="margin-left:14px;font-size:12px;font-weight:400;letter-spacing:1px;color:${GREY};">${esc(en)}</span>`:'')
        + `</p>`
        + `<h2 style="margin:0;font-family:${M.head};font-size:21px;line-height:1.5;font-weight:600;letter-spacing:1px;color:${H};">${inl(zh)}</h2>`
        + (deck?`<p style="margin:6px 0 0;font-family:${SANS};font-size:14px;line-height:1.7;letter-spacing:0.5px;color:${GREY};">${inl(deck)}</p>`:'')
        + `</section>`;
    },
    sub(t){
      return `<h3 style="margin:36px 0 12px;font-family:${M.head};font-size:16px;line-height:1.6;font-weight:600;letter-spacing:0.5px;color:${M.A};">${inl(t)}</h3>`;
    },
    // Quote: no marks, no frame; set larger, indented two characters, in the palette colour
    quote(q,at){
      return `<section style="margin:36px 0 40px;padding-left:2em;">`
        + (q.length?`<p style="margin:0;font-family:${M.head};font-size:18px;line-height:1.8;font-weight:500;letter-spacing:1px;color:${M.A};">${q.map(inl).join('<br>')}</p>`:'')
        + at.map(a=>`<p style="margin:12px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:1px;color:${GREY};">${inl(a)}</p>`).join('')
        + `</section>`;
    },
    // Data: oversized light figures in colour on a flat pale wash; rows stack as bands
    data(ls){
      let h='';
      for(let k=0;k<ls.length;k+=3){
        const row=ls.slice(k,k+3), n=row.length, fs=n===1?48:n===2?38:29, lastRow=k+3>=ls.length;
        h+=`<section style="display:flex;margin:${k?0:30}px 0 ${lastRow?36:2}px;padding:22px 20px 20px;background-color:${M.wash};">` + row.map((c,j)=>
          `<section style="flex:1;min-width:0;${j<n-1?'padding-right:14px;':''}">`
          + `<p style="margin:0;font-family:${LIGHT};font-size:${fs}px;line-height:1.1;font-weight:300;letter-spacing:-0.5px;color:${M.A};">${inl(c[0]||'')}</p>`
          + (c[1]?`<p style="margin:10px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:0.5px;color:${MID};">${inl(c[1])}</p>`:'')
          + (c[2]?`<p style="margin:2px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${GREY};">${inl(c[2])}</p>`:'')
          + `</section>`).join('') + `</section>`;
      }
      return h;
    },
    // Table: head in colour over one colour hairline, pale row lines, no outer rules
    table(head,body,idx,isNum,mb){
      const last=idx.length-1;
      const pad=(j,t,b)=>`padding:${t}px ${j===last?0:12}px ${b}px 0;`;
      const thead=head?`<tr>${idx.map(j=>`<th style="${pad(j,0,10)}border-bottom:1px solid ${M.A};font-family:${SANS};font-size:12px;font-weight:500;letter-spacing:0.5px;line-height:1.5;color:${M.A};text-align:${isNum[j]?'right':'left'};vertical-align:bottom;">${inl(head[j]||'')}</th>`).join('')}</tr>`:'';
      const tbody=body.map((r,k)=>`<tr>${idx.map(j=>`<td style="${pad(j,12,12)}${k<body.length-1?`border-bottom:1px solid ${LINE};`:''}font-family:${isNum[j]?LIGHT:SANS};font-size:14px;line-height:1.55;font-weight:${j===0?500:400};color:${j===0?H:BODY};text-align:${isNum[j]?'right':'left'};vertical-align:top;">${inl(r[j]||'')}</td>`).join('')}</tr>`).join('');
      return `<section style="margin:12px 0 ${mb}px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><tbody>${thead}${tbody}</tbody></table></section>`;
    },
    image(alt,url,mb){
      if(/^https?:\/\//i.test(url)){
        return `<section style="margin:8px 0 ${mb}px;"><img src="${esc(url)}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;"></section>`;
      }
      return `<section style="margin:8px 0 ${mb}px;padding:52px 16px;background-color:${M.wash};text-align:center;"><p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${MID};">圖片位置${alt?'：'+esc(alt):''}</p><p style="margin:4px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${GREY};">貼到後台後，在這裡上傳圖片替換</p></section>`;
    },
    caption(t){
      return `<p style="margin:0 0 30px;font-family:${SANS};font-size:12px;line-height:1.6;letter-spacing:0.3px;color:${GREY};">${inl(t)}</p>`;
    },
    ul(a){return list(a,'dash',{fs:16,lh:1.9,color:BODY,mark:M.A,mb:8,last:22});},
    ol(a){return list(a,'ol',{fs:16,lh:1.9,color:BODY,mark:M.A,mb:8,last:22});},
    // Divider: a short colour line, flush left like everything else
    hr(){return rule(28,1,M.A,'36px 0');},
    // End mark: a drawn full stop in the palette colour
    end(){return `<section style="width:7px;height:7px;margin:52px auto 40px;border:1.5px solid ${M.A};border-radius:50%;overflow:hidden;line-height:7px;font-size:0;"><br></section>`;},
    // Key points: the flat wash, title and numbers in colour
    card(title,body){
      return `<section style="margin:0 0 44px;padding:20px 20px 14px;background-color:${M.wash};">`
        + (title?`<p style="margin:0 0 14px;font-family:${SANS};font-size:12px;line-height:1.5;font-weight:600;letter-spacing:2px;color:${M.A};">${inl(title)}</p>`:'')
        + boxBody(body,{fs:15,lh:1.75,color:H,mark:M.A,mb:10,last:6},'n')
        + `</section>`;
    },
    small(title,body){
      return `<section style="margin:48px 0 20px;">`
        + (title?`<p style="margin:0 0 8px;font-family:${SANS};font-size:12px;line-height:1.5;font-weight:600;letter-spacing:1px;color:${MID};">${inl(title)}</p>`:'')
        + boxBody(body,{fs:12,lh:1.7,color:GREY,mark:'#A6A6A6',mb:4,last:4},'dash') + `</section>`;
    },
    para(t){return `<p style="${P}">${inl(t)}</p>`;},
    wrap(h){return `<section style="font-family:${SANS};font-size:16px;color:${BODY};">${h}</section>`;}
  };
}

// ---------- skin 4: space ----------
// The whole article sits on a deep-space plate. The title floats in a scatter of stars and ends
// on a planet's limb: a glowing arc cut from a very wide ellipse, so it reads as a horizon seen
// from orbit, with an original rocket climbing beside the headline. Chapters are a numbered
// ring joined by a trail to a small rocket.
// Figures read like instrument telemetry. Stars are typed glyphs in flex rows, so nothing here
// needs images, SVG or positioning, which WeChat strips.
function spaceSkin(s,date){
  const X = spaceTheme(s);
  const PAD = 18;
  const P = `margin:0 0 22px;font-family:${SANS};font-size:16px;line-height:1.9;letter-spacing:0.6px;color:${X.text};text-align:justify;`;
  const inl = x => esc(x)
    .replace(/\*\*(.+?)\*\*/g,`<strong style="font-weight:700;color:${X.white};">$1</strong>`)
    .replace(/==(.+?)==/g,`<span style="background-color:${X.mark};color:${X.white};padding:0 3px;">$1</span>`);
  const lst = makeList(inl);
  const glow = (c,r,a) => `text-shadow:0 0 ${r}px ${rgba(c,a)};`;
  const blank = (st) => `<section style="${st}overflow:hidden;font-size:0;"><br></section>`;

  // One row of scattered stars: [glyph, size, colour, drop from the top of the row]
  function field(pat,h,m){
    return `<section style="display:flex;justify-content:space-between;align-items:flex-start;height:${h}px;margin:${m};overflow:hidden;">`
      + pat.map(([g,fs,c,dy])=>`<span style="display:block;margin-top:${dy}px;font-family:${SANS};font-size:${fs}px;line-height:1;color:${c};${g==='✦'?glow(c,6,.7):''}">${g}</span>`).join('')
      + `</section>`;
  }
  const B=X.star, D=X.dim, W=X.A2;
  const SKY1=[['·',14,D,6],['✦',9,B,16],['·',11,D,0],['+',11,W,9],['·',15,D,19],['·',10,B,3],['✦',7,W,13],['·',13,D,5],['+',9,D,17],['✦',11,B,1],['·',11,D,10]];
  const SKY2=[['·',11,D,2],['·',14,B,12],['+',9,D,5],['✦',8,B,15],['·',12,D,0],['·',10,W,9],['·',15,D,14],['+',10,B,3],['·',11,D,11],['✦',8,W,6]];

  // An original rocket built from boxes: rounded nose, porthole, accent band, swept fins,
  // nozzle, a two-layer flame and fading smoke puffs. Fire colours stay the same in every palette.
  const HULL = mix('#FFFFFF',X.bg,.07), NOZ = mix('#FFFFFF',X.bg,.5);
  const FIRE = 'background-color:#FFB25C;';
  function rocketUp(){
    const puff = (d,a,m) => blank(`width:${d}px;height:${d}px;margin-top:${m}px;border-radius:50%;background-color:${rgba('#FFFFFF',a)};line-height:${d}px;`);
    return `<section style="flex-shrink:0;width:34px;margin:2px 0 0 16px;display:flex;flex-direction:column;align-items:center;">`
      + blank(`width:16px;height:20px;border-radius:50% 50% 0 0 / 100% 100% 0 0;background-color:${HULL};line-height:20px;`)
      + `<section style="width:16px;height:24px;padding-top:6px;box-sizing:border-box;background-color:${HULL};display:flex;justify-content:center;">`
      +   blank(`width:9px;height:9px;box-sizing:border-box;border:2px solid ${X.A};border-radius:50%;background-color:${X.bg};line-height:5px;`)
      + `</section>`
      + blank(`width:16px;height:3px;background-color:${X.A};line-height:3px;`)
      + `<section style="display:flex;align-items:flex-end;">`
      +   blank(`width:9px;height:15px;border-radius:100% 0 0 0 / 100% 0 0 0;background-color:${X.A};line-height:15px;`)
      +   blank(`width:16px;height:18px;background-color:${HULL};line-height:18px;`)
      +   blank(`width:9px;height:15px;border-radius:0 100% 0 0 / 0 100% 0 0;background-color:${X.A};line-height:15px;`)
      + `</section>`
      + blank(`width:10px;height:4px;border-radius:0 0 2px 2px;background-color:${NOZ};line-height:4px;`)
      + `<section style="width:12px;height:24px;margin-top:1px;border-radius:50% 50% 50% 50% / 28% 28% 72% 72%;${FIRE}background-image:linear-gradient(#FFE08A 0%,#FF8A3D 62%,rgba(255,122,61,0) 100%);box-shadow:0 0 12px rgba(255,170,80,0.55);display:flex;justify-content:center;overflow:hidden;">`
      +   blank(`width:6px;height:12px;margin-top:1px;border-radius:50% 50% 50% 50% / 30% 30% 70% 70%;background-color:#FFF8DD;line-height:12px;`)
      + `</section>`
      + puff(8,.3,5) + puff(6,.2,4) + puff(5,.13,4) + puff(4,.08,4)
      + `</section>`;
  }
  // The same rocket, small and flying right, for chapter headers; the orbit line becomes its trail
  function rocketSide(){
    return `<section style="flex-shrink:0;display:flex;align-items:center;">`
      + blank(`width:10px;height:6px;border-radius:72% 28% 28% 72% / 50% 50% 50% 50%;${FIRE}background-image:linear-gradient(to left,#FFE08A,#FF8A3D 60%,rgba(255,122,61,0));line-height:6px;`)
      + blank(`width:4px;height:13px;margin-left:1px;border-radius:3px 1px 1px 3px;background-color:${X.A};line-height:13px;`)
      + blank(`width:12px;height:7px;background-color:${HULL};line-height:7px;`)
      + blank(`width:7px;height:7px;border-radius:0 100% 100% 0 / 0 50% 50% 0;background-color:${HULL};line-height:7px;`)
      + `</section>`;
  }

  function list(items,kind,o){
    const W={dot:20,small:12,ol:26,num2:32}[kind];
    return lst(items,Object.assign({W,marker:k=>{
      if(kind==='dot') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-size:8px;line-height:1;vertical-align:3px;color:${o.mark};">●</span>`;
      if(kind==='small') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-weight:700;color:${o.mark};">·</span>`;
      return `<span style="display:inline-block;width:${W}px;text-indent:0;font-family:${NUM};font-weight:700;color:${o.mark};">${kind==='num2'?String(k+1).padStart(2,'0'):(k+1)+'.'}</span>`;
    }},o));
  }
  function boxBody(lines,o,bullet){
    const html=[]; let k=0;
    while(k<lines.length){
      const t=lines[k];
      if(/^[-*•]\s+/.test(t)){const a=[];while(k<lines.length&&/^[-*•]\s+/.test(lines[k])){a.push(lines[k].replace(/^[-*•]\s+/,''));k++;}html.push(list(a,bullet,o));continue;}
      if(/^\d+(\.\s+|、)/.test(t)){const a=[];while(k<lines.length&&/^\d+(\.\s+|、)/.test(lines[k])){a.push(lines[k].replace(/^\d+(\.\s+|、)/,''));k++;}html.push(list(a,'ol',o));continue;}
      html.push(`<p style="margin:0 0 ${o.mb}px;font-family:${SANS};font-size:${o.fs}px;line-height:${o.lh};letter-spacing:0.5px;color:${o.color};">${inl(t)}</p>`);k++;
    }
    return html.join('');
  }

  return {
    // Title: stars, column + date, headline, more stars; then the planet limb runs edge to edge.
    // The limb has to escape the side padding, so this block closes the padded column,
    // draws the limb at full plate width, and reopens the column.
    title(h){
      const meta=(s.column||date)
        ? `<section style="display:flex;justify-content:space-between;align-items:baseline;margin:0 0 12px;">`
          + `<span style="font-family:${SANS};font-size:13px;line-height:1.5;font-weight:700;letter-spacing:2px;color:${X.A};">${esc(s.column||'')}</span>`
          + `<span style="font-family:${NUM};font-size:13px;line-height:1.5;letter-spacing:1px;color:${X.muted};">${esc(date||'')}</span></section>`
        : '';
      return field(SKY1,26,'0 0 22px') + meta
        + `<section style="display:flex;align-items:flex-start;">`
        +   `<section style="flex:1;min-width:0;">`
        +     `<h1 style="margin:0;font-family:${X.head};font-size:25px;line-height:1.5;font-weight:700;letter-spacing:1px;color:${X.white};${glow(X.A,18,.25)}">${inl(h)}</h1>`
        +     field(SKY2,22,'26px 0 0')
        +   `</section>`
        +   rocketUp()
        + `</section>`
        + `</section>`
        + `<section style="display:flex;justify-content:center;align-items:flex-start;height:34px;padding-top:12px;margin:0 0 34px;overflow:hidden;">`
        +   `<section style="flex-shrink:0;width:170%;height:120px;border-top:2px solid ${X.limb};border-radius:50%;background-color:transparent;background-image:linear-gradient(${rgba(X.planet,.95)} 0px,${rgba(X.planet,0)} 34px);box-shadow:0 -3px 16px ${rgba(X.limb,.55)};overflow:hidden;font-size:0;"><br></section>`
        + `</section>`
        + `<section style="padding:0 ${PAD}px;">`;
    },
    // Chapter: number in a ring, a trail, a small rocket at its end; title below
    chapter(n,zh,en,deck,first){
      const nn=String(n).padStart(2,'0');
      return `<section style="margin:${first?0:56}px 0 22px;">`
        + `<section style="display:flex;align-items:center;margin:0 0 14px;">`
        +   `<span style="flex-shrink:0;display:inline-block;width:30px;height:30px;box-sizing:border-box;border:1px solid ${X.A};border-radius:50%;text-align:center;font-family:${NUM};font-size:12px;line-height:28px;font-weight:700;letter-spacing:0.5px;color:${X.A};">${nn}</span>`
        +   blank(`flex:1;min-width:0;height:1px;margin-left:8px;background-color:${X.orbit};background-image:linear-gradient(to right,${rgba(X.A,.08)},${rgba(X.A,.6)});line-height:1px;`)
        +   rocketSide()
        + `</section>`
        + `<h2 style="margin:0;font-family:${X.head};font-size:21px;line-height:1.5;font-weight:700;letter-spacing:1px;color:${X.white};">${inl(zh)}`
        + (en?`<span style="margin-left:10px;font-family:${SANS};font-size:12px;font-weight:400;letter-spacing:1.5px;color:${X.muted};">${esc(en)}</span>`:'')
        + `</h2>`
        + (deck?`<p style="margin:6px 0 0;font-family:${SANS};font-size:14px;line-height:1.7;letter-spacing:0.5px;color:${X.muted};">${inl(deck)}</p>`:'')
        + `</section>`;
    },
    sub(t){
      return `<h3 style="margin:34px 0 12px;font-family:${X.head};font-size:17px;line-height:1.5;font-weight:700;letter-spacing:0.5px;color:${X.A};">${inl(t)}</h3>`;
    },
    // Quote: a received transmission; centred, set larger, a bright star above
    quote(q,at){
      return `<section style="margin:38px 0 42px;text-align:center;">`
        + `<p style="margin:0 0 14px;font-family:${SANS};font-size:14px;line-height:1;color:${X.A2};${glow(X.A2,8,.7)}">✦</p>`
        + (q.length?`<p style="margin:0;font-family:${X.head};font-size:18px;line-height:1.8;font-weight:500;letter-spacing:1px;color:${X.white};">${q.map(inl).join('<br>')}</p>`:'')
        + at.map(a=>`<p style="margin:14px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:1px;color:${X.muted};">${inl(a)}</p>`).join('')
        + `</section>`;
    },
    // Data: telemetry panel, label above a glowing figure, cells split by faint rules
    data(ls){
      let h='';
      for(let k=0;k<ls.length;k+=3){
        const row=ls.slice(k,k+3), n=row.length, fs=n===1?38:n===2?30:24, lastRow=k+3>=ls.length;
        h+=`<section style="display:flex;margin:${k?0:6}px 0 ${lastRow?28:10}px;padding:16px 4px;background-color:${X.panel};border:1px solid ${X.panelLine};border-radius:6px;">` + row.map((c,j)=>
          `<section style="flex:1;min-width:0;padding:2px 12px;${j?`border-left:1px solid ${X.panelLine};`:''}">`
          + (c[1]?`<p style="margin:0 0 6px;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:0.5px;color:${X.muted};">${inl(c[1])}</p>`:'')
          + `<p style="margin:0;font-family:${NUM};font-size:${fs}px;line-height:1.15;font-weight:700;letter-spacing:0.5px;color:${X.A};${glow(X.A,12,.5)}">${inl(c[0]||'')}</p>`
          + (c[2]?`<p style="margin:6px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${X.muted};">${inl(c[2])}</p>`:'')
          + `</section>`).join('') + `</section>`;
      }
      return h;
    },
    // Table: accent head over an orbit-coloured line, faint row rules
    table(head,body,idx,isNum,mb){
      const thead=head?`<tr>${idx.map(j=>`<th style="padding:0 8px 10px;border-bottom:1px solid ${X.orbit};font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:0.5px;line-height:1.5;color:${X.A};text-align:${isNum[j]?'right':'left'};vertical-align:bottom;">${inl(head[j]||'')}</th>`).join('')}</tr>`:'';
      const tbody=body.map((r,k)=>`<tr>${idx.map(j=>`<td style="padding:11px 8px;border-bottom:1px solid ${k===body.length-1?X.orbit:X.line};font-family:${isNum[j]?NUM:SANS};font-size:13.5px;line-height:1.55;font-weight:${j===0?700:400};color:${j===0?X.white:X.text};text-align:${isNum[j]?'right':'left'};vertical-align:top;">${inl(r[j]||'')}</td>`).join('')}</tr>`).join('');
      return `<section style="margin:8px 0 ${mb}px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;${head?'':`border-top:1px solid ${X.orbit};`}"><tbody>${thead}${tbody}</tbody></table></section>`;
    },
    image(alt,url,mb){
      if(/^https?:\/\//i.test(url)){
        return `<section style="margin:6px 0 ${mb}px;"><img src="${esc(url)}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;border-radius:6px;"></section>`;
      }
      return `<section style="margin:6px 0 ${mb}px;padding:48px 16px;border:1px dashed ${X.orbit};border-radius:6px;background-color:${X.panel};text-align:center;"><p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${X.text};">圖片位置${alt?'：'+esc(alt):''}</p><p style="margin:4px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${X.muted};">貼到後台後，在這裡上傳圖片替換</p></section>`;
    },
    caption(t){
      return `<p style="margin:0 0 28px;font-family:${SANS};font-size:12px;line-height:1.6;letter-spacing:0.3px;color:${X.muted};">${inl(t)}</p>`;
    },
    ul(a){return list(a,'dot',{fs:16,lh:1.9,color:X.text,mark:X.A,mb:8,last:22});},
    ol(a){return list(a,'ol',{fs:16,lh:1.9,color:X.text,mark:X.A,mb:8,last:22});},
    // Divider: a few stars
    hr(){
      return `<p style="margin:10px 0 30px;padding-left:16px;text-align:center;font-family:${SANS};font-size:11px;line-height:1;letter-spacing:16px;">`
        + `<span style="color:${X.dim};">·</span><span style="color:${X.A2};">✦</span><span style="color:${X.dim};">·</span></p>`;
    },
    // End mark: one bright star
    end(){
      return `<p style="margin:48px 0 40px;text-align:center;font-family:${SANS};font-size:20px;line-height:1;color:${X.A2};${glow(X.A2,12,.8)}">✦</p>`;
    },
    // Key points: briefing panel, title and numbers in the accent
    card(title,body){
      return `<section style="margin:0 0 40px;padding:18px 18px 12px;background-color:${X.panel};border:1px solid ${X.panelLine};border-radius:6px;">`
        + (title?`<p style="margin:0 0 14px;font-family:${SANS};font-size:13px;line-height:1.5;font-weight:700;letter-spacing:2px;color:${X.A};">${inl(title)}</p>`:'')
        + boxBody(body,{fs:15,lh:1.75,color:X.white,mark:X.A,mb:10,last:6},'num2')
        + `</section>`;
    },
    small(title,body){
      return `<section style="margin:44px 0 0;padding-top:14px;border-top:1px solid ${X.line};">`
        + (title?`<p style="margin:0 0 8px;font-family:${SANS};font-size:12px;line-height:1.5;font-weight:700;letter-spacing:1px;color:${X.muted};">${inl(title)}</p>`:'')
        + boxBody(body,{fs:12,lh:1.7,color:X.muted,mark:X.dim,mb:4,last:4},'small') + `</section>`;
    },
    para(t){return `<p style="${P}">${inl(t)}</p>`;},
    // Plate: deep background with a faint glow at the top; the column inside carries the side padding
    wrap(h){
      return `<section style="padding:0 0 36px;background-color:${X.bg};background-image:radial-gradient(130% 55% at 50% 0%,${X.haze} 0%,${X.bg} 75%);font-family:${SANS};font-size:16px;color:${X.text};">`
        + `<section style="padding:28px ${PAD}px 0;">${h}</section></section>`;
    }
  };
}

// ---------- skin 5: renaissance ----------
// A page from a Venetian printing house around 1500. The article sits on vellum, its text block
// ruled in red as luxury copies were ruled by hand. The title stands in a round arch on a plinth,
// after the architectural frames of title pages; chapters are numbered CAPITVLVM I, II, III and
// open on an illuminated initial whose ground alternates between the two pigments. Figures and
// tables follow a merchant's ledger of Pacioli's day: a double rule on top, money columns split
// by red verticals. Ornaments are typed glyphs (¶ ☞ ❧ ❦) and floats, so nothing needs images.
// Headings stay in Song type here: a Renaissance page set in sans would no longer be one.
const LATIN = "Palatino,'Palatino Linotype','Book Antiqua','Hoefler Text',Baskerville,Georgia,serif";
const OLDNUM = "Georgia,'Times New Roman',serif"; // Georgia's figures are old-style, like early print
function roman(n){
  const V=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let r='';n=Math.max(1,Math.floor(n)||1);V.forEach(([v,g])=>{while(n>=v){r+=g;n-=v;}});return r;
}
function renaiTheme(s){
  const p = RENAI.find(x=>x.id===s.renai)||RENAI[0];
  const t = k => mix(p.ink,p.paper,k);
  return Object.assign({}, p, {
    body:t(.1), ink2:t(.25), muted:t(.36), faint:t(.46),
    rule:mix(p.gold,p.paper,.3), hair:mix(p.gold,p.paper,.62),
    panel:mix(p.paper,'#C9A66B',.14), light:mix(p.paper,'#FFFFFF',.4), edge:mix(p.paper,'#B48C55',.16),
    ruling:mix(p.A,p.paper,.38), ledger:mix(p.A,p.paper,.62),
    leaf:mix(p.gold,'#FFE9A8',.6), mark:rgba(p.gold,.26)
  });
}
function renaiSkin(s,date){
  const R = renaiTheme(s);
  const P = `margin:0 0 22px;font-family:${SERIF};font-size:16px;line-height:1.9;letter-spacing:0.5px;color:${R.body};text-align:justify;`;
  const inl = x => esc(x)
    .replace(/\*\*(.+?)\*\*/g,`<strong style="font-weight:700;color:${R.ink};">$1</strong>`)
    .replace(/==(.+?)==/g,`<span style="background-color:${R.mark};padding:0 2px;">$1</span>`);
  const lst = makeList(inl);
  const bar = (color,h,extra) => `<section style="height:${h}px;background-color:${color};${extra||''}overflow:hidden;line-height:${h}px;font-size:0;"><br></section>`;
  const blank = st => `<section style="${st}overflow:hidden;font-size:0;"><br></section>`;
  // A centred mark between two short gold rules
  const flank = (inner,w,m) => `<section style="display:flex;align-items:center;justify-content:center;margin:${m};">`
    + bar(R.rule,1,`width:${w}px;flex-shrink:0;`) + inner + bar(R.rule,1,`width:${w}px;flex-shrink:0;`) + `</section>`;
  // The first paragraph after the title or a chapter head opens on an illuminated initial
  let drop=false, drops=0;

  function list(items,kind,o){
    const W={lozenge:18,dot:12,ol:26,roman:32}[kind];
    return lst(items,Object.assign({W,ff:SERIF,marker:k=>{
      if(kind==='lozenge') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-size:8px;line-height:1;vertical-align:3px;color:${o.mark};">◆</span>`;
      if(kind==='dot') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-weight:700;color:${o.mark};">·</span>`;
      if(kind==='roman') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-family:${LATIN};font-style:italic;color:${o.mark};">${roman(k+1).toLowerCase()}.</span>`;
      return `<span style="display:inline-block;width:${W}px;text-indent:0;font-family:${OLDNUM};font-weight:700;color:${o.mark};">${k+1}.</span>`;
    }},o));
  }
  function boxBody(lines,o,bullet){
    const html=[]; let k=0;
    while(k<lines.length){
      const t=lines[k];
      if(/^[-*•]\s+/.test(t)){const a=[];while(k<lines.length&&/^[-*•]\s+/.test(lines[k])){a.push(lines[k].replace(/^[-*•]\s+/,''));k++;}html.push(list(a,bullet,o));continue;}
      if(/^\d+(\.\s+|、)/.test(t)){const a=[];while(k<lines.length&&/^\d+(\.\s+|、)/.test(lines[k])){a.push(lines[k].replace(/^\d+(\.\s+|、)/,''));k++;}html.push(list(a,bullet==='roman'?'roman':'ol',o));continue;}
      html.push(`<p style="margin:0 0 ${o.mb}px;font-family:${SERIF};font-size:${o.fs}px;line-height:${o.lh};letter-spacing:0.5px;color:${o.color};">${inl(t)}</p>`);k++;
    }
    return html.join('');
  }

  const K = {
    // Title: a round arch (two concentric frames, the inner one a shade deeper) standing on a
    // thick-and-thin plinth that is wider than the arch, with an oculus at the crown
    title(h){
      drop=true;
      const oculus = `<section style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;margin:0 auto 14px;box-sizing:border-box;border:1px solid ${R.gold};border-radius:50%;">`
        + blank(`width:8px;height:8px;border-radius:50%;background-color:${R.A};line-height:8px;`) + `</section>`;
      return `<section style="margin:4px 0 36px;">`
        + `<section style="margin:0 6px;padding:4px 4px 0;border:1px solid ${R.gold};border-bottom:0;border-radius:50% 50% 0 0 / 108px 108px 0 0;">`
        + `<section style="padding:22px 12px 24px;border:1px solid ${R.gold};border-bottom:0;border-radius:50% 50% 0 0 / 104px 104px 0 0;background-color:${R.panel};text-align:center;">`
        + oculus
        + (s.column?`<p style="margin:0 0 12px;padding-left:4px;font-family:${SERIF};font-size:13px;line-height:1.5;font-weight:700;letter-spacing:4px;color:${R.A};">${esc(s.column)}</p>`:'')
        + `<h1 style="margin:0;font-family:${SERIF};font-size:22px;line-height:1.6;font-weight:700;letter-spacing:1px;color:${R.ink};">${inl(h)}</h1>`
        + (date?bar(R.rule,1,'width:36px;margin:16px auto 12px;')+`<p style="margin:0;padding-left:2px;font-family:${OLDNUM};font-size:13px;line-height:1.5;letter-spacing:2px;color:${R.muted};">${esc(date)}</p>`:'')
        + `</section></section>`
        + bar(R.gold,3,'') + bar(R.gold,1,'margin-top:2px;')
        + `</section>`;
    },
    // Chapter: CAPITVLVM and a Roman numeral between gold rules, the title centred below
    chapter(n,zh,en,deck,first){
      drop=true;
      return `<section style="margin:${first?4:56}px 0 24px;text-align:center;">`
        + flank(`<span style="flex-shrink:0;margin:0 12px;padding-left:4px;font-family:${LATIN};font-size:12px;line-height:1.5;letter-spacing:4px;white-space:nowrap;color:${R.A};">CAPITVLVM ${roman(n)}</span>`,28,'0 0 12px')
        + `<h2 style="margin:0;font-family:${SERIF};font-size:21px;line-height:1.55;font-weight:700;letter-spacing:1px;color:${R.ink};">${inl(zh)}</h2>`
        + (en?`<p style="margin:6px 0 0;padding-left:3px;font-family:${LATIN};font-size:12px;line-height:1.5;letter-spacing:3px;color:${R.muted};">${esc(en.toUpperCase())}</p>`:'')
        + (deck?`<p style="margin:8px 0 0;font-family:${SERIF};font-size:14.5px;line-height:1.7;letter-spacing:0.5px;color:${R.muted};">${inl(deck)}</p>`:'')
        + `</section>`;
    },
    // Subhead: a red pilcrow, the capitulum mark rubricators painted at each new section
    sub(t){
      return `<h3 style="margin:30px 0 12px;font-family:${SERIF};font-size:17px;line-height:1.6;font-weight:700;letter-spacing:0.5px;color:${R.ink};"><span style="margin-right:6px;font-family:${LATIN};font-weight:400;color:${R.A};">¶</span>${inl(t)}</h3>`;
    },
    // Quote: the reader's manicule pointing at a passage between two gold hairlines
    quote(q,at){
      return `<section style="display:flex;align-items:flex-start;margin:30px 0 34px;padding:14px 0;border-top:1px solid ${R.rule};border-bottom:1px solid ${R.rule};">`
        + `<span style="flex-shrink:0;display:block;width:34px;font-family:${LATIN};font-size:22px;line-height:1.35;color:${R.A};">☞</span>`
        + `<section style="flex:1;min-width:0;">`
        + (q.length?`<p style="margin:0;font-family:${SERIF};font-size:17px;line-height:1.8;font-weight:700;letter-spacing:0.5px;color:${R.ink};">${q.map(inl).join('<br>')}</p>`:'')
        + at.map(a=>`<p style="margin:10px 0 0;font-family:${SERIF};font-size:12px;line-height:1.5;letter-spacing:1px;color:${R.muted};">${inl(a)}</p>`).join('')
        + `</section></section>`;
    },
    // Data: a ledger line on deeper vellum, double rule on top, red rules between the figures
    data(ls){
      let h='';
      for(let k=0;k<ls.length;k+=3){
        const row=ls.slice(k,k+3), n=row.length, fs=n===1?36:n===2?30:24, lastRow=k+3>=ls.length;
        h+=`<section style="display:flex;margin:${k?0:6}px 0 ${lastRow?26:10}px;background-color:${R.panel};border-top:3px double ${R.ink2};border-bottom:1px solid ${R.rule};">` + row.map((c,j)=>
          `<section style="flex:1;min-width:0;padding:12px;${j?`border-left:1px solid ${R.ledger};`:''}">`
          + (c[1]?`<p style="margin:0 0 4px;font-family:${SERIF};font-size:12px;line-height:1.5;letter-spacing:0.5px;color:${R.muted};">${inl(c[1])}</p>`:'')
          + `<p style="margin:0;font-family:${OLDNUM};font-size:${fs}px;line-height:1.2;font-weight:400;letter-spacing:0;color:${R.A};">${inl(c[0]||'')}</p>`
          + (c[2]?`<p style="margin:4px 0 0;font-family:${SERIF};font-size:11px;line-height:1.5;color:${R.faint};">${inl(c[2])}</p>`:'')
          + `</section>`).join('') + `</section>`;
      }
      return h;
    },
    // Table: ledger ruling, double rule on top, numeric columns split by red verticals
    table(head,body,idx,isNum,mb){
      const sep=j=>j>0&&isNum[j]?`border-left:1px solid ${R.ledger};`:'';
      const thead=head?`<tr>${idx.map(j=>`<th style="padding:8px;${sep(j)}border-bottom:1px solid ${R.ink2};font-family:${SERIF};font-size:12px;font-weight:700;letter-spacing:1px;line-height:1.5;color:${R.A};text-align:${isNum[j]?'right':'left'};vertical-align:bottom;">${inl(head[j]||'')}</th>`).join('')}</tr>`:'';
      const tbody=body.map((r,k)=>`<tr>${idx.map(j=>`<td style="padding:9px 8px;${sep(j)}border-bottom:1px solid ${k===body.length-1?R.ink2:R.hair};font-family:${isNum[j]?OLDNUM:SERIF};font-size:14px;line-height:1.55;font-weight:${j===0?700:400};color:${j===0?R.ink:R.body};text-align:${isNum[j]?'right':'left'};vertical-align:top;">${inl(r[j]||'')}</td>`).join('')}</tr>`).join('');
      return `<section style="margin:4px 0 ${mb}px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;border-top:3px double ${R.ink2};"><tbody>${thead}${tbody}</tbody></table></section>`;
    },
    image(alt,url,mb){
      if(/^https?:\/\//i.test(url)){
        return `<section style="margin:6px 0 ${mb}px;padding:4px;border:1px solid ${R.rule};background-color:${R.panel};"><img src="${esc(url)}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;"></section>`;
      }
      return `<section style="margin:6px 0 ${mb}px;padding:44px 16px;border:1px dashed ${R.rule};background-color:${R.panel};text-align:center;"><p style="margin:0;font-family:${SERIF};font-size:13px;line-height:1.6;color:${R.muted};">圖片位置${alt?'：'+esc(alt):''}</p><p style="margin:4px 0 0;font-family:${SERIF};font-size:11px;line-height:1.5;color:${R.faint};">貼到後台後，在這裡上傳圖片替換</p></section>`;
    },
    caption(t){
      return `<p style="margin:0 0 26px;font-family:${SERIF};font-size:12px;line-height:1.6;letter-spacing:0.3px;color:${R.muted};">${inl(t)}</p>`;
    },
    ul(a){return list(a,'lozenge',{fs:16,lh:1.9,color:R.body,mark:R.A,mb:8,last:22});},
    ol(a){return list(a,'ol',{fs:16,lh:1.9,color:R.body,mark:R.A,mb:8,last:22});},
    // Divider: a hedera leaf, the printer's ornament Aldus made common, between gold rules
    hr(){return flank(`<span style="flex-shrink:0;margin:0 10px;font-family:${LATIN};font-size:15px;line-height:1;color:${R.A};">❧</span>`,44,'12px 0 30px');},
    // End mark: FINIS in rubric over a gold fleuron
    end(){
      return `<section style="margin:46px 0 34px;text-align:center;">`
        + `<p style="margin:0;padding-left:6px;font-family:${LATIN};font-size:13px;line-height:1.5;letter-spacing:6px;color:${R.A};">FINIS</p>`
        + `<p style="margin:6px 0 0;font-family:${LATIN};font-size:18px;line-height:1;color:${R.gold};">❦</p>`
        + `</section>`;
    },
    // Key points: a ruled panel, title between gold rules, items numbered i. ii. iii.
    card(title,body){
      return `<section style="margin:0 0 36px;padding:16px 16px 10px;background-color:${R.panel};border:1px solid ${R.rule};">`
        + (title?flank(`<span style="min-width:0;margin:0 10px;padding-left:3px;font-family:${SERIF};font-size:14px;line-height:1.5;font-weight:700;letter-spacing:3px;text-align:center;color:${R.A};">${inl(title)}</span>`,20,'0 0 14px'):'')
        + boxBody(body,{fs:15,lh:1.75,color:R.ink,mark:R.A,mb:8,last:6},'roman')
        + `</section>`;
    },
    small(title,body){
      return `<section style="margin:40px 0 0;padding-top:12px;border-top:3px double ${R.rule};">`
        + (title?`<p style="margin:0 0 8px;font-family:${SERIF};font-size:12px;line-height:1.5;font-weight:700;letter-spacing:1px;color:${R.A};">${inl(title)}</p>`:'')
        + boxBody(body,{fs:12,lh:1.7,color:R.muted,mark:R.faint,mb:4,last:4},'dot') + `</section>`;
    },
    // Paragraph; the first after a title or chapter head floats an illuminated initial two lines
    // deep: the letter in gold on a pigment ground, inside a fine gold frame. Lines that open on
    // punctuation, a digit or markup keep their normal setting.
    para(t){
      const c=t.charAt(0), want=drop; drop=false;
      if(want && t.length>1 && /[㐀-鿿豈-﫿A-Za-z]/.test(c)){
        const g=(drops++%2)?R.B:R.A;
        return `<p style="${P}overflow:hidden;"><span style="float:left;display:block;margin:5px 10px 0 0;padding:3px;background-color:${g};">`
          + `<span style="display:block;width:48px;height:48px;box-sizing:border-box;border:1px solid ${rgba(R.leaf,.6)};text-indent:0;text-align:center;font-family:${SERIF};font-size:32px;line-height:46px;font-weight:700;letter-spacing:0;color:${R.leaf};">${esc(c)}</span></span>`
          + inl(t.slice(1)) + `</p>`;
      }
      return `<p style="${P}">${inl(t)}</p>`;
    },
    // Plate: vellum, a little darker toward the edges, with the text block ruled in red
    wrap(h){
      return `<section style="padding:8px;background-color:${R.paper};background-image:radial-gradient(ellipse at 50% 40%,${R.light} 0%,${R.paper} 60%,${R.edge} 100%);font-family:${SERIF};font-size:16px;color:${R.body};">`
        + `<section style="padding:24px 14px 18px;border:3px double ${R.ruling};">${h}</section></section>`;
    }
  };
  // Any other block between a heading and its first paragraph cancels the initial
  ['sub','quote','data','table','image','caption','ul','ol','hr','end','card','small'].forEach(k=>{
    const f=K[k]; K[k]=function(){drop=false;return f.apply(K,arguments);};
  });
  return K;
}

// ---------- skin 6: macaron ----------
// Sweet, soft and young, in the colours of a macaron box. The title opens on a rounded pastel
// card: sprinkles scattered across the top and a row of macarons on a white plate, each drawn as
// two domed shells with ruffled feet around a cream filling. Under it the column on a pastel pill,
// the date, a bold sans headline and a bar of three colour segments. The five flavours take turns:
// chapter pills, figure cards, list badges and dots step through pink, pistachio, lemon, lavender
// and blueberry, starting from the chosen palette's own flavour. Subheads and ==marks== get a
// highlighter stroke. Everything is boxes, borders and gradients, so it survives WeChat's filter.
function poemTheme(s){
  const p = POEM.find(x=>x.id===s.poem)||POEM[0];
  const c = MAC[p.start];
  const t = k => mix(p.ink,'#FFFFFF',k);
  return Object.assign({}, p, {
    A:c.fg, P:c.bg, tint:mix(c.bg,'#FFFFFF',.45), rule:mix(c.fg,'#FFFFFF',.84),
    body:t(.16), muted:t(.48), faint:t(.62),
    mac:k=>MAC[(p.start+k)%MAC.length]
  });
}
function poemSkin(s,date){
  const X = poemTheme(s);
  const P = `margin:0 0 22px;font-family:${SANS};font-size:16px;line-height:1.85;letter-spacing:0.5px;color:${X.body};text-align:justify;`;
  const HL = `background-image:linear-gradient(transparent 58%,${X.hl} 58%);`;
  const inl = x => esc(x)
    .replace(/\*\*(.+?)\*\*/g,`<strong style="font-weight:700;color:${X.ink};">$1</strong>`)
    .replace(/==(.+?)==/g,`<span style="${HL}padding:0 2px;">$1</span>`);
  const lst = makeList(inl);
  const blank = st => `<section style="${st}overflow:hidden;font-size:0;"><br></section>`;
  const pill = (txt,c,st) => `<span style="display:inline-block;padding:3px 12px;border-radius:999px;background-color:${c.bg};font-family:${SANS};font-size:12px;line-height:1.6;font-weight:700;letter-spacing:1px;color:${c.fg};${st||''}">${txt}</span>`;

  // One macaron: domed shell, ruffled foot, cream filling, foot, shell
  function macaron(w,c,st){
    const h1=Math.round(w*.34), h2=Math.round(w*.27), f=Math.max(4,Math.round(w*.13));
    return `<section style="flex-shrink:0;width:${w}px;${st||''}">`
      + blank(`height:${h1}px;border-radius:50% 50% 44% 44% / 82% 82% 18% 18%;background-color:${c.shell};background-image:linear-gradient(${mix(c.shell,'#FFFFFF',.4)} 0%,${c.shell} 72%);line-height:${h1}px;`)
      + blank(`height:3px;margin:0 2px;border-radius:2px;background-color:${c.foot};line-height:3px;`)
      + blank(`height:${f}px;margin:0 4px;border-radius:3px;background-color:#FFF8EC;line-height:${f}px;`)
      + blank(`height:3px;margin:0 2px;border-radius:2px;background-color:${c.foot};line-height:3px;`)
      + blank(`height:${h2}px;border-radius:44% 44% 50% 50% / 18% 18% 82% 82%;background-color:${c.shell};background-image:linear-gradient(${c.shell} 30%,${c.foot} 100%);line-height:${h2}px;`)
      + `</section>`;
  }
  // A sprinkle: a tiny rounded stick at an angle
  const sprinkle = (c,deg,mt) => blank(`flex-shrink:0;width:11px;height:4px;margin-top:${mt}px;border-radius:2px;background-color:${c};transform:rotate(${deg}deg);line-height:4px;`);
  function scene(){
    const m = X.mac;
    return `<section style="padding:18px 0 14px;border-radius:18px;background-color:${X.tint};background-image:linear-gradient(160deg,${X.P} 0%,${X.tint} 60%,#FFFFFF 100%);overflow:hidden;">`
        + `<section style="display:flex;justify-content:space-between;padding:0 9%;">`
          + sprinkle(m(1).foot,30,0) + sprinkle(m(2).foot,-40,10) + sprinkle(m(3).foot,70,2) + sprinkle(m(4).foot,-20,12) + sprinkle(m(0).foot,45,0)
        + `</section>`
        + `<section style="display:flex;justify-content:space-between;margin-top:10px;padding:0 17%;">`
          + sprinkle(m(3).foot,-60,4) + sprinkle(m(0).foot,15,0) + sprinkle(m(2).foot,-30,6) + sprinkle(m(1).foot,60,0)
        + `</section>`
        + `<section style="display:flex;justify-content:center;align-items:flex-end;margin-top:14px;">`
          + macaron(50,m(1)) + macaron(62,m(0),'margin-left:10px;') + macaron(46,m(2),'margin-left:10px;transform:rotate(-10deg);') + macaron(54,m(3),'margin-left:10px;')
        + `</section>`
        + blank(`height:6px;margin:6px 10% 0;border-radius:6px;background-color:#FFFFFF;line-height:6px;`)
      + `</section>`;
  }

  function list(items,kind,o){
    const W = kind==='num' ? 30 : 18;
    return lst(items,Object.assign({W,ff:SANS,marker:k=>{
      const c=X.mac(k);
      return kind==='num'
        ? `<span style="display:inline-block;width:${W}px;text-indent:0;"><span style="display:inline-block;width:20px;height:20px;border-radius:6px;background-color:${o.white?'#FFFFFF':c.bg};font-family:${NUM};font-size:12px;line-height:20px;font-weight:700;text-align:center;vertical-align:1px;color:${c.fg};">${k+1}</span></span>`
        : `<span style="display:inline-block;width:${W}px;text-indent:0;font-size:9px;line-height:1;vertical-align:3px;color:${o.mono||c.foot};">●</span>`;
    }},o));
  }
  function boxBody(lines,o,bullet){
    const html=[]; let k=0;
    while(k<lines.length){
      const t=lines[k];
      if(/^[-*•]\s+/.test(t)){const a=[];while(k<lines.length&&/^[-*•]\s+/.test(lines[k])){a.push(lines[k].replace(/^[-*•]\s+/,''));k++;}html.push(list(a,bullet,o));continue;}
      if(/^\d+(\.\s+|、)/.test(t)){const a=[];while(k<lines.length&&/^\d+(\.\s+|、)/.test(lines[k])){a.push(lines[k].replace(/^\d+(\.\s+|、)/,''));k++;}html.push(list(a,'num',o));continue;}
      html.push(`<p style="margin:0 0 ${o.mb}px;font-family:${SANS};font-size:${o.fs}px;line-height:${o.lh};letter-spacing:0.5px;color:${o.color};">${inl(t)}</p>`);k++;
    }
    return html.join('');
  }
  const dots = (sz,gap,n) => Array.from({length:n},(_,k)=>blank(`flex-shrink:0;width:${sz}px;height:${sz}px;${k?`margin-left:${gap}px;`:''}border-radius:50%;background-color:${X.mac(k).foot};line-height:${sz}px;`)).join('');

  return {
    // Title: the macaron card, the column on a pastel pill with the date, a bold headline, a three-colour bar
    title(h){
      const meta = (s.column||date) ? `<section style="display:flex;align-items:center;margin:18px 0 0;">`
        + (s.column?pill(esc(s.column),X.mac(0)):'')
        + (date?`<span style="margin-left:${s.column?10:0}px;font-family:${NUM};font-size:13px;line-height:1.6;letter-spacing:1px;color:${X.muted};">${esc(date)}</span>`:'')
        + `</section>` : '';
      return `<section style="margin:0 0 40px;">`
        + scene() + meta
        + `<h1 style="margin:14px 0 0;font-family:${SANS};font-size:25px;line-height:1.45;font-weight:700;letter-spacing:1px;color:${X.ink};">${inl(h)}</h1>`
        + `<section style="display:flex;margin:18px 0 0;">` + [0,1,2].map(k=>blank(`flex-shrink:0;width:18px;height:5px;${k?'margin-left:4px;':''}border-radius:5px;background-color:${X.mac(k).foot};line-height:5px;`)).join('') + `</section>`
        + `</section>`;
    },
    // Chapter: the number on a pill in the next flavour, a small English label, then a bold title
    chapter(n,zh,en,deck,first){
      const c=X.mac(n-1);
      return `<section style="margin:${first?0:52}px 0 20px;">`
        + `<section style="display:flex;align-items:center;">`
          + pill(String(n).padStart(2,'0'),c,`font-family:${NUM};font-size:14px;letter-spacing:2px;`)
          + (en?`<span style="margin-left:10px;font-family:${NUM};font-size:11px;line-height:1.5;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${c.fg};">${esc(en)}</span>`:'')
        + `</section>`
        + `<h2 style="margin:12px 0 0;font-family:${SANS};font-size:21px;line-height:1.5;font-weight:700;letter-spacing:0.5px;color:${X.ink};">${inl(zh)}</h2>`
        + (deck?`<p style="margin:6px 0 0;font-family:${SANS};font-size:14.5px;line-height:1.7;letter-spacing:0.5px;color:${X.muted};">${inl(deck)}</p>`:'')
        + `</section>`;
    },
    // Subhead: bold, with a highlighter stroke under the words
    sub(t){
      return `<h3 style="margin:32px 0 12px;font-family:${SANS};font-size:17.5px;line-height:1.6;font-weight:700;letter-spacing:0.5px;color:${X.ink};"><span style="${HL}padding:0 2px;">${inl(t)}</span></h3>`;
    },
    // Quote: a soft rounded card with a big quotation mark in the accent
    quote(q,at){
      return `<section style="margin:36px 0 40px;padding:18px 20px 20px;border-radius:18px;background-color:${X.tint};">`
        + `<p style="margin:0;font-family:${NUM};font-size:44px;line-height:0.9;font-weight:700;color:${X.A};">“</p>`
        + (q.length?`<p style="margin:2px 0 0;font-family:${SANS};font-size:17.5px;line-height:1.75;font-weight:700;letter-spacing:0.5px;color:${X.ink};">${q.map(inl).join('<br>')}</p>`:'')
        + at.map(a=>`<p style="margin:12px 0 0;font-family:${SANS};font-size:12.5px;line-height:1.5;text-align:right;color:${X.muted};">${inl(a)}</p>`).join('')
        + `</section>`;
    },
    // Data: each figure on a card of its own flavour
    data(ls){
      let h='';
      for(let k=0;k<ls.length;k+=3){
        const row=ls.slice(k,k+3), n=row.length, fs=n===1?36:n===2?30:21, lastRow=k+3>=ls.length;
        h+=`<section style="display:flex;margin:${k?0:6}px 0 ${lastRow?28:8}px;">` + row.map((c,j)=>{
          const m=X.mac(k+j);
          return `<section style="flex:1;min-width:0;${j?'margin-left:8px;':''}padding:14px 12px 12px;border-radius:14px;background-color:${m.bg};">`
          + (c[1]?`<p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.5;color:${X.muted};">${inl(c[1])}</p>`:'')
          + `<p style="margin:6px 0 0;font-family:${NUM};font-size:${fs}px;line-height:1.15;font-weight:700;color:${m.fg};">${inl(c[0]||'')}</p>`
          + (c[2]?`<p style="margin:6px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${X.faint};">${inl(c[2])}</p>`:'')
          + `</section>`;}).join('') + `</section>`;
      }
      return h;
    },
    // Table: a rounded card, the header row in the palette flavour, rows divided by soft lines
    table(head,body,idx,isNum,mb){
      const al=j=>isNum[j]?'right':'left';
      const thead=head?`<tr>${idx.map(j=>`<th style="padding:10px 12px;background-color:${X.P};font-family:${SANS};font-size:12.5px;font-weight:700;line-height:1.5;color:${X.A};text-align:${al(j)};vertical-align:bottom;">${inl(head[j]||'')}</th>`).join('')}</tr>`:'';
      const tbody=body.map((r,k)=>`<tr>${idx.map(j=>`<td style="padding:10px 12px;${k<body.length-1?`border-bottom:1px solid ${X.rule};`:''}font-family:${isNum[j]?NUM:SANS};font-size:14px;line-height:1.6;font-weight:${j===0?700:400};color:${j===0?X.ink:X.body};text-align:${al(j)};vertical-align:top;">${inl(r[j]||'')}</td>`).join('')}</tr>`).join('');
      return `<section style="margin:8px 0 ${mb}px;overflow-x:auto;border-radius:14px;border:1px solid ${X.rule};"><table style="width:100%;border-collapse:collapse;"><tbody>${thead}${tbody}</tbody></table></section>`;
    },
    // Image: rounded corners
    image(alt,url,mb){
      if(/^https?:\/\//i.test(url)){
        return `<section style="margin:8px 0 ${mb}px;border-radius:14px;overflow:hidden;"><img src="${esc(url)}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;"></section>`;
      }
      return `<section style="margin:8px 0 ${mb}px;padding:40px 12px;border-radius:14px;border:2px dashed ${X.rule};background-color:${X.tint};text-align:center;"><p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${X.muted};">圖片位置${alt?'：'+esc(alt):''}</p><p style="margin:4px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${X.faint};">貼到後台後，在這裡上傳圖片替換</p></section>`;
    },
    caption(t){
      return `<p style="margin:0 0 26px;font-family:${SANS};font-size:12px;line-height:1.6;color:${X.muted};"><span style="margin-right:6px;font-size:8px;vertical-align:2px;color:${X.mac(0).foot};">●</span>${inl(t)}</p>`;
    },
    ul(a){return list(a,'dot',{fs:16,lh:1.85,color:X.body,mb:8,last:22});},
    ol(a){return list(a,'num',{fs:16,lh:1.85,color:X.body,mb:8,last:22});},
    // Divider: five dots, one per flavour
    hr(){return `<section style="display:flex;justify-content:center;align-items:center;margin:16px 0 36px;">${dots(7,9,5)}</section>`;},
    // End mark: a small macaron and a pill reading 完
    end(){
      return `<section style="display:flex;justify-content:center;align-items:center;margin:48px 0 36px;">`
        + macaron(30,X.mac(0)) + `<section style="flex-shrink:0;margin-left:12px;">${pill('完',X.mac(0),'padding:3px 16px;font-size:13px;letter-spacing:0;')}</section>`
        + `</section>`;
    },
    // Key points: a rounded tinted card, the title on a white pill, items on white number badges
    card(title,body){
      return `<section style="margin:0 0 36px;padding:16px 16px 12px;border-radius:18px;background-color:${X.tint};">`
        + (title?`<p style="margin:0 0 12px;line-height:1.5;">${pill(inl(title),{bg:'#FFFFFF',fg:X.A})}</p>`:'')
        + boxBody(body,{fs:15,lh:1.8,color:X.ink,white:true,mb:8,last:4},'num')
        + `</section>`;
    },
    small(title,body){
      return `<section style="margin:40px 0 0;padding:14px 16px 12px;border-radius:14px;background-color:#F7F7F9;">`
        + (title?`<p style="margin:0 0 6px;font-family:${SANS};font-size:12.5px;line-height:1.5;font-weight:700;color:${X.muted};">${inl(title)}</p>`:'')
        + boxBody(body,{fs:12,lh:1.7,color:X.muted,mono:X.faint,mb:4,last:2},'dot') + `</section>`;
    },
    para(t){return `<p style="${P}">${inl(t)}</p>`;},
    wrap(h){
      return `<section style="padding:22px 16px 28px;background-color:${X.paper};font-family:${SANS};font-size:16px;color:${X.body};">${h}</section>`;
    }
  };
}

// ---------- skin 7: tech future ----------
// An engineering readout from the near future, set on a plate with a fine dot grid. The title
// sits inside a heads-up-display frame of four corner brackets, with status lights and a signal
// meter. Chapters are numbered in hex (0x01, 0x02) on a small IC package with pins above and
// below and a pin-1 dot, wired by a trace to a via. Figures read like a dashboard, captions are
// written as code comments, and the end mark is EOF with a block cursor. Everything is boxes,
// borders and gradients, so it survives WeChat's filter.
const MONO = "Menlo,'SF Mono',Consolas,'Roboto Mono','Courier New',monospace";
function techTheme(s){
  const p = TECH.find(x=>x.id===s.tech)||TECH[0];
  return Object.assign({}, p, {
    faint:mix(p.muted,p.bg,.25), mark:rgba(p.A,.2), trace:mix(p.A,p.bg,.45),
    head:s.head==='serif'?SERIF:SANS
  });
}
function techSkin(s,date){
  const X = techTheme(s);
  const P = `margin:0 0 22px;font-family:${SANS};font-size:16px;line-height:1.85;letter-spacing:0.5px;color:${X.text};text-align:justify;`;
  const inl = x => esc(x)
    .replace(/\*\*(.+?)\*\*/g,`<strong style="font-weight:700;color:${X.ink};">$1</strong>`)
    .replace(/==(.+?)==/g,`<span style="background-color:${X.mark};color:${X.ink};padding:0 2px;">$1</span>`);
  const lst = makeList(inl);
  const blank = st => `<section style="${st}overflow:hidden;font-size:0;"><br></section>`;
  const led = (c,m) => blank(`flex-shrink:0;width:6px;height:6px;margin:${m||0};border-radius:50%;background-color:${c};line-height:6px;`);
  // A corner bracket; sides is e.g. 'top left'
  const corner = sides => blank(`flex-shrink:0;width:14px;height:14px;box-sizing:border-box;${sides.split(' ').map(d=>`border-${d}:2px solid ${X.A};`).join('')}line-height:14px;`);
  const cornerRow = (l,r) => `<section style="display:flex;justify-content:space-between;">${l?corner(l):''}${r?corner(r):''}</section>`;
  const hex = n => '0x'+n.toString(16).toUpperCase().padStart(2,'0');
  // An IC package: four pins on top and bottom, a dark body with a pin-1 dot and the label
  function chip(label){
    const pins = `<section style="display:flex;justify-content:space-around;padding:0 6px;">${[0,1,2,3].map(()=>blank(`width:3px;height:4px;background-color:${X.pin};line-height:4px;`)).join('')}</section>`;
    return `<section style="flex-shrink:0;width:60px;">${pins}`
      + `<section style="display:flex;align-items:center;justify-content:center;padding:4px 0;border-radius:2px;background-color:${X.chip};">`
      +   blank(`flex-shrink:0;width:3px;height:3px;margin-right:5px;border-radius:50%;background-color:${rgba(X.chipText,.5)};line-height:3px;`)
      +   `<span style="font-family:${MONO};font-size:12px;line-height:16px;font-weight:700;letter-spacing:1px;color:${X.chipText};">${label}</span>`
      + `</section>${pins}</section>`;
  }

  function list(items,kind,o){
    const W={sq:18,dot:12,ol:30,num2:30}[kind];
    return lst(items,Object.assign({W,marker:k=>{
      if(kind==='sq') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-size:9px;line-height:1;vertical-align:3px;color:${o.mark};">■</span>`;
      if(kind==='dot') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-weight:700;color:${o.mark};">·</span>`;
      return `<span style="display:inline-block;width:${W}px;text-indent:0;font-family:${MONO};font-size:13px;font-weight:700;color:${o.mark};">${String(k+1).padStart(2,'0')}</span>`;
    }},o));
  }
  function boxBody(lines,o,bullet){
    const html=[]; let k=0;
    while(k<lines.length){
      const t=lines[k];
      if(/^[-*•]\s+/.test(t)){const a=[];while(k<lines.length&&/^[-*•]\s+/.test(lines[k])){a.push(lines[k].replace(/^[-*•]\s+/,''));k++;}html.push(list(a,bullet,o));continue;}
      if(/^\d+(\.\s+|、)/.test(t)){const a=[];while(k<lines.length&&/^\d+(\.\s+|、)/.test(lines[k])){a.push(lines[k].replace(/^\d+(\.\s+|、)/,''));k++;}html.push(list(a,'ol',o));continue;}
      html.push(`<p style="margin:0 0 ${o.mb}px;font-family:${SANS};font-size:${o.fs}px;line-height:${o.lh};letter-spacing:0.5px;color:${o.color};">${inl(t)}</p>`);k++;
    }
    return html.join('');
  }

  return {
    // Title: HUD corners, a status line (light, column, date), the headline, a signal meter
    title(h){
      const N=28, lit=20;
      const meter = `<section style="display:flex;margin:18px 0 0;">`
        + Array.from({length:N},(_,k)=>blank(`flex:1;min-width:0;height:6px;${k<N-1?'margin-right:2px;':''}background-color:${k<lit?mix(X.A2,X.A,k/(lit-1)):X.line};line-height:6px;`)).join('')
        + `</section>`;
      const meta = (s.column||date)
        ? `<section style="display:flex;justify-content:space-between;align-items:center;margin:0 0 14px;">`
          + `<section style="display:flex;align-items:center;min-width:0;">${led(X.A2,'0 8px 0 0')}<span style="font-family:${SANS};font-size:12px;line-height:1.5;font-weight:700;letter-spacing:2px;color:${X.ink};">${esc(s.column||'')}</span></section>`
          + `<span style="flex-shrink:0;margin-left:10px;font-family:${MONO};font-size:12px;line-height:1.5;letter-spacing:1px;color:${X.muted};">${esc(date||'')}</span></section>`
        : '';
      return `<section style="margin:0 0 38px;">`
        + cornerRow('top left','top right')
        + `<section style="padding:2px 14px 4px;">${meta}`
        + `<h1 style="margin:0;font-family:${X.head};font-size:26px;line-height:1.42;font-weight:700;letter-spacing:0.5px;color:${X.ink};">${inl(h)}</h1>`
        + meter + `</section>`
        + cornerRow('bottom left','bottom right')
        + `</section>`;
    },
    // Chapter: hex number on a chip, a trace running to a via, the title below
    chapter(n,zh,en,deck,first){
      return `<section style="margin:${first?0:54}px 0 22px;">`
        + `<section style="display:flex;align-items:center;margin:0 0 14px;">`
        +   chip(hex(n))
        +   blank(`flex:1;min-width:0;height:1px;margin:0 0 0 -1px;background-color:${X.trace};line-height:1px;`)
        +   blank(`flex-shrink:0;width:9px;height:9px;box-sizing:border-box;border:2px solid ${X.A};border-radius:50%;line-height:5px;`)
        + `</section>`
        + `<h2 style="margin:0;font-family:${X.head};font-size:22px;line-height:1.45;font-weight:700;letter-spacing:0.5px;color:${X.ink};">${inl(zh)}</h2>`
        + (en?`<p style="margin:5px 0 0;font-family:${MONO};font-size:11px;line-height:1.5;letter-spacing:2px;color:${X.muted};">${esc(en.toUpperCase())}</p>`:'')
        + (deck?`<p style="margin:8px 0 0;font-family:${SANS};font-size:14.5px;line-height:1.65;letter-spacing:0.5px;color:${X.muted};">${inl(deck)}</p>`:'')
        + `</section>`;
    },
    sub(t){
      return `<h3 style="margin:30px 0 12px;font-family:${X.head};font-size:17px;line-height:1.5;font-weight:700;letter-spacing:0.5px;color:${X.ink};"><span style="margin-right:8px;font-family:${MONO};font-weight:700;color:${X.A};">&gt;</span>${inl(t)}</h3>`;
    },
    // Quote: locked on between two corner brackets
    quote(q,at){
      return `<section style="margin:30px 0 34px;">`
        + cornerRow('top left','')
        + `<section style="padding:6px 18px;">`
        + (q.length?`<p style="margin:0;font-family:${X.head};font-size:18px;line-height:1.7;font-weight:700;letter-spacing:0.5px;color:${X.ink};">${q.map(inl).join('<br>')}</p>`:'')
        + at.map(a=>`<p style="margin:10px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:0.5px;color:${X.muted};">${inl(a)}</p>`).join('')
        + `</section>`
        + `<section style="display:flex;justify-content:flex-end;">${corner('bottom right')}</section>`
        + `</section>`;
    },
    // Data: a dashboard readout; each cell has a status light, a label and the figure
    data(ls){
      let h='';
      for(let k=0;k<ls.length;k+=3){
        const row=ls.slice(k,k+3), n=row.length, fs=n===1?36:n===2?30:24, lastRow=k+3>=ls.length;
        h+=`<section style="display:flex;margin:${k?0:6}px 0 ${lastRow?26:10}px;background-color:${X.panel};border:1px solid ${X.line};border-top:2px solid ${X.A};">` + row.map((c,j)=>
          `<section style="flex:1;min-width:0;padding:12px;${j?`border-left:1px solid ${X.line};`:''}">`
          + `<section style="display:flex;align-items:center;margin:0 0 6px;">${led(X.A2,'0 6px 0 0')}<span style="min-width:0;font-family:${SANS};font-size:12px;line-height:1.4;letter-spacing:0.5px;color:${X.muted};">${inl(c[1]||'')}</span></section>`
          + `<p style="margin:0;font-family:${NUM};font-size:${fs}px;line-height:1.15;font-weight:700;letter-spacing:0;color:${X.A};">${inl(c[0]||'')}</p>`
          + (c[2]?`<p style="margin:6px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${X.faint};">${inl(c[2])}</p>`:'')
          + `</section>`).join('') + `</section>`;
      }
      return h;
    },
    // Table: inverted header bar, hairline rows, figures right-aligned
    table(head,body,idx,isNum,mb){
      const thead=head?`<tr>${idx.map(j=>`<th style="padding:8px;background-color:${X.ink};font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:1px;line-height:1.5;color:${X.bg};text-align:${isNum[j]?'right':'left'};vertical-align:bottom;">${inl(head[j]||'')}</th>`).join('')}</tr>`:'';
      const tbody=body.map((r,k)=>`<tr>${idx.map(j=>`<td style="padding:9px 8px;border-bottom:1px solid ${k===body.length-1?X.A:X.line};font-family:${isNum[j]?NUM:SANS};font-size:13.5px;line-height:1.55;font-weight:${j===0?700:400};color:${j===0?X.ink:X.text};text-align:${isNum[j]?'right':'left'};vertical-align:top;">${inl(r[j]||'')}</td>`).join('')}</tr>`).join('');
      return `<section style="margin:4px 0 ${mb}px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;${head?'':`border-top:2px solid ${X.A};`}"><tbody>${thead}${tbody}</tbody></table></section>`;
    },
    // Image: framed by the HUD corners
    image(alt,url,mb){
      const inner = /^https?:\/\//i.test(url)
        ? `<img src="${esc(url)}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;">`
        : `<section style="padding:44px 16px;border:1px dashed ${X.line};background-color:${X.panel};text-align:center;"><p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${X.muted};">圖片位置${alt?'：'+esc(alt):''}</p><p style="margin:4px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${X.faint};">貼到後台後，在這裡上傳圖片替換</p></section>`;
      return `<section style="margin:6px 0 ${mb}px;">${cornerRow('top left','top right')}<section style="padding:0 6px;">${inner}</section>${cornerRow('bottom left','bottom right')}</section>`;
    },
    // Caption: written as a code comment
    caption(t){
      return `<p style="margin:0 0 26px;font-family:${SANS};font-size:12px;line-height:1.6;letter-spacing:0.3px;color:${X.muted};"><span style="margin-right:6px;font-family:${MONO};color:${X.A};">//</span>${inl(t)}</p>`;
    },
    ul(a){return list(a,'sq',{fs:16,lh:1.85,color:X.text,mark:X.A,mb:8,last:22});},
    ol(a){return list(a,'ol',{fs:16,lh:1.85,color:X.text,mark:X.A,mb:8,last:22});},
    // Divider: a dashed line
    hr(){return blank(`height:1px;margin:10px 0 30px;background-color:${X.line};background-image:repeating-linear-gradient(to right,${X.muted} 0 6px,${X.bg} 6px 12px);line-height:1px;`);},
    // End mark: EOF and a block cursor
    end(){
      return `<p style="margin:46px 0 34px;text-align:center;font-family:${MONO};font-size:12px;line-height:1.5;letter-spacing:3px;color:${X.muted};">EOF<span style="margin-left:4px;font-size:15px;letter-spacing:0;color:${X.A};">▮</span></p>`;
    },
    // Key points: a spec panel with an inverted header bar and three status lights
    card(title,body){
      return `<section style="margin:0 0 34px;border:1px solid ${X.line};background-color:${X.panel};">`
        + (title?`<section style="display:flex;justify-content:space-between;align-items:center;padding:7px 12px;background-color:${X.ink};">`
          + `<span style="min-width:0;font-family:${SANS};font-size:13px;line-height:1.5;font-weight:700;letter-spacing:2px;color:${X.bg};">${inl(title)}</span>`
          + `<section style="display:flex;flex-shrink:0;margin-left:10px;">${led(X.A2,'0 0 0 5px')}${led(X.A,'0 0 0 5px')}${led(X.muted,'0 0 0 5px')}</section></section>`:'')
        + `<section style="padding:14px 14px 8px;">` + boxBody(body,{fs:14.5,lh:1.7,color:X.ink,mark:X.A,mb:8,last:6},'num2') + `</section>`
        + `</section>`;
    },
    small(title,body){
      return `<section style="margin:40px 0 0;">`
        + blank(`height:1px;margin:0 0 12px;background-color:${X.line};background-image:repeating-linear-gradient(to right,${X.muted} 0 3px,${X.bg} 3px 7px);line-height:1px;`)
        + (title?`<p style="margin:0 0 8px;font-family:${SANS};font-size:12px;line-height:1.5;font-weight:700;letter-spacing:1px;color:${X.muted};">${inl(title)}</p>`:'')
        + boxBody(body,{fs:12,lh:1.7,color:X.muted,mark:X.faint,mb:4,last:4},'dot') + `</section>`;
    },
    para(t){return `<p style="${P}">${inl(t)}</p>`;},
    // Plate: the palette ground with a dot grid
    wrap(h){
      return `<section style="padding:26px 16px 30px;background-color:${X.bg};background-image:radial-gradient(${X.dot} 1px,transparent 1.4px);background-size:16px 16px;font-family:${SANS};font-size:16px;color:${X.text};">${h}</section>`;
    }
  };
}

// ---------- skin 8: memphis ----------
// After the Memphis Group (Milan, 1981): laminate-pattern squiggles, a confetti of circles,
// triangles and squares, black outlines and flat hard shadows, brights set against pastels.
// The title is a pastel board with a dot grid, a confetti row, a highlighter headline and a
// sawtooth hem. Chapters open on an outlined number disc that steps through the four colours,
// with a squiggle under the title. Figures sit on colour tiles with hard black shadows.
// Squiggles are half-ring boxes in a flex row and triangles are CSS border triangles, so
// nothing needs images, SVG or positioning, which WeChat strips.
const MEMPHIS = [
  {id:'classic', name:'經典', C:['#FF5FA2','#FFD23F','#1FC3B0','#3D5AFE']},
  {id:'candy',   name:'糖果', C:['#B79CFF','#FFE07A','#7EE0C3','#FF9F80']},
  {id:'primary', name:'原色', C:['#F2433A','#FFC93C','#2B59C3','#19A974']}
];
function lumi(h){const c=hx(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function memphisTheme(s){
  const p = MEMPHIS.find(x=>x.id===s.memphis)||MEMPHIS[0];
  const K = '#1A1A1A';
  // Step a colour toward white or black until it passes the test, so black text and the
  // small marks stay readable whatever the palette
  const toward = (c,to,ok) => {let t=0,x=c;while(!ok(x)&&t<1){t=Math.min(1,t+.05);x=mix(c,to,t);}return x;};
  const on = c => (lumi(c)+.05)/(lumi(K)+.05) >= 1.05/(lumi(c)+.05) ? K : '#FFFFFF';
  return Object.assign({}, p, {K, on,
    tile: p.C.map(c=>toward(c,'#FFFFFF',x=>lumi(x)>=.42)),
    deco: p.C.map(c=>toward(c,K,x=>lumi(x)<=.32)),
    pale: p.C.map(c=>mix(c,'#FFFFFF',.86)),
    mark: toward(p.C[1],'#FFFFFF',x=>lumi(x)>=.6)
  });
}
function memphisSkin(s,date){
  const X = memphisTheme(s), K = X.K, C = X.C;
  const BODY = '#2B2B2B', MUTED = '#666666';
  const P = `margin:0 0 20px;font-family:${SANS};font-size:16px;line-height:1.85;letter-spacing:0.5px;color:${BODY};text-align:justify;`;
  const inl = x => esc(x)
    .replace(/\*\*(.+?)\*\*/g,`<strong style="font-weight:700;color:${K};">$1</strong>`)
    .replace(/==(.+?)==/g,`<span style="background-color:${X.mark};padding:0 2px;">$1</span>`);
  const lst = makeList(inl);
  const blank = st => `<section style="${st}overflow:hidden;font-size:0;"><br></section>`;
  // Confetti; st carries margins
  const circ = (d,c,st) => blank(`flex-shrink:0;width:${d}px;height:${d}px;box-sizing:border-box;border:2px solid ${K};border-radius:50%;background-color:${c};line-height:${d}px;${st||''}`);
  const ring = (d,c,st) => blank(`flex-shrink:0;width:${d}px;height:${d}px;box-sizing:border-box;border:3px solid ${c};border-radius:50%;line-height:${d}px;${st||''}`);
  const tri = (w,h,c,st) => blank(`flex-shrink:0;width:0;height:0;border-left:${w/2}px solid transparent;border-right:${w/2}px solid transparent;border-bottom:${h}px solid ${c};line-height:0;${st||''}`);
  const sq = (d,c,deg,st) => blank(`flex-shrink:0;width:${d}px;height:${d}px;box-sizing:border-box;border:2px solid ${K};background-color:${c};transform:rotate(${deg}deg);line-height:${d}px;${st||''}`);
  const cross = (fs,c,st) => `<span style="flex-shrink:0;display:block;font-family:${SANS};font-size:${fs}px;line-height:1;font-weight:700;color:${c};${st||''}">✕</span>`;
  // Squiggle: half rings alternating up and down, overlapping by one stroke so the ends join
  function wave(n,c,st){
    const w=16, h=8, bw=3; let a='';
    for(let k=0;k<n;k++){
      a+=blank(`flex-shrink:0;width:${w}px;height:${h}px;box-sizing:border-box;border:${bw}px solid ${c};`
        + (k%2===0?`border-bottom:0;border-radius:${h}px ${h}px 0 0;`:`border-top:0;border-radius:0 0 ${h}px ${h}px;margin-top:${h}px;`)
        + (k?`margin-left:-${bw}px;`:'') + `line-height:${h}px;`);
    }
    return `<section style="display:flex;align-items:flex-start;height:${w}px;overflow:hidden;${st||''}">${a}</section>`;
  }
  // Sawtooth hem: a row of triangles, clipped at the column edge
  const zig = (n,c,st) => `<section style="display:flex;overflow:hidden;${st||''}">${Array.from({length:n},()=>tri(14,9,c)).join('')}</section>`;

  const GL = ['●','▲','■'];
  function list(items,kind,o){
    const W = kind==='num' ? 30 : kind==='dot' ? 14 : 20;
    return lst(items,Object.assign({W,marker:k=>{
      if(kind==='num') return `<span style="display:inline-block;width:${W}px;text-indent:0;"><span style="display:inline-block;width:21px;height:21px;box-sizing:border-box;border:1.5px solid ${K};border-radius:50%;background-color:${X.tile[(k+1)%4]};font-family:${FUT};font-size:11px;line-height:18px;font-weight:700;text-align:center;text-indent:0;vertical-align:1px;color:${K};">${k+1}</span></span>`;
      if(kind==='dot') return `<span style="display:inline-block;width:${W}px;text-indent:0;font-weight:700;color:${o.mark};">·</span>`;
      return `<span style="display:inline-block;width:${W}px;text-indent:0;font-size:10px;line-height:1;vertical-align:2px;color:${X.deco[[0,2,3][k%3]]};">${GL[k%3]}</span>`;
    }},o));
  }
  function boxBody(lines,o,bullet){
    const html=[]; let k=0;
    while(k<lines.length){
      const t=lines[k];
      if(/^[-*•]\s+/.test(t)){const a=[];while(k<lines.length&&/^[-*•]\s+/.test(lines[k])){a.push(lines[k].replace(/^[-*•]\s+/,''));k++;}html.push(list(a,bullet,o));continue;}
      if(/^\d+(\.\s+|、)/.test(t)){const a=[];while(k<lines.length&&/^\d+(\.\s+|、)/.test(lines[k])){a.push(lines[k].replace(/^\d+(\.\s+|、)/,''));k++;}html.push(list(a,'num',o));continue;}
      html.push(`<p style="margin:0 0 ${o.mb}px;font-family:${SANS};font-size:${o.fs}px;line-height:${o.lh};letter-spacing:0.5px;color:${o.color};">${inl(t)}</p>`);k++;
    }
    return html.join('');
  }

  return {
    // Title: dotted pastel board with a hard shadow; confetti row, column and date chips,
    // the headline on a highlighter band; a sawtooth hem underneath
    title(h){
      const meta=(s.column||date)
        ? `<section style="display:flex;flex-wrap:wrap;align-items:center;margin:0 0 12px;">`
          + (s.column?`<span style="display:inline-block;margin-right:8px;padding:2px 11px;border:2px solid ${K};border-radius:999px;background-color:${K};font-family:${SANS};font-size:12px;line-height:1.5;font-weight:700;letter-spacing:1px;color:#FFFFFF;">${esc(s.column)}</span>`:'')
          + (date?`<span style="display:inline-block;padding:2px 10px;border:2px solid ${K};border-radius:999px;background-color:#FFFFFF;font-family:${FUT};font-size:12px;line-height:1.5;font-weight:700;letter-spacing:0.5px;color:${K};">${esc(date)}</span>`:'')
          + `</section>`
        : '';
      return `<section style="margin:0 6px 36px 0;">`
        + `<section style="padding:16px 16px 20px;border:2.5px solid ${K};background-color:${X.pale[0]};background-image:radial-gradient(${rgba(K,.16)} 1.2px,transparent 1.6px);background-size:12px 12px;box-shadow:6px 6px 0 ${C[2]};">`
        +   `<section style="display:flex;justify-content:space-between;align-items:center;margin:0 0 16px;">`
        +     circ(18,C[1]) + wave(7,X.deco[3]) + tri(18,16,C[2]) + sq(13,C[3],20) + cross(15,K)
        +   `</section>`
        +   meta
        +   `<h1 style="margin:0;font-family:${SANS};font-size:26px;line-height:1.55;font-weight:900;letter-spacing:0.5px;color:${K};"><span style="padding:0 4px;background-color:${X.mark};-webkit-box-decoration-break:clone;box-decoration-break:clone;">${inl(h)}</span></h1>`
        + `</section>`
        + zig(60,C[0],'margin:16px 0 0;')
        + `</section>`;
    },
    // Chapter: outlined number disc in the next colour, English on a pill, title, a squiggle
    chapter(n,zh,en,deck,first){
      const c=C[(n-1)%4];
      return `<section style="margin:${first?0:52}px 0 22px;">`
        + `<section style="display:flex;align-items:center;">`
        +   `<section style="flex-shrink:0;width:46px;height:46px;box-sizing:border-box;border:2.5px solid ${K};border-radius:50%;background-color:${c};box-shadow:3px 3px 0 ${K};text-align:center;font-family:${FUT};font-size:17px;line-height:41px;font-weight:700;letter-spacing:0.5px;color:${X.on(c)};">${String(n).padStart(2,'0')}</section>`
        +   `<section style="flex:1;min-width:0;margin-left:14px;">`
        +     (en?`<p style="margin:0 0 5px;line-height:1;"><span style="display:inline-block;padding:2px 8px;border:1.5px solid ${K};border-radius:999px;background-color:${X.tile[n%4]};font-family:${FUT};font-size:10.5px;line-height:1.4;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${K};">${esc(en)}</span></p>`:'')
        +     `<h2 style="margin:0;font-family:${SANS};font-size:21px;line-height:1.45;font-weight:900;letter-spacing:0.5px;color:${K};">${inl(zh)}</h2>`
        +   `</section>`
        + `</section>`
        // Squiggles skip the yellow, which turns muddy once darkened enough to show on white
        + wave(11,X.deco[[0,2,3][(n-1)%3]],'margin:12px 0 0 60px;')
        + (deck?`<p style="margin:10px 0 0 60px;font-family:${SANS};font-size:14.5px;line-height:1.7;letter-spacing:0.5px;color:${MUTED};">${inl(deck)}</p>`:'')
        + `</section>`;
    },
    // Subhead: a triangle and a thick underline in the second colour
    sub(t){
      return `<h3 style="margin:30px 0 12px;font-family:${SANS};font-size:17.5px;line-height:1.7;font-weight:800;letter-spacing:0.5px;color:${K};"><span style="margin-right:8px;font-size:12px;vertical-align:2px;color:${X.deco[0]};">▲</span><span style="padding:0 1px 1px;border-bottom:4px solid ${C[1]};">${inl(t)}</span></h3>`;
    },
    // Quote: an outlined white card with a coloured hard shadow, a quote disc and a squiggle
    quote(q,at){
      return `<section style="margin:34px 6px 38px 0;padding:16px 18px 18px;border:2.5px solid ${K};background-color:#FFFFFF;box-shadow:6px 6px 0 ${C[3]};">`
        + `<section style="display:flex;align-items:center;margin:0 0 12px;">`
        +   `<section style="flex-shrink:0;width:34px;height:34px;box-sizing:border-box;border:2px solid ${K};border-radius:50%;background-color:${C[0]};text-align:center;font-family:${QUOTE};font-size:30px;line-height:42px;font-weight:700;color:${X.on(C[0])};overflow:hidden;">“</section>`
        +   wave(6,X.deco[2],'margin-left:10px;')
        + `</section>`
        + (q.length?`<p style="margin:0;font-family:${SANS};font-size:17.5px;line-height:1.75;font-weight:800;letter-spacing:0.5px;color:${K};">${q.map(inl).join('<br>')}</p>`:'')
        + at.map(a=>`<p style="margin:10px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;letter-spacing:0.5px;color:${MUTED};">${inl(a)}</p>`).join('')
        + `</section>`;
    },
    // Data: each figure on an outlined colour tile with a hard black shadow
    data(ls){
      let h='';
      for(let k=0;k<ls.length;k+=3){
        const row=ls.slice(k,k+3), n=row.length, fs=n===1?36:n===2?28:21, lastRow=k+3>=ls.length;
        h+=`<section style="display:flex;margin:${k?0:8}px 4px ${lastRow?28:14}px 0;">` + row.map((c,j)=>
          `<section style="flex:1;min-width:0;${j<n-1?'margin-right:10px;':''}padding:12px 10px;box-sizing:border-box;border:2px solid ${K};background-color:${X.tile[[1,0,2][(k/3+j)%3]]};box-shadow:4px 4px 0 ${K};">`
          + (c[1]?`<p style="margin:0 0 4px;font-family:${SANS};font-size:12px;line-height:1.45;font-weight:700;color:${K};">${inl(c[1])}</p>`:'')
          + `<p style="margin:0;font-family:${FUT};font-size:${fs}px;line-height:1.2;font-weight:700;letter-spacing:0;color:${K};">${inl(c[0]||'')}</p>`
          + (c[2]?`<p style="margin:5px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:#444444;">${inl(c[2])}</p>`:'')
          + `</section>`).join('') + `</section>`;
      }
      return h;
    },
    // Table: outlined, header row on the second colour, banded rows, a coloured hard shadow
    table(head,body,idx,isNum,mb){
      const al=j=>isNum[j]?'right':'left';
      const thead=head?`<tr>${idx.map(j=>`<th style="padding:9px 10px;background-color:${X.tile[1]};border-bottom:2px solid ${K};font-family:${SANS};font-size:12.5px;font-weight:800;letter-spacing:0.5px;line-height:1.5;color:${K};text-align:${al(j)};vertical-align:bottom;">${inl(head[j]||'')}</th>`).join('')}</tr>`:'';
      const tbody=body.map((r,k)=>`<tr>${idx.map(j=>`<td style="padding:9px 10px;background-color:${k%2?X.pale[2]:'#FFFFFF'};${k<body.length-1?`border-bottom:1px solid ${mix(K,'#FFFFFF',.78)};`:''}font-family:${isNum[j]?FUT:SANS};font-size:13.5px;line-height:1.55;font-weight:${j===0?700:400};color:${j===0?K:BODY};text-align:${al(j)};vertical-align:top;">${inl(r[j]||'')}</td>`).join('')}</tr>`).join('');
      return `<section style="margin:6px 4px ${mb}px 0;overflow-x:auto;border:2px solid ${K};box-shadow:4px 4px 0 ${C[0]};"><table style="width:100%;border-collapse:collapse;"><tbody>${thead}${tbody}</tbody></table></section>`;
    },
    image(alt,url,mb){
      if(/^https?:\/\//i.test(url)){
        return `<section style="margin:6px 6px ${mb}px 0;border:2.5px solid ${K};box-shadow:6px 6px 0 ${C[2]};"><img src="${esc(url)}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;"></section>`;
      }
      return `<section style="margin:6px 6px ${mb}px 0;padding:40px 16px;border:2.5px dashed ${K};background-color:${X.pale[1]};text-align:center;"><p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${BODY};">圖片位置${alt?'：'+esc(alt):''}</p><p style="margin:4px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:${MUTED};">貼到後台後，在這裡上傳圖片替換</p></section>`;
    },
    caption(t){
      return `<p style="margin:0 0 26px;font-family:${SANS};font-size:12px;line-height:1.6;letter-spacing:0.3px;color:${MUTED};"><span style="margin-right:6px;font-size:10px;vertical-align:1px;color:${X.deco[0]};">▲</span>${inl(t)}</p>`;
    },
    ul(a){return list(a,'glyph',{fs:16,lh:1.85,color:BODY,mb:8,last:20});},
    ol(a){return list(a,'num',{fs:16,lh:1.85,color:BODY,mb:8,last:20});},
    // Divider: a line of confetti
    hr(){
      return `<section style="display:flex;justify-content:center;align-items:center;margin:14px 0 32px;">`
        + circ(11,C[0]) + tri(14,12,C[2],'margin-left:14px;') + sq(10,C[1],20,'margin-left:14px;') + cross(13,K,'margin-left:14px;') + ring(13,C[3],'margin-left:14px;')
        + `</section>`;
    },
    // End mark: 完 on a black pill, flanked by confetti
    end(){
      return `<section style="display:flex;justify-content:center;align-items:center;margin:48px 0 36px;">`
        + tri(16,14,C[2]) + circ(14,C[1],'margin-left:10px;')
        + `<span style="flex-shrink:0;display:inline-block;margin-left:12px;padding:3px 16px;border-radius:999px;background-color:${K};box-shadow:3px 3px 0 ${C[0]};font-family:${SANS};font-size:13px;line-height:1.6;font-weight:900;color:#FFFFFF;">完</span>`
        + sq(12,C[3],20,'margin-left:14px;') + ring(14,C[0],'margin-left:10px;')
        + `</section>`;
    },
    // Key points: outlined card with a black hard shadow; a coloured header strip with confetti
    card(title,body){
      const hb=C[0];
      return `<section style="margin:6px 6px 36px 0;border:2.5px solid ${K};background-color:#FFFFFF;box-shadow:6px 6px 0 ${K};">`
        + `<section style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-bottom:2.5px solid ${K};background-color:${hb};">`
        +   `<span style="min-width:0;font-family:${SANS};font-size:15px;line-height:1.5;font-weight:900;letter-spacing:1px;color:${X.on(hb)};">${title?inl(title):''}</span>`
        +   `<section style="display:flex;align-items:center;flex-shrink:0;margin-left:10px;">${circ(12,C[1])}${tri(14,12,K,'margin-left:7px;')}${sq(10,C[2],20,'margin-left:7px;')}</section>`
        + `</section>`
        + `<section style="padding:14px 14px 8px;">` + boxBody(body,{fs:15,lh:1.75,color:K,mb:8,last:6},'num') + `</section>`
        + `</section>`;
    },
    small(title,body){
      return `<section style="margin:40px 0 0;padding:12px 14px 10px;border:2px dashed ${mix(K,'#FFFFFF',.55)};">`
        + (title?`<p style="margin:0 0 6px;font-family:${SANS};font-size:12.5px;line-height:1.5;font-weight:800;letter-spacing:0.5px;color:${K};">${inl(title)}</p>`:'')
        + boxBody(body,{fs:12,lh:1.7,color:MUTED,mark:'#9A9A9A',mb:4,last:2},'dot') + `</section>`;
    },
    para(t){return `<p style="${P}">${inl(t)}</p>`;},
    wrap(h){return `<section style="padding:6px 2px 10px;background-color:#FFFFFF;font-family:${SANS};font-size:16px;color:${BODY};">${h}</section>`;}
  };
}

// Each layout: its skin, its palette list, which state key holds the palette, and its swatch look.
const STYLES = {
  brief:   {skin:briefSkin,   list:PRESETS, key:'preset',  accent:s=>theme(s).A,      swatch:p=>p.accent},
  retro:   {skin:retroSkin,   list:RETRO,   key:'retro',   accent:s=>retroTheme(s).A, swatch:p=>`linear-gradient(${p.C[0]} 0 25%,${p.C[1]} 25% 50%,${p.C[2]} 50% 75%,${p.C[3]} 75%)`},
  minimal: {skin:minimalSkin, list:MINI,    key:'minimal', accent:s=>miniTheme(s).A,  swatch:p=>p.A},
  space:   {skin:spaceSkin,   list:SPACE,   key:'space',   accent:s=>spaceTheme(s).bg, swatch:p=>`radial-gradient(circle,${p.A} 0 26%,${p.bg} 30%)`},
  renaissance: {skin:renaiSkin, list:RENAI, key:'renai', accent:s=>renaiTheme(s).A, swatch:p=>`radial-gradient(circle,${p.A} 0 38%,${p.gold} 42% 54%,${p.paper} 58%)`},
  poem:    {skin:poemSkin,    list:POEM,    key:'poem',    accent:s=>poemTheme(s).A,  swatch:p=>{const c=MAC[p.start];return `linear-gradient(${c.shell} 0 36%,${c.foot} 36% 43%,#FFF8EC 43% 57%,${c.foot} 57% 64%,${c.shell} 64%)`;}},
  tech:    {skin:techSkin,    list:TECH,    key:'tech',    accent:s=>techTheme(s).A,  swatch:p=>`conic-gradient(${p.A} 0 25%,${p.bg} 25% 50%,${p.A2} 50% 75%,${p.bg} 75%)`},
  memphis: {skin:memphisSkin, list:MEMPHIS, key:'memphis', accent:s=>mix(memphisTheme(s).C[0],'#1A1A1A',.4), swatch:p=>`conic-gradient(${p.C[0]} 0 25%,${p.C[1]} 25% 50%,${p.C[2]} 50% 75%,${p.C[3]} 75%)`}
};
function render(src,s,date){
  return parse(src, (STYLES[s.style]||STYLES.brief).skin(s,date));
}

// ---------- public API ----------
// s: 設定。style 選版式；各版式的配色用對應的鍵（見 STYLES[style].key）；
// column 為欄目名，head 為 'sans' 或 'serif'（標題字體），custom 為研究簡報的自訂色。
function renderWith(src, opts, date) {
  const s = Object.assign({}, DEFAULTS, opts || {});
  if (!STYLES[s.style]) throw new Error('未知的版式：' + s.style + '（可用：' + Object.keys(STYLES).join(', ') + '）');
  return render(String(src || ''), s, date === undefined ? '' : date);
}
function listStyles() {
  const NAMES = {brief:'研究簡報', retro:'復古未來', minimal:'極簡', space:'太空', renaissance:'文藝復興', poem:'馬卡龍', tech:'科技未來', memphis:'孟菲斯'};
  return Object.keys(STYLES).map(id => ({
    id, name: NAMES[id] || id, key: STYLES[id].key,
    variants: STYLES[id].list.map(p => ({id: p.id, name: p.name}))
  }));
}
return {render: renderWith, parse, listStyles, STYLES, DEFAULTS, SAMPLE};
});
