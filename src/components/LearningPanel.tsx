import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SchoolIcon from '@mui/icons-material/School';

import { Math } from './Math';
import type { LayeredRealization } from '../lib/layered';

export type LearningPanelProps = {
  realization: LayeredRealization;
  n: number;
};

const ket = (i: number, n: number) =>
  n === 0 ? '|\\rangle' : `|${i.toString(2).padStart(n, '0')}\\rangle`;

export function LearningPanel({ realization, n }: LearningPanelProps) {
  const haveD2plus = realization.maxDirectDistance >= 2;
  const walkApplied = realization.walkAware && realization.walkDecomposedCycles > 0;

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 0 }}>
      <Box sx={{ p: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SchoolIcon fontSize="small" color="action" />
        <Typography variant="overline" color="text.secondary">
          學習資訊 — Decomposition Theory
        </Typography>
      </Box>

      <Accordion disableGutters defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">
            <strong>1. Cycle decomposition</strong>
            　{' '}—　任何 <Math tex="\alpha \in S_{2^n}" /> 可唯一分解為 disjoint cycles
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            一個 m-cycle 至少需要 <Math tex="m-1" /> 個 transposition 才能實現（這是
            理論下界）。所以排列總共需要的 transposition 數為：
          </Typography>
          <Math display tex={`\\#\\text{transpositions}(\\alpha) = \\sum_{C \\in \\text{cycles}(\\alpha)} (|C| - 1) = 2^n - \\#\\text{cycles}(\\alpha)`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            目前 mapping 偵測到 <strong>{realization.totalCycles}</strong> 個長度 ≥ 2 的 cycle。
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">
            <strong>2. Anchor fan-out（預設拆法）</strong>
            　—　以 <Math tex="a_0" /> 為樞紐扇出
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            m-cycle 可寫為：
          </Typography>
          <Math display tex={`(a_0\\ a_1\\ \\cdots\\ a_{m-1}) = (a_0\\ a_1) \\circ (a_0\\ a_2) \\circ \\cdots \\circ (a_0\\ a_{m-1})`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            注意這裡每個 <Math tex="(a_0\ a_k)" /> 的 Hamming 距離 <Math tex="d(a_0, a_k)" /> 可能大於 1，
            這時還需要進一步 Gray-path 展開（見 §3）。本算法的「Above / Below」toggle 是在
            選擇 Gray-path 的走法。
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">
            <strong>3. Gray-path 共軛展開（<Math tex="2d-1" /> 層）</strong>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            對距離 <Math tex="d \geq 2" /> 的 transposition <Math tex="(i\ j)" />，
            走一條 Hamming-1 路徑 <Math tex="i = p_0 \to p_1 \to \cdots \to p_d = j" />，
            利用共軛恆等式：
          </Typography>
          <Math display tex={`(i\\ j) = (p_0\\ p_1)(p_1\\ p_2)\\cdots(p_{d-1}\\ p_d)\\cdots(p_1\\ p_2)(p_0\\ p_1)`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            共 <Math tex="2d-1" /> 個 legal 2-cycle。對稱結構意味著外層的兩個
            <Math tex="(p_0\ p_1)" /> 把中間的 swap「平移」到 <Math tex="i" /> 的位置。
            {haveD2plus && (
              <>
                {' '}— 本次 mapping 的最大直接距離 <Math tex={`d = ${realization.maxDirectDistance}`} />，
                所以這條公式有用上。
              </>
            )}
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion
        disableGutters
        defaultExpanded={walkApplied}
        sx={{
          bgcolor: walkApplied ? 'success.50' : undefined,
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">
            <strong>4. Walk-aware shortcut（條件式改寫）</strong>
            　—　若 cycle 本身就走在 Hamming-1 walk 上
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            觀察到 m-cycle 也能寫成相鄰邊的合成：
          </Typography>
          <Math display tex={`(v_0\\ v_1\\ \\cdots\\ v_{m-1}) = (v_0\\ v_1) \\circ (v_1\\ v_2) \\circ \\cdots \\circ (v_{m-2}\\ v_{m-1})`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
            若每個 <Math tex="d(v_k, v_{k+1}) = 1" />（cycle 是 Hamming-1 walk），則右式的每個
            transposition 已是 legal 2-cycle，恰 <Math tex="m-1" /> 層 — 達到理論下界。
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>條件 vs 暴力</strong>：偵測是 <Math tex="O(m)" /> 的謂詞判斷，不是搜尋。
            命中時封閉式產出最佳解；沒命中 fallback 到 §2。
          </Typography>
          {walkApplied && (
            <Typography variant="body2" color="success.dark" sx={{ mt: 1 }}>
              ✓ 本次有 <strong>{realization.walkDecomposedCycles}</strong> 個 cycle 命中 walk shortcut。
            </Typography>
          )}
          {realization.walkAware && !walkApplied && realization.totalCycles > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              本次無 cycle 為 Hamming walk（屬於正常情況，多數隨機排列都不是）。
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">
            <strong>5. Involution cancellation（最佳化定理）</strong>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            每個 legal 2-cycle 都是 involution：
          </Typography>
          <Math display tex={`\\sigma^2 = e \\quad \\forall\\ \\sigma = (a\\ b),\\ d(a,b)=1`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            所以兩個相同 swap 緊鄰時必相消。若中間隔的 layer 都跟它 disjoint
            （無共用端點），也可以 commute 過去再消：
          </Typography>
          <Math display tex={`\\sigma_1 \\sigma_2 \\sigma_1 = \\sigma_2 \\sigma_1 \\sigma_1 = \\sigma_2 \\quad \\text{when}\\ \\sigma_1 \\cap \\sigma_2 = \\emptyset`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            這條規則對量子電路的對應：相鄰兩個圖樣相同的 (n−1)-controlled X 必相消，
            不論 control 是空心、實心或混雜。
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">
            <strong>6. Quantum-circuit 對應</strong>
            　—　每個 legal layer ⇔ (n−1)-controlled X
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            對 swap <Math tex={`(${ket(0, n)},\\ ${ket(1, n)})`} /> 般地：
            target qubit <Math tex="q^* = " /> 唯一不同位（<Math tex="a \oplus b" /> 的單一 1-bit）；
            其餘 qubit <Math tex="q \neq q^*" /> 為控制端，極性取自 <Math tex="a" />（與 <Math tex="b" /> 相同）的該位：
          </Typography>
          <Math display tex={`\\text{control}(q) = \\begin{cases} \\bullet\\ (\\text{positive}) & \\text{if } a_q = 1 \\\\ \\circ\\ (\\text{negative}) & \\text{if } a_q = 0 \\end{cases}`} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            空心控制可用 <Math tex="X" />-共軛恆等式 <Math tex={`C^0_q(U) = X_q \\cdot C^1_q(U) \\cdot X_q`} /> 展開成
            全 positive control（每個多付 2 個 X gate）。
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ p: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <Stat label="layers" value={String(realization.layers.length)} />
          <Stat label="strategy" value={realization.strategy} />
          <Stat label="walk-aware" value={realization.walkAware ? 'on' : 'off'} />
          <Stat
            label="cycles"
            value={`${realization.totalCycles}${realization.walkAware ? ` (${realization.walkDecomposedCycles} via walk)` : ''}`}
          />
          <Stat label="max direct d" value={String(realization.maxDirectDistance)} />
        </Stack>
      </Box>
    </Paper>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column' }}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontWeight: 600,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
