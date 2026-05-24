/**
 * ProgramCard — displays a single education program with eligibility,
 * tuition, skill gains, duration, and enroll/change-major/drop actions.
 * Requirements: Req 10, 3.1, 3.2, 3.5, 9.6
 */
import {
  Box, Card, CardContent, CardActions, Typography, Chip,
  Button, CircularProgress,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { useSetupMode } from '../../contexts/SetupModeContext';
import BookmarkToggle from '../../features/bookmarks/BookmarkToggle';
import type { EducationProgram } from './types';
import { stressOutlineSx, EDU_TYPE_COLORS, EDU_FIELD_OUTLINE, EDU_TRACK_OUTLINE } from '../../lib/colorMaps';
import {
  statChipSx, skillGainSummary, gainStringToCamelKey,
  StatRow, StatChip, IconBadge, IconBadgeGrid,
} from '../../components/cards/cardComponents';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    certificate: 'Professional', vocational: 'Vocational',
    associates: "Associate's", bachelors: "Bachelor's",
    masters: "Master's", doctorate: 'Doctorate', professional: 'Professional',
  };
  return labels[type] ?? type;
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString();
}

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
 * High studiousness → lower stress; Low studiousness → higher stress.
 */
function getStress(type: string, isStem: boolean, studiousness: number): number {
  const isHigh = studiousness >= 67;
  const isLow = studiousness < 34;
  if (type === 'vocational') return 20;
  if (type === 'certificate') return isHigh ? 48 : isLow ? 64 : 56;
  if (type === 'associates') return isStem ? (isHigh ? 40 : isLow ? 48 : 40) : (isHigh ? 30 : isLow ? 36 : 30);
  if (type === 'bachelors')  return isStem ? (isHigh ? 50 : isLow ? 58 : 50) : (isHigh ? 40 : isLow ? 48 : 40);
  if (type === 'masters')    return isStem ? (isHigh ? 62 : isLow ? 74 : 68) : (isHigh ? 55 : isLow ? 65 : 60);
  if (type === 'doctorate')  return isStem ? (isHigh ? 72 : isLow ? 84 : 78) : (isHigh ? 64 : isLow ? 76 : 70);
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
  /** Player's studiousness level (0-100). Defaults to 50 (average). */
  studiousness?: number;
}

