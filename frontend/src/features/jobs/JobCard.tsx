/**
 * JobCard — displays a single job with eligibility, salary, raise schedule,
 * time blocks, stress, PTO, benefits, skill/trait gains, and apply/quit actions.
 * Requirements: Req 11
 */
import { useState } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Chip, Stack,
  Tooltip, IconButton, Button, Collapse, Divider, CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import WorkIcon from '@mui/icons-material/Work';
import WorkOffIcon from '@mui/icons-material/WorkOff';
import type { JobItem } from './types';
import { useSetupMode } from '../../contexts/SetupModeContext';
import BookmarkToggle from '../../features/bookmarks/BookmarkToggle';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSalary(n: number): string {
  if (n === 0) return 'Commission / Variable';
  return '$' + n.toLocaleString();
}

function raiseLabel(schedule: Record<string, unknown>): string {
  const type = schedule.type as string | undefined;
  if (!type) return 'No raises';
  const labels: Record<string, string> = {
    SS: 'Slow start',
    MS: 'Medium start',
    SM: 'Slow middle',
    MM: 'Medium middle',
    ML: 'Medium large',
    FS: 'Fast start',
    LS: 'Large start',
    commission: 'Commission-based',
  };
  return labels[type] ?? type;
}

function locationLabel(loc: string): string {
  if (loc === 'city') return '🏙️ City';
  if (loc === 'suburb') return '🏡 Suburb';
  return '🌐 Both';
}

function easeLabel(ease: number): string {
  const labels = ['', 'Very Easy', 'Easy', 'Moderate', 'Hard', 'Very Hard'];
  return labels[ease] ?? String(ease);
}

function easeColor(ease: number): string {
  if (ease <= 1) return 'success';
  if (ease <= 2) return 'info';
  if (ease <= 3) return 'warning';
  return 'error';
}

