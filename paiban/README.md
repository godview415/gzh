# 公眾號雜誌排版台

把 Markdown 風格的純文字，排成可以直接貼進微信公眾號後台的雜誌式版面。共 8 套版式、29 種預設配色（研究簡報另可自訂顏色），全部輸出內聯樣式的 HTML，不依賴圖片、SVG 或定位，貼進公眾號不會跑版。

## 檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 排版台本體。用瀏覽器打開即可使用：左邊寫標記，右邊即時預覽，一鍵複製到公眾號 |
| `SPEC.md` | 標記規範。可以直接當提示詞交給任何 AI 模型，讓它把草稿轉成排版台標記 |
| `paiban.js` | 排版核心，從 `index.html` 抽出，可在 Node.js 或瀏覽器裡呼叫 |
| `render.js` | 命令列工具：標記檔 → 公眾號 HTML |
| `build.js` | 改了 `index.html` 之後執行，重新產生 `paiban.js` |
| `examples/sample.md` | 示範所有語法的範例文章 |

## 版式與配色

| 版式 id | 名稱 | 配色 id |
|---|---|---|
| `brief` | 研究簡報 | `ledger` 帳本藍、`pine` 松墨綠、`claret` 酒紅、`graphite` 石墨、`custom` 自訂色 |
| `retro` | 復古未來 | `sunset` 日落、`atomic` 原子、`mission` 太空 |
| `minimal` | 極簡 | `dai` 黛、`cinnabar` 朱、`bamboo` 竹、`ink` 墨 |
| `space` | 太空 | `deep` 深空、`nebula` 星雲、`mars` 火星 |
| `renaissance` | 文藝復興 | `vermilion` 朱砂、`lapis` 群青、`verdigris` 銅綠、`sepia` 棕墨 |
| `poem` | 馬卡龍 | `strawberry` 草莓、`pistachio` 開心果、`lavender` 薰衣草、`lemon` 檸檬 |
| `tech` | 科技未來 | `wafer` 晶圓、`laser` 雷射、`pcb` 電路、`titan` 鈦金 |
| `memphis` | 孟菲斯 | `classic` 經典、`candy` 糖果、`primary` 原色 |

## 用法

### 一、網頁

用瀏覽器打開 `index.html`，貼上標記，選版式和配色，按「複製到公眾號」，再到公眾號後台貼上。

### 二、讓其他 AI 模型產出標記

把 `SPEC.md` 的內容當成提示詞（或作為附件上傳）交給模型，再交給它文章草稿。模型會回傳一段排版台標記和一份以「SD：」開頭的內容問題清單。標記貼進排版台即可。

### 三、程式呼叫

命令列（需要 Node.js 18 以上）：

```bash
node render.js --list                                   # 列出全部版式與配色
node render.js 文章.md --style memphis --variant classic --column 市場筆記 --date 2026.11.18 > out.html
node render.js 文章.md --style poem --variant lemon --preview > preview.html   # 可在瀏覽器打開的預覽頁
cat 文章.md | node render.js --style tech
```

Node.js：

```js
const paiban = require('./paiban.js');
const html = paiban.render(markup, {style: 'memphis', memphis: 'classic', column: '市場筆記'}, '2026.11.18');
paiban.listStyles();   // 版式與配色清單
```

瀏覽器：

```html
<script src="paiban.js"></script>
<script>
  document.getElementById('out').innerHTML =
    paiban.render(markup, {style: 'tech', tech: 'pcb'}, '2026.11.18');
</script>
```

`render(標記, 設定, 日期)` 的設定：

| 鍵 | 說明 | 預設 |
|---|---|---|
| `style` | 版式 id | `space` |
| 配色鍵 | 各版式自己的鍵：`preset`（研究簡報）、`retro`、`minimal`、`space`、`renai`（文藝復興）、`poem`（馬卡龍）、`tech`、`memphis` | 各版式第一個配色 |
| `column` | 欄目名，顯示在標題上方 | `市場筆記` |
| `head` | 標題字體：`sans` 黑體或 `serif` 宋體 | `sans` |
| `custom` | 研究簡報的自訂主色，搭配 `preset: 'custom'` | `#6A4C93` |

日期傳空字串則不顯示日期。

## 標記速查

```
# 主標題
## 章節標題 | ENGLISH
### 緊接章節頭時是副標，其他位置是小標題
**粗體**　==底色標記==
> 引文
> —— 出處
[數據] 數值 | 名稱 | 口徑
| 欄 | 欄 |
|---|---|
^ 圖說或資料來源
- 清單　1. 有序清單
::: 卡片 要點框標題
:::
::: 底部小字區標題
:::
---
[完]
```

完整規則見 `SPEC.md`。

## 維護

`index.html` 是唯一的源頭。改了排版台之後執行 `node build.js`，`paiban.js` 就會同步更新。
