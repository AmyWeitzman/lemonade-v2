/**
 * TimeBlockVisualizer — 60-block scale showing how time is allocated.
 *
 * The backend returns `activities` = all blocks not consumed by sleep/work/
 * childcare/commute/pets.  That is the player's *available* budget — it is NOT
 * time already spent on activities.
 *
 * To show what's really happening we split the activities bucket:
 *   - usedActivityBlocks  → blocks the player has added to their cart / spent
 *   - unused              → activities − usedActivityBlocks
 *
 * Props:
 *   breakdown         — TimeBlockBreakdown from the API
 *   usedActivityBlocks — blocks already committed via cart (defaults to 0)
 *   loading           — show skeleton while fetching
 */
import { Box, Typography, Stack, Skeleton, Chip } from '@mui/material';
import type { TimeBlockBreakdown } from './types';

interface Segment {
  key: string;
  label: string;
  emoji: string;
  color: string;
  textColor: string;
}

const SEGMENTS: Segment[] = [
  { key: 'sleep',      label: 'Sleep',      emoji: '😴', color: '#5c6bc0', textColor: '#fff' },
  { key: 'work',       label: 'Work',       emoji: '💼', color: '#ef5350', textColor: '#fff' },
  { key: 'childcare',  label: 'Childcare',  emoji: '👶', color: '#ec407a', textColor: '#fff' },
  { key: 'commute',    label: 'Commute',    emoji: '🚗', color: '#ff7043', textColor: '#fff' },
  { key: 'pets',       label: 'Pets',       emoji: '🐾', color: '#ab47bc', textColor: '#fff' },
  { key: 'chores',     label: 'Chores',     emoji: '🧹', color: '#8d6e63', textColor: '#fff' },
  { key: 'activities', label: 'Activities', emoji: '🍋', color: '#66bb6a', textColor: '#fff' },
  { key: 'reserved',   label: 'Required',   emoji: '🔒', color: '#ffb300', textColor: '#333' },
  { key: 'unused',     label: 'Unused',     emoji: '⬜', color: '#d6d6d6ff', textColor: '#333' },
];

interface Props {
  breakdown: TimeBlockBreakdown | null;
  /** Blocks already committed to actions (from cart). Default 0. */
  usedActivityBlocks?: number;
  /** Blocks reserved for a required action not yet in the cart. Default 0. */
  reservedBlocks?: number;
  loading?: boolean;
}

export default function TimeBlockVisualizer({
  breakdown,
  usedActivityBlocks = 0,
  reservedBlocks = 0,
  loading,
}: Props) {
  if (loading || !breakdown) {
    return (
      <Box sx={{ mb: 2 }}>
        <Skeleton variant="rounded" height={44} />
        <Skeleton variant="text" width={300} sx={{ mt: 1 }} />
      </Box>
    );
  }

  const total = breakdown.total || 60;

  // `activities` from the API = available activity budget (not yet spent)
  // Split it into used (cart) and unused
  const activityBudget = breakdown.activities;
  const usedBlocks = Math.min(usedActivityBlocks, activityBudget);
  const reserved = Math.max(0, Math.min(reservedBlocks, activityBudget - usedBlocks));
  const unusedBlocks = Math.max(0, activityBudget - usedBlocks - reserved);

  const getBlocks = (key: string): number => {
    if (key === 'activities') return usedBlocks;
    if (key === 'reserved') return reserved;
    if (key === 'unused') return unusedBlocks;
    return (breakdown[key as keyof TimeBlockBreakdown] as number) ?? 0;
  };

  return (
    <Box>
      {/* Bar */}
      <Box
        sx={{
          display: 'flex',
          height: 36,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {SEGMENTS.map((seg) => {
          const blocks = getBlocks(seg.key);
          if (blocks <= 0) return null;
          const pct = (blocks / total) * 100;
          return (
            <Box
              key={seg.key}
              sx={{
                width: `${pct}%`,
                bgcolor: seg.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'default',
                transition: 'width 0.3s ease',
                minWidth: 4,
              }}
            >
              {pct >= 7 && (
                <Typography
                  sx={{
                    color: seg.textColor,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    userSelect: 'none',
                    lineHeight: 1,
                  }}
                >
                  {blocks}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Legend — colored badge chips */}
      <Stack
        direction="row"
        flexWrap="wrap"
        gap={1.25}
        sx={{ mt: 1.5, justifyContent: 'center' }}
      >
        {SEGMENTS.map((seg) => {
          const blocks = getBlocks(seg.key);
          return (
            <Chip
              key={seg.key}
              label={`${seg.emoji} ${seg.label}`}
              size="small"
              sx={{
                bgcolor: seg.color,
                color: seg.textColor,
                fontWeight: 600,
                fontSize: '0.78rem',
                height: 26,
                opacity: blocks === 0 ? 0.35 : 1,
                '& .MuiChip-label': { px: 1.25 },
              }}
            />
          );
        })}
        {breakdown.ptoUsed > 0 && (
          <Chip
            label="🏖️ PTO used"
            size="small"
            sx={{
              bgcolor: '#ffa726',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.78rem',
              height: 26,
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
        )}
      </Stack>
    </Box>
  );
}
