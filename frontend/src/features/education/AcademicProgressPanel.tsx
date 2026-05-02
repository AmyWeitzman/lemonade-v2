/**
 * AcademicProgressPanel — shows current enrollment status, credit progress,
 * estimated graduation year, scholarship balance, and scholarship apply button.
 * Requirements: Req 10
 */
import {
  Box, Paper, Typography, Stack, LinearProgress, Chip, Tooltip,
  Button, Divider, CircularProgress,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { ActiveEducation } from './types';

interface Props {
  education: ActiveEducation | null;
  playerAge: number;
  onApplyScholarship: () => void;
  applyingScholarship: boolean;
  scholarshipAppliedThisYear: boolean;
}

function creditBar(completed: number, total: number, label: string, color: string) {
  const pct = total > 0 ? Math.min(100, (completed / total) * 100) : 0;
  return (
    <Box sx={{ mb: 1 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
          {completed} / {total}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
    </Box>
  );
}

export default function AcademicProgressPanel({
  education,
  playerAge,
  onApplyScholarship,
  applyingScholarship,
  scholarshipAppliedThisYear,
}: Props) {
  if (!education) return null;

  const { creditsCompleted, totalCredits, isPartTime, programName, programType, programField } = education;

  // Remaining credits
  const genEdRemaining = Math.max(0, totalCredits.generalEducation - creditsCompleted.generalEducation);
  const fieldRemaining = Math.max(0, totalCredits.field - creditsCompleted.field);
  const majorRemaining = Math.max(0, totalCredits.major - creditsCompleted.major);
  const totalRemaining = genEdRemaining + fieldRemaining + majorRemaining;

  // Estimated graduation year
  const creditsPerYear = isPartTime ? 0.5 : 1;
  const yearsLeft = creditsPerYear > 0 ? Math.ceil(totalRemaining / creditsPerYear) : 0;
  const estimatedGradAge = playerAge + yearsLeft;

  // Scholarship balance (sum of all awarded amounts)
  const scholarshipBalance = education.scholarships.reduce((sum, s) => sum + s.amount, 0);

  // Overall progress
  const totalCreditsNeeded =
    totalCredits.generalEducation + totalCredits.field + totalCredits.major;
  const totalCompleted =
    creditsCompleted.generalEducation + creditsCompleted.field + creditsCompleted.major;
  const overallPct = totalCreditsNeeded > 0
    ? Math.min(100, (totalCompleted / totalCreditsNeeded) * 100)
    : 0;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2, p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <SchoolIcon fontSize="small" color="primary" />
        <Typography variant="body2" fontWeight={700} color="primary.main">
          Current Enrollment
        </Typography>
        <Chip
          label={isPartTime ? 'Part-time' : 'Full-time'}
          size="small"
          color={isPartTime ? 'default' : 'primary'}
          sx={{ fontSize: '0.65rem', height: 18 }}
        />
      </Stack>

      {/* Program info */}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="body2" fontWeight={600}>
          {programName}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.25 }}>
          <Chip
            label={programType}
            size="small"
            sx={{ fontSize: '0.6rem', height: 16 }}
          />
          {programField && (
            <Chip
              label={programField}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 16 }}
            />
          )}
        </Stack>
      </Box>

      <Divider sx={{ mb: 1.5 }} />

      {/* Credit progress bars */}
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.75 }}>
        Academic Progress
      </Typography>

      {totalCredits.generalEducation > 0 &&
        creditBar(creditsCompleted.generalEducation, totalCredits.generalEducation, '📚 General Education', '#42a5f5')}
      {totalCredits.field > 0 &&
        creditBar(creditsCompleted.field, totalCredits.field, '🔍 Field Credits', '#66bb6a')}
      {totalCredits.major > 0 &&
        creditBar(creditsCompleted.major, totalCredits.major, '🎯 Major Credits', '#ab47bc')}

      {/* Overall */}
      <Box sx={{ mt: 0.5 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
          <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
            Overall
          </Typography>
          <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
            {Math.round(overallPct)}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={overallPct}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': { borderRadius: 4 },
          }}
        />
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Graduation estimate + scholarship */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Box>
          <Tooltip title="Estimated age at graduation based on current enrollment status">
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <EmojiEventsIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                Est. graduation: age <strong>{estimatedGradAge}</strong>
                {yearsLeft > 0 && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, fontSize: '0.7rem' }}>
                    ({yearsLeft} yr{yearsLeft !== 1 ? 's' : ''} left)
                  </Typography>
                )}
              </Typography>
            </Stack>
          </Tooltip>
          {scholarshipBalance > 0 && (
            <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.25, fontSize: '0.72rem' }}>
              🏆 Scholarship balance: ${scholarshipBalance.toLocaleString()}
            </Typography>
          )}
        </Box>

        <Tooltip
          title={
            scholarshipAppliedThisYear
              ? 'Already applied for a scholarship this year'
              : 'Apply for a scholarship (once per year)'
          }
        >
          <span>
            <Button
              size="small"
              variant="outlined"
              color="success"
              disabled={scholarshipAppliedThisYear || applyingScholarship}
              startIcon={applyingScholarship ? <CircularProgress size={12} /> : undefined}
              onClick={onApplyScholarship}
              sx={{ fontSize: '0.7rem', flexShrink: 0 }}
            >
              {scholarshipAppliedThisYear ? '✅ Applied' : '🏆 Apply for Scholarship'}
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Paper>
  );
}
