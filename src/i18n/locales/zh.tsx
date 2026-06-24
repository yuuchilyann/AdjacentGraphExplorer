import { Box } from '@mui/material';
import { Math } from '../../components/Math';
import { N_MIN, N_MAX } from '../../types';
import type { TParams, TValue } from '../types';
import { Swatch } from '../_components';

/**
 * Traditional Chinese (zh-Hant) — the CANONICAL dictionary and source of truth.
 * The `Dictionary` / `TKey` types are derived from this object, so every other
 * locale is compile-checked to carry exactly the same keys.
 *
 * Conventions:
 *  - keys are flat, dotted, namespaced by view: app.*, control.*, learning.*, …
 *  - string-valued keys are consumed by both t() and tStr()
 *  - function-valued keys returning JSX must only be read through t()
 *  - keys read by tStr() (svg.*, *.toast.*, meta.*) MUST resolve to a string
 */
export const zh = {
  // ── metadata (synced to <html lang>, <title>, <meta description>) ──
  'meta.title': 'Adjacent Graph Explorer',
  'meta.description': 'Adjacent Graph Explorer — 相鄰結構圖的互動式探索。',

  // ── app shell ──
  'app.title': 'Adjacent Graph Explorer',
  'app.experimental': 'experimental',
  'app.view.legal': 'Adjacent Bipartite Graph',
  'app.view.builder': 'Permutation Builder',
  'app.view.chain': 'Permutation Chain',
  'app.view.guided': 'Guided Build',
  'app.footer': (p: TParams) => `© ${p.year} Adjacent Graph Explorer`,

  // ── control panel ──
  'control.n.label': 'n (量子位元數)',
  'control.n.helper': `允許範圍 ${N_MIN}–${N_MAX}`,
  'control.caption': (p: TParams) =>
    `n = ${p.n} ⇒ 2ⁿ = ${p.stateCount} 個基底態、${p.edgeCount} 條合法邊`,
  'control.warn': (p: TParams) =>
    `n = ${p.n} 會產生 ${p.edgeCount} 條邊，bipartite 檢視會非常擁擠，渲染也可能變慢。`,

  // ── learning panel (theorem prose interleaved with <Math>) ──
  'learning.header': '學習資訊 — Decomposition Theory',

  'learning.acc1.summary': (
    <>
      <strong>1. Cycle decomposition</strong>
      　—　任何 <Math tex="\alpha \in S_{2^n}" /> 可唯一分解為 disjoint cycles
    </>
  ),
  'learning.acc1.intro': (
    <>
      一個 m-cycle 至少需要 <Math tex="m-1" /> 個 transposition 才能實現（這是
      理論下界）。所以排列總共需要的 transposition 數為：
    </>
  ),
  'learning.acc1.count': (p: TParams) => (
    <>
      目前 mapping 偵測到 <strong>{String(p.totalCycles)}</strong> 個長度 ≥ 2 的 cycle。
    </>
  ),

  'learning.acc2.summary': (
    <>
      <strong>2. Anchor fan-out（預設拆法）</strong>
      　—　以 <Math tex="a_0" /> 為樞紐扇出
    </>
  ),
  'learning.acc2.intro': 'm-cycle 可寫為：',
  'learning.acc2.note': (
    <>
      注意這裡每個 <Math tex="(a_0\ a_k)" /> 的 Hamming 距離 <Math tex="d(a_0, a_k)" /> 可能大於 1，
      這時還需要進一步 Gray-path 展開（見 §3）。此演算法的「Top-down / Bottom-up」toggle 是在
      選擇 Gray-path 的走法。
    </>
  ),

  'learning.acc3.summary': (
    <>
      <strong>3. Gray-path 共軛展開（<Math tex="2d-1" /> 層）</strong>
    </>
  ),
  'learning.acc3.intro': (
    <>
      對距離 <Math tex="d \geq 2" /> 的 transposition <Math tex="(i\ j)" />，
      走一條 Hamming-1 路徑 <Math tex="i = p_0 \to p_1 \to \cdots \to p_d = j" />，
      利用共軛恆等式：
    </>
  ),
  'learning.acc3.note': (p: TParams) => (
    <>
      共 <Math tex="2d-1" /> 個 legal 2-cycle。對稱結構意味著外層的兩個
      <Math tex="(p_0\ p_1)" /> 把中間的 swap「平移」到 <Math tex="i" /> 的位置。
      {(p.haveD2plus as boolean) && (
        <>
          {' '}— 本次 mapping 的最大直接距離 <Math tex={`d = ${p.maxDirectDistance}`} />，
          所以這條公式有用上。
        </>
      )}
    </>
  ),

  'learning.acc4.summary': (
    <>
      <strong>4. Walk-aware shortcut（條件式改寫）</strong>
      　—　若 cycle 本身就走在 Hamming-1 walk 上
    </>
  ),
  'learning.acc4.intro': '觀察到 m-cycle 也能寫成相鄰邊的合成：',
  'learning.acc4.note': (
    <>
      若每個 <Math tex="d(v_k, v_{k+1}) = 1" />（cycle 是 Hamming-1 walk），則右式的每個
      transposition 已是 legal 2-cycle，恰 <Math tex="m-1" /> 層 — 達到理論下界。
    </>
  ),
  'learning.acc4.condVsBrute': (
    <>
      <strong>條件 vs 暴力</strong>：偵測是 <Math tex="O(m)" /> 的謂詞判斷，不是搜尋。
      命中時封閉式產出最佳解；沒命中 fallback 到 §2。
    </>
  ),
  'learning.acc4.applied': (p: TParams) => (
    <>
      ✓ 本次有 <strong>{String(p.count)}</strong> 個 cycle 命中 walk shortcut。
    </>
  ),
  'learning.acc4.notApplied': '本次無 cycle 為 Hamming walk（屬於正常情況，多數隨機排列都不是）。',

  'learning.acc5.summary': (
    <>
      <strong>5. Involution cancellation（最佳化定理）</strong>
    </>
  ),
  'learning.acc5.intro': '每個 legal 2-cycle 都是 involution：',
  'learning.acc5.note': (
    <>
      所以兩個相同 swap 緊鄰時必相消。若中間隔的 layer 都跟它 disjoint
      （無共用端點），也可以 commute 過去再消：
    </>
  ),
  'learning.acc5.circuit': (
    <>
      這條規則對量子電路的對應：相鄰兩個圖樣相同的 (n−1)-controlled X 必相消，
      不論 control 是空心、實心或混雜。
    </>
  ),

  'learning.acc6.summary': (
    <>
      <strong>6. Quantum-circuit 對應</strong>
      　—　每個 legal layer ⇔ (n−1)-controlled X
    </>
  ),
  'learning.acc6.intro': (p: TParams) => (
    <>
      對 swap <Math tex={`(${p.ket0},\\ ${p.ket1})`} /> 般地：
      target qubit <Math tex="q^* = " /> 唯一不同位（<Math tex="a \oplus b" /> 的單一 1-bit）；
      其餘 qubit <Math tex="q \neq q^*" /> 為控制端，極性取自 <Math tex="a" />（與 <Math tex="b" /> 相同）的該位：
    </>
  ),
  'learning.acc6.note': (
    <>
      空心控制可用 <Math tex="X" />-共軛恆等式 <Math tex={`C^0_q(U) = X_q \\cdot C^1_q(U) \\cdot X_q`} /> 展開成
      全 positive control（每個多付 2 個 X gate）。
    </>
  ),

  // ── quantum circuit view ──
  'circuit.title': 'Quantum Circuit — Layer → Multi-controlled X',
  'circuit.subtitle': (p: TParams) => (
    <>
      每一個 Hamming d = 1 的 layer (a&nbsp;b) 對應一個多控 X gate：
      差異位元 = target（⊕），其餘 n−1 個位元為控制端 —
      <Swatch filled color={p.gateColor as string} />=1、
      <Swatch filled={false} color={p.gateColor as string} />=0。
      線路採用 MSQ 配置：最下方為 |x₀⟩，最上方為 |x{(p.n as number) - 1}⟩；時間軸由左至右。
    </>
  ),
  'circuit.controlLabel': '控制端',
  'circuit.mode.tooltip.mixed': '保留 mixed control：bit=0 顯示為空心白控制。',
  'circuit.mode.tooltip.positive':
    '把每個空心白控制透過 X-共軛展開為 X · positive control · X，方便對應只支援 positive control 的硬體。',
  'circuit.mode.mixed': 'Mixed control',
  'circuit.mode.positive': 'Positive-only',
  'circuit.playhead.tooltip.off': '此開關僅作用於電路圖分頁。',
  'circuit.playhead.tooltip.on':
    '顯示對齊目前播放位置的橘色高亮區域。關閉後「複製為 PNG」即為標準量子電路圖。',
  'circuit.playhead.label': '播放位置高亮',
  'circuit.tab.diagram': '電路圖',
  'circuit.tab.qiskit': 'Qiskit 程式碼',
  'circuit.tab.jupyter': 'Jupyter / Colab',
  // ── guided build view ──
  'guided.err.appendTarget': (p: TParams) =>
    `要在尾端追加 (${p.from} ${p.to}) 把 strand 帶到 target ${p.to}，但 Hamming distance = ${p.d}（必須 d = 1）`,
  'guided.err.insertFront': (p: TParams) =>
    `要在最前面插入 (${p.a} ${p.b})，但 Hamming distance = ${p.d}（必須 d = 1）`,
  'guided.err.editLayer': (p: TParams) =>
    `要把 strand 從 ${p.from} 帶到 ${p.to}，需要 layer (${p.from} ${p.to}) 但 Hamming distance = ${p.d}，非 legal 2-cycle`,
  'guided.title': 'Guided Build — 引導構築',
  'guided.subtitle':
    '在上方連連看完成完整的 bijection（目標排列 α）後，系統自動載入 Top-Down 分解作為起點；你可以拖曳重排、插入或刪除任一層 legal 2-cycle，卡住時按「Auto-finish」讓系統補完。',
  'guided.status.tooltip.notReady': (p: TParams) =>
    `尚未完成 bijection（${p.progress}）。完成後才會啟動編輯區。`,
  'guided.status.tooltip.matches': '目前的 layer 序列已實現目標。',
  'guided.status.tooltip.off': (p: TParams) =>
    `還有 ${p.mismatch} 條 strand 終點不符；按 Auto-finish 可補上 ${p.auto} 層。`,
  'guided.strategy.tooltip':
    'Top-down 走 AND-bridge、Bottom-up 走 OR-bridge。影響預載與 Auto-finish 的展開選擇。',
  'guided.autoFinish.tooltip.notReady': (p: TParams) =>
    `請先完成上方連連看（目前 ${p.progress}）。`,
  'guided.autoFinish.tooltip.matches': '已實現目標，沒有需要補的層。',
  'guided.autoFinish.tooltip.do': (p: TParams) =>
    `把剩餘排列 σ 用 ${p.strategy} 展開後追加到尾端（${p.auto} 層）。`,
  'guided.resetBaseline.tooltip': '重新載入目前 Strategy 下的 Top-Down/Bottom-Up 預設分解。',
  'guided.clearLayers.tooltip': '清空所有 layer，從零開始堆。',
  'guided.resetBanner': (p: TParams) =>
    `已重新載入 ${p.strategy} 的預設分解（${p.layers} 層），可以開始編輯。`,
  'guided.notReadyAlert': (p: TParams) =>
    `完成上方連連看（目前 ${p.progress}）後，這裡會自動載入預設分解供你編輯。`,
  'guided.layerSeqLabel': 'Layer 序列（左→右為時序）：',
  'guided.moveLeft.tooltip': '向左移一格',
  'guided.moveRight.tooltip': '向右移一格',
  'guided.delete.tooltip': '刪除此層',
  'guided.decomposition': '分解（時序左→右）：',
  'guided.legend': '綠點 = 該 row 終點已達 target；紅點 = 偏離；右側虛線格 = target 參考位置。',
  'guided.dragHelp':
    '拖曳節點（跨欄可）：抓住任一欄的 |x⟩ 鎖定那條 strand；落在 source 欄 = 在最前面插入新層；落在 L_c 欄 = 改 L_c 讓該 strand 走到 |y⟩（藍色 = 合法新 swap）；同欄拖回該 strand 的「入射位置」(紅色) = 刪掉 L_c；落在 target 欄 = 在尾端追加一層把該 strand 帶到 target 行（給沒層數時或快收尾用）。「+」/「Add empty layer」 = 插入空 layer，再用拖曳定義。',
  'guided.insertSlot.tooltip': (p: TParams) =>
    `在位置 ${p.idx} 插入空 layer / 拖曳 chip 到此移動`,

  // ── permutation chain view ──
  'chain.title': 'Permutation Chain — 多段連連看',
  'chain.subtitle': (
    <>
      |X<sub>1</sub>⟩ → |X<sub>2</sub>⟩ → ⋯ → |X<sub>L</sub>⟩，每段 α
      <sub>k</sub> 獨立連線；合成 α<sub>total</sub> = α<sub>L−1</sub> ∘ ⋯ ∘
      α<sub>1</sub> 顯示於下方。
    </>
  ),
  'chain.progress.all': (p: TParams) => `全部完成 (${p.stages}/${p.stages})`,
  'chain.progress.partial': (p: TParams) => `進度 ${p.done}/${p.stages}`,
  'chain.stageCount': '層數',
  'chain.removeStage.tooltip': '移除最後一層（L − 1）',
  'chain.addStage.tooltip': '新增一層（L + 1）',
  'chain.random.legal.tooltip': '每段都隨機產生合法 (d ≤ 1) 排列',
  'chain.random.legal': '隨機合法',
  'chain.random.any.tooltip': '每段都隨機任意排列',
  'chain.random.any': '隨機任意',
  'chain.reset': '清除',
  'chain.fillSelfLoop': '補滿 self-loop',
  'chain.selfLoop.tooltip.fill': (p: TParams) =>
    `把所有段剩餘共 ${p.count} 個未連的來源補成 self-loop（|x⟩→|x⟩，固定點），不動已連的邊`,
  'chain.selfLoop.tooltip.complete': '所有段皆完整，無需補 self-loop',
  'chain.selfLoop.tooltip.blocked':
    '剩餘未連來源的自身目標已被佔用，無法自動補 self-loop（請手動處理或清除衝突）',
  'chain.pathAware.tooltip.disabled':
    '需所有段完成才能依路徑排序（避免欄內列重複/缺漏）',
  'chain.pathAware.tooltip.on':
    '已開啟：第 c ≥ 1 欄的列順序依「α_{c-1} 的輸出」排，strand 變直線；代價是欄內 ket 不再可預測位置',
  'chain.pathAware.tooltip.off':
    '關閉：每欄都用 0..2ⁿ-1 預設順序，欄內 ket 位置可預測，但 strand 會交叉',
  'chain.pathAware': '依路徑排序',
  'chain.stage.status.complete': '完整',
  'chain.stage.cycleLabel': (p: TParams) => `α${p.k} cycle 表示（${p.status}）`,
  'chain.stage.identity.tooltip': (p: TParams) =>
    `直通連接 α${p.k}（α(x) = x，將同列直接連起來）`,
  'chain.stage.randomLegal.tooltip': (p: TParams) =>
    `隨機合法重設 α${p.k}（d ≤ 1，不動其他段）`,
  'chain.stage.randomAny.tooltip': (p: TParams) =>
    `隨機任意排列 α${p.k}（不限 d，不動其他段）`,
  'chain.stage.clear.tooltip': (p: TParams) => `清除 α${p.k}`,
  'chain.selectedHint': (p: TParams) =>
    `來源 = (α${p.col} 的) ${p.ket}；藍色 = 合法目標 (d ≤ 1)、橙色 = 遠端目標 (d ≥ 2，會自動進入分層)、紅色 = 已被佔用 (會 snap)。`,
  'chain.composite.cycleLabel': (p: TParams) => (
    <>
      合成 α<sub>total</sub> = α{String(p.stages)} ∘ ⋯ ∘ α1（cycle 表示）
    </>
  ),
  'chain.composite.result.legal': (p: TParams) =>
    `✓ 合成 G_α ⊆ Adjacent Bipartite Graph（max d = ${p.maxD}）`,
  'chain.composite.result.illegal': (p: TParams) =>
    `△ 合成含 d ≥ 2 邊（max d = ${p.maxD}），需要分層實現 — 詳見下方 Layered Realization`,
  'chain.perStage.tooltip':
    '展開時，依序顯示 α₁..α_{L-1} 各自的分層實現，方便對照合成版的層數差異。',
  'chain.perStage.label': '顯示各段分解',
  'chain.perStage.title': (p: TParams) => (
    <>
      α<sub>{String(p.k)}</sub> 的 Layered Realization
    </>
  ),
  'chain.composite.layeredTitle': (
    <>
      合成 α<sub>total</sub> 的 Layered Realization
    </>
  ),

  // ── permutation builder view ──
  'builder.title': 'Permutation Builder — 連連看',
  'builder.subtitle':
    '左欄點/拖到右欄完成連線。非法或衝突的釋放會 silent-snap 到最近的合法可用目標。',
  'builder.progress': (p: TParams) => `進度 ${p.size}/${p.total}`,
  'builder.random.legal.tooltip':
    '隨機產生 G_α ⊆ Adjacent Bipartite Graph 的合法排列（所有邊 d ≤ 1）',
  'builder.random.legal': '隨機合法',
  'builder.random.any.tooltip':
    '隨機產生任意完整排列（通常含 d ≥ 2 邊，會觸發 Layered Realization）',
  'builder.random.any': '隨機任意',
  'builder.fillSelfLoop': '補滿 self-loop',
  'builder.reset': '清除',
  'builder.selfLoop.tooltip.fill': (p: TParams) =>
    `把剩餘 ${p.count} 個未連的來源補成 self-loop（|x⟩→|x⟩，固定點）`,
  'builder.selfLoop.tooltip.complete': '排列已完整，無需補 self-loop',
  'builder.selfLoop.tooltip.blocked':
    '剩餘未連來源的自身目標已被佔用，無法自動補 self-loop（請手動處理或清除衝突）',
  'builder.cycleLabel': 'Cycle 表示',
  'builder.twoLineLabel': '雙行（Cauchy）表示法',
  'builder.twoLineOmitted': (p: TParams) =>
    `n = ${p.n} ⇒ 2ⁿ = ${p.total}，欄數過多，略去完整展開。`,
  'builder.matrixLabel': (
    <>
      排列矩陣 <Math tex="P_{\alpha}" />
    </>
  ),
  'builder.matrix.tooltip.annotated': '加注模式：矩陣內嵌十進位行／列標籤（教學用）',
  'builder.matrix.tooltip.standard': '標準模式：純排列矩陣',
  'builder.matrix.annotated': '加注',
  'builder.matrix.standard': '標準',
  'builder.matrixOmitted': (p: TParams) =>
    `n = ${p.n} ⇒ ${p.total} × ${p.total} 矩陣過大，略去顯示（僅 n ≤ 4 時繪製）。`,
  'builder.selectedHint': (p: TParams) =>
    `來源 = ${p.ket}；藍色 = 合法目標 (d ≤ 1)、橙色 = 遠端目標 (d ≥ 2，會自動進入分層)、紅色 = 已被佔用 (會 snap)。`,
  'builder.result.legal': (p: TParams) =>
    `✓ G_α ⊆ Adjacent Bipartite Graph（max d = ${p.maxD}）`,
  'builder.result.illegal': (p: TParams) =>
    `△ 含 d ≥ 2 邊（max d = ${p.maxD}），需要分層實現 — 詳見下方 Layered Realization`,

  // ── elementary row matrix panel ──
  'matrix.detail.tooltip.full':
    '完整模式（學者）：列出每一欄與完整矩陣，便於逐項驗證。',
  'matrix.detail.tooltip.simplified':
    '簡化模式（一般使用者）：用 ⋯ 省略未變動的部分，只突顯被互換的兩列。',
  'matrix.detail.simplified': '簡化',
  'matrix.detail.full': '完整',
  'matrix.intro': (p: TParams) => (
    <>
      每一個 legal layer 的 transposition{' '}
      <Math tex={`\\alpha = (\\,|i\\rangle\\ \\ |j\\rangle\\,)`} /> 對應一個{' '}
      <strong>elementary row matrix</strong>{' '}
      <Math tex="R_{(i,\,j)}" />，也就是把 <Math tex={`${p.N} \\times ${p.N}`} />{' '}
      單位矩陣的第 <Math tex="i" /> 列與第 <Math tex="j" /> 列互換：
    </>
  ),
  'matrix.legend': (p: TParams) => (
    <>
      被互換的兩個基底態，位元配色對應量子電路：
      <Box component="span" sx={{ color: p.controlColor as string, fontWeight: 700 }}>
        ■ 控制位元（|i⟩、|j⟩ 相同）
      </Box>
      <Box component="span" sx={{ color: p.targetColor as string, fontWeight: 700 }}>
        ■ 目標位元（唯一相異 → 被 X 翻轉）
      </Box>
    </>
  ),
  'matrix.alert.tooManyColumns': (p: TParams) =>
    `n = ${p.n} ⇒ 2ⁿ = ${p.N}，欄數過多無法逐欄完整展開（雙行表示法的完整展開僅在 n ≤ 6 時提供）。以下改以 landmark 形式顯示。`,
  'matrix.alert.matrixTooBig': (p: TParams) =>
    `n = ${p.n} ⇒ ${p.N} × ${p.N} 矩陣過大不適合完整顯示（僅在 n ≤ 4 時繪製完整矩陣）。雙行表示法仍逐欄完整展開。`,
  'matrix.footer': (p: TParams) => (
    <>
      共 {String(p.count)} 個 elementary row matrix，與上方量子電路的 layer
      一一對應；整個排列的矩陣為這些 <Math tex="R_{(i,\,j)}" /> 依時序的乘積。
    </>
  ),

  // ── layered realization (wiring diagram) view ──
  'layered.title': 'Layered Realization — Wiring Diagram',
  'layered.subtitle': (p: TParams) => (
    <>
      每欄是固定的 |0⟩..|2ⁿ-1⟩ 軌道；每條 strand 起點代表 source 的某個 |x⟩，
      沿著各 layer 在軌道間穿梭，終點即為 α(|x⟩)。共 {String(p.layers)}{' '}
      層 legal 2-cycle（max direct d = {String(p.maxDirectDistance)}）
      {(p.reduced as boolean) && (p.cancelledPairs as number) > 0 ? (
        <>
          {' '}— 已消去 {String(p.cancelledPairs)} 對 involution 虛工（原 {String(p.canonicalLayers)} 層）
        </>
      ) : (p.reduced as boolean) ? (
        <> — 無可消去的虛工</>
      ) : null}
      。
    </>
  ),
  'layered.verify.ok': '已驗證：每條 strand 終點 = target，且每個 layer 都是 d ≤ 1。',
  'layered.verify.fail': (p: TParams) =>
    `驗證失敗：${p.mismatches} 條 strand 終點不符、${p.illegal} 個 layer 非法。`,
  'layered.strategy.tooltip.gray':
    'Gray-path 走法：Top-down 走 AND-bridge（低權重）；Bottom-up 走 OR-bridge（高權重）。只對 d ≥ 2 的 transposition 有差。',
  'layered.strategy.tooltip.walkAll':
    '本次所有 cycle 都被 Walk-aware 直接吃下，沒有 Gray-path 共軛展開，Top-down/Bottom-up 對結果無影響（已 disabled）。',
  'layered.strategy.tooltip.none':
    '本次排列無 d ≥ 2 的 transposition，沒有 Gray-path 共軛展開，Top-down/Bottom-up 對結果無影響（已 disabled）。',
  'layered.reduced.tooltip.on':
    '已開啟：相鄰（或可交換通過的）同 swap 對會自動相消，顯示最短化序列。',
  'layered.reduced.tooltip.off':
    '關閉：顯示算法原始輸出（含可能的 involution 虛工，方便看出分解來源）。',
  'layered.walk.tooltip.on':
    '已開啟：若 cycle 成員恰好沿 Hamming-1 walk 排列，直接走相鄰邊，恰 m-1 層。條件式改寫，非搜尋。',
  'layered.walk.tooltip.off':
    '關閉：每個 cycle 一律用 anchor 展開（cycle[0] 為樞紐 fan out）。',
  'layered.walk.chip.detected.tooltip': (p: TParams) =>
    `偵測到 ${p.decomposed} / ${p.total} 個 cycle 是 Hamming walk，直接以相鄰邊分解。`,
  'layered.walk.chip.none.tooltip':
    '此排列中沒有任一 cycle 是 Hamming walk；walk-aware 對此 case 沒有效益（屬於正常情況）。',
  'layered.reverse.tooltip.desc':
    '目前：|11⟩→|00⟩（由上而下遞減）。點擊切回遞增。',
  'layered.reverse.tooltip.asc':
    '目前：|00⟩→|11⟩（由上而下遞增）。點擊切換為遞減排列。',
  'layered.unsupported': (p: TParams) =>
    `有 ${p.count} 個 d ≥ 3 的 transposition 尚未支援分解：${p.list}`,
  'layered.empty.alreadyLegal': '目標已是 Adjacent Bipartite Graph 的子圖，不需要分層。',
  'layered.empty.noCycle': '目前沒有可分解的非平凡 cycle。',
  'layered.play.first': '回到開始',
  'layered.play.prev': '上一步',
  'layered.play.pause': '暫停',
  'layered.play.play': '自動播放',
  'layered.play.next': '下一步',
  'layered.play.last': '跳到結束',
  'layered.legend.label': 'Strand 圖例：',
  'layered.legend.fixed': '(fixed)',
  'layered.decomposition': '分解（時序左→右）：',

  // ── legal (adjacent bipartite) graph view ──
  'legal.title': '合法圖 (Legal Graph) — Bipartite view',
  'legal.subtitle':
    '左欄為來源 |x⟩，右欄為目標 |y⟩，連線代表 Hamming(x, y) ≤ 1（含 self-loop）。',
  'legal.chip.selfLoop': (p: TParams) => `self-loop × ${p.count}`,
  'legal.chip.bitFlip': (p: TParams) => `bit-flip × ${p.count}`,
  'legal.showSelfLoops': '顯示 self-loop',
  'legal.hint':
    '提示：滑鼠移到左欄 |x⟩ 醒目其 outgoing 合法邊 (x → y)；移到右欄 |y⟩ 醒目其 incoming 合法邊 (x → y)。',

  // ── shared export / code / install affordances ──
  'export.copyCode.tooltip': '複製程式碼',
  'export.download.py.tooltip': '下載 .py',
  'export.toast.codeCopied': '已複製 Qiskit 程式碼到剪貼簿',
  'export.toast.copyFailed': (p: TParams) => `複製失敗：${p.error}`,
  'export.toast.downloadFailed': (p: TParams) => `下載失敗：${p.error}`,
  'export.toast.pyDownloaded': (p: TParams) => `已下載 ${p.filename}.py`,
  'export.download.ipynb.btn': '下載 .ipynb',
  'export.colabHint': '上傳到 Google Colab：File → Upload notebook，依序執行各 cell。',
  'export.copyCell.tooltip': '複製此 cell',
  'export.toast.cellCopied': '已複製此 cell 到剪貼簿',
  'export.toast.ipynbDownloaded': (p: TParams) => `已下載 ${p.filename}.ipynb`,
  'export.install.label': '環境安裝',
  'export.install.copy.tooltip': '複製安裝指令',
  'export.install.hint': '含 matplotlib / pylatexenc，支援 qc.draw("mpl") 圖形輸出。',
  'export.toast.installCopied': '已複製安裝指令到剪貼簿',
  'export.err.noClipboardImageApi': '此瀏覽器不支援圖片剪貼簿 API',
  'export.png.copy.tooltip': '複製為 PNG',
  'export.png.download.tooltip': '下載 PNG',
  'export.toast.svgNotFoundCopy': '找不到要複製的圖',
  'export.toast.svgNotFoundDownload': '找不到要下載的圖',
  'export.toast.pngCopied': '已複製 PNG 到剪貼簿',
  'export.toast.pngDownloaded': (p: TParams) => `已下載 ${p.filename}.png`,

  // ── qiskit function-form (package) view ──
  'qiskit.title': 'Qiskit 函式版 — 任意排列 α → 量子電路',
  'qiskit.collapsedHint':
    '展開以產生「任意排列 α → 電路」的通用 Python 函式（請按下產生程式碼）',
  'qiskit.intro': (p: TParams) => (
    <>
      一份自給自足的通用 Python 函式：傳入任意排列 α（以 cycle
      表示），內部自行完成「α → 合法 (Hamming = 1) 層 → 多控 X」的完整
      分解 — 不必逐 gate 手寫。按下按鈕會以目前的 α 與設定（strategy
      <Box component="span" sx={{ mx: 0.5, fontFamily: 'monospace' }}>
        {String(p.strategy)}
      </Box>
      、walk_aware={String(p.walkAware)}、reduce={String(p.reduced)}）產生範例
      呼叫；改 alpha_cycles 即可重算其他排列。
    </>
  ),
  'qiskit.alphaLabel': '目前 α（cycle 表示）',
  'qiskit.btn.generate': '產生程式碼',
  'qiskit.btn.regenerate': '重新產生程式碼',
  'qiskit.stale': 'α 已變更，下方內容已過期',
  'qiskit.tab.module': 'Python 模組',
  'qiskit.tab.jupyter': 'Jupyter / Colab',
  'qiskit.footer':
    '函式內含 positive 參數：build_circuit(..., positive=True) 會把空心白控制以 X-共軛展開為 positive-only 控制，方便對應只支援 positive control 的硬體。',

  'circuit.footer': (p: TParams) => (
    <>
      共 {String(p.count)} 個 gate
      {(p.mode as string) === 'mixed' ? (
        <>
          ，與上方 Wiring Diagram 的 layer 一一對應；
          gate Lk 作用 = 翻轉 target qubit 當且僅當每個控制端條件成立
          （實心黑要求 1、空心白要求 0）。
        </>
      ) : (
        <>
          ；以 X-共軛恆等式
          <Box
            component="span"
            sx={{
              mx: 0.5,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            }}
          >
            C⁰_q(U) = X_q · C¹_q(U) · X_q
          </Box>
          把全部 {String(p.negCount)} 個空心白控制展開為「X · positive control · X」。展開後所有 control 皆為實心黑，可直接對應只支援 positive control 的硬體。
        </>
      )}
    </>
  ),
} satisfies Record<string, TValue>;

/** Union of all valid translation keys (drives autocomplete + missing-key errors). */
export type TKey = keyof typeof zh;

/** Shape every locale must implement: exactly TKey's keys, each a TValue. */
export type Dictionary = Record<TKey, TValue>;
