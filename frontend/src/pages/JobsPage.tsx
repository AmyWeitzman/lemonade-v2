/**
 * JobsPage — "Seeds to Trees"
 *
 * Full job catalog with search, filters, apply/quit flow,
 * and current employment status panel.
 *
 * Requirements: Req 11, Req 44, Req 45, Req 46, Req 47
 */
import { useState, useRef, useCallback } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Grid, Stack,
  Alert, Skeleton, Chip, Tooltip, Paper, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import WorkIcon from '@mui/icons-material/Work';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../store';
import { setFilters, resetFilters } from '../features/jobs/jobsSlice';
import JobCard from '../features/jobs/JobCard';
import JobFilters from '../features/jobs/JobFilters';
import type { JobItem, ActiveEmployment } from '../features/jobs/types';
import api from '../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQueryParams(
  filters: RootState['jobs']['filters'],
  gameSessionId: string,
): Record<string, string> {
  const params: Record<string, string> = { gameSessionId };
  if (filters.minSalary !== null) params.minSalary = String(filters.minSalary);
  if (filters.maxSalary !== null) params.maxSalary = String(filters.maxSalary);
  if (filters.minPto !== null) params.minPto = String(filters.minPto);
  if (filters.maxTimeBlocks !== null) params.maxTimeBlocks = String(filters.maxTimeBlocks);
  if (filters.maxStress !== null) params.maxStress = String(filters.maxStress);
  if (filters.location) params.location = filters.location;
  if (filters.partTimeOnly) params.partTimeOnly = 'true';
  if (filters.fullTimeOnly) params.fullTimeOnly = 'true';
  if (filters.seasonal !== null) params.seasonal = String(filters.seasonal);
  if (filters.hasPension) params.hasPension = 'true';
  if (filters.eligibleOnly) params.eligibleOnly = 'true';
  if (filters.showAll) params.showAll = 'true';
  if (filters.sort) params.sort = filters.sort;
  return params;
}

function fmtSalary(n: number): string {
  return '$' + n.toLocaleString();
}

// ─── Current Employment Panel ─────────────────────────────────────────────────

interface EmploymentPanelProps {
  employments: ActiveEmployment[];
  onQuit: (jobId: string) => void;
  quittingId: string | null;
}

