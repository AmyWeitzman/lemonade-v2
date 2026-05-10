/**
 * EducationPage — "Zest for Learning"
 *
 * Full education catalog with search, filters, program cards,
 * enrollment flow, academic progress panel, scholarship application,
 * change-major and drop-out actions.
 *
 * Requirements: Req 10, Req 33
 */
import { useState, useRef, useCallback, memo } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Stack,
  Alert, Skeleton, Chip, Divider, Button, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, FormControl, InputLabel, Select, MenuItem, CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import TipsAndUpdatesIcon from '@mui/icons-material/EmojiObjects';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../store';
import { setEduFilters, resetEduFilters } from '../features/education/educationSlice';
import {
  setBookmarks,
  addProgramBookmark,
  removeProgramBookmark,
} from '../features/bookmarks/bookmarksSlice';
import ProgramCard from '../features/education/ProgramCard';
import ProgramFilters from '../features/education/ProgramFilters';
import AcademicProgressPanel from '../features/education/AcademicProgressPanel';
import type { EducationProgram, ActiveEducation } from '../features/education/types';
import api from '../lib/api';
import { useSetupMode } from '../contexts/SetupModeContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQueryParams(
  filters: RootState['education']['filters'],
  gameSessionId: string,
  overrideEligibleOnly?: boolean,
): Record<string, string> {
  const params: Record<string, string> = { gameSessionId };
  if (filters.type) params.type = filters.type;
  if (filters.selectedMajors.length > 0) params.selectedMajors = filters.selectedMajors.join(',');
  if (filters.track) params.track = filters.track;
  if (filters.partTimeOnly) params.partTimeOnly = 'true';
  if (filters.maxTuition !== null) params.maxTuition = String(filters.maxTuition);
  // In setup mode we force eligibleOnly=false so all programs are visible for planning
  const effectiveEligibleOnly = overrideEligibleOnly !== undefined ? overrideEligibleOnly : filters.eligibleOnly;
  if (effectiveEligibleOnly) params.eligibleOnly = 'true';
  if (filters.sort) params.sort = filters.sort;
  return params;
}

// ─── Change Major Dialog ──────────────────────────────────────────────────────

interface ChangeMajorDialogProps {
  open: boolean;
  targetProgram: EducationProgram | null;
  currentProgramName: string;
  onConfirm: (partTime: boolean) => void;
  onClose: () => void;
  loading: boolean;
}

