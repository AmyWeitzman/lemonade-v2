/**
 * TimeBlockVisualizer — 60-block scale showing how time is allocated.
 * Segments: sleep / work / childcare / commute / pets / activities
 */
import { Box, Tooltip, Typography, Stack, Skeleton } from '@mui/material';
import type { TimeBlockBreakdown } from './types';

interface Segment {
  key: keyof TimeBlockBreakdown;
  label: string;
  emoji: string;
  color: string;
}

const SEGMENTS: Segment[] = [
  { key: 'sleep',     label: 'Sleep',     emoji: '😴', color: '#5c6bc0' },
  { key: 'work',      label: 'Work',      emoji: '💼', color: '#ef5350' },
  { key: 'childcare', label: 'Childcare', emoji: '👶', color: '#ec407a' },
  { key: 'commute',   label: 'Commute',   emoji: '🚗', color: '#ff7043' },
  { key: 'pets',      label: 'Pets',      emoji: '🐾', color: '#ab47bc' },
  { key: 'activities',label: 'Activities',emoji: '🍋', color: '#66bb6a' },
];

interface Props {
  breakdown: TimeBlockBreakdown | null;
  loading?: boolean;
}

export default function TimeBlockVisualizer({ breakdown, loading }: Props) {
  if (loading || !breakdown) {
    return (
      <Box sx={{ mb: 2 }}>
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="text" width={200} sx={{ mt: 0.5 }} />
      </Box>
    );
  }

  const total = breakdown.total || 60;

  return (
    <Box>
      {/* Bar */}
      <Box
        sx={{
          display: 'flex',
          height: 32,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {SEGMENTS.map((seg) => {
          const blocks = breakdown[seg.key] as number;
          if (blocks <= 0) return null;
          const pct = (blocks / total) * 100;
          return (
            <Tooltip
              key={seg.key}
              title={`${seg.emoji} ${seg.label}: ${blocks} block${blocks !== 1 ? 's' : ''}`}
              arrow
            >
              <Box
                sx={{
                  width: `${pct}%`,
                  bgcolor: seg.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default',
                  transition: 'width 0.3s ease',
                  minWidth: blocks > 0 ? 4 : 0,
                  '&:hover': { filter: 'brightness(1.15)' },
                }}
              >
                {pct >= 8 && (
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: '0.65rem', userSelect: 'none' }}>
                    {blocks}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Legend */}
      <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mt: 1 }}>
        {SEGMENTS.map((seg) => {
          const blocks = breakdown[seg.key] as number;
          return (
            <Stack key={seg.key} direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: seg.color, flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary">
                {seg.emoji} {seg.label}: <strong>{blocks}</strong>
              </Typography>
            </Stack>
          );
        })}
        {breakdown.ptoUsed > 0 && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffa726', flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">
              🏖️ PTO used: <strong>{breakdown.ptoUsed}</strong>
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
