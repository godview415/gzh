#!/usr/bin/env node
// 命令列排版：把排版台標記轉成公眾號 HTML
//
//   node render.js 文章.md --style memphis --variant classic --column 市場筆記 --date 2026.11.18 > out.html
//   node render.js 文章.md --style poem --preview > preview.html   # 輸出可在瀏覽器打開的預覽頁
//   cat 文章.md | node render.js --style tech                       # 也可從標準輸入讀
//   node render.js --list                                          # 列出全部版式與配色
'use strict';
const fs = require('fs');
const path = require('path');
const paiban = require(path.join(__dirname, 'paiban.js'));

const args = process.argv.slice(2);
const opt = {};
let file = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    if (k === 'preview' || k === 'list' || k === 'help') opt[k] = true;
    else opt[k] = args[++i];
  } else file = a;
}

if (opt.help) {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 8).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}

if (opt.list) {
  for (const st of paiban.listStyles()) {
    console.log(`${st.id.padEnd(12)} ${st.name}\t配色：` + st.variants.map(v => `${v.id}（${v.name}）`).join('、'));
  }
  process.exit(0);
}

const src = file ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8');
const style = opt.style || paiban.DEFAULTS.style;
const st = paiban.STYLES[style];
if (!st) {
  console.error(`未知的版式：${style}。用 --list 查看可用版式。`);
  process.exit(1);
}
const s = {style};
if (opt.variant) {
  if (!st.list.some(p => p.id === opt.variant) && !(style === 'brief' && opt.variant === 'custom')) {
    console.error(`版式 ${style} 沒有配色 ${opt.variant}。可用：` + st.list.map(p => p.id).join(', '));
    process.exit(1);
  }
  s[st.key] = opt.variant;
}
if (opt.column !== undefined) s.column = opt.column;
if (opt.head) s.head = opt.head;          // sans 或 serif
if (opt.custom) s.custom = opt.custom;    // 研究簡報自訂色，配合 --variant custom
const date = opt.date !== undefined ? opt.date : (() => {
  const d = new Date();
  return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
})();

const html = paiban.render(src, s, date);
if (opt.preview) {
  process.stdout.write(`<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>排版預覽</title>
<style>body{margin:0;background:#EEF0F2;}#paper{width:375px;max-width:100%;margin:24px auto;padding:26px 16px 44px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08),0 10px 28px rgba(0,0,0,.07);}</style>
</head><body><section id="paper">${html}</section></body></html>
`);
} else {
  process.stdout.write(html + '\n');
}