export default function ProgramCard({
  program, onEnroll, onChangeMajor, onDrop, enrolling,
  isCurrentProgram: _isCurrentProgram, hasActiveEnrollment: _hasActiveEnrollment,
  isBookmarked, onBookmarkToggle, bookmarkLoading, studiousness = 50,
}: Props) {
  const { isSetupMode } = useSetupMode();

  const autoGains = skillGainSummary(program.skillGains?.automatic ?? {});
  const majorGains = skillGainSummary(program.skillGains?.major ?? {});
  const allGains = [...autoGains, ...majorGains];

  const effectiveEligible = isSetupMode ? true : program.eligible;
  const borderColor = program.alreadyEnrolled ? 'info.main'
    : program.alreadyGraduated ? 'success.main'
    : effectiveEligible ? 'success.main'
    : 'error.main';

  const stress = getStress(program.type, program.isStem, studiousness);

  // Field label + outline color
  const rawField =
    program.type === 'vocational' ? 'vocational' :
    program.type === 'certificate' ? 'professional' :
    (program.field ?? 'general');
  const fieldKey = rawField.toLowerCase();
  const fieldLabel = rawField.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const fc = EDU_FIELD_OUTLINE[fieldKey] ?? { border: '#aaa', color: '#333' };

  // Track outline color
  const trackKey = program.isStem ? 'stem' : 'humanities';
  const tc = EDU_TRACK_OUTLINE[trackKey] ?? { border: '#aaa', color: '#333' };

  // Type chip color
  const typec = EDU_TYPE_COLORS[program.type] ?? { bg: 'rgba(47,182,211,0.15)', text: 'inherit' };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2, borderColor, borderWidth: 2,
        bgcolor: program.alreadyEnrolled ? 'success.50' : effectiveEligible ? 'background.paper' : 'action.hover',
        opacity: effectiveEligible || program.alreadyEnrolled || program.alreadyGraduated ? 1 : 0.85,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
        position: 'relative', fontSize: '0.9rem',
      }}
    >
      {onBookmarkToggle && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <BookmarkToggle itemId={program.id} itemName={program.name} type="education"
            isBookmarked={isBookmarked ?? false} onToggle={(id) => onBookmarkToggle(id)} loading={bookmarkLoading} />
        </Box>
      )}

      <CardContent sx={{ pb: 0, pr: 10, pt: 1.5 }}>
        {/* Title + Type badge */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3, fontSize: '1.1rem', mb: 0.1 }}>
          {program.name}
        </Typography>
        <Chip label={typeLabel(program.type)} size="small"
          sx={{ fontSize: '0.8rem', height: 22, mb: 0.75, bgcolor: typec.bg, color: typec.text, fontWeight: 700 }} />

        {/* 2-column stats grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 0.75 }}>
          <StatRow label="Tuition:">
            <StatChip label={`${fmtMoney(program.tuitionFullTime)}/yr`} />
          </StatRow>
          <StatRow label="Duration:">
            <StatChip label={`${program.isShortcut && program.shortcutDuration ? program.shortcutDuration : program.durationFT} yr${program.durationFT !== 1 ? 's' : ''}`} />
          </StatRow>
          <StatRow label="Time Blocks:">
            <StatChip label={`${getTimeBlocks(program.type, studiousness)}`} />
          </StatRow>
          <StatRow label="Stress:">
            <Chip label={`${stress}%`} size="small" sx={stressOutlineSx(stress)} />
          </StatRow>
          <StatRow label="Track:">
            <Chip label={program.isStem ? 'STEM' : 'Humanities'} size="small"
              sx={{ ...statChipSx, bgcolor: 'transparent', border: `1.5px solid ${tc.border}`, color: tc.color, fontWeight: 600 }} />
          </StatRow>
          <StatRow label="Field:">
            <Chip label={fieldLabel} size="small"
              sx={{ ...statChipSx, bgcolor: 'transparent', border: `1.5px solid ${fc.border}`, color: fc.color, fontWeight: 600 }} />
          </StatRow>
        </Box>

        {/* Eligibility reasons */}
        {!program.eligible && !program.alreadyEnrolled && !program.alreadyGraduated && program.eligibilityReasons.length > 0 && !isSetupMode && (
          <Box sx={{ mb: 0.75 }}>
            {program.eligibilityReasons.slice(0, 3).map((r, i) => (
              <Typography key={i} sx={{ fontSize: '0.8rem', color: 'error.main' }}>• {r}</Typography>
            ))}
            {program.eligibilityReasons.length > 3 && (
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                +{program.eligibilityReasons.length - 3} more…
              </Typography>
            )}
          </Box>
        )}

        {/* Annual Skill/Trait Gains */}
        {allGains.length > 0 && (
          <Box sx={{ mb: 0.75 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
              Annual Skill/Trait Gains
            </Typography>
            <IconBadgeGrid>
              {allGains.map((g) => (
                <IconBadge key={g} skillKey={gainStringToCamelKey(g)} tooltip={g} />
              ))}
            </IconBadgeGrid>
          </Box>
        )}
      </CardContent>

      {!isSetupMode && (
        <CardActions sx={{ pt: 0.5, pb: 1, px: 2, justifyContent: 'flex-end', gap: 1 }}>
          {program.alreadyEnrolled ? (
            <>
              {['associates', 'bachelors', 'masters', 'doctorate'].includes(program.type) && (
                <Button size="small" variant="outlined" color="primary"
                  onClick={() => onChangeMajor(program.id)} sx={{ fontSize: '0.7rem' }}>
                  Change Major
                </Button>
              )}
              <Button size="small" variant="outlined" color="error" onClick={onDrop} sx={{ fontSize: '0.7rem' }}>
                Drop Out
              </Button>
            </>
          ) : program.alreadyGraduated ? (
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'success.main' }}>✅ Degree earned</Typography>
          ) : (
            <>
              {program.partTimeAllowed && (
                <Button size="small" variant="outlined" color="primary"
                  disabled={!program.eligible || enrolling}
                  startIcon={enrolling ? <CircularProgress size={12} /> : undefined}
                  onClick={() => onEnroll(program.id, true)} sx={{ fontSize: '0.7rem' }}>
                  Enroll (PT)
                </Button>
              )}
              <Button size="small" variant={program.eligible ? 'contained' : 'outlined'}
                color={program.eligible ? 'primary' : 'inherit'}
                disabled={!program.eligible || enrolling}
                startIcon={enrolling ? <CircularProgress size={12} /> : <SchoolIcon sx={{ fontSize: '0.9rem !important' }} />}
                onClick={() => onEnroll(program.id, false)} sx={{ fontSize: '0.7rem' }}>
                Enroll (FT)
              </Button>
            </>
          )}
        </CardActions>
      )}
    </Card>
  );
}
