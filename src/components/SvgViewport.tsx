import type { ReactNode, RefObject } from 'react';
import { Box } from '@mui/material';

import { ExportActions } from './ExportActions';

export type SvgViewportProps = {
  svgRef: RefObject<SVGSVGElement | null>;
  /** Filename (no extension) passed to ExportActions. */
  filename: string;
  /** Set to true when the inner SVG has interactive drag/select behavior. */
  disableUserSelect?: boolean;
  children: ReactNode;
};

/**
 * Scrollable wrapper around a `<svg>` view, with a flat Copy/Download overlay
 * pinned to the top-right corner. The overlay sits outside the inner scroll
 * container so it stays in place even when the SVG is panned horizontally.
 * The inner `pt` reserves vertical room so the overlay never covers SVG
 * content.
 */
export function SvgViewport({
  svgRef,
  filename,
  disableUserSelect = false,
  children,
}: SvgViewportProps) {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          overflow: 'auto',
          maxWidth: '100%',
          bgcolor: 'background.default',
          borderRadius: 1,
          pt: 5,
          ...(disableUserSelect ? { userSelect: 'none' } : {}),
        }}
      >
        {children}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'transparent',
          px: 0.25,
        }}
      >
        <ExportActions svgRef={svgRef} filename={filename} />
      </Box>
    </Box>
  );
}
