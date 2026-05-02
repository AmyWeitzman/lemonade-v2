/**
 * ProgramCard — displays a single education program with eligibility,
 * tuition, skill gains, duration, and enroll/change-major/drop actions.
 * Requirements: Req 10, 3.1, 3.2, 3.5, 9.6
 */
import { useState } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Chip, Stack,
  Tooltip, IconButton, Button, Collapse, Divider, CircularProgress,
  LinearProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import SchoolIcon from '@mui/icons-material/School';
import { useSetupMode } from '../../contexts/SetupModeContext';
import BookmarkToggle from '../../features/bookmarks/BookmarkToggle';
import type { EducationProgram } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    certificate: '📜 Certificate',
    vocational: '🔧 Vocational',
    associates: "🎓 Associate's",
    bachelors: "🎓 Bachelor's",
    masters: "🎓 Master's",
    doctorate: '🎓 Doctorate',
    professional: '🏥 Professional',
  };
  return labels[type] ?? type;
}

function typeColor(type: string): string {
  const colors: Record<string, string> = {
    certificate: '#fff3e0',
    vocational: '#fce4ec',
    associates: '#e3f2fd',
    bachelors: '#e8f5e9',
    masters: '#f3e5f5',
    doctorate: '#ede7f6',
    professional: '#e0f2f1',
  };
  return colors[type] ?? '#f5f5f5';
}

function stressColor(level: number): 'success' | 'warning' | 'error' {
  if (level <= 20) return 'success';
  if (level <= 40) return 'warning';
  return 'error';
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString();
}

