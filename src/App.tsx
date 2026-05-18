import { useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Chip,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';

import { ControlPanel } from './components/ControlPanel';
import { LegalGraphView } from './components/LegalGraphView';
import { buildLegalGraph } from './lib/hypercube';

export default function App() {
  const [n, setN] = useState(2);
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
          <LegalGraphView graph={graph} />
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
