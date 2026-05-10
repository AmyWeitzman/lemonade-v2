/**
 * JobCard — displays a single job with eligibility, salary, raise schedule,
 * time blocks, stress, benefits, skill/trait gains, and apply/quit actions.
 * Requirements: Req 11
 */
import { useState } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Chip, Stack,
  Button, Divider, CircularProgress, Collapse, IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WorkIcon from '@mui/icons-material/Work';
import WorkOffIcon from '@mui/icons-material/WorkOff';
import type { JobItem } from './types';
import { useSetupMode } from '../../contexts/SetupModeContext';
import BookmarkToggle from '../../features/bookmarks/BookmarkToggle';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSalary(n: number): string {
  if (n === 0) return 'Variable';
  return '$' + n.toLocaleString();
}

function formatRaise(schedule: Record<string, unknown>): string {
  const type = schedule.type as string | undefined;
  if (!type) return 'None';
  if (type === 'commission') return 'Commission-based';
  const freqMap: Record<string, number> = { S: 3, M: 2, F: 1 };
  const amtMap: Record<string, number> = { S: 3, M: 5, L: 7 };
  const freq = freqMap[type[0]] ?? 2;
  const amt = amtMap[type[1]] ?? 3;
  return `${amt}%/${freq}yrs`;
}

function locationLabel(loc: string): string {
  if (loc === 'city') return '🏙️ City';
  if (loc === 'suburb') return '🏡 Suburb';
  return '🌐 City/Suburb';
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function reqLevel(value: number): { label: string; color: string; icon: string } {
  if (value <= 33) return { label: 'Low', color: '#4caf50', icon: '▼' };
  if (value <= 66) return { label: 'Med', color: '#ff9800', icon: '—' };
  return { label: 'High', color: '#f44336', icon: '▲' };
}

function benefitSummary(benefits: Record<string, unknown>): string[] {
  const lines: string[] = [];
  if (benefits.freeGymMembership) lines.push('🏋️ Free gym membership');
  if (benefits.waivesTaxPrepFee) lines.push('📋 Waives tax prep fee');
  if (typeof benefits.shoppingDiscountPct === 'number' && benefits.shoppingDiscountPct > 0) lines.push(`🛒 ${benefits.shoppingDiscountPct}% off shopping`);
  if (typeof benefits.autoMaintenanceDiscountPct === 'number' && benefits.autoMaintenanceDiscountPct > 0) lines.push(`🔧 ${benefits.autoMaintenanceDiscountPct}% off auto maintenance`);
  if (typeof benefits.pestDiscountPct === 'number' && benefits.pestDiscountPct > 0) lines.push(`🐛 ${benefits.pestDiscountPct}% off pest control`);
  if (typeof benefits.plumbingDiscountPct === 'number' && benefits.plumbingDiscountPct > 0) lines.push(`🚿 ${benefits.plumbingDiscountPct}% off plumbing`);
  if (typeof benefits.electricalDiscountPct === 'number' && benefits.electricalDiscountPct > 0) lines.push(`⚡ ${benefits.electricalDiscountPct}% off electrical`);
  if (typeof benefits.housingRepairDiscountPct === 'number' && benefits.housingRepairDiscountPct > 0) lines.push(`🏠 ${benefits.housingRepairDiscountPct}% off housing repairs`);
  if (benefits.travelTickets) {
    const t = benefits.travelTickets as { count: number; discountPct: number };
    lines.push(`✈️ ${t.discountPct}% off ${t.count} travel tickets`);
  }
  if (typeof benefits.baseTips === 'number' && benefits.baseTips > 0) lines.push(`💵 Extra $${benefits.baseTips.toLocaleString()} in tips`);
  if (typeof benefits.incomePerTimeBlock === 'number' && benefits.incomePerTimeBlock > 0) lines.push(`💰 Extra $${benefits.incomePerTimeBlock.toLocaleString()} per time block`);
  if (benefits.canBeSecondJob) lines.push('➕ Can be a second job');
  if (benefits.eveningShift) lines.push('🌙 Evening shift');
  if (benefits.rollsOverYrToYr) lines.push('🔄 PTO rolls over year to year');
  return lines;
}

const SKILL_KEYS = ['math', 'science', 'art', 'music', 'writing', 'analysis', 'homeRepair', 'technology', 'health'];
const TRAIT_KEYS = [
  'bravery', 'perseverance', 'charisma', 'compassion', 'creativity',
  'organization', 'patience', 'caution', 'sociability', 'stressTolerance',
  'goodWithKids', 'physicalAbility', 'communication',
];

const chipSx = { fontSize: '0.85rem', height: 26, bgcolor: 'rgba(47, 182, 211, 0.15)' } as const;

// ─── Career Advancement Sub-component ─────────────────────────────────────────

function CareerAdvancement({ salaryTiers, resolvedDegrees, hasDegreeRequirement }: {
  salaryTiers: Record<string, number>;
  resolvedDegrees: Array<{ name: string; type: string }>;
  hasDegreeRequirement: boolean;
}) {
  const [open, setOpen] = useState(false);

  const typeLabel: Record<string, string> = {
    none: 'No Degree',
    cc: "Associate's",
    associates: "Associate's",
    bachelors: "Bachelor's",
    masters: "Master's",
    phd: 'Doctorate',
    doctorate: 'Doctorate',
  };

  const typeOrder = ['none', 'cc', 'associates', 'bachelors', 'masters', 'phd', 'doctorate'];

  // Find unique degree names grouped by type from resolved degrees
  const namesByType = new Map<string, string[]>();
  for (const d of resolvedDegrees) {
    const normalizedType = d.type === 'associates' ? 'cc' : d.type;
    if (!namesByType.has(normalizedType)) namesByType.set(normalizedType, []);
    const list = namesByType.get(normalizedType)!;
    if (!list.includes(d.name)) list.push(d.name);
  }

  // Sort tiers by degree level
  const sortedTiers = Object.entries(salaryTiers)
    .sort(([a], [b]) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

  // If job requires a degree, skip the first tier (it's the base salary shown on the card)
  // If no degree required, skip 'none' tier (it's the base salary) but show everything else
  let advancedTiers: [string, number][];
  if (hasDegreeRequirement) {
    advancedTiers = sortedTiers.slice(1);
  } else {
    advancedTiers = sortedTiers.filter(([key]) => key !== 'none');
  }

  if (advancedTiers.length === 0) return null;

  // Build display lines — list all qualifying majors at each tier
  const displayLines: { label: string; salary: number }[] = [];
  for (const [degree, salary] of advancedTiers) {
    // Map salary tier keys to resolvedDegrees type keys
    const lookupKeys = [degree];
    if (degree === 'phd') lookupKeys.push('doctorate');
    if (degree === 'doctorate') lookupKeys.push('phd');
    if (degree === 'cc') lookupKeys.push('associates');
    if (degree === 'associates') lookupKeys.push('cc');

    let names: string[] = [];
    for (const key of lookupKeys) {
      const found = namesByType.get(key);
      if (found && found.length > 0) { names = found; break; }
    }

    const degLabel = typeLabel[degree] ?? degree;
    if (names.length === 0) {
      displayLines.push({ label: degLabel, salary });
    } else {
      for (const name of names) {
        displayLines.push({ label: `${degLabel} in ${name}`, salary });
      }
    }
  }

  if (displayLines.length === 0) return null;

  return (
    <Box sx={{ mt: 0.5 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <Typography sx={{ fontSize: '0.8rem', color: 'primary.main', fontWeight: 600 }}>
          Career Advancement
        </Typography>
        <IconButton size="small" sx={{ p: 0, ml: 0.25 }}>
          {open ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Stack spacing={0.25} sx={{ mt: 0.5 }}>
          {displayLines.map((line, i) => (
            <Typography key={i} sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
              {line.label}: ${line.salary.toLocaleString()}/yr
            </Typography>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  job: JobItem;
  onApply: (jobId: string, partTime: boolean) => void;
  onQuit: (jobId: string) => void;
  applying: boolean;
  quitting: boolean;
  isBookmarked?: boolean;
  onBookmarkToggle?: (jobId: string) => void;
  bookmarkLoading?: boolean;
}

export default function JobCard({ job, onApply, onQuit, applying, quitting, isBookmarked, onBookmarkToggle, bookmarkLoading }: Props) {
  const { isSetupMode } = useSetupMode();

  const skillGains = Object.entries(job.annualGains)
    .filter(([k]) => SKILL_KEYS.includes(k));
  const traitGains = Object.entries(job.annualGains)
    .filter(([k]) => TRAIT_KEYS.includes(k));
  const benefits = benefitSummary(job.benefits as Record<string, unknown>);

  const reqSkills = (job.requirements.skills ?? {}) as Record<string, unknown>;
  const reqCerts = (job.requirements.certifications ?? []) as string[];
  const hasReqs = Object.keys(reqSkills).length > 0 || reqCerts.length > 0;

  // In setup mode, treat all jobs as eligible for border color
  const effectiveEligible = isSetupMode ? true : job.eligible;

  const borderColor = job.alreadyEmployed
    ? 'info.main'
    : effectiveEligible
    ? 'success.main'
    : 'error.main';

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor,
        borderWidth: 2,
        bgcolor: job.alreadyEmployed
          ? 'success.50'
          : effectiveEligible
          ? 'background.paper'
          : 'action.hover',
        opacity: effectiveEligible || job.alreadyEmployed ? 1 : 0.85,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
        position: 'relative',
        fontSize: '0.9rem',
      }}
    >
      {/* Bookmark badge */}
      {onBookmarkToggle && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <BookmarkToggle
            itemId={job.id}
            itemName={job.title}
            type="job"
            isBookmarked={isBookmarked ?? false}
            onToggle={(id) => onBookmarkToggle(id)}
            loading={bookmarkLoading}
          />
        </Box>
      )}

      <CardContent sx={{ pb: 0, pr: 10, pt: 1.5 }}>
        {/* Title */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3, fontSize: '1.1rem', mb: 0.75 }}>
          {job.title}
        </Typography>

        {/* 2-column stats grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 0.75 }}>
          {/* Row 1: Starting Salary | Raises */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Starting Salary:
            </Typography>
            <Chip label={fmtSalary(job.baseSalary)} size="small" sx={chipSx} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Raises:
            </Typography>
            <Chip label={formatRaise(job.raiseSchedule)} size="small" sx={chipSx} />
          </Box>

          {/* Row 2: Schedule | Stress */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Schedule:
            </Typography>
            <Chip label={job.timeBlocks === 0 ? 'Variable' : `${job.timeBlocks} time blocks`} size="small" sx={chipSx} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Stress:
            </Typography>
            <Chip label={`${job.stressLevel}%`} size="small" sx={chipSx} />
          </Box>

          {/* Row 3: Type | PTO */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Type:
            </Typography>
            <Chip label={[job.fullTime && 'FT', job.partTime && 'PT', job.seasonal && 'Seasonal'].filter(Boolean).join(' / ')} size="small" sx={chipSx} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              PTO:
            </Typography>
            <Chip label={job.ptoTimeBlocks > 0 ? `${job.ptoTimeBlocks} time blocks` : 'None'} size="small" sx={chipSx} />
          </Box>

          {/* Row 4: Location | Pension */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Location:
            </Typography>
            <Chip label={locationLabel(job.location)} size="small" sx={chipSx} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Pension:
            </Typography>
            <Chip label={job.hasPension ? 'Yes' : 'No'} size="small" sx={chipSx} />
          </Box>
        </Box>

        {/* Degree Required + Avg Application Time (full width rows) */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap', mt: 0.25 }}>
            Degree:
          </Typography>
          {(job.degreeDisplayList?.length ?? 0) > 0
            ? job.degreeDisplayList.map((d, i) => (
                <Chip key={i} label={d} size="small" sx={chipSx} />
              ))
            : <Chip label="None" size="small" sx={chipSx} />
          }
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
            Avg Application Time:
          </Typography>
          <Chip label={`${job.easeOfGetting} time block${job.easeOfGetting === 1 ? '' : 's'}`} size="small" sx={chipSx} />
        </Box>

        {/* Requirements */}
        {hasReqs && (
          <Box sx={{ mb: 0.75 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 600, mb: 0.25 }}>
              Requirements
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.4}>
              {Object.entries(reqSkills).map(([skill, val]) => {
                const numVal = Array.isArray(val) ? (val[0] as number) : (val as number);
                const level = reqLevel(numVal);
                return (
                  <Chip
                    key={skill}
                    label={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <Box component="span" sx={{ color: level.color, fontWeight: 700 }}>{level.icon}</Box>
                        {formatKey(skill)}
                      </Box>
                    }
                    size="small"
                    sx={{ fontSize: '0.8rem', height: 24, bgcolor: 'rgba(47, 182, 211, 0.15)' }}
                  />
                );
              })}
              {reqCerts.map((cert) => (
                <Chip
                  key={cert}
                  label={cert === 'CPR' ? '📜 CPR Certification' : `📜 ${cert}`}
                  size="small"
                  sx={{ fontSize: '0.8rem', height: 24, bgcolor: 'rgba(47, 182, 211, 0.15)' }}
                />
              ))}
            </Stack>
            {((skillGains.length > 0 || traitGains.length > 0) || benefits.length > 0) && <Divider sx={{ mt: 0.75 }} />}
          </Box>
        )}

        {/* Annual Gains */}
        {(skillGains.length > 0 || traitGains.length > 0) && (
          <Box sx={{ mb: 0.75 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 600, mb: 0.25 }}>
              Annual Gains
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.4}>
              {skillGains.map(([key, val]) => (
                <Chip key={key} label={`${formatKey(key)} +${val}%`} size="small" sx={{ fontSize: '0.8rem', height: 24, bgcolor: 'rgba(47, 182, 211, 0.15)' }} />
              ))}
              {traitGains.map(([key, val]) => (
                <Chip key={key} label={`${formatKey(key)} +${val}%`} size="small" sx={{ fontSize: '0.8rem', height: 24, bgcolor: 'rgba(47, 182, 211, 0.15)' }} />
              ))}
            </Stack>
            {benefits.length > 0 && <Divider sx={{ mt: 0.75 }} />}
          </Box>
        )}

        {/* Perks */}
        {benefits.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
              Perks
            </Typography>
            <Stack gap={0.25}>
              {benefits.map((b, i) => (
                <Typography key={i} sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
                  {b}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}

        {/* Career Advancement (collapsible — only shown if salary tiers exist) */}
        {job.salaryTiers && Object.keys(job.salaryTiers).length > 0 && (
          <CareerAdvancement
            salaryTiers={job.salaryTiers}
            resolvedDegrees={job.resolvedDegrees}
            hasDegreeRequirement={(job.degreeDisplayList?.length ?? 0) > 0}
          />
        )}
      </CardContent>

      {!isSetupMode && (
        <CardActions sx={{ pt: 0.5, pb: 1, px: 2, justifyContent: 'flex-end', gap: 1 }}>
          {job.alreadyEmployed ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={quitting ? <CircularProgress size={12} /> : <WorkOffIcon sx={{ fontSize: '0.9rem !important' }} />}
              disabled={quitting}
              onClick={() => onQuit(job.id)}
              sx={{ fontSize: '0.7rem' }}
            >
              Quit
            </Button>
          ) : (
            <>
              {job.partTime && job.fullTime && (
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  disabled={!job.eligible || applying}
                  startIcon={applying ? <CircularProgress size={12} /> : undefined}
                  onClick={() => onApply(job.id, true)}
                  sx={{ fontSize: '0.7rem' }}
                >
                  Apply (PT)
                </Button>
              )}
              <Button
                size="small"
                variant={job.eligible ? 'contained' : 'outlined'}
                color={job.eligible ? 'primary' : 'inherit'}
                disabled={!job.eligible || applying}
                startIcon={applying ? <CircularProgress size={12} /> : <WorkIcon sx={{ fontSize: '0.9rem !important' }} />}
                onClick={() => onApply(job.id, false)}
                sx={{ fontSize: '0.7rem' }}
              >
                Apply
              </Button>
            </>
          )}
        </CardActions>
      )}
    </Card>
  );
}
