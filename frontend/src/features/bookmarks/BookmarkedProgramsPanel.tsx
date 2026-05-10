/**
 * BookmarkedProgramsPanel
 *
 * Displays the list of education programs the player has bookmarked, with live
 * eligibility indicators based on the backend-annotated `eligible` field
 * (computed from the player's current rolled-but-not-yet-confirmed stats).
 *
 * Requirements: 7.2, 7.4, 7.6
 */
import { Box, Typography, Chip, Paper, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import type { RootState } from '../../store';
import type { EducationProgram } from '../education/types';
import api from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookmarkedProgramsPanelProps {
  currentTraits: Record<string, number>; // base + deltas
  currentSkills: Record<string, number>; // base + deltas
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString();
}

/** Human-readable label for program type. */
function fmtProgramType(type: EducationProgram['type']): string {
  const labels: Record<EducationProgram['type'], string> = {
    associates: "Associate's",
    bachelors: "Bachelor's",
    masters: "Master's",
    doctorate: 'Doctorate',
    certificate: 'Certificate',
    vocational: 'Vocational',
    professional: 'Professional',
  };
  return labels[type] ?? type;
}

// ─── Sub-component: single bookmarked program row ─────────────────────────────

interface ProgramRowProps {
  program: EducationProgram;
}

function BookmarkedProgramRow({ program }: ProgramRowProps) {
  // Use the backend-annotated eligible field — it is computed from the player's
  // current (rolled but not yet confirmed) stats, which is the correct baseline
  // for the setup phase.
  const eligible = program.eligible;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        {/* Left: name + type + tuition */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {program.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {fmtProgramType(program.type)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Tuition: {fmtCurrency(program.tuitionFullTime)}/yr (full-time)
          </Typography>

          {/* Eligibility reasons when not eligible */}
          {!eligible && program.eligibilityReasons.length > 0 && (
            <Box sx={{ mt: 0.75 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                Requirements not met:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {program.eligibilityReasons.map((reason, idx) => (
                  <Chip
                    key={idx}
                    label={reason}
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>

        {/* Right: eligibility indicator */}
        <Box sx={{ flexShrink: 0, pt: 0.25 }}>
          {eligible ? (
            <Chip
              icon={<CheckCircleIcon />}
              label="Eligible"
              color="success"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          ) : (
            <Chip
              icon={<CancelIcon />}
              label="Not eligible"
              color="error"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BookmarkedProgramsPanel({
  currentTraits: _currentTraits,
  currentSkills: _currentSkills,
}: BookmarkedProgramsPanelProps) {
  const bookmarkedProgramIds = useSelector((s: RootState) => s.bookmarks.programIds);
  const { gameSessionId } = useSelector((s: RootState) => s.auth);

  // Fetch all education programs for this session, then filter to bookmarked IDs client-side
  const { data, isLoading, isError } = useQuery({
    queryKey: ['education', { gameSessionId, forBookmarks: true }],
    queryFn: async () => {
      if (!gameSessionId) throw new Error('No session');
      const res = await api.get('/education', { params: { gameSessionId } });
      return res.data as { programs: EducationProgram[] };
    },
    enabled: !!gameSessionId && bookmarkedProgramIds.length > 0,
    staleTime: 60_000,
  });

  const bookmarkedPrograms = (data?.programs ?? []).filter((p) =>
    bookmarkedProgramIds.includes(p.id),
  );

  // ── Empty state ────────────────────────────────────────────────────────────
  if (bookmarkedProgramIds.length === 0) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Bookmarked Programs
        </Typography>
        <Paper
          variant="outlined"
          sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderStyle: 'dashed' }}
        >
          <Typography variant="body2" color="text.secondary" gutterBottom>
            No education programs bookmarked yet.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Link to="/setup/education" style={{ color: 'inherit' }}>
              Browse programs
            </Link>{' '}
            to bookmark ones you're interested in.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Bookmarked Programs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Loading bookmarked programs…
        </Typography>
      </Box>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Bookmarked Programs
        </Typography>
        <Typography variant="body2" color="error">
          Failed to load program details.
        </Typography>
      </Box>
    );
  }

  // ── Program list ───────────────────────────────────────────────────────────
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Bookmarked Programs
        </Typography>
        <Chip
          label={bookmarkedPrograms.length}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ height: 20, fontSize: '0.7rem' }}
        />
      </Stack>

      <Stack spacing={1}>
        {bookmarkedPrograms.map((program) => (
          <BookmarkedProgramRow key={program.id} program={program} />
        ))}
      </Stack>
    </Box>
  );
}
