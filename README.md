# Adjacent Graph Explorer

互動式探索 **Adjacent Bipartite Graph** 與其上之合法排列（permutation）實現
的靜態網站。針對 n 個量子位元（n ≥ 0）的計算基底 \|0⟩, \|1⟩, …, \|2ⁿ−1⟩，
提供三個層次的視覺化：

1. **Adjacent Bipartite Graph** — 規範鄰接關係 d(x, y) ≤ 1（單一 bit-flip
   或 identity）的二部圖
2. **Permutation Builder** — 連連看式互動，把任意目標排列「畫」出來
3. **Layered Realization** — 自動把含 d ≥ 2 邊的排列分解成多層 legal
   2-cycle，並以 wiring 圖呈現完整路線

## 數學背景（簡述）

### Adjacent Bipartite Graph

G = (V₁, V₂, E) 其中

- V₁ = V₂ = { \|0⟩, \|1⟩, …, \|2ⁿ−1⟩ }
- e_{ij} = (\|i⟩, \|j⟩) ∈ E ⇔ d(i, j) ∈ {0, 1}
- d(i, j) = Σ_k (i_k ⊕ j_k)（Hamming distance）

邊數恰為 2ⁿ · (n+1)：每個節點貢獻 1 個 self-loop（d=0）+ n 個 single
bit-flip 鄰居（d=1）。

### Permutation Graph / 2-Cyclic Permutation Graph

任何 α ∈ S_{2ⁿ} 都可表示為 bipartite graph 上的 perfect matching。當 α
=(\|i⟩  \|j⟩) 是一個對換，且 d(i, j) = 1，則 G_α ⊆ G —— 稱為「legal
2-cycle」，對應 (n−1)-controlled X gate。

### Layered Realization

當 α 的某條邊 d(x, α(x)) ≥ 2 時，G_α ⊄ G，無法直接畫出；需要分解為多層
legal 2-cycle：

```
α = π_m ∘ π_{m-1} ∘ ... ∘ π_1
```

其中每個 π_k 都是 Adjacent Bipartite Graph 的子圖。對距離 d 的對換
(\|i⟩ \|j⟩)，沿 Hamming-1 path `i = p₀ — p₁ — … — p_d = j` 做共軛展開，得
**2d − 1** 個 legal 2-cycle：

- **Above greedy** — 走 AND-bridge（低權重）：先把 i 獨有的 1-bit 清掉，
  再把 j 獨有的 1-bit 設上；分解形如 `(p₀ p₁)(p₁ p₂)…(p_{d-1} p_d)…(p₁ p₂)(p₀ p₁)`
- **Below greedy** — 走 OR-bridge（高權重）：先設後清；分解形如
  `(p_{d-1} p_d)…(p₀ p₁)(p₁ p₂)…(p_{d-1} p_d)`

兩種策略產生的目標排列相同，路線不同。

## 主要功能

| 視圖 | 互動 |
|---|---|
| Adjacent Bipartite Graph | hover 左欄高亮 outgoing 合法邊；hover 右欄高亮 incoming；切換 self-loop |
| Permutation Builder | 點兩下 / 拖曳連線；藍邊 = legal、橙邊 = 需要分層、紅 = 衝突 silent-snap；即時 cycle 表示 |
| Layered Realization | 多欄 wiring 圖；每條 strand 一個色；step prev/next/play/pause；Above ↔ Below 切換；runtime verification chip |

控制面板：n 由 TextField + Slider 雙向綁定（0 ≤ n ≤ 10，n > 6 提示視圖會
擁擠）。

## 技術棧

| 套件 | 版本 |
|---|---|
| Vite | ^8.0 |
| React | ^19.2 |
| TypeScript | ^6.0 |
| MUI (Material UI) | ^9.0 |
| Emotion | ^11.14 |

## 環境需求

- Node.js 20 或以上（Vite 8 需要）

## 開發 / 編譯

