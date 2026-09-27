/**
 * Shared color maps for skills, traits, stress levels, edu types, fields, and tracks.
 * Used by JobCard and ProgramCard for consistent color-coding.
 */

// ─── Stress (Jobs) — lighter backgrounds, less emphasis ──────────────────────

export function stressColorJob(pct: number): { bg: string; text: string } {
  if (pct >= 60) return { bg: '#ef9a9a', text: '#7f0000' };   // high → light red, dark text
  if (pct >= 35) return { bg: '#fff176', text: '#5f4000' };   // medium → light yellow, dark text
  return { bg: '#a5d6a7', text: '#1b5e20' };                  // low → light green, dark text
}

// ─── Stress (Edu) — outline style ────────────────────────────────────────────

export function stressOutlineSx(pct: number): Record<string, unknown> {
  let border: string;
  let color: string;
  if (pct >= 60) {
    border = '#c62828'; color = '#b71c1c';   // dark red
  } else if (pct >= 35) {
    border = '#f57f17'; color = '#e65100';   // dark amber/orange
  } else {
    border = '#2e7d32'; color = '#1b5e20';   // dark green
  }
  return {
    fontSize: '0.85rem',
    height: 26,
    bgcolor: 'transparent',
    border: `1.5px solid ${border}`,
    color,
    fontWeight: 700,
  };
}

// ─── Education Type — filled background ───────────────────────────────────────

export const EDU_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  vocational:   { bg: '#e65100', text: '#fff' },   // deep orange
  associates:   { bg: '#b71c1c', text: '#fff' },   // dark red
  bachelors:    { bg: '#0d47a1', text: '#fff' },   // dark blue
  masters:      { bg: '#1b5e20', text: '#fff' },   // dark green
  doctorate:    { bg: '#f57f17', text: '#fff' },   // dark amber
  certificate:  { bg: '#4a148c', text: '#fff' },   // dark purple
  professional: { bg: '#4a148c', text: '#fff' },   // dark purple
};

// ─── Education Field — outline style ─────────────────────────────────────────

export const EDU_FIELD_OUTLINE: Record<string, { border: string; color: string }> = {
  'fine arts':           { border: '#b71c1c', color: '#b71c1c' },   // dark red
  'humanities':          { border: '#e65100', color: '#bf360c' },   // deep orange
  'math':                { border: '#795548', color: '#4e342e' },   // brown
  'physical sciences':   { border: '#2e7d32', color: '#1b5e20' },   // dark green
  'biological sciences': { border: '#0d47a1', color: '#0d47a1' },   // dark blue
  'professional':        { border: '#4a148c', color: '#4a148c' },   // dark purple
  'vocational':          { border: '#e65100', color: '#bf360c' },   // deep orange
};

// ─── Education Track — outline style ─────────────────────────────────────────

export const EDU_TRACK_OUTLINE: Record<string, { border: string; color: string }> = {
  stem:       { border: '#2e7d32', color: '#1b5e20' },   // dark green
  humanities: { border: '#e65100', color: '#bf360c' },   // deep orange
};

// ─── Skills & Traits — outline style ─────────────────────────────────────────

export const SKILL_TRAIT_COLORS: Record<string, { border: string; color: string }> = {
  // Skills
  math:           { border: '#b8860b', color: '#7a5c00' },
  science:        { border: '#2e7d32', color: '#1b5e20' },
  art:            { border: '#bf360c', color: '#bf360c' },
  music:          { border: '#7b1fa2', color: '#6a1b9a' },
  writing:        { border: '#0277bd', color: '#01579b' },
  analysis:       { border: '#1565c0', color: '#0d47a1' },
  homeRepair:     { border: '#5d4037', color: '#4e342e' },
  technology:     { border: '#00838f', color: '#006064' },
  health:         { border: '#c2185b', color: '#880e4f' },
  // Traits
  bravery:        { border: '#e65100', color: '#bf360c' },
  perseverance:   { border: '#c62828', color: '#b71c1c' },
  charisma:       { border: '#827717', color: '#827717' },
  compassion:     { border: '#ad1457', color: '#880e4f' },
  creativity:     { border: '#6a1b9a', color: '#4a148c' },
  organization:   { border: '#424242', color: '#212121' },
  patience:       { border: '#388e3c', color: '#2e7d32' },
  caution:        { border: '#f9a825', color: '#e65100' },
  sociability:    { border: '#c2185b', color: '#880e4f' },
  stressTolerance:{ border: '#00695c', color: '#004d40' },
  goodWithKids:   { border: '#0288d1', color: '#01579b' },
  physicalAbility:{ border: '#283593', color: '#1a237e' },
  communication:  { border: '#00838f', color: '#006064' },
};

