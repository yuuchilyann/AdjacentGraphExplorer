# Permutation Chain — 功能規格與加分清單

> 分支 `進階的PermutationBuilder` 引入的多段排列建構器，是 Permutation
> Builder 的後向擴充：把單一 |X⟩ → |Y⟩ 的連連看，延伸成
> |X₁⟩ → |X₂⟩ → ⋯ → |X_L⟩ 的鏈式接力。

## 一、定義與記號

- **層 (column)**：|X_k⟩，k = 1, ..., L
- **段排列 (stage)**：α_k : |X_k⟩ ↦ |X_{k+1}⟩，k = 1, ..., L − 1
- **合成 (composite)**：α_total = α_{L−1} ∘ ⋯ ∘ α_2 ∘ α_1

當 L = 2 時退化成原本的 Permutation Builder（單段）；目前 L 範圍 [2, 6]。

## 二、目前已實作（main 視圖）

- L 欄並列，預設 L = 3（兩段），±鈕在 2..10 欄間調整（純 UX 安全限，無
  演算法或記憶體限制）
- 每段 α_k 獨立 mapping，點/拖互動沿用 PermutationBuilder 的政策（含
  silent-snap、d ≥ 2 合法但會自動觸發分層）
- 表頭顯示 |X_k⟩；段中央顯示 α_k（完成時轉綠）
- 每段 cycle decomposition + 合成 α_total cycle 顯示
- 全部段完成後嵌入 `LayeredView` 顯示**合成 α_total** 的層級實現
- 全部隨機合法 / 全部隨機任意 / 全部清除 + SVG export
- `n` 改變時自動清空全部段
- 工具列採兩列：資訊列 + 動作列（分組 + 直線分隔 + 淡灰底）；複製/下載
  浮在圖區右上角，與 5 個視圖統一

## 三、助手嚴選加分功能（尚未實作）

排序依「教學/可讀性收益 ÷ 工程成本」優先。先不要急著一次塞進去；每加
一個都先確認其他功能仍清爽，避免回到擠版面。

### 1. ✅ 每段獨立的 Layered Realization 視圖（已實作 2026-05-21）

**實作位置**：`PermutationChain.tsx` — `showPerStageLayered` state + Switch
「顯示各段分解」(預設關閉)。在「Layered Realization」標題旁切換；
展開時依序渲染 α_1..α_{L-1} 各自的 `<LayeredView>`，再接合成 α_total 版本。
每段的 LayeredView 都自帶完整 toolbar（Top-down/Bottom-up、Original/Reduced、
Walk-aware），可獨立調整每段視覺策略。

**原本動機**：對學習者來說，看到每段如何分別被分解，再對照合成結果，
能直接看出「為什麼合成的層數 ≠ 各段層數之和」。

### 2. ✅ 每段獨立的「隨機合法 / 清除」鈕（已實作 2026-05-21）

**實作位置**：`PermutationChain.tsx` — 每段 cycle 表示行（`α_k cycle 表示`）
右側加 icon-only 按鈕對：✨ AutoFixHigh = 隨機合法重設該段、↺ RestartAlt =
清除該段（`mappings[k].size === 0` 時 disabled）。

**設計決策**：
- 不放「隨機任意」per-stage 版本：命中率低，且 per-stage 隨機任意通常會
  破壞鏈式設計的教學意圖；全域版仍在主工具列保留
- icon-only、不重複文字 label，維持工具列密度紀律

### 3. ✅ 中間欄 |X_k⟩ 視覺連續性（已實作 2026-05-21）

**實作位置**：`PermutationChain.tsx` — `pathAware` state + ToggleButton
「依路徑排序」(預設關閉)。位於 toolbar Row 2 第三個群組。

**設計決策**：
- 只在 `composite !== null`（所有段完成）時啟用；否則 ToggleButton
  disabled + Tooltip 解釋（per [[feedback-disable-inactive-controls]]）。
  避免欄內列重複/缺漏的視覺崩壞
- 採 `effectivePathAware = pathAware && composite !== null`：使用者切換到
  partial state 時自動退回預設排序，狀態還在，重新完成後又會生效
- 純文字 ToggleButton（不配 icon），與 Walk-aware 視覺一致
  (per [[feedback-icon-policy]])

**核心邏輯**：
- `pathOrdering[c][r]` = 第 c 欄第 r 列對應的 index
  - 第 0 欄 identity；第 c 欄 = `pathOrdering[c-1].map(idx => mappings[c-1].get(idx))`
- `yForCol(c, idx)` 與 `indexAtRowInCol(c, row)` 翻譯 index ↔ 列位置
- SVG 渲染與 drag commit 都通過這對 helper，不再直接呼叫 `yFor(idx)`

**未來可考慮**：合成完成前的 partial path-aware（每欄只重排已定義的部分），
但這會犧牲 row 唯一性，目前判斷不划算。

### 4. 「隨機合法 / 隨機任意」改為 SplitButton

**現狀**：兩顆並列按鈕。

**想法**：合併成一顆 SplitButton——預設動作「隨機合法」，下拉選「隨機
任意」。可進一步壓縮工具列寬度。

**收益**：低（節省約 80–100 px 橫向空間）；**成本**：低。

**取捨**：增加了一次互動成本（要點下拉），且使「隨機任意」變得不那麼
顯眼。目前並列方案的「一鍵到位」優勢可能比省空間重要——這條優先級
最低，除非未來工具列再次被新功能塞滿。

### 5. Slider / NumberInput 取代 ± 步進器

**現狀**：`[−] L = 3 [+]` 步進。

**想法**：改為水平 Slider（min=2, max=6）或數字輸入框，一次設定到位。

**收益**：低（L 範圍只有 2..6，± 鈕 1–4 次就到位）；**成本**：低。

**取捨**：Slider 的「拖動 → 即時新增/刪除段資料」的視覺暗示比較難設計
（拖過頭會清空很多段）；步進器有「每按一次明確產生一個事件」的可控感。
**不建議改**。列在此僅為完整記錄發想過程。

---

維護原則：本文件記錄「已對齊使用者意圖」的加分項。投機性、未對話過的
想法（例如自動找最短合成、合成定理面板等）留在 `docs/private/`。
