/**
 * BookmarkedJobsPanel
 *
 * Displays the list of jobs the player has bookmarked, with live eligibility
 * indicators computed from the player's current (base + delta) traits and skills.
 *
 * Requirements: 7.1, 7.3, 7.5
 */
import { Box, Typography, Chip, Paper, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import type { RootState } from '../../store';
import type { JobItem } from '../jobs/types';
import api from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookmarkedJobsPanelProps {
  currentTraits: Record<string, number>; // base + deltas
  currentSkills: Record<string, number>; // base + deltas
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSalary(n: number): string {
  return '$' + n.toLocaleString();
}

/**
 * Check whether the player meets all requirements for a job.
 * Requirements keys map to minimum values; we check both traits and skills.
 */
function checkEligibility(
  requirements: Record<string, unknown>,
  currentTraits: Record<string, number>,
  currentSkills: Record<string, number>,
): boolean {
  for (const [key, minValue] of Object.entries(requirements)) {
    if (typeof minValue !== 'number') continue;
    const traitVal = currentTraits[key] ?? 0;
    const skillVal = currentSkills[key] ?? 0;
    // A key can be satisfied by either the trait or the skill value
    const playerVal = Math.max(traitVal, skillVal);
    if (playerVal < minValue) return false;
  }
  return true;
}

// ─── Sub-component: single bookmarked job row ─────────────────────────────────

interface JobRowProps {
  job: JobItem;
  currentTraits: Record<string, number>;
  currentSkills: Record<string, number>;
}

function BookmarkedJobRow({ job, currentTraits, currentSkills }: JobRowProps) {
  const eligible = checkEligibility(
    job.requirements as Record<string, unknown>,
    currentTraits,
    currentSkills,
  );

  const requirementEntries = Object.entries(job.requirements as Record<string, unknown>).filter(
    ([, v]) => typeof v === 'number',
  ) as [string, number][];

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        {/* Left: title + salary */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {job.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {fmtSalary(job.baseSalary)}/yr base
          </Typography>

          {/* Requirements list */}
          {requirementEntries.length > 0 && (
            <Box sx={{ mt: 0.75 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                Requirements:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {requirementEntries.map(([key, minVal]) => {
                  const playerVal = Math.max(
                    currentTraits[key] ?? 0,
                    currentSkills[key] ?? 0,
                  );
                  const met = playerVal >= minVal;
                  return (
                    <Chip
                      key={key}
                      label={`${key}: ${minVal}`}
                      size="small"
                      color={met ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  );
                })}
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

export default function BookmarkedJobsPanel({
  currentTraits,
  currentSkills,
}: BookmarkedJobsPanelProps) {
  const bookmarkedJobIds = useSelector((s: RootState) => s.bookmarks.jobIds);
  const { gameSessionId } = useSelector((s: RootState) => s.auth);

  // Fetch all jobs for this session, then filter to bookmarked IDs client-side
  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobs', { gameSessionId, forBookmarks: true }],
    queryFn: async () => {
      if (!gameSessionId) throw new Error('No session');
      const res = await api.get('/jobs', { params: { gameSessionId, showAll: 'true' } });
      return res.data as { jobs: JobItem[] };
    },
    enabled: !!gameSessionId && bookmarkedJobIds.length > 0,
    staleTime: 60_000,
  });

  const bookmarkedJobs = (data?.jobs ?? []).filter((j) => bookmarkedJobIds.includes(j.id));

  // ── Empty state ────────────────────────────────────────────────────────────
  if (bookmarkedJobIds.length === 0) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Bookmarked Jobs
        </Typography>
        <Paper
          variant="outlined"
          sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderStyle: 'dashed' }}
        >
          <Typography variant="body2" color="text.secondary" gutterBottom>
            No jobs bookmarked yet.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Link to="/setup/jobs" style={{ color: 'inherit' }}>
              Browse jobs
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
          Bookmarked Jobs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Loading bookmarked jobs…
        </Typography>
      </Box>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Bookmarked Jobs
        </Typography>
        <Typography variant="body2" color="error">
          Failed to load job details.
        </Typography>
      </Box>
    );
  }

  // ── Job list ───────────────────────────────────────────────────────────────
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Bookmarked Jobs
        </Typography>
        <Chip
          label={bookmarkedJobs.length}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ height: 20, fontSize: '0.7rem' }}
        />
      </Stack>

      <Stack spacing={1}>
        {bookmarkedJobs.map((job) => (
          <BookmarkedJobRow
            key={job.id}
            job={job}
            currentTraits={currentTraits}
            currentSkills={currentSkills}
          />
        ))}
      </Stack>
    </Box>
  );
}