function skillGainSummary(gains: Record<string, number>): string[] {
  return Object.entries(gains)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k} +${v}%`);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  program: EducationProgram;
  onEnroll: (programId: string, partTime: boolean) => void;
  onChangeMajor: (programId: string) => void;
  onDrop: () => void;
  enrolling: boolean;
  isCurrentProgram: boolean; // player is enrolled in a different program
  hasActiveEnrollment: boolean; // player is enrolled in ANY program
  isBookmarked?: boolean;
  onBookmarkToggle?: (programId: string) => void;
  bookmarkLoading?: boolean;
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
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const { isSetupMode } = useSetupMode();

  const autoGains = skillGainSummary(program.skillGains?.automatic ?? {});
  const majorGains = skillGainSummary(program.skillGains?.major ?? {});
  const totalCredits =
    program.totalCredits.generalEducation +
    program.totalCredits.field +
    program.totalCredits.major;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: program.alreadyEnrolled
          ? 'primary.main'
          : program.eligible
          ? 'divider'
          : 'error.light',
        bgcolor: program.alreadyEnrolled
          ? 'primary.50'
          : program.eligible
          ? 'background.paper'
          : 'action.hover',
        opacity: program.eligible || program.alreadyEnrolled || program.alreadyGraduated ? 1 : 0.85,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
        position: 'relative',
      }}
    >
      {/* Status badges */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 0.5,
          flexWrap: 'wrap',
          maxWidth: 160,
          justifyContent: 'flex-end',
          zIndex: 1,
        }}
      >
        {onBookmarkToggle && (
          <BookmarkToggle
            itemId={program.id}
            itemName={program.name}
            type="education"
            isBookmarked={isBookmarked ?? false}
            onToggle={(id) => onBookmarkToggle(id)}
            loading={bookmarkLoading}
          />
        )}
        {program.alreadyEnrolled && (
          <Chip
            label="✅ Enrolled"
            size="small"
            color="primary"
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
        )}
        {program.alreadyGraduated && (
          <Chip
            label="🎓 Graduated"
            size="small"
            color="success"
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
        )}
        {program.isShortcut && (
          <Tooltip title="CC shortcut: only 2 years needed (same major)">
            <Chip
              label="⚡ Shortcut"
              size="small"
              color="warning"
              sx={{ fontSize: '0.65rem', height: 20 }}
            />
          </Tooltip>
        )}
        {program.isStem && (
          <Chip
            label="🔬 STEM"
            size="small"
            sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#e3f2fd' }}
          />
        )}
      </Box>

      <CardContent sx={{ pb: 0, pr: 10 }}>
        {/* Title + eligibility icon */}
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 0.75 }}>
          <Tooltip
            title={
              program.alreadyEnrolled
                ? 'Currently enrolled'
                : program.alreadyGraduated
                ? 'Already graduated from this program'
                : program.eligible
                ? 'You meet all requirements'
                : program.eligibilityReasons.join(' • ')
            }
            arrow
          >
            <Box sx={{ mt: 0.25, flexShrink: 0 }}>
              {program.alreadyEnrolled ? (
                <SchoolIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              ) : program.eligible || program.alreadyGraduated ? (
                <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
              ) : (
                <BlockIcon sx={{ fontSize: 18, color: 'error.main' }} />
              )}
            </Box>
          </Tooltip>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {program.name}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
              <Chip
                label={typeLabel(program.type)}
                size="small"
                sx={{ fontSize: '0.6rem', height: 18, bgcolor: typeColor(program.type) }}
              />
              {program.field && (
                <Chip
                  label={program.field}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 18 }}
                />
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Key stats */}
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1 }}>
          <Tooltip title="Full-time annual tuition">
            <Chip
              label={`💰 ${fmtMoney(program.tuitionFullTime)}/yr FT`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Tooltip>
          {program.tuitionPartTime && (
            <Tooltip title="Part-time annual tuition">
              <Chip
                label={`💰 ${fmtMoney(program.tuitionPartTime)}/yr PT`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}
          <Tooltip title="Full-time duration in years">
            <Chip
              label={`⏱ ${program.isShortcut && program.shortcutDuration ? program.shortcutDuration : program.durationFT} yr${program.durationFT !== 1 ? 's' : ''} FT`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Tooltip>
          {program.durationPT && (
            <Tooltip title="Part-time duration in years">
              <Chip
                label={`⏱ ${program.durationPT} yrs PT`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}
          <Tooltip title="Stress added per year while enrolled">
            <Chip
              label={`😰 ${program.stressLevel}% stress`}
              size="small"
              color={stressColor(program.stressLevel)}
              sx={{ fontSize: '0.7rem' }}
            />
          </Tooltip>
        </Stack>

        {/* Eligibility reasons */}
        {!program.eligible && !program.alreadyEnrolled && !program.alreadyGraduated && program.eligibilityReasons.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {program.eligibilityReasons.slice(0, 3).map((r, i) => (
              <Typography key={i} variant="caption" color="error.main" display="block" sx={{ fontSize: '0.7rem' }}>
                • {r}
              </Typography>
            ))}
            {program.eligibilityReasons.length > 3 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                +{program.eligibilityReasons.length - 3} more…
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
              {/* Credit breakdown */}
              {totalCredits > 0 && (
                <>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                    Credit Requirements
                  </Typography>
                  <Stack gap={0.5} sx={{ mb: 1 }}>
                    {program.totalCredits.generalEducation > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                        📚 Gen Ed: {program.totalCredits.generalEducation} credit{program.totalCredits.generalEducation !== 1 ? 's' : ''}
                      </Typography>
                    )}
                    {program.totalCredits.field > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                        🔍 Field: {program.totalCredits.field} credit{program.totalCredits.field !== 1 ? 's' : ''}
                      </Typography>
                    )}
                    {program.totalCredits.major > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                        🎯 Major: {program.totalCredits.major} credit{program.totalCredits.major !== 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Stack>
                  <Divider sx={{ mb: 1 }} />
                </>
              )}

              {/* Skill gains */}
              {(autoGains.length > 0 || majorGains.length > 0) && (
                <>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                    Annual Skill Gains
                  </Typography>
                  {autoGains.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 0.5 }}>
                      {autoGains.map((g) => (
                        <Chip key={g} label={g} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#e3f2fd' }} />
                      ))}
                    </Stack>
                  )}
                  {majorGains.length > 0 && (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.25 }}>
                        Major-specific:
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
                        {majorGains.map((g) => (
                          <Chip key={g} label={g} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#f3e5f5' }} />
                        ))}
                      </Stack>
                    </>
                  )}
                  <Divider sx={{ mb: 1 }} />
                </>
              )}

              {/* Part-time note */}
              {program.partTimeAllowed && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                  ℹ️ Part-time grants half skill gains per year
                </Typography>
              )}
            </Box>
          </Collapse>
        </Box>
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
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
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
