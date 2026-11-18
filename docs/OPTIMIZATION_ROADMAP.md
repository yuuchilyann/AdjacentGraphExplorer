# Layer Decomposition — Optimization Roadmap

本文記錄 Adjacent Graph Explorer 在 layered realization 演算法上**已實作**
與**規劃中**的所有最佳化機制，並依「本質類型」而非「效益大小」分類。
此分類對 UI 設計也很重要：不同類型的最佳化要求不同的使用者介面範式
（自動套用 vs opt-in toggle vs 演算法切換）。

> 維護原則：任何新最佳化都必須通過 `scripts/verify-layered.mjs` 的窮舉
> ＋抽樣＋全 transposition＋walk-aware＋targeted Hamming-walk 測試才能合入。

## 一、本質分類

| 類別 | 觸發條件 | 結果保證 | 適合的 UI |
|---|---|---|---|
| **代數恆等式（unconditional rewrite）** | 結構出現必然能用 | 永遠正確、永遠縮短或不變 | opt-in toggle（保留教學軌跡），預設關閉 |
| **條件式改寫（conditional rewrite）** | 輸入須符合特定結構 | 命中就封閉式、可證明最佳 | opt-in modifier toggle + 命中 chip |
| **搜尋型（heuristic / brute）** | 無結構限制，但需列舉 | 通常無封閉保證，仰賴啟發式 | opt-in toggle 或下拉策略選單 |
| **演算法家族切換** | 從根本上不同的解法 | 解的結構截然不同，無法直接比較 | 主要演算法選單，並列輸出 |

## 二、已實作

### ✅ Peephole involution cancellation（代數恆等式）

- **位置**：`simplifyLayers` in `src/lib/layered.ts`
- **UI**：`Original / Reduced` ToggleButtonGroup（橘色，secondary）
- **規則**：兩個相同 swap 之間，若中間所有層皆與其 disjoint（無共用端點），
  則可 commute 通過後一起消除。迭代至 fixpoint。
- **教學軌跡**：預設關閉，保留 Original 形式，讓學習者看出虛工從哪段
  Gray-path 邊界產生。

### ✅ Walk-aware decomposition（條件式改寫）

- **位置**：`tryWalkDecomposition` in `src/lib/layered.ts`
- **UI**：`Walk-aware` ToggleButton（綠色，success）+ 命中 chip
- **規則**：若 cycle 成員存在某個 rotation 使前 m−1 條 cyclic edge 皆 d=1，
  直接以相鄰邊分解，恰 m−1 層。O(m) 謂詞偵測。
- **命中率**：n=2 75%、n=3 42.4%、合成 Hamming walk 100%。

### ✅ Optimal：窮舉最短排序（搜尋型，n ≤ 3）

- **位置**：`src/lib/synthesis.ts`（`shortestCircuit`、`legalLayerLowerBound`）；
  `optimizeRealization` / `applyLayerMode` in `src/lib/layered.ts`
- **UI**：`Original / Reduced / Optimal` 同一組 ToggleButtonGroup 的第三個值（不另加 toggle）。
  Optimal 時 Top-down/Bottom-up 與 Walk-aware 停用並以 Tooltip 說明；旁邊 chip 顯示
  `7L · LB 6`（達下界時加 ✓）。n ≥ 4 時按鈕 disabled。Chain 模式為逐段各自最短。
- **規則**：只用同一種合法 layer（Hamming-1 對換 =(n−1)-控 X），從 identity 對 S_{2ⁿ}
  做 BFS（n=3 為 8! = 40 320 個狀態），再由目標往回剝最後一層重建序列。這等價於
  超立方體 Qₙ 上的 **token swapping**（一般圖／樹上皆 NP-complete，無已知 Qₙ 公式）。
- **下界**（任意 n 皆可算）：max(2ⁿ − 循環數, ⌈Σ d_H(x, α(x)) / 2⌉)。n=3 全排列中
  60%（24 328 / 40 320）最佳值恰等於下界，其餘最多差 3。
- **成效**（`npm run verify` 實測）：n=3 平均 13.13 → 6.61 層；最壞 22 → 12。
- **n ≥ 4**：16! ≈ 2×10¹³ 無法窮舉；可行方向為單題 A*/IDA*（以上述下界為啟發函數）
  或啟發式 + 下界證書（結果 = 下界即證明最佳）。尚未實作。

### ✅ Gate 庫比較卡片（演算法家族切換，n ≤ 3）

