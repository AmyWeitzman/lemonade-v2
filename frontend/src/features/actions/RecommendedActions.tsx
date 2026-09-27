/**
 * RecommendedActions — a short "you should probably do this" list on the Actions
 * page (required housing/transport, find a job when broke, use idle time blocks).
 */
import { Paper, Box, Stack, Typography, Chip } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/LightbulbOutlined';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import api from '../../lib/api';

interface Recommendation {
  actionName: string;
  reason: string;
  severity: 'info' | 'warning';
  link: string;
}

export default function RecommendedActions() {
  const navigate = useNavigate();
  const { gameSessionId } = useSelector((s: RootState) => s.auth);

  const { data } = useQuery({
    queryKey: ['recommendedActions', gameSessionId],
    queryFn: async () => {
      const { data } = await api.get('/actions/recommended', { params: { gameSessionId } });
      return data.recommendations as Recommendation[];
    },
    enabled: !!gameSessionId,
    staleTime: 15_000,
  });

  const recs = data ?? [];
  if (recs.length === 0) return null;

  return (
    <Paper
      variant="outlined"
      sx={{ mb: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.8)', borderColor: 'warning.light' }}
    >
      <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
        <LightbulbIcon fontSize="small" sx={{ color: 'warning.dark' }} />
        <Typography variant="body2" fontWeight={700}>Recommended Actions</Typography>
      </Box>
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Stack spacing={0.75}>
          {recs.map((r, i) => (
            <Stack
              key={i}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: r.severity === 'warning' ? '#fff3e0' : '#f1f8e9',
                cursor: 'pointer',
                '&:hover': { filter: 'brightness(0.97)' },
              }}
              onClick={() => navigate(r.link)}
            >
              <Chip
                label={r.actionName}
                size="small"
                color={r.severity === 'warning' ? 'warning' : 'success'}
                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
              />
              <Typography variant="caption" color="text.secondary">{r.reason}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}