function CurrentEmploymentPanel({ employments, onQuit, quittingId }: EmploymentPanelProps) {
  if (employments.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2, p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <WorkIcon fontSize="small" color="success" />
        <Typography variant="body2" fontWeight={700} color="success.main">
          Current Employment
        </Typography>
      </Stack>
      <Stack spacing={1}>
        {employments.map((emp) => (
          <Box
            key={emp.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {emp.jobTitle}
                {emp.isPartTime && (
                  <Chip label="PT" size="small" sx={{ ml: 0.75, fontSize: '0.6rem', height: 16 }} />
                )}
                {emp.isSeasonal && (
                  <Chip label="Seasonal" size="small" color="warning" sx={{ ml: 0.5, fontSize: '0.6rem', height: 16 }} />
                )}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
                <Typography variant="caption" color="text.secondary">
                  💰 {fmtSalary(emp.currentSalary)}/yr
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  📅 {emp.yearsOfService} yr{emp.yearsOfService !== 1 ? 's' : ''}
                </Typography>
                {emp.ptoRemaining > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    🏖️ {emp.ptoRemaining} PTO remaining
                  </Typography>
                )}
              </Stack>
            </Box>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={quittingId === emp.jobId}
              onClick={() => onQuit(emp.jobId)}
              sx={{ fontSize: '0.7rem', flexShrink: 0 }}
            >
              Quit
            </Button>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobsPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { playerId, gameSessionId } = useSelector((s: RootState) => s.auth);
  const { filters } = useSelector((s: RootState) => s.jobs);

  const [searchInput, setSearchInput] = useState(filters.search);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' | 'info' } | null>(null);
  const [quitConfirm, setQuitConfirm] = useState<{ jobId: string; title: string } | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [quittingId, setQuittingId] = useState<string | null>(null);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      dispatch(setFilters({ search: value }));
    }, 350);
  }, [dispatch]);

  // ── Fetch jobs ─────────────────────────────────────────────────────────────
  const queryParams = gameSessionId ? buildQueryParams(filters, gameSessionId) : null;

  const { data: jobsData, isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ['jobs', queryParams],
    queryFn: async () => {
      if (!queryParams) throw new Error('No session');
      if (filters.search.trim()) {
        const res = await api.get('/jobs/search', {
          params: { q: filters.search.trim(), gameSessionId },
        });
        return res.data as { jobs: JobItem[] };
      }
      const res = await api.get('/jobs', { params: queryParams });
      return res.data as { jobs: JobItem[] };
    },
    enabled: !!gameSessionId && !!playerId,
    staleTime: 30_000,
  });

  // ── Fetch current employments ──────────────────────────────────────────────
  const { data: playerData } = useQuery({
    queryKey: ['playerEmployments', playerId, gameSessionId],
    queryFn: async () => {
      const res = await api.get(`/players/${playerId}`, { params: { gameSessionId } });
      return res.data as {
        player: {
          projectedIncome: number;
          employments: Array<{
            id: string;
            jobId: string;
            isActive: boolean;
            isPartTime: boolean;
            isSeasonal: boolean;
            currentSalary: number;
            yearsOfService: number;
            ptoRemaining: number;
            startAge: number;
            job: { title: string };
          }>;
        };
      };
    },
    enabled: !!playerId && !!gameSessionId,
    staleTime: 15_000,
  });

  const activeEmployments: ActiveEmployment[] = (playerData?.player?.employments ?? [])
    .filter((e) => e.isActive)
    .map((e) => ({
      id: e.id,
      jobId: e.jobId,
      jobTitle: e.job.title,
      currentSalary: e.currentSalary,
      yearsOfService: e.yearsOfService,
      ptoRemaining: e.ptoRemaining,
      isPartTime: e.isPartTime,
      isSeasonal: e.isSeasonal,
      startAge: e.startAge,
    }));

  // ── Apply mutation ─────────────────────────────────────────────────────────
  const applyMutation = useMutation({
    mutationFn: async ({ jobId, partTime }: { jobId: string; partTime: boolean }) => {
      const res = await api.post(`/jobs/${jobId}/apply`, { gameSessionId, partTime });
      return res.data;
    },
    onMutate: ({ jobId }) => setApplyingId(jobId),
    onSuccess: (_data, { jobId }) => {
      const job = jobsData?.jobs.find((j) => j.id === jobId);
      setToast({ message: `You're now employed as ${job?.title ?? 'a new job'}!`, severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['playerEmployments'] });
      queryClient.invalidateQueries({ queryKey: ['timeBlocks'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string; reasons?: string[] } } })
        ?.response?.data;
      const text = msg?.reasons?.join(', ') ?? msg?.error ?? 'Failed to apply';
      setToast({ message: text, severity: 'error' });
    },
    onSettled: () => setApplyingId(null),
  });

  // ── Quit mutation ──────────────────────────────────────────────────────────
  const quitMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await api.post(`/jobs/${jobId}/quit`, { gameSessionId });
      return res.data;
    },
    onMutate: (jobId) => setQuittingId(jobId),
    onSuccess: (_data, jobId) => {
      const emp = activeEmployments.find((e) => e.jobId === jobId);
      setToast({ message: `You quit ${emp?.jobTitle ?? 'your job'}.`, severity: 'info' });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['playerEmployments'] });
      queryClient.invalidateQueries({ queryKey: ['timeBlocks'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setToast({ message: msg ?? 'Failed to quit', severity: 'error' });
    },
    onSettled: () => {
      setQuittingId(null);
      setQuitConfirm(null);
    },
  });

  const handleApply = (jobId: string, partTime: boolean) => {
    applyMutation.mutate({ jobId, partTime });
  };

  const handleQuitRequest = (jobId: string) => {
    const emp = activeEmployments.find((e) => e.jobId === jobId);
    const job = jobsData?.jobs.find((j) => j.id === jobId);
    const title = emp?.jobTitle ?? job?.title ?? 'this job';
    setQuitConfirm({ jobId, title });
  };

  const handleQuitConfirm = () => {
    if (quitConfirm) quitMutation.mutate(quitConfirm.jobId);
  };

  const jobs = jobsData?.jobs ?? [];
  const eligibleCount = jobs.filter((j) => j.eligible).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            🌱 Seeds to Trees
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Find your next career move
          </Typography>
        </Box>
        {playerData?.player && (
          <Tooltip title="Projected annual income from all active jobs">
            <Chip
              label={`📊 Projected: ${fmtSalary(playerData.player.projectedIncome)}`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Tooltip>
        )}
      </Stack>

      {/* Current employment */}
      <CurrentEmploymentPanel
        employments={activeEmployments}
        onQuit={handleQuitRequest}
        quittingId={quittingId}
      />

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search jobs…"
        value={searchInput}
        onChange={(e) => handleSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
        aria-label="Search jobs"
      />

      {/* Filters */}
      <JobFilters
        filters={filters}
        onChange={(partial) => dispatch(setFilters(partial))}
        onReset={() => dispatch(resetFilters())}
      />

      {/* Results summary */}
      {!jobsLoading && !jobsError && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
          </Typography>
          {!filters.eligibleOnly && eligibleCount > 0 && (
            <>
              <Divider orientation="vertical" flexItem />
              <Typography variant="body2" color="success.main">
                {eligibleCount} eligible
              </Typography>
            </>
          )}
        </Stack>
      )}

      {/* Error */}
      {jobsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load jobs. Please try again.
        </Alert>
      )}

      {/* Job grid */}
      <Grid container spacing={2}>
        {jobsLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton variant="rounded" height={200} />
              </Grid>
            ))
          : jobs.map((job) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={job.id}>
                <JobCard
                  job={job}
                  onApply={handleApply}
                  onQuit={handleQuitRequest}
                  applying={applyingId === job.id}
                  quitting={quittingId === job.id}
                />
              </Grid>
            ))}
      </Grid>

      {/* Empty state */}
      {!jobsLoading && !jobsError && jobs.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No jobs found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting your filters or turning off "Eligible only"
          </Typography>
          <Button variant="outlined" onClick={() => dispatch(resetFilters())}>
            Reset filters
          </Button>
        </Box>
      )}

      {/* Quit confirmation dialog */}
      <Dialog open={!!quitConfirm} onClose={() => setQuitConfirm(null)}>
        <DialogTitle>Quit {quitConfirm?.title}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to quit <strong>{quitConfirm?.title}</strong>? Your accumulated
            PTO will be reset and your projected income will be reduced.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuitConfirm(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleQuitConfirm}
            disabled={quitMutation.isPending}
          >
            Quit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast notifications */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