/** Returns outline chip sx for a skill or trait key. */
export function skillTraitChipSx(key: string): Record<string, unknown> {
  const c = SKILL_TRAIT_COLORS[key];
  if (!c) return { fontSize: '0.8rem', height: 24, bgcolor: 'transparent', border: '1.5px solid rgba(47,182,211,0.6)', color: 'text.primary' };
  return {
    fontSize: '0.8rem',
    height: 24,
    bgcolor: 'transparent',
    border: `1.5px solid ${c.border}`,
    color: c.color,
    fontWeight: 600,
  };
}

// ─── Skill / Trait Icons ──────────────────────────────────────────────────────
// Unicode / emoji icons that render clearly even at small sizes.

export const SKILL_TRAIT_ICONS: Record<string, string> = {
  // Skills
  math:           '➗',
  science:        '🔬',
  art:            '🎨',
  music:          '🎵',
  writing:        '✏️',
  analysis:       '📊',
  homeRepair:     '🔧',
  technology:     '💻',
  health:         '❤️',
  // Traits
  bravery:        '🦁',
  perseverance:   '💪',
  charisma:       '✨',
  compassion:     '🤝',
  creativity:     '💡',
  organization:   '📋',
  patience:       '⏳',
  caution:        '⚠️',
  sociability:    '💬',
  stressTolerance:'🧘',
  goodWithKids:   '👶',
  physicalAbility:'🏃',
  communication:  '📣',
};

// ─── Avg Application Time ─────────────────────────────────────────────────────

/**
 * Maps easeOfGetting scale (1–5) to actual time blocks.
 * Rideshare Driver is a special case: stored as easeOfGetting=1 but displays 2 time blocks.
 * Pass jobTitle to handle that exception.
 */
export function easeToTimeBlocks(easeOfGetting: number, jobTitle?: string): number {
  if (jobTitle === 'Rideshare Driver') return 2;
  const map: Record<number, number> = { 1: 4, 2: 6, 3: 8, 4: 10, 5: 20 };
  return map[easeOfGetting] ?? easeOfGetting;
}

/**
 * Color scale for avg application time.
 * ease=1 (4 tb): very light yellow with black outline
 * ease=1 rideshare (2 tb): very light blue (special)
 * ease=2 (6 tb): amber-yellow
 * ease=3 (8 tb): dark amber, dark text for readability
 * ease=4 (10 tb): deep orange-red
 * ease=5 (20 tb): dark red
 */
export function appTimeChipSx(easeOfGetting: number, jobTitle?: string): Record<string, unknown> {
  if (jobTitle === 'Rideshare Driver') {
    return { fontSize: '0.85rem', height: 26, bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 600, border: '1px solid #90caf9' };
  }
  switch (easeOfGetting) {
    case 1: return { fontSize: '0.85rem', height: 26, bgcolor: '#fff9c4', color: '#212121', fontWeight: 600, border: '1.5px solid #2e2e2eff' };
    case 2: return { fontSize: '0.85rem', height: 26, bgcolor: '#ffe082', color: '#212121', fontWeight: 600, border: '1.5px solid #2e2e2eff' };
    case 3: return { fontSize: '0.85rem', height: 26, bgcolor: '#ff8f00', color: '#212121', fontWeight: 700, border: '1.5px solid #2e2e2eff' };
    case 4: return { fontSize: '0.85rem', height: 26, bgcolor: '#d84315', color: '#fff',    fontWeight: 600, border: '1.5px solid #2e2e2eff' };
    case 5: return { fontSize: '0.85rem', height: 26, bgcolor: '#b71c1c', color: '#fff',    fontWeight: 600, border: '1.5px solid #2e2e2eff' };
    default: return { fontSize: '0.85rem', height: 26, bgcolor: 'rgba(47,182,211,0.15)', color: 'inherit' };
  }
}
