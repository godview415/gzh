#!/usr/bin/env node
// 從 index.html 重新產生 paiban.js。改動排版台（index.html）之後執行：node build.js
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const open = html.indexOf('<script>\n(function(){\n');
const stop = html.indexOf('\n// ---------- state ----------');
if (open < 0 || stop < 0) throw new Error('index.html 的結構變了，找不到排版核心的起訖位置');
const core = html.slice(open + '<script>\n(function(){\n'.length, stop).replace(/\s+$/, '\n');
const HEAD = "/*!\n * paiban.js — 公眾號雜誌排版台的排版核心\n * 把排版台標記（Markdown 風格的純文字）轉成微信公眾號可直接貼上的內聯樣式 HTML。\n * 與 index.html 中的排版邏輯完全相同，可在 Node.js 或瀏覽器中直接呼叫。\n *\n *   const paiban = require('./paiban.js');\n *   const html = paiban.render(markup, {style:'memphis', memphis:'classic', column:'市場筆記'}, '2026.11.18');\n */\n(function (root, factory) {\n  if (typeof module === 'object' && module.exports) module.exports = factory();\n  else root.paiban = factory();\n})(typeof self !== 'undefined' ? self : this, function () {\n'use strict';\n";
const FOOT = "\n// ---------- public API ----------\n// s: 設定。style 選版式；各版式的配色用對應的鍵（見 STYLES[style].key）；\n// column 為欄目名，head 為 'sans' 或 'serif'（標題字體），custom 為研究簡報的自訂色。\nfunction renderWith(src, opts, date) {\n  const s = Object.assign({}, DEFAULTS, opts || {});\n  if (!STYLES[s.style]) throw new Error('未知的版式：' + s.style + '（可用：' + Object.keys(STYLES).join(', ') + '）');\n  return render(String(src || ''), s, date === undefined ? '' : date);\n}\nfunction listStyles() {\n  const NAMES = {brief:'研究簡報', retro:'復古未來', minimal:'極簡', space:'太空', renaissance:'文藝復興', poem:'馬卡龍', tech:'科技未來', memphis:'孟菲斯'};\n  return Object.keys(STYLES).map(id => ({\n    id, name: NAMES[id] || id, key: STYLES[id].key,\n    variants: STYLES[id].list.map(p => ({id: p.id, name: p.name}))\n  }));\n}\nreturn {render: renderWith, parse, listStyles, STYLES, DEFAULTS, SAMPLE};\n});\n";
fs.writeFileSync(path.join(__dirname, 'paiban.js'), HEAD + core + FOOT);
console.log('已更新 paiban.js');