```bash
# 安裝
npm install

# 開發伺服器（http://localhost:5173）
npm run dev

# 型別檢查
npm run typecheck

# 編譯靜態網站（輸出至 ./publish，非預設的 ./dist）
npm run build

# 預覽編譯後內容
npm run preview

# 跑分層演算法正確性驗證（窮舉 n=0..3、抽樣 n=4..7、所有 transposition）
npm run verify
```

## 專案結構

```
AdjacentGraphExplorer/
├─ index.html
├─ vite.config.ts             # build.outDir = "publish"
├─ tsconfig*.json
├─ scripts/
│  └─ verify-layered.mjs      # 獨立執行的分解演算法驗證腳本
├─ public/
└─ src/
   ├─ main.tsx                # React 入口
   ├─ App.tsx                 # 主畫面 + 視圖切換
   ├─ theme.ts                # MUI 主題
   ├─ types.ts                # BasisState / LegalEdge / N_MIN / N_MAX
   ├─ lib/
   │  ├─ hypercube.ts         # basisStates / legalEdges / buildLegalGraph
   │  ├─ permutation.ts       # snapTarget / cycleDecomposition / Mapping
   │  └─ layered.ts           # realizeLayered (含 runtime verification)
   └─ components/
      ├─ ControlPanel.tsx     # n 控制
      ├─ LegalGraphView.tsx   # Adjacent Bipartite Graph 視圖
      ├─ PermutationBuilder.tsx  # 連連看 Builder
      └─ LayeredView.tsx      # Wiring diagram + 動畫控制
```

## 正確性驗證

`scripts/verify-layered.mjs` 是獨立的純 JS 腳本（無相依），重新實作演算法
並對下列三組進行核驗：

1. **窮舉**：n = 0..3 共 40,347 個排列 × 兩種策略
2. **抽樣**：n = 4..7 每組 500 個隨機排列 × 兩種策略
3. **所有 transposition**：n = 2..7 共 10,794 個對換，分別檢驗：
   - 每個 layer 都是 d ≤ 1
   - 套用整串 layer 後每個 source 終點等於 target
   - layer 數恰為 2d − 1

最後一次跑全部通過。執行：

```bash
npm run verify
```

UI 上每次 `realizeLayered` 也會做 runtime self-check，LayeredView 標題列
有 `verified` chip；萬一不符會立刻變橙色 `mismatch`。

## 部署

線上版（GitHub Pages）：<https://yuuchilyann.github.io/AdjacentGraphExplorer/>

設計上使用**相對路徑** (`base: './'` in `vite.config.ts`)，編譯後的
`publish/index.html` 內部所有資產都是 `./assets/...`，所以：

- 倉庫改名、子目錄搬家、改丟到任何 CDN 都不需要重編
- 直接把 `publish/` 整個資料夾推到 GitHub Pages 設定的分支即可
- `public/.nojekyll` 確保 GitHub Pages 不啟用 Jekyll（不會誤略 `_` 開頭的檔）

開發伺服器 (`npm run dev`) 仍走 `/` 根路徑，不影響本地工作流。

> 注意：相對路徑 `./` 適用於沒有 client-side routing 的單頁應用。如果未來
> 接 React Router 之類的 HTML5 history mode，子路徑進入需要 GitHub Pages
> 的 404 fallback hack，或改用 HashRouter。

## 已知限制

- **層數沒做最小化**：使用 cycle 拆 `(a₀ a_k)`+ 每對單獨 Gray-path 共軛
  展開，正確但非最短。長 cycle 或共用 bridge 的多個 transposition 理論上
  可合併壓縮 layer 數。
- **大 n 視覺擁擠**：n > 6 時 bipartite 列數變多，n > 8 wiring 圖會非常
  寬；目前以滾動條 + 自動字級縮小因應，未引入虛擬化。
- **n = 0 是 trivial case**：只有一個基底態 \|⟩、唯一排列。

## 授權

未指定。
