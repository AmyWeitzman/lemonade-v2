/**
 * BookmarkedProgramsPanel
 *
 * Displays bookmarked education programs with skill/trait gain badges.
 * Requirements: 7.2, 7.4, 7.6
 */
import { Box, Typography, Chip, Paper, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import type { RootState } from '../../store';
import type { EducationProgram } from '../education/types';
import api from '../../lib/api';
import { IconBadge, IconBadgeGrid, skillGainSummary, gainStringToCamelKey } from '../../components/cards/cardComponents';
import { EDU_TYPE_COLORS } from '../../lib/colorMaps';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookmarkedProgramsPanelProps {
  currentTraits: Record<string, number>;
  currentSkills: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeLabel(type: EducationProgram['type']): string {
  const labels: Record<EducationProgram['type'], string> = {
    associates: "Associate's", bachelors: "Bachelor's", masters: "Master's",
    doctorate: 'Doctorate', certificate: 'Professional', vocational: 'Vocational', professional: 'Professional',
  };
  return labels[type] ?? type;
}

// ─── Sub-component: single bookmarked program row ─────────────────────────────

function BookmarkedProgramRow({ program }: { program: EducationProgram }) {
  const autoGains = skillGainSummary(program.skillGains?.automatic ?? {});
  const majorGains = skillGainSummary(program.skillGains?.major ?? {});
  const allGains = [...autoGains, ...majorGains];
  const typec = EDU_TYPE_COLORS[program.type] ?? { bg: 'rgba(47,182,211,0.15)', text: 'inherit' };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Typography variant="body2" fontWeight={700} noWrap sx={{ mb: 0.4 }}>
        {program.name}
      </Typography>
      <Chip label={typeLabel(program.type)} size="small"
        sx={{ fontSize: '0.7rem', height: 18, mb: allGains.length > 0 ? 0.75 : 0, bgcolor: typec.bg, color: typec.text, fontWeight: 700 }} />

      {allGains.length > 0 && (
        <IconBadgeGrid>
          {allGains.map((g) => (
            <IconBadge key={g} skillKey={gainStringToCamelKey(g)} tooltip={g} />
          ))}
        </IconBadgeGrid>
      )}
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['educationPrograms', { gameSessionId, forBookmarks: true }],
    queryFn: async () => {
      if (!gameSessionId) throw new Error('No session');
      // Correct endpoint: /education/programs (not /education)
      const res = await api.get('/education/programs', { params: { gameSessionId } });
      return res.data as { programs: EducationProgram[] };
    },
    enabled: !!gameSessionId && bookmarkedProgramIds.length > 0,
    staleTime: 60_000,
  });

  const bookmarkedPrograms = (data?.programs ?? []).filter((p) => bookmarkedProgramIds.includes(p.id));

  if (bookmarkedProgramIds.length === 0) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Bookmarked Programs</Typography>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>No education programs bookmarked yet.</Typography>
          <Typography variant="body2" color="text.secondary">
            <Link to="/setup/education" style={{ color: 'inherit' }}>Browse programs</Link>{' '}to bookmark ones you're interested in.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Bookmarked Programs</Typography>
        <Typography variant="body2" color="text.secondary">Loading bookmarked programs…</Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Bookmarked Programs</Typography>
        <Typography variant="body2" color="error">Failed to load program details.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>Bookmarked Programs</Typography>
        <Chip
          label={bookmarkedPrograms.length}
          size="small"
          sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(0,0,0,0.15)', color: 'text.primary', fontWeight: 700 }}
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
