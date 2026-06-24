# Qiskit / Colab 匯出

把 Layered Realization 的量子電路匯出成可在 IBM Quantum / Google Colab 執行的
Python。分兩種交付，對應不同抽象層級。

## 1. 逐行展開（Quantum Circuit 卡片內）

住在 `QuantumCircuitView` 的分頁，描述「**這一張**電路、逐 gate」：

- **電路圖**：SVG 視圖。「播放位置高亮」開關可關閉橘色 playhead，讓「複製為 PNG」
  得到標準電路圖（off 時連 active gate 橘色、未來段虛線一併隱藏）。
- **Qiskit 程式碼**：`buildQiskitCode` 逐層輸出多控 X。
- **Jupyter / Colab**：`buildQiskitNotebook` → 3 個 cell（安裝 / 電路 / `qc.draw("mpl")`）。

控制端 `Mixed control` / `Positive-only` 切換同時影響輸出：
- mixed → `XGate().control(m, ctrl_state=…)`，負控制端編進 `ctrl_state`。
- positive → 負控制端以 X-共軛展開成 `x; mcx; x`，只用 positive control。

## 2. 函式版 / 任意排列 α → 量子電路（獨立卡片）

`QiskitPackageView`，放在 LearningPanel 上方。是**可重用的通用函式**：傳入任意排列
α（cycle 表示），內部自行完成「α → 合法 (Hamming = 1) 層 → 多控 X」的完整分解。

UI 行為（為了 連連看 流暢度）：

- **預設摺疊**；摺疊時完全不建立程式碼字串、不掛 Prism。
- 展開後只顯示說明 + **目前 α（cycle 表示）**（免捲動查驗）+「產生程式碼」按鈕。
- **按下按鈕才渲染**（拍當下 α 的快照）。之後 α 若改變，顯示「α 已變更，內容已過期」
  並提供「重新產生程式碼」—— 渲染只發生在按鈕按下，絕不顯示與當前 α 不符的程式碼。
- Notebook 把「函式定義」與「函式呼叫 + 出圖」拆成不同 cell。

> 介面文案不使用「pip 套件 / 封裝」字眼（那是內部工作任務的描述，非對使用者的文宣）。

### 與 `layered.ts` 的同步約束（重要）

`src/lib/qiskit.ts` 的 `FUNCTION_MODULE`（一段 `String.raw` 內嵌的 Python）是
`src/lib/layered.ts`（`realizeLayered` / `decomposeTransposition` / `grayPath` /
`tryWalkDecomposition` / `simplifyLayers`）與 `permutation.ts`
（`cycleDecomposition`）的**逐行移植**。

**改動 `layered.ts` 的演算法時，必須同步更新這段 Python**，否則函式版會與 app drift。

#### 驗證等價性（可重現）

1. 用 `scripts/verify-layered.mjs` 的 JS mirror，對所有排列（n=2、n=3 全枚舉 + n=4
   抽樣）× strategy × walkAware × reduced 產生參考 layers。
2. 用 regex 從 `qiskit.ts` 抽出 `FUNCTION_MODULE`（去掉 `from qiskit` 兩行），以
   Python `exec` 跑同樣 case，逐一比對。
3. 曾跑 **334,752 cases 全數一致**。

## 安裝指令（QiskitInstallBlock）

刻意用明確套件名 `qiskit matplotlib pylatexenc`（**不用** `qiskit[visualization]`
的方括號 extras）：方括號在 zsh / PowerShell 是萬用字元、要分 shell 引號；明確列名
則 cmd / PowerShell / bash / zsh 通用。pip / conda / uv 三種環境各一行。
