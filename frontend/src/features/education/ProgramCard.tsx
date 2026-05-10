/**
 * ProgramCard — displays a single education program with eligibility,
 * tuition, skill gains, duration, and enroll/change-major/drop actions.
 * Styled to match JobCard patterns (border color, label+chip grid, etc.)
 * Requirements: Req 10, 3.1, 3.2, 3.5, 9.6
 */
import {
  Box, Card, CardContent, CardActions, Typography, Chip, Stack,
  Button, CircularProgress,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { useSetupMode } from '../../contexts/SetupModeContext';
import BookmarkToggle from '../../features/bookmarks/BookmarkToggle';
import type { EducationProgram } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    certificate: 'Professional',
    vocational: 'Vocational',
    associates: "Associate's",
    bachelors: "Bachelor's",
    masters: "Master's",
    doctorate: 'Doctorate',
    professional: 'Professional',
  };
  return labels[type] ?? type;
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString();
}

function skillGainSummary(gains: Record<string, number>): string[] {
  return Object.entries(gains)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${formatKey(k)} +${v}%`);
}

const chipSx = { fontSize: '0.85rem', height: 26, bgcolor: 'rgba(47, 182, 211, 0.15)' } as const;

/** Time blocks needed per year based on program type and studiousness level (0-100) */
function getTimeBlocks(type: string, studiousness: number): number {
  const isHigh = studiousness >= 67;
  const isLow = studiousness < 34;
  if (type === 'vocational') return 16;
  if (type === 'doctorate') return isHigh ? 20 : isLow ? 28 : 24;
  return isHigh ? 16 : isLow ? 24 : 20;
}

/**
 * Stress per year by program type, track, and studiousness level.
 * H = Humanities stress, S = STEM stress from academic actions seed data.
 * High studiousness → H values (lower stress); Low studiousness → S values (higher stress).
 */
function getStress(type: string, isStem: boolean, studiousness: number): number {
  const isHigh = studiousness >= 67;
  const isLow = studiousness < 34;
  if (type === 'vocational') return 20;
  if (type === 'certificate') return isHigh ? 48 : isLow ? 64 : 56;
  if (type === 'associates') {
    if (isStem) return isHigh ? 40 : isLow ? 48 : 40;
    return isHigh ? 30 : isLow ? 36 : 30;
  }
  if (type === 'bachelors') {
    if (isStem) return isHigh ? 50 : isLow ? 58 : 50;
    return isHigh ? 40 : isLow ? 48 : 40;
  }
  if (type === 'masters') {
    if (isStem) return isHigh ? 62 : isLow ? 74 : 68;
    return isHigh ? 55 : isLow ? 65 : 60;
  }
  if (type === 'doctorate') {
    if (isStem) return isHigh ? 72 : isLow ? 84 : 78;
    return isHigh ? 64 : isLow ? 76 : 70;
  }
  return isStem ? 50 : 40;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  program: EducationProgram;
  onEnroll: (programId: string, partTime: boolean) => void;
  onChangeMajor: (programId: string) => void;
  onDrop: () => void;
  enrolling: boolean;
  isCurrentProgram: boolean;
  hasActiveEnrollment: boolean;
  isBookmarked?: boolean;
  onBookmarkToggle?: (programId: string) => void;
  bookmarkLoading?: boolean;
  /** Player's studiousness level (0-100). If not provided, uses average (50). */
  studiousness?: number;
}

export default function ProgramCard({
  program,
  onEnroll,
  onChangeMajor,
  onDrop,
  enrolling,
  isCurrentProgram,
  hasActiveEnrollment,
  isBookmarked,
  onBookmarkToggle,
  bookmarkLoading,
  studiousness = 50, // default to average
}: Props) {
  const { isSetupMode } = useSetupMode();

  const autoGains = skillGainSummary(program.skillGains?.automatic ?? {});
  const majorGains = skillGainSummary(program.skillGains?.major ?? {});

  // In setup mode, treat all programs as eligible for border color
  const effectiveEligible = isSetupMode ? true : program.eligible;

  const borderColor = program.alreadyEnrolled
    ? 'info.main'
    : program.alreadyGraduated
    ? 'success.main'
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
        bgcolor: program.alreadyEnrolled
          ? 'success.50'
          : effectiveEligible
          ? 'background.paper'
          : 'action.hover',
        opacity: effectiveEligible || program.alreadyEnrolled || program.alreadyGraduated ? 1 : 0.85,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
        position: 'relative',
        fontSize: '0.9rem',
      }}
    >
      {/* Bookmark in top-right */}
      {onBookmarkToggle && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <BookmarkToggle
            itemId={program.id}
            itemName={program.name}
            type="education"
            isBookmarked={isBookmarked ?? false}
            onToggle={(id) => onBookmarkToggle(id)}
            loading={bookmarkLoading}
          />
        </Box>
      )}

      <CardContent sx={{ pb: 0, pr: 10, pt: 1.5 }}>
        {/* Title + Type subtitle */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3, fontSize: '1.1rem', mb: 0.1 }}>
          {program.name}
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.secondary', mb: 0.75 }}>
          {typeLabel(program.type)}
        </Typography>

        {/* 2-column stats grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 0.75 }}>
          {/* Row 1: Tuition | Duration */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Tuition:
            </Typography>
            <Chip label={`${fmtMoney(program.tuitionFullTime)}/yr`} size="small" sx={chipSx} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Duration:
            </Typography>
            <Chip
              label={`${program.isShortcut && program.shortcutDuration ? program.shortcutDuration : program.durationFT} yr${program.durationFT !== 1 ? 's' : ''}`}
              size="small"
              sx={chipSx}
            />
          </Box>

          {/* Row 2: Time Blocks | Stress */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Time Blocks:
            </Typography>
            <Chip label={`${getTimeBlocks(program.type, studiousness)}`} size="small" sx={chipSx} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Stress:
            </Typography>
            <Chip label={`${getStress(program.type, program.isStem, studiousness)}%`} size="small" sx={chipSx} />
          </Box>

          {/* Row 3: Track | Field */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Track:
            </Typography>
            <Chip label={program.isStem ? 'STEM' : 'Humanities'} size="small" sx={chipSx} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Field:
            </Typography>
            <Chip
              label={
                (program.type === 'vocational') ? 'Vocational' :
                (program.type === 'certificate') ? 'Professional' :
                program.field
                  ? program.field.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                  : 'General'
              }
              size="small"
              sx={chipSx}
            />
          </Box>
        </Box>

        {/* Eligibility reasons */}
        {!program.eligible && !program.alreadyEnrolled && !program.alreadyGraduated && program.eligibilityReasons.length > 0 && !isSetupMode && (
          <Box sx={{ mb: 0.75 }}>
            {program.eligibilityReasons.slice(0, 3).map((r, i) => (
              <Typography key={i} sx={{ fontSize: '0.8rem', color: 'error.main' }}>
                • {r}
              </Typography>
            ))}
            {program.eligibilityReasons.length > 3 && (
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                +{program.eligibilityReasons.length - 3} more…
              </Typography>
            )}
          </Box>
        )}

        {/* Annual Skill/Trait Gains — always visible, single merged list */}
        {(autoGains.length > 0 || majorGains.length > 0) && (
          <Box sx={{ mb: 0.75 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 600, mb: 0.25 }}>
              Annual Skill/Trait Gains
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.4}>
              {[...autoGains, ...majorGains].map((g) => (
                <Chip key={g} label={g} size="small" sx={{ fontSize: '0.8rem', height: 24, bgcolor: 'rgba(47, 182, 211, 0.15)' }} />
              ))}
            </Stack>
          </Box>
        )}

      </CardContent>

      {!isSetupMode && (
        <CardActions sx={{ pt: 0.5, pb: 1, px: 2, justifyContent: 'flex-end', gap: 1 }}>
          {program.alreadyEnrolled ? (
            <>
              {/* Change major — only for degree programs */}
              {['associates', 'bachelors', 'masters', 'doctorate'].includes(program.type) && (
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() => onChangeMajor(program.id)}
                  sx={{ fontSize: '0.7rem' }}
                >
                  Change Major
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={onDrop}
                sx={{ fontSize: '0.7rem' }}
              >
                Drop Out
              </Button>
            </>
          ) : program.alreadyGraduated ? (
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'success.main' }}>
              ✅ Degree earned
            </Typography>
          ) : (
            <>
              {/* Part-time enroll button */}
              {program.partTimeAllowed && (
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  disabled={!program.eligible || enrolling}
                  startIcon={enrolling ? <CircularProgress size={12} /> : undefined}
                  onClick={() => onEnroll(program.id, true)}
                  sx={{ fontSize: '0.7rem' }}
                >
                  Enroll (PT)
                </Button>
              )}
              {/* Full-time enroll button */}
              <Button
                size="small"
                variant={program.eligible ? 'contained' : 'outlined'}
                color={program.eligible ? 'primary' : 'inherit'}
                disabled={!program.eligible || enrolling}
                startIcon={enrolling ? <CircularProgress size={12} /> : <SchoolIcon sx={{ fontSize: '0.9rem !important' }} />}
                onClick={() => onEnroll(program.id, false)}
                sx={{ fontSize: '0.7rem' }}
              >
                Enroll (FT)
              </Button>
            </>
          )}
        </CardActions>
      )}
    </Card>
  );
}
