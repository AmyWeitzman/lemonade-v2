/**
 * Shared UI primitives used by JobCard and ProgramCard.
 * Update styling here and it applies to both pages.
 */
import { Box, Chip, Typography, Tooltip } from '@mui/material';
import { SKILL_TRAIT_ICONS, SKILL_TRAIT_COLORS } from '../../lib/colorMaps';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default chip style for plain stat values (salary, duration, etc.) */
export const statChipSx = {
  fontSize: '0.85rem',
  height: 26,
  bgcolor: 'rgba(47, 182, 211, 0.15)',
} as const;

/** Tooltip props shared across all icon badges */
const sharedTooltipSlotProps = {
  popper: { modifiers: [{ name: 'offset', options: { offset: [0, -6] } }] },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "homeRepair" → "Home Repair" */
export function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * Converts a gain summary string like "Home Repair +5%" back to its camelCase key.
 * Used to look up icon/color from a pre-formatted gain string.
 */
export function gainStringToCamelKey(gainStr: string): string {
  const keyRaw = gainStr.replace(/ \+\d+%$/, '');
  return keyRaw
    .split(' ')
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

/** Builds "Skill +N%" summary strings from a gains record. */
export function skillGainSummary(gains: Record<string, number>): string[] {
  return Object.entries(gains)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${formatKey(k)} +${v}%`);
}

// ─── StatRow ──────────────────────────────────────────────────────────────────

interface StatRowProps {
  label: string;
  children: React.ReactNode;
}

/** A label + chip/badge pair used in the 2-column stats grid. */
export function StatRow({ label, children }: StatRowProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

/** A plain stat chip — label text on the default teal background. */
export function StatChip({ label, sx }: { label: string; sx?: object }) {
  return <Chip label={label} size="small" sx={{ ...statChipSx, ...sx }} />;
}

// ─── Icon Badge ───────────────────────────────────────────────────────────────

interface IconBadgeProps {
  /** camelCase skill/trait key, e.g. "homeRepair" */
  skillKey: string;
  /** Tooltip text shown on hover */
  tooltip: string;
  /** Optional content rendered below the icon (e.g. level dots) */
  below?: React.ReactNode;
  /** Override badge height (default 44, use 52 when showing dots below) */
  height?: number;
}

/**
 * A square icon badge with a colored border matching the skill/trait.
 * Shows the emoji icon and an optional element below it (e.g. level dots).
 * Tooltip shows the full name + any extra info.
 */
export function IconBadge({ skillKey, tooltip, below, height = 44 }: IconBadgeProps) {
  const icon = SKILL_TRAIT_ICONS[skillKey] ?? '?';
  const c = SKILL_TRAIT_COLORS[skillKey];

  return (
    <Tooltip
      title={<Typography sx={{ fontSize: '0.85rem' }}>{tooltip}</Typography>}
      arrow
      placement="top"
      slotProps={sharedTooltipSlotProps as any}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.3,
          width: 44,
          height,
          borderRadius: 1.5,
          border: c ? `2px solid ${c.border}` : '2px solid rgba(47,182,211,0.6)',
          color: c ? c.color : 'text.primary',
          bgcolor: 'transparent',
          cursor: 'default',
          userSelect: 'none',
          pt: below ? 0.5 : 0,
          pb: below ? 0.5 : 0,
        }}
      >
        <Box sx={{ fontSize: '1.35rem', lineHeight: 1 }}>{icon}</Box>
        {below}
      </Box>
    </Tooltip>
  );
}

// ─── Level Dots ───────────────────────────────────────────────────────────────

interface LevelDotsProps {
  /** 'Low' | 'Medium' | 'High' */
  level: string;
}

/** 1 green / 2 yellow / 3 red dots indicating requirement level. */
export function LevelDots({ level }: LevelDotsProps) {
  const dotColor =
    level === 'Low' ? '#43a047' :
    level === 'Medium' ? '#f9a825' :
    '#e53935';
  const dotCount = level === 'Low' ? 1 : level === 'Medium' ? 2 : 3;

  return (
    <Box sx={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {Array.from({ length: dotCount }).map((_, i) => (
        <Box
          key={i}
          sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }}
        />
      ))}
    </Box>
  );
}

// ─── IconBadgeGrid ────────────────────────────────────────────────────────────

interface IconBadgeGridProps {
  children: React.ReactNode;
}

/** Wraps icon badges in a grid with max 4 per row. */
export function IconBadgeGrid({ children }: IconBadgeGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 44px)',
        gap: 0.75,
      }}
    >
      {children}
    </Box>
  );
}