function benefitSummary(benefits: Record<string, unknown>): string[] {
  const lines: string[] = [];
  if (benefits.freeGymMembership) lines.push('🏋️ Free gym membership');
  if (benefits.waivesTaxPrepFee) lines.push('📋 Waives tax prep fee');
  if (typeof benefits.shoppingDiscountPct === 'number') lines.push(`🛒 ${benefits.shoppingDiscountPct}% shopping discount`);
  if (typeof benefits.autoMaintenanceDiscountPct === 'number') lines.push(`🔧 ${benefits.autoMaintenanceDiscountPct}% auto maintenance discount`);
  if (typeof benefits.pestDiscountPct === 'number') lines.push(`🐛 ${benefits.pestDiscountPct}% pest control discount`);
  if (typeof benefits.plumbingDiscountPct === 'number') lines.push(`🚿 ${benefits.plumbingDiscountPct}% plumbing discount`);
  if (typeof benefits.electricalDiscountPct === 'number') lines.push(`⚡ ${benefits.electricalDiscountPct}% electrical discount`);
  if (typeof benefits.housingRepairDiscountPct === 'number') lines.push(`🏠 ${benefits.housingRepairDiscountPct}% housing repair discount`);
  if (benefits.travelTickets) {
    const t = benefits.travelTickets as { count: number; discountPct: number };
    lines.push(`✈️ ${t.count} travel tickets (${t.discountPct}% off)`);
  }
  if (typeof benefits.baseTips === 'number') lines.push(`💵 Tips: $${benefits.baseTips.toLocaleString()} base`);
  if (typeof benefits.incomePerTimeBlock === 'number') lines.push(`💰 $${benefits.incomePerTimeBlock.toLocaleString()} per time block`);
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
  const [expanded, setExpanded] = useState(false);
  const { isSetupMode } = useSetupMode();

  const skillGains = Object.entries(job.annualGains)
    .filter(([k]) => SKILL_KEYS.includes(k));
  const traitGains = Object.entries(job.annualGains)
    .filter(([k]) => TRAIT_KEYS.includes(k));
  const benefits = benefitSummary(job.benefits as Record<string, unknown>);

  const reqSkills = (job.requirements.skills ?? {}) as Record<string, unknown>;
  const reqCerts = (job.requirements.certifications ?? []) as string[];
  const hasReqs = Object.keys(reqSkills).length > 0 || reqCerts.length > 0;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: job.alreadyEmployed
          ? 'success.main'
          : job.eligible
          ? 'divider'
          : 'error.light',
        bgcolor: job.alreadyEmployed
          ? 'success.50'
          : job.eligible
          ? 'background.paper'
          : 'action.hover',
        opacity: job.eligible || job.alreadyEmployed ? 1 : 0.85,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
        position: 'relative',
      }}
    >
      {/* Badges */}
      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 160, justifyContent: 'flex-end', zIndex: 1 }}>
        {onBookmarkToggle && (
          <BookmarkToggle
            itemId={job.id}
            itemName={job.title}
            type="job"
            isBookmarked={isBookmarked ?? false}
            onToggle={(id) => onBookmarkToggle(id)}
            loading={bookmarkLoading}
          />
        )}
        {job.alreadyEmployed && (
          <Chip label="✅ Employed" size="small" color="success" sx={{ fontSize: '0.65rem', height: 20 }} />
        )}
        {job.hasPension && (
          <Tooltip title="This job includes a pension">
            <Chip label="🏦 Pension" size="small" color="info" sx={{ fontSize: '0.65rem', height: 20 }} />
          </Tooltip>
        )}
        {job.seasonal && (
          <Chip label="🌻 Seasonal" size="small" color="warning" sx={{ fontSize: '0.65rem', height: 20 }} />
        )}
        {job.partTime && !job.fullTime && (
          <Chip label="PT" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
        )}
      </Box>

      <CardContent sx={{ pb: 0, pr: 10 }}>
        {/* Title + eligibility */}
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 0.75 }}>
          <Tooltip
            title={
              job.alreadyEmployed
                ? 'Currently employed here'
                : job.eligible
                ? 'You meet all requirements'
                : job.eligibilityReasons.join(' • ')
            }
            arrow
          >
            <Box sx={{ mt: 0.25, flexShrink: 0 }}>
              {job.alreadyEmployed ? (
                <WorkIcon sx={{ fontSize: 18, color: 'success.main' }} />
              ) : job.eligible ? (
                <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
              ) : (
                <BlockIcon sx={{ fontSize: 18, color: 'error.main' }} />
              )}
            </Box>
          </Tooltip>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {job.title}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
              <Chip
                label={locationLabel(job.location)}
                size="small"
                sx={{ fontSize: '0.6rem', height: 18 }}
              />
              <Tooltip title={`Difficulty to get: ${easeLabel(job.easeOfGetting)}`}>
                <Chip
                  label={easeLabel(job.easeOfGetting)}
                  size="small"
                  color={easeColor(job.easeOfGetting) as 'success' | 'info' | 'warning' | 'error'}
                  sx={{ fontSize: '0.6rem', height: 18 }}
                />
              </Tooltip>
            </Stack>
          </Box>
        </Stack>

        {/* Key stats */}
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1 }}>
          <Tooltip title="Base annual salary">
            <Chip
              label={`💰 ${fmtSalary(job.baseSalary)}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Tooltip>
          <Tooltip title="Time blocks required per year">
            <Chip
              label={`⏱ ${job.timeBlocks} TB`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Tooltip>
          <Tooltip title="Stress level">
            <Chip
              label={`😰 ${job.stressLevel}%`}
              size="small"
              sx={{
                fontSize: '0.7rem',
                bgcolor: job.stressLevel <= 30 ? '#e8f5e9' : job.stressLevel <= 60 ? '#fff3e0' : '#ffebee',
                color: job.stressLevel <= 30 ? 'success.dark' : job.stressLevel <= 60 ? 'warning.dark' : 'error.dark',
              }}
            />
          </Tooltip>
          {job.ptoTimeBlocks > 0 && (
            <Tooltip title="PTO time blocks per year">
              <Chip
                label={`🏖️ ${job.ptoTimeBlocks} PTO`}
                size="small"
                sx={{ fontSize: '0.7rem', bgcolor: '#e3f2fd' }}
              />
            </Tooltip>
          )}
          {(job.unpaidTimeOff ?? 0) > 0 && (
            <Tooltip title="Unpaid time off blocks">
              <Chip
                label={`🌴 ${job.unpaidTimeOff} unpaid`}
                size="small"
                sx={{ fontSize: '0.7rem', bgcolor: '#f3e5f5' }}
              />
            </Tooltip>
          )}
          <Tooltip title={`Raise schedule: ${raiseLabel(job.raiseSchedule)}`}>
            <Chip
              label={`📈 ${raiseLabel(job.raiseSchedule)}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Tooltip>
        </Stack>

        {/* Employment type chips */}
        <Stack direction="row" gap={0.5} sx={{ mb: 1 }}>
          {job.fullTime && (
            <Chip label="Full-time" size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#e8f5e9' }} />
          )}
          {job.partTime && (
            <Chip label="Part-time" size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#e3f2fd' }} />
          )}
          {job.seasonal && (
            <Chip label="Seasonal" size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#fff8e1' }} />
          )}
        </Stack>

        {/* Eligibility reasons */}
        {!job.eligible && !job.alreadyEmployed && job.eligibilityReasons.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {job.eligibilityReasons.slice(0, 3).map((r, i) => (
              <Typography key={i} variant="caption" color="error.main" display="block" sx={{ fontSize: '0.7rem' }}>
                • {r}
              </Typography>
            ))}
            {job.eligibilityReasons.length > 3 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                +{job.eligibilityReasons.length - 3} more…
              </Typography>
            )}
          </Box>
        )}

        {/* Expandable details */}
        <Box>
          <Box
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mt: 0.5 }}
            onClick={() => setExpanded((v) => !v)}
          >
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
              Details
            </Typography>
            <IconButton size="small" sx={{ p: 0, ml: 0.25 }}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>

          <Collapse in={expanded}>
            <Box sx={{ mt: 1 }}>
              {/* Requirements */}
              {hasReqs && (
                <>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                    Requirements
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
                    {Object.entries(reqSkills).map(([skill, val]) => (
                      <Chip
                        key={skill}
                        label={`${skill} ${Array.isArray(val) ? val[0] : val}%`}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#fce4ec' }}
                      />
                    ))}
                    {reqCerts.map((cert) => (
                      <Chip
                        key={cert}
                        label={`📜 ${cert}`}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#fff3e0' }}
                      />
                    ))}
                  </Stack>
                  <Divider sx={{ mb: 1 }} />
                </>
              )}

              {/* Annual gains */}
              {(skillGains.length > 0 || traitGains.length > 0) && (
                <>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                    Annual Gains
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
                    {skillGains.map(([key, val]) => (
                      <Chip key={key} label={`${key} +${val}%`} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#e3f2fd' }} />
                    ))}
                    {traitGains.map(([key, val]) => (
                      <Chip key={key} label={`${key} +${val}%`} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#f3e5f5' }} />
                    ))}
                  </Stack>
                  <Divider sx={{ mb: 1 }} />
                </>
              )}

              {/* Benefits */}
              {benefits.length > 0 && (
                <>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                    Benefits & Perks
                  </Typography>
                  <Stack gap={0.25} sx={{ mb: 1 }}>
                    {benefits.map((b, i) => (
                      <Typography key={i} variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                        {b}
                      </Typography>
                    ))}
                  </Stack>
                </>
              )}
            </Box>
          </Collapse>
        </Box>
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
