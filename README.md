# Adjacent Graph Explorer

實驗性探索相鄰圖（adjacent graph）結構的科學應用，靜態網站形式發佈。

## 技術棧

- **Vite** — 開發伺服器與打包工具
- **React 18 + TypeScript** — UI 與型別系統
- **MUI (Material UI) v6** — UI 元件庫
- **Emotion** — MUI 預設樣式引擎

## 環境需求

- Node.js 18 或以上

## 使用方式

```bash
# 安裝相依套件
npm install

# 啟動開發伺服器（預設 http://localhost:5173）
npm run dev

# 型別檢查
npm run typecheck

# 編譯產生靜態網站（輸出至 ./publish）
npm run build

# 預覽編譯後的網站
npm run preview
```

## 專案結構

```
AdjacentGraphExplorer/
├─ index.html              # Vite entry HTML
├─ vite.config.ts          # Vite 設定（outDir = publish）
├─ tsconfig*.json          # TypeScript 設定
├─ public/                 # 靜態資源（直接複製到 publish/）
└─ src/
   ├─ main.tsx             # React 入口
   ├─ App.tsx              # 根元件
   ├─ theme.ts             # MUI 主題
   └─ vite-env.d.ts
```

## 編譯輸出

`npm run build` 會把靜態檔案輸出到 `publish/` 目錄（非預設的 `dist/`）。
此設定位於 `vite.config.ts` 的 `build.outDir`。