- **位置**：`src/components/GateLibraryView.tsx`（放在 Quantum Circuit 卡片下方）
- **目的**：讓使用者自行切換「現行 / ① MCX 最佳排序 / ② +SWAP / ③ +Fredkin /
  ④ X·CNOT·Toffoli / ⑤ ④+SWAP+Fredkin」，比較各 gate 庫的最短電路長度。
  每顆按鈕顯示 gate 數；SWAP 類 gate 以紫色標示並統計；②③⑤ 會說明與不含 SWAP
  的版本相比是否更短。
- **為何是獨立卡片**：②～⑤ 的一個 gate 可能同時搬動多對基底態，無法與 Wiring
  Diagram 的單一 swap layer 一一對應，因此不放進主圖的切換。
- **n=3 全排列最短長度**（最壞 / 平均）：現行 22 / 13.13；① 12 / 6.61；② 10 / 5.87；
  ③ 9 / 5.59；④ 6 / 4.58；⑤ 6 / 4.14。主要的縮短來自「排序」與「控制端較少」，
  SWAP / Fredkin 的額外貢獻有限。

## 三、規劃中（原 roadmap）

### Smart anchor selection（搜尋型）

**現狀**：cycle decomposition 永遠取 `cycle[0]` 為 anchor，扇出
`(a₀ a₁)(a₀ a₂)…(a₀ a_{m-1})`。

**想法**：枚舉 m 個 anchor 候選，選擇 `argmin_{a₀} Σ_k d(a₀, a_k)`
作為扇出樞紐。O(m²) 計算量、預期可縮短長 cycle 的總 Gray-path 長度。

**預期效益**：中。對混雜距離的 cycle 有立竿見影效果。對單距離 cycle
無影響。

**工程成本**：低。`realizeLayered` 內 cycle 處理段加一個 minimization
迴圈即可。

**UI 整合**：與 Top-down/Bottom-up 並列為「anchor 選擇」軸（vs Gray-path
走法軸），或作為一顆 modifier toggle。

### Per-transposition Top-down/Bottom-up mixing（搜尋型）

**現狀**：Top-down/Bottom-up 是全域 toggle，整個排列共用一個 Gray-path
走法。

**想法**：允許每個 transposition 各自選 above/below，在 cycle decomposition
邊界爭取更多 Gray-path 邊界重合 → 更多自然抵消。組合空間 2^k 需啟發式
剪枝或局部搜尋。

**預期效益**：中。間接強化 [[peephole reduction]] 的命中率。

**工程成本**：中。需要設計剪枝啟發式（greedy local-search 或 DP-on-cycles）。

**UI 整合**：新增第三個值 `Mixed`（auto）到現有 Top-down/Bottom-up toggle，
或開另一顆「Optimize boundary cancellation」開關。

### Parallel disjoint swaps per layer（深度最佳化）

**現狀**：一層 = 一個 swap。電路深度 = layer count。

**想法**：disjoint legal 2-cycle 互相 commute，可塞入同一時間步。
改變「一層 = 一個 swap」的資料模型為「一層 = matching」（一組 disjoint swap）。

**預期效益**：高（電路深度）；對 gate 總數無直接影響。對量子電路觀點下
最有實際意義——這正是現實量子硬體最在乎的指標。

**工程成本**：高。資料模型、wiring 圖佈局、QuantumCircuitView 的時間軸
都要重新設計。

**UI 整合**：可能需要獨立視圖切換 `Sequential / Parallel`，且 wiring 圖的
「step prev/next」語義要變（一個 step 可能對應多個 swap）。

### Template matching（條件式改寫）

**現狀**：未實作。

**想法**：辨識常見 gate 圖樣（Toffoli identity、3-CNOT swap、Hadamard
共軛 X 等）替換成更短的等效序列。本質上是 peephole 的更大圖樣版。

**預期效益**：中～高，視範本庫深度而定。

**工程成本**：中～高。範本庫設計、匹配引擎、避免無窮重寫。

**UI 整合**：每個範本命中可獨立報告（chip：「Toffoli identity ×3」），
也可以 toggle 個別範本啟用。

## 四、其他想法與下一階段 UI 設計

仍在發想階段的新最佳化機制（hybrid walk-anchor、cross-cycle interleaving、
optimal-decomposition oracle、greedy step-by-step、bridge-vertex sharing
等）、優先順序的取捨建議、以及在引入新功能前的 UI 重新設計考量，皆
記錄於本機私有檔：

```
docs/private/SPECULATIVE_IDEAS.md   ← 已 .gitignore，不上雲
```

這些內容未經充分驗證，亦尚未對外公開承諾，因此暫不放入 git 追蹤的
公開文件。等實作完成或設計細節穩定後，再考慮搬遷至本文。
