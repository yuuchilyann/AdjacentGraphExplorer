import { Box } from '@mui/material';

/**
 * Small presentational helpers shared by locale dictionaries, so rich-prose
 * entries (e.g. circuit legends) don't duplicate markup across languages.
 */

/** Inline color-swatch dot used in circuit-legend prose (filled = control 1). */
export function Swatch({ filled, color }: { filled: boolean; color: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        mx: 0.5,
        bgcolor: filled ? color : '#fff',
        border: filled ? undefined : `1.5px solid ${color}`,
      }}
    />
  );
}
