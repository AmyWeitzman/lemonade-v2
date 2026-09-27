/**
 * BookmarkedJobsPanel
 *
 * Displays bookmarked jobs with live skill/trait requirement badges.
 * Requirements: 7.1, 7.3, 7.5
 */
import { Box, Typography, Chip, Paper, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import type { RootState } from '../../store';
import type { JobItem } from '../jobs/types';
import api from '../../lib/api';
import { IconBadge, IconBadgeGrid } from '../../components/cards/cardComponents';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookmarkedJobsPanelProps {
  currentTraits: Record<string, number>;
  currentSkills: Record<string, number>;
}

// ─── Sub-component: single bookmarked job row ─────────────────────────────────

interface JobRowProps {
  job: JobItem;
  currentTraits: Record<string, number>;
  currentSkills: Record<string, number>;
}

function BookmarkedJobRow({ job, currentTraits: _currentTraits, currentSkills: _currentSkills }: JobRowProps) {
  const reqSkills = (job.requirements?.skills ?? {}) as Record<string, unknown>;
  const reqCerts = (job.requirements?.certifications ?? []) as string[];
  const hasReqs = Object.keys(reqSkills).length > 0 || reqCerts.length > 0;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Typography variant="body2" fontWeight={700} noWrap sx={{ mb: hasReqs ? 0.75 : 0 }}>
        {job.title}
      </Typography>

      {hasReqs && (
        <IconBadgeGrid>
          {Object.keys(reqSkills).map((skill) => (
            <IconBadge key={skill} skillKey={skill} tooltip={skill.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()} />
          ))}
          {reqCerts.map((cert) => (
            <IconBadge key={cert} skillKey="__cert__" tooltip={cert === 'CPR' ? 'CPR Certification' : cert} />
          ))}
        </IconBadgeGrid>
      )}
    </Paper>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BookmarkedJobsPanel({
  currentTraits: _currentTraits,
  currentSkills: _currentSkills,
}: BookmarkedJobsPanelProps) {
  const bookmarkedJobIds = useSelector((s: RootState) => s.bookmarks.jobIds);
  const { gameSessionId } = useSelector((s: RootState) => s.auth);

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

  if (bookmarkedJobIds.length === 0) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Bookmarked Jobs</Typography>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>No jobs bookmarked yet.</Typography>
          <Typography variant="body2" color="text.secondary">
            <Link to="/setup/jobs" style={{ color: 'inherit' }}>Browse jobs</Link>{' '}to bookmark ones you're interested in.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Bookmarked Jobs</Typography>
        <Typography variant="body2" color="text.secondary">Loading bookmarked jobs…</Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Bookmarked Jobs</Typography>
        <Typography variant="body2" color="error">Failed to load job details.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>Bookmarked Jobs</Typography>
        <Chip
          label={bookmarkedJobs.length}
          size="small"
          sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(0,0,0,0.15)', color: 'text.primary', fontWeight: 700 }}
        />
      </Stack>
      <Stack spacing={1}>
        {bookmarkedJobs.map((job) => (
          <BookmarkedJobRow key={job.id} job={job} currentTraits={_currentTraits} currentSkills={_currentSkills} />
        ))}
      </Stack>
    </Box>
  );
}
