import { useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Chip,
  Container,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import LinkIcon from '@mui/icons-material/Link';
import BuildIcon from '@mui/icons-material/Build';

import { ControlPanel } from './components/ControlPanel';
import { LegalGraphView } from './components/LegalGraphView';
import { PermutationBuilder } from './components/PermutationBuilder';
import { PermutationChain } from './components/PermutationChain';
import { GuidedBuildView } from './components/GuidedBuildView';
import { buildLegalGraph } from './lib/hypercube';

type ViewMode = 'legal' | 'builder' | 'chain' | 'guided';

export default function App() {
  const [n, setN] = useState(2);
  const [mode, setMode] = useState<ViewMode>('legal');
  const graph = useMemo(() => buildLegalGraph(n), [n]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <HubIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Adjacent Graph Explorer
          </Typography>
          <Chip
            label="experimental"
            size="small"
            color="secondary"
            sx={{ color: 'common.white' }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        <Stack spacing={3}>
          <ControlPanel n={n} onChange={setN} />

          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: 'center', justifyContent: 'center' }}
          >
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, v: ViewMode | null) => {
                if (v !== null) setMode(v);
              }}
              size="small"
              color="primary"
            >
              <ToggleButton value="legal">
                <AccountTreeIcon sx={{ mr: 1, fontSize: 18 }} />
                Adjacent Bipartite Graph
              </ToggleButton>
              <ToggleButton value="builder">
                <ShuffleIcon sx={{ mr: 1, fontSize: 18 }} />
                Permutation Builder
              </ToggleButton>
              <ToggleButton value="chain">
                <LinkIcon sx={{ mr: 1, fontSize: 18 }} />
                Permutation Chain
              </ToggleButton>
              <ToggleButton value="guided">
                <BuildIcon sx={{ mr: 1, fontSize: 18 }} />
                Guided Build
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {mode === 'legal' && <LegalGraphView graph={graph} />}
          {mode === 'builder' && <PermutationBuilder n={n} />}
          {mode === 'chain' && <PermutationChain n={n} />}
          {mode === 'guided' && <GuidedBuildView n={n} />}
        </Stack>
      </Container>

      <Box
        component="footer"
        sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}
      >
        <Typography variant="caption">
          © {new Date().getFullYear()} Adjacent Graph Explorer
        </Typography>
      </Box>
    </Box>
  );
}
