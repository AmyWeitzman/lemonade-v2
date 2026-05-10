/**
 * JobsPage — "Seeds to Trees"
 *
 * Full job catalog with search, filters, apply/quit flow,
 * and current employment status panel.
 *
 * Requirements: Req 11, Req 44, Req 45, Req 46, Req 47, 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 2.9, 4.8, 9.1, 9.3, 9.5
 */
import { useState, useRef, useCallback, memo } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Stack,
  Alert, Skeleton, Chip, Tooltip, Paper, Divider, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, FormControl, InputLabel, Select, MenuItem, CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import WorkIcon from '@mui/icons-material/Work';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import TipsAndUpdatesIcon from '@mui/icons-material/EmojiObjects';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../store';
import { setFilters, resetFilters } from '../features/jobs/jobsSlice';
import {
  setBookmarks,
  addJobBookmark,
  removeJobBookmark,
} from '../features/bookmarks/bookmarksSlice';
import JobCard from '../features/jobs/JobCard';
import JobFilters from '../features/jobs/JobFilters';
import type { JobItem, ActiveEmployment } from '../features/jobs/types';
import api from '../lib/api';
import { useSetupMode } from '../contexts/SetupModeContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQueryParams(
  filters: RootState['jobs']['filters'],
  gameSessionId: string,
  overrideEligibleOnly?: boolean,
): Record<string, string> {
  const params: Record<string, string> = { gameSessionId };
  if (filters.minSalary !== null) params.minSalary = String(filters.minSalary);
  if (filters.minPto !== null) params.minPto = String(filters.minPto);
  if (filters.maxTimeBlocks !== null) params.maxTimeBlocks = String(filters.maxTimeBlocks);
  if (filters.maxStress !== null) params.maxStress = String(filters.maxStress);
  if (filters.location) params.location = filters.location;
  if (filters.requiredMajor) params.requiredMajor = filters.requiredMajor;
  if (filters.partTimeOnly) params.partTimeOnly = 'true';
  if (filters.fullTimeOnly) params.fullTimeOnly = 'true';
  if (filters.seasonal !== null) params.seasonal = String(filters.seasonal);
  if (filters.hasPension) params.hasPension = 'true';
  if (filters.hasTips) params.hasTips = 'true';
  if (filters.hasDiscounts) params.hasDiscounts = 'true';
  // In setup mode we force eligibleOnly=false so all jobs are visible for planning
  const effectiveEligibleOnly = overrideEligibleOnly !== undefined ? overrideEligibleOnly : filters.eligibleOnly;
  if (effectiveEligibleOnly) params.eligibleOnly = 'true';
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

// ─── Debounced Search Input (isolated to prevent parent re-renders) ───────────

const DebouncedSearchInput = memo(function DebouncedSearchInput({
  initialValue,
  onSearch,
}: {
  initialValue: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    setSearching(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSearch(v);
      setSearching(false);
    }, 500);
  };

  const handleClear = () => {
    setValue('');
    setSearching(false);
    if (timer.current) clearTimeout(timer.current);
    onSearch('');
  };

  return (
    <TextField
      fullWidth
      size="small"
      placeholder="Search jobs…"
      value={value}
      onChange={handleChange}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {searching && (
              <CircularProgress size={16} sx={{ mr: 0.5 }} />
            )}
            {value && (
              <Tooltip title="Clear search">
                <IconButton size="small" onClick={handleClear} aria-label="Clear search" edge="end">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </InputAdornment>
        ),
      }}
      sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.6)', borderRadius: 1, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
      aria-label="Search jobs"
    />
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobsPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { playerId, gameSessionId } = useSelector((s: RootState) => s.auth);
  const { filters } = useSelector((s: RootState) => s.jobs);
  const { isSetupMode } = useSetupMode();

  // Bookmark state from Redux
  const bookmarkedJobIds = useSelector((s: RootState) => s.bookmarks.jobIds);
  const bookmarkedProgramIds = useSelector((s: RootState) => s.bookmarks.programIds);

  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' | 'info' } | null>(null);
  const [quitConfirm, setQuitConfirm] = useState<{ jobId: string; title: string } | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [quittingId, setQuittingId] = useState<string | null>(null);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  // Search callback — only triggers API refetch, doesn't cause parent re-render
  const handleSearch = useCallback((value: string) => {
    dispatch(setFilters({ search: value }));
  }, [dispatch]);

  // ── Fetch jobs ─────────────────────────────────────────────────────────────
  // In setup mode, force eligibleOnly=false so all jobs are visible for planning
  const queryParams = gameSessionId
    ? buildQueryParams(filters, gameSessionId, isSetupMode ? false : undefined)
    : null;

  const { data: jobsData, isLoading: jobsLoading, isFetching: jobsFetching, error: jobsError } = useQuery({
    queryKey: ['jobs', queryParams],
    queryFn: async () => {
      if (!queryParams) throw new Error('No session');
      const res = await api.get('/jobs', { params: queryParams });
      return res.data as { jobs: JobItem[] };
    },
    enabled: !!gameSessionId && !!playerId,
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

  // ── Bookmark toggle ────────────────────────────────────────────────────────
  const handleBookmarkToggle = async (jobId: string) => {
    const isCurrentlyBookmarked = bookmarkedJobIds.includes(jobId);
    // Optimistic update
    if (isCurrentlyBookmarked) {
      dispatch(removeJobBookmark(jobId));
    } else {
      dispatch(addJobBookmark(jobId));
    }
    try {
      const { data } = await api.post(`/players/${playerId}/bookmarks/jobs/${jobId}`);
      dispatch(setBookmarks({ jobIds: data.jobIds, programIds: bookmarkedProgramIds }));
    } catch {
      // Rollback on error
      if (isCurrentlyBookmarked) {
        dispatch(addJobBookmark(jobId));
      } else {
        dispatch(removeJobBookmark(jobId));
      }
      setToast({ message: 'Failed to update bookmark', severity: 'error' });
    }
  };

  const allJobs = jobsData?.jobs ?? [];
  // Apply client-side search filter
  const searchTerm = filters.search.trim().toLowerCase();
  const searchedJobs = searchTerm
    ? allJobs.filter((j) => j.title.toLowerCase().includes(searchTerm))
    : allJobs;
  // Apply client-side bookmarked-only filter when enabled
  const bookmarkFiltered = showBookmarkedOnly
    ? searchedJobs.filter((j) => bookmarkedJobIds.includes(j.id))
    : searchedJobs;
  // Apply client-side skill/trait level filter
  const jobs = filters.skillTraitFilters.length > 0
    ? bookmarkFiltered.filter((j) => {
        const reqs = (j.requirements?.skills ?? {}) as Record<string, unknown>;
        return filters.skillTraitFilters.every((stf) => {
          if (!stf.level || !stf.comparator) return true; // incomplete filter = no filter
          const reqVal = reqs[stf.key];
          // Jobs without a requirement for this skill have an effective value of 0 (low)
          const numVal = reqVal === undefined || reqVal === null
            ? 0
            : Array.isArray(reqVal) ? (reqVal[0] as number) : (typeof reqVal === 'number' ? reqVal : 0);

          // Determine the job's level for this skill
          let jobLevel: 'low' | 'medium' | 'high';
          if (numVal <= 33) jobLevel = 'low';
          else if (numVal <= 66) jobLevel = 'medium';
          else jobLevel = 'high';

          const levelOrder = { low: 0, medium: 1, high: 2 };
          const jobLevelNum = levelOrder[jobLevel];
          const filterLevelNum = levelOrder[stf.level];

          if (stf.comparator === 'at_least') return jobLevelNum >= filterLevelNum;
          if (stf.comparator === 'at_most') return jobLevelNum <= filterLevelNum;
          if (stf.comparator === 'only') return jobLevelNum === filterLevelNum;
          return true;
        });
      })
    : bookmarkFiltered;
  const eligibleCount = allJobs.filter((j) => j.eligible).length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: (t) => t.palette.primary.light, p: { xs: 2, md: 3 } }}>
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            <Box component="span" sx={{ filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.45))' }}>🌱</Box> Seeds to Trees
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {isSetupMode && (
            <Chip
              icon={<BookmarkIcon fontSize="small" sx={{ color: '#F9A825 !important' }} />}
              label={`${bookmarkedJobIds.length} bookmarked`}
              sx={{ fontWeight: 600, color: '#212121', borderColor: '#212121' }}
              variant="outlined"
            />
          )}
          {!isSetupMode && playerData?.player && (
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
      </Stack>

      {/* Setup mode info banner */}
      {isSetupMode && (
        <Alert severity="info" icon={<TipsAndUpdatesIcon />} sx={{ mb: 2, bgcolor: '#FFF9C4', '& .MuiAlert-icon': { color: '#F9A825' } }}>
          Bookmark your interests to more easily align your profile to your career goals.
        </Alert>
      )}

      {/* Current employment — hidden in setup mode */}
      {!isSetupMode && (
        <CurrentEmploymentPanel
          employments={activeEmployments}
          onQuit={handleQuitRequest}
          quittingId={quittingId}
        />
      )}

      {/* Search */}
      <DebouncedSearchInput initialValue={filters.search} onSearch={handleSearch} />

      {/* Loading indicator for search/filter changes */}
      {jobsFetching && !jobsLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Searching…</Typography>
        </Box>
      )}

      {/* Filters */}
      <JobFilters
        filters={filters}
        onChange={(partial) => dispatch(setFilters(partial))}
        onReset={() => { dispatch(resetFilters()); setShowBookmarkedOnly(false); }}
        showBookmarkedOnly={showBookmarkedOnly}
        onBookmarkedOnlyChange={setShowBookmarkedOnly}
      />

      {/* Results summary + Sort */}
      {!jobsLoading && !jobsError && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
            </Typography>
            {!filters.eligibleOnly && !isSetupMode && eligibleCount > 0 && (
            <>
              <Divider orientation="vertical" flexItem />
              <Typography variant="body2" color="success.main">
                {eligibleCount} eligible
              </Typography>
            </>
          )}
          </Stack>
          <FormControl size="small" sx={{ width: 220 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={filters.sort}
              label="Sort by"
              onChange={(e) => dispatch(setFilters({ sort: e.target.value as typeof filters.sort }))}
              sx={{ bgcolor: 'rgba(255,255,255,0.6)' }}
            >
              <MenuItem value="">Default</MenuItem>
              <MenuItem value="salary_desc">💰 Salary High to Low</MenuItem>
              <MenuItem value="stress_asc">😌 Stress Low to High</MenuItem>
              <MenuItem value="time_blocks_asc">⏱ Time Blocks Low to High</MenuItem>
              <MenuItem value="pto_desc">🏖️ PTO High to Low</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      )}

      {/* Error */}
      {jobsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load jobs. Please try again.
        </Alert>
      )}

      {/* Job grid — masonry when unsorted, left-to-right grid when sorted */}
      <Box sx={
        filters.sort
          ? { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }
          : { columnCount: { xs: 1, sm: 2, md: 3, lg: 4 }, columnGap: 2 }
      }>
        {jobsLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Box key={i} sx={{ breakInside: 'avoid', mb: 2 }}>
                <Skeleton variant="rounded" height={200} />
              </Box>
            ))
          : jobs.map((job) => (
              <Box key={job.id} sx={{ breakInside: 'avoid', mb: 2 }}>
                <JobCard
                  job={job}
                  onApply={handleApply}
                  onQuit={handleQuitRequest}
                  applying={applyingId === job.id}
                  quitting={quittingId === job.id}
                  isBookmarked={bookmarkedJobIds.includes(job.id)}
                  onBookmarkToggle={handleBookmarkToggle}
                  bookmarkLoading={false}
                />
              </Box>
            ))}
      </Box>

      {/* Empty state */}
      {!jobsLoading && !jobsError && jobs.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No jobs found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting your filters or turning off "Eligible only"
          </Typography>
          <Button variant="outlined" onClick={() => { dispatch(resetFilters()); setShowBookmarkedOnly(false); }}>
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
    </Box>
  );
}
