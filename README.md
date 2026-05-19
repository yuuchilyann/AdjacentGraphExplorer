# Adjacent Graph Explorer

互動式探索 **Adjacent Bipartite Graph** 與其上之合法排列（permutation）實現
的靜態網站。針對 n 個量子位元（n ≥ 0）的計算基底 \|0⟩, \|1⟩, …, \|2ⁿ−1⟩，
提供四個層次的視覺化：

1. **Adjacent Bipartite Graph** — 規範鄰接關係 d(x, y) ≤ 1（單一 bit-flip
   或 identity）的二部圖
2. **Permutation Builder** — 連連看式互動，把任意目標排列「畫」出來
3. **Layered Realization** — 自動把含 d ≥ 2 邊的排列分解成多層 legal
   2-cycle，並以 wiring 圖呈現完整路線；可切換 **Canonical / Reduced**
   （involution 消去）與 **Walk-aware**（cycle 沿 Hamming walk 直走的條件式改寫）
4. **Quantum Circuit** — 把每個 legal layer 轉譯為對應的 (n−1)-controlled
   X gate，採 MSQ 配置；提供 Mixed control / Positive-only 切換

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

### Walk-aware shortcut（條件式改寫）

當一個 cycle `(v₀ v₁ … v_{m-1})` 的成員恰好構成 Hamming-1 walk（每對相鄰
`d(v_k, v_{k+1}) = 1`），可直接利用代數恆等式：

```
(v₀ v₁ … v_{m-1}) = (v₀ v₁) ∘ (v₁ v₂) ∘ … ∘ (v_{m-2} v_{m-1})
```

每個 transposition 已是 legal 2-cycle，所以**恰 m−1 層**——達到 m-cycle 的
理論下界。這是一個 **條件式改寫**（pattern match），不是搜尋：偵測只是
O(m) 的謂詞判斷，命中即用封閉式分解。

對 `(|00⟩ |01⟩ |11⟩ |10⟩)`：anchor 展開要 5 層、Walk-aware 直接 3 層（無
involution 虛工）。

### Canonical vs Reduced layer view

Canonical 輸出按上述規則「每個 transposition 各自展開」，是結構上對應到
cycle decomposition 與 Gray-path 共軛的「教學版」序列。但相鄰兩個
transposition 共用 Gray-path 端點時，邊界會產生**完全相同的 legal swap
連兩次**——每個 legal layer 都是 involution（σ² = e），所以這對 swap 互
消，是「虛工」。

開啟 **Reduced** 模式會跑 peephole 化簡：兩個相同的 swap 只要中間所有層
都跟它們 disjoint（無共用端點，可 commute 通過）就互相消掉，迭代至 fixpoint。

例（n = 2，4-cycle `(|00⟩ |01⟩ |11⟩ |10⟩)`，Above）：

- Canonical（5 層）：`(00,01) (00,01) (01,11) (00,01) (00,10)`
- Reduced（3 層）：`(01,11) (00,01) (00,10)` — 達 m-cycle 的層數下界 m−1

> **不自動套用**。canonical 讓學習者看見「虛工從哪裡來」（哪一個 Gray-path
> 邊界的副產品），對應到量子電路裡是「兩個完全相同的多控 X 連在一起」。

### Quantum Circuit translation

每個 legal layer (a b)（Hamming d = 1）對應一個 (n−1)-controlled X gate：

- 差異位元 q\* = target qubit，畫成 `⊕`
- 其餘 n−1 個位元為控制端；該位元在 a、b 中的共同值為 1 → **實心黑**
  positive control，為 0 → **空心白** negative control

線路採 **MSQ** 配置（least-significant qubit 在最下方）：q=0 是底部那條
wire、q=n−1 是頂部，時間軸由左至右。Wiring diagram 與 quantum circuit
共用 `step` 狀態，播放控制會同時 highlight 兩張圖中對應的 layer / gate。

**Positive-only mode** 使用 X-共軛恆等式

> `C⁰_q(U) = X_q · C¹_q(U) · X_q`

把每個空心白控制展開為「`X` · positive control · `X`」 —— 每個 layer 從
1 欄擴展為 3 欄（`[X 前] · [全 positive 多控 X] · [X 後]`），中間欄的所
有控制端皆為實心黑。這對應真實硬體編譯器（只支援 positive control）的
標準展開，每個空心白多付 2 個 X gate 的成本。

> 符號慣例：`[X]` 方框專用於無條件單比特 NOT；`⊕` 專用於受控閘的
> target（必定掛在 control 線上）。兩者不互換。

## 主要功能

| 視圖 | 互動 |
|---|---|
| Adjacent Bipartite Graph | hover 左欄高亮 outgoing 合法邊；hover 右欄高亮 incoming；切換 self-loop |
| Permutation Builder | 點兩下 / 拖曳連線；藍邊 = legal、橙邊 = 需要分層、紅 = 衝突 silent-snap；即時 cycle 表示 |
| Layered Realization | 多欄 wiring 圖；每條 strand 一個色；step prev/next/play/pause；Above ↔ Below 切換；Canonical ↔ Reduced 切換（peephole 化簡）；Walk-aware modifier（命中時亮 chip）；runtime verification chip；折疊式「學習資訊」面板含 KaTeX 排版的六段定理與公式 |
| Quantum Circuit | MSQ 配置（\|x₀⟩ 在最下）；layer → 多控 X gate；Mixed control ↔ Positive-only 切換；active gate 與 wiring 同步 highlight |

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
| KaTeX | ^0.16 |

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
   │  └─ layered.ts           # realizeLayered + simplifyLayers + tryWalkDecomposition
   └─ components/
      ├─ ControlPanel.tsx     # n 控制
      ├─ LegalGraphView.tsx   # Adjacent Bipartite Graph 視圖
      ├─ PermutationBuilder.tsx  # 連連看 Builder
      ├─ LayeredView.tsx      # Wiring diagram + 動畫控制（嵌入 QuantumCircuitView + LearningPanel）
      ├─ QuantumCircuitView.tsx  # 量子電路（MSQ + Mixed/Positive-only）
      ├─ LearningPanel.tsx    # 折疊式 decomposition theory（KaTeX 排版）
      └─ Math.tsx             # KaTeX 包裝元件
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

## 最佳化機制

### 已實作（摘要）

- **Peephole involution cancellation**（代數恆等式）— UI: `Canonical / Reduced` toggle
- **Walk-aware decomposition**（條件式改寫）— UI: `Walk-aware` modifier toggle

### 規劃中（摘要）

- Smart anchor selection（搜尋型）
- Per-transposition Above/Below mixing（搜尋型）
- Parallel disjoint swaps per layer（深度最佳化，需重設計資料模型）
- Template matching（條件式改寫）

完整的分類、效益／成本分析、與測試流程，請見
[`docs/OPTIMIZATION_ROADMAP.md`](docs/OPTIMIZATION_ROADMAP.md)。

任何新最佳化都必須通過 `scripts/verify-layered.mjs` 的窮舉＋抽樣＋全
transposition＋walk-aware 模式＋合成 Hamming walk targeted 測試才能合入。

## 其他已知限制

- **大 n 視覺擁擠**：n > 6 時 bipartite 列數變多，n > 8 wiring 圖會非常
  寬；目前以滾動條 + 自動字級縮小因應，未引入虛擬化。
- **n = 0 是 trivial case**：只有一個基底態 \|⟩、唯一排列。

## 授權

未指定。