function ChangeMajorDialog({
  open,
  targetProgram,
  currentProgramName,
  onConfirm,
  onClose,
  loading,
}: ChangeMajorDialogProps) {
  const [partTime, setPartTime] = useState(false);

  if (!targetProgram) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Change Major</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Switch from <strong>{currentProgramName}</strong> to{' '}
          <strong>{targetProgram.name}</strong>?
        </DialogContentText>
        <DialogContentText variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Gen Ed credits always transfer. Field credits transfer only if the field is the same.
          Major credits never transfer.
        </DialogContentText>
        {targetProgram.partTimeAllowed && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <Button
              size="small"
              variant={!partTime ? 'contained' : 'outlined'}
              onClick={() => setPartTime(false)}
            >
              Full-time
            </Button>
            <Button
              size="small"
              variant={partTime ? 'contained' : 'outlined'}
              onClick={() => setPartTime(true)}
            >
              Part-time
            </Button>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(partTime)}
          disabled={loading}
        >
          Confirm Change
        </Button>
      </DialogActions>
    </Dialog>
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
      placeholder="Search programs…"
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
      aria-label="Search education programs"
    />
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EducationPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { playerId, gameSessionId } = useSelector((s: RootState) => s.auth);
  const { filters } = useSelector((s: RootState) => s.education);
  const { isSetupMode } = useSetupMode();

  // Bookmark state from Redux
  const bookmarkedProgramIds = useSelector((s: RootState) => s.bookmarks.programIds);
  const bookmarkedJobIds = useSelector((s: RootState) => s.bookmarks.jobIds);

  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [dropConfirmOpen, setDropConfirmOpen] = useState(false);
  const [changeMajorTarget, setChangeMajorTarget] = useState<EducationProgram | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  // Search callback — only triggers API refetch, doesn't cause parent re-render
  const handleSearch = useCallback((value: string) => {
    dispatch(setEduFilters({ search: value }));
  }, [dispatch]);

  // ── Fetch programs ─────────────────────────────────────────────────────────
  // In setup mode, force eligibleOnly=false so all programs are visible for planning
  const queryParams = gameSessionId
    ? buildQueryParams(filters, gameSessionId, isSetupMode ? false : undefined)
    : null;

  const { data: programsData, isLoading: programsLoading, isFetching: programsFetching, error: programsError } = useQuery({
    queryKey: ['educationPrograms', queryParams],
    queryFn: async () => {
      if (!queryParams) throw new Error('No session');
      const res = await api.get('/education/programs', { params: queryParams });
      return res.data as { programs: EducationProgram[] };
    },
    enabled: !!gameSessionId && !!playerId,
  });

  // ── Fetch player education state ───────────────────────────────────────────
  const { data: playerData } = useQuery({
    queryKey: ['playerEducation', playerId, gameSessionId],
    queryFn: async () => {
      const res = await api.get(`/players/${playerId}`, { params: { gameSessionId } });
      return res.data as {
        player: {
          age: number;
          collegeFund: number;
          parentContributions: { collegeFund: number };
          traits: Record<string, number>;
          educations: Array<{
            id: string;
            programId: string;
            isPartTime: boolean;
            startAge: number;
            creditsCompleted: { generalEducation: number; field: number; major: number };
            scholarships: Array<{ year: number; amount: number }>;
            parentContributionUsed: number;
            graduated: boolean;
            graduationAge?: number;
            isActive: boolean;
            program: {
              name: string;
              type: string;
              field: string;
              totalCredits: { generalEducation: number; field: number; major: number };
            };
          }>;
        };
      };
    },
    enabled: !!playerId && !!gameSessionId,
    staleTime: 15_000,
  });

  // ── Fetch current year for scholarship check ───────────────────────────────
  const { data: sessionData } = useQuery({
    queryKey: ['sessionYear', gameSessionId],
    queryFn: async () => {
      const res = await api.get(`/sessions/${gameSessionId}`);
      return res.data as { session: { currentYear: number } };
    },
    enabled: !!gameSessionId,
    staleTime: 60_000,
  });

  const playerAge = playerData?.player?.age ?? 18;
  const activeEdu = playerData?.player?.educations?.find((e) => e.isActive) ?? null;
  const currentYear = sessionData?.session?.currentYear ?? 0;

  // Studiousness = average of perseverance and organization (0-100); default 50 (average) in setup
  const traits = playerData?.player?.traits ?? {};
  const studiousness = isSetupMode
    ? 50
    : Math.round(((traits.perseverance ?? 50) + (traits.organization ?? 50)) / 2);

  const activeEducation: ActiveEducation | null = activeEdu
    ? {
        id: activeEdu.id,
        programId: activeEdu.programId,
        programName: activeEdu.program.name,
        programType: activeEdu.program.type,
        programField: activeEdu.program.field,
        isPartTime: activeEdu.isPartTime,
        startAge: activeEdu.startAge,
        creditsCompleted: activeEdu.creditsCompleted,
        scholarships: activeEdu.scholarships,
        parentContributionUsed: activeEdu.parentContributionUsed,
        graduated: activeEdu.graduated,
        graduationAge: activeEdu.graduationAge,
        totalCredits: activeEdu.program.totalCredits,
      }
    : null;

  const scholarshipAppliedThisYear =
    activeEdu?.scholarships?.some((s) => s.year === currentYear) ?? false;

  // ── Enroll mutation ────────────────────────────────────────────────────────
  const enrollMutation = useMutation({
    mutationFn: async ({ programId, partTime }: { programId: string; partTime: boolean }) => {
      const res = await api.post('/education/enroll', { gameSessionId, programId, partTime });
      return res.data;
    },
    onMutate: ({ programId }) => setEnrollingId(programId),
    onSuccess: (_data, { programId }) => {
      const prog = programsData?.programs.find((p) => p.id === programId);
      const mode = _data.isShortcut ? ' (CC shortcut applied!)' : '';
      setToast({
        message: `Enrolled in ${prog?.name ?? 'program'}!${mode}`,
        severity: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['educationPrograms'] });
      queryClient.invalidateQueries({ queryKey: ['playerEducation'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string; reasons?: string[] } } })
        ?.response?.data;
      const text = msg?.reasons?.join(', ') ?? msg?.error ?? 'Failed to enroll';
      setToast({ message: text, severity: 'error' });
    },
    onSettled: () => setEnrollingId(null),
  });

  // ── Scholarship mutation ───────────────────────────────────────────────────
  const scholarshipMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/education/scholarships', { gameSessionId });
      return res.data as { awarded: boolean; amount: number };
    },
    onSuccess: (data) => {
      if (data.awarded) {
        setToast({
          message: `🏆 Scholarship awarded: ${data.amount.toLocaleString()}!`,
          severity: 'success',
        });
      } else {
        setToast({ message: 'No scholarship awarded this year.', severity: 'info' });
      }
      queryClient.invalidateQueries({ queryKey: ['playerEducation'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setToast({ message: msg ?? 'Failed to apply for scholarship', severity: 'error' });
    },
  });

  // ── Change major mutation ──────────────────────────────────────────────────
  const changeMajorMutation = useMutation({
    mutationFn: async ({ newProgramId, partTime }: { newProgramId: string; partTime: boolean }) => {
      const res = await api.post('/education/change-major', {
        gameSessionId,
        newProgramId,
        partTime,
      });
      return res.data as { success: boolean; sameField: boolean };
    },
    onSuccess: (data) => {
      const note = data.sameField
        ? 'Field credits transferred.'
        : 'Field credits reset (different field).';
      setToast({ message: `Major changed! ${note}`, severity: 'info' });
      setChangeMajorTarget(null);
      queryClient.invalidateQueries({ queryKey: ['educationPrograms'] });
      queryClient.invalidateQueries({ queryKey: ['playerEducation'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string; reasons?: string[] } } })
        ?.response?.data;
      const text = msg?.reasons?.join(', ') ?? msg?.error ?? 'Failed to change major';
      setToast({ message: text, severity: 'error' });
    },
  });

  // ── Drop out mutation ──────────────────────────────────────────────────────
  const dropMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/education/drop', { gameSessionId });
      return res.data;
    },
    onSuccess: () => {
      setToast({
        message: 'Dropped out. Credits saved for 5 years if you re-enroll.',
        severity: 'warning',
      });
      setDropConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['educationPrograms'] });
      queryClient.invalidateQueries({ queryKey: ['playerEducation'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setToast({ message: msg ?? 'Failed to drop out', severity: 'error' });
      setDropConfirmOpen(false);
    },
  });

  const programs = programsData?.programs ?? [];
  const eligibleCount = programs.filter((p) => p.eligible).length;
  const hasActiveEnrollment = !!activeEducation;

  // ── Bookmark toggle ────────────────────────────────────────────────────────
  const handleBookmarkToggle = async (programId: string) => {
    const isCurrentlyBookmarked = bookmarkedProgramIds.includes(programId);
    // Optimistic update
    if (isCurrentlyBookmarked) {
      dispatch(removeProgramBookmark(programId));
    } else {
      dispatch(addProgramBookmark(programId));
    }
    try {
      const { data } = await api.post(`/players/${playerId}/bookmarks/education/${programId}`);
      dispatch(setBookmarks({ jobIds: bookmarkedJobIds, programIds: data.programIds }));
    } catch {
      // Rollback on error
      if (isCurrentlyBookmarked) {
        dispatch(addProgramBookmark(programId));
      } else {
        dispatch(removeProgramBookmark(programId));
      }
      setToast({ message: 'Failed to update bookmark', severity: 'error' });
    }
  };

  // Apply client-side search filter
  const searchTerm = filters.search.trim().toLowerCase();
  const searchedPrograms = searchTerm
    ? programs.filter((p) => p.name.toLowerCase().includes(searchTerm))
    : programs;
  // Apply client-side track filter
  const trackFiltered = filters.track
    ? searchedPrograms.filter((p) => {
        if (filters.track === 'stem') return p.isStem;
        if (filters.track === 'humanities') return !p.isStem;
        return true; // 'both' shows all
      })
    : searchedPrograms;
  // Apply client-side major filter
  const majorFiltered = filters.selectedMajors.length > 0
    ? trackFiltered.filter((p) => filters.selectedMajors.includes(p.name))
    : trackFiltered;
  // Apply client-side bookmarked-only filter when enabled
  const displayedPrograms = showBookmarkedOnly
    ? majorFiltered.filter((p) => bookmarkedProgramIds.includes(p.id))
    : majorFiltered;

  if (!gameSessionId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You must be in an active game session to view education.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: (t) => t.palette.primary.light, p: { xs: 2, md: 3 } }}>
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            <Box component="span" sx={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.35))' }}>📚</Box> Zest for Learning
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {isSetupMode && (
            <Chip
              icon={<BookmarkIcon fontSize="small" sx={{ color: '#F9A825 !important' }} />}
              label={`${bookmarkedProgramIds.length} bookmarked`}
              sx={{ fontWeight: 600, color: '#212121', borderColor: '#212121' }}
              variant="outlined"
            />
          )}
          {!isSetupMode && activeEducation && (
            <Chip
              label={`🎓 Enrolled: ${activeEducation.programName}`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600, maxWidth: 260 }}
            />
          )}
        </Stack>
      </Stack>

      {/* Setup mode info banner */}
      {isSetupMode && (
        <Alert severity="info" icon={<TipsAndUpdatesIcon />} sx={{ mb: 2, bgcolor: '#FFF9C4', '& .MuiAlert-icon': { color: '#F9A825' } }}>
          Bookmark your interests to more easily align your profile to your career goals.
        </Alert>
      )}

      {/* Notices */}
      <Alert severity="info" sx={{ mb: 1, bgcolor: 'rgba(255,255,255,0.6)' }}>
        Part-time costs half the tuition, is double the duration, is half the stress, and grants half of the skill gains per year.
      </Alert>
      <Alert severity="info" sx={{ mb: 1, bgcolor: 'rgba(255,255,255,0.6)' }}>
        Annual skills and traits gains for education programs is dependent on completing academic actions each year.
      </Alert>
      {isSetupMode && (
        <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
          Stress and time blocks shown are averages based on one's studiousness level. These numbers may change based on your studiousness level after your profile is set up. Those who persevere and are organized tend to need to spend less time on academic actions and are less stressed.
        </Alert>
      )}

      {/* Academic progress panel — hidden in setup mode */}
      {!isSetupMode && (
        <AcademicProgressPanel
          education={activeEducation}
          playerAge={playerAge}
          onApplyScholarship={() => scholarshipMutation.mutate()}
          applyingScholarship={scholarshipMutation.isPending}
          scholarshipAppliedThisYear={scholarshipAppliedThisYear}
        />
      )}

      {/* Parent contribution reminder — only in normal gameplay */}
      {!isSetupMode && playerData?.player?.collegeFund !== undefined && playerData.player.collegeFund > 0 && (
        <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
          💰 You have <strong>${playerData.player.collegeFund.toLocaleString()}</strong> remaining in your college fund from parent contributions.
        </Alert>
      )}

      {/* Search */}
      <DebouncedSearchInput initialValue={filters.search} onSearch={handleSearch} />

      {/* Loading indicator for search/filter changes */}
      {programsFetching && !programsLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Searching…</Typography>
        </Box>
      )}

      {/* Filters */}
      <ProgramFilters
        filters={filters}
        onChange={(partial) => dispatch(setEduFilters(partial))}
        onReset={() => dispatch(resetEduFilters())}
        showBookmarkedOnly={showBookmarkedOnly}
        onBookmarkedOnlyChange={setShowBookmarkedOnly}
      />

      {/* Results summary + Sort */}
      {!programsLoading && !programsError && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {displayedPrograms.length} program{displayedPrograms.length !== 1 ? 's' : ''} found
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
              onChange={(e) => dispatch(setEduFilters({ sort: e.target.value as typeof filters.sort }))}
              sx={{ bgcolor: 'rgba(255,255,255,0.6)' }}
            >
              <MenuItem value="">Default</MenuItem>
              <MenuItem value="tuition_asc">💰 Tuition Low to High</MenuItem>
              <MenuItem value="stress_asc">😌 Stress Low to High</MenuItem>
              <MenuItem value="grad_salary_desc">💲 Grad Salary High to Low</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      )}

      {/* Error */}
      {programsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load programs. Please try again.
        </Alert>
      )}

      {/* Program grid — masonry when unsorted, left-to-right grid when sorted */}
      <Box sx={
        filters.sort
          ? { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }
          : { columnCount: { xs: 1, sm: 2, md: 3, lg: 4 }, columnGap: 2 }
      }>
        {programsLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Box key={i} sx={{ breakInside: 'avoid', mb: 2 }}>
                <Skeleton variant="rounded" height={220} />
              </Box>
            ))
          : displayedPrograms.map((program) => (
              <Box key={program.id} sx={{ breakInside: 'avoid', mb: 2 }}>
                <ProgramCard
                  program={program}
                  onEnroll={(programId, partTime) => enrollMutation.mutate({ programId, partTime })}
                  onChangeMajor={(programId) => {
                    const prog = programs.find((p) => p.id === programId);
                    if (prog) setChangeMajorTarget(prog);
                  }}
                  onDrop={() => setDropConfirmOpen(true)}
                  enrolling={enrollingId === program.id}
                  isCurrentProgram={activeEducation?.programId === program.id}
                  hasActiveEnrollment={hasActiveEnrollment}
                  isBookmarked={bookmarkedProgramIds.includes(program.id)}
                  onBookmarkToggle={handleBookmarkToggle}
                  bookmarkLoading={false}
                  studiousness={studiousness}
                />
              </Box>
            ))}
      </Box>

      {/* Empty state */}
      {!programsLoading && !programsError && displayedPrograms.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No programs found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting your filters or turning off &ldquo;Eligible only&rdquo;
          </Typography>
          <Button variant="outlined" onClick={() => dispatch(resetEduFilters())}>
            Reset filters
          </Button>
        </Box>
      )}

      {/* Drop out confirmation */}
      <Dialog open={dropConfirmOpen} onClose={() => setDropConfirmOpen(false)}>
        <DialogTitle>Drop Out?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to drop out of{' '}
            <strong>{activeEducation?.programName}</strong>? Your credits will be saved for
            5 years if you re-enroll in the same program, but any scholarship balance will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDropConfirmOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => dropMutation.mutate()}
            disabled={dropMutation.isPending}
          >
            Drop Out
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change major dialog */}
      <ChangeMajorDialog
        open={!!changeMajorTarget}
        targetProgram={changeMajorTarget}
        currentProgramName={activeEducation?.programName ?? ''}
        onConfirm={(partTime) => {
          if (changeMajorTarget) {
            changeMajorMutation.mutate({ newProgramId: changeMajorTarget.id, partTime });
          }
        }}
        onClose={() => setChangeMajorTarget(null)}
        loading={changeMajorMutation.isPending}
      />

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4500}
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
