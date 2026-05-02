/**
 * EducationPage — "Zest for Learning"
 *
 * Full education catalog with search, filters, program cards,
 * enrollment flow, academic progress panel, scholarship application,
 * change-major and drop-out actions.
 *
 * Requirements: Req 10, Req 33
 */
import { useState, useRef, useCallback } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Grid, Stack,
  Alert, Skeleton, Chip, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../store';
import { setEduFilters, resetEduFilters } from '../features/education/educationSlice';
import ProgramCard from '../features/education/ProgramCard';
import ProgramFilters from '../features/education/ProgramFilters';
import AcademicProgressPanel from '../features/education/AcademicProgressPanel';
import type { EducationProgram, ActiveEducation } from '../features/education/types';
import api from '../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQueryParams(
  filters: RootState['education']['filters'],
  gameSessionId: string,
): Record<string, string> {
  const params: Record<string, string> = { gameSessionId };
  if (filters.type) params.type = filters.type;
  if (filters.field) params.field = filters.field;
  if (filters.isStem !== null) params.isStem = String(filters.isStem);
  if (filters.partTimeOnly) params.partTimeOnly = 'true';
  if (filters.maxTuition !== null) params.maxTuition = String(filters.maxTuition);
  if (filters.eligibleOnly) params.eligibleOnly = 'true';
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EducationPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { playerId, gameSessionId } = useSelector((s: RootState) => s.auth);
  const { filters } = useSelector((s: RootState) => s.education);

  const [searchInput, setSearchInput] = useState(filters.search);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [dropConfirmOpen, setDropConfirmOpen] = useState(false);
  const [changeMajorTarget, setChangeMajorTarget] = useState<EducationProgram | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      dispatch(setEduFilters({ search: value }));
    }, 350);
  }, [dispatch]);

  // ── Fetch programs ─────────────────────────────────────────────────────────
  const queryParams = gameSessionId ? buildQueryParams(filters, gameSessionId) : null;

  const { data: programsData, isLoading: programsLoading, error: programsError } = useQuery({
    queryKey: ['educationPrograms', queryParams],
    queryFn: async () => {
      if (!queryParams) throw new Error('No session');
      if (filters.search.trim()) {
        const res = await api.get('/education/programs/search', {
          params: { q: filters.search.trim(), gameSessionId },
        });
        return res.data as { programs: EducationProgram[] };
      }
      const res = await api.get('/education/programs', { params: queryParams });
      return res.data as { programs: EducationProgram[] };
    },
    enabled: !!gameSessionId && !!playerId,
    staleTime: 30_000,
  });

  // ── Fetch player education state ───────────────────────────────────────────
  const { data: playerData } = useQuery({
    queryKey: ['playerEducation', playerId, gameSessionId],
    queryFn: async () => {
      const res = await api.get(`/players/${playerId}`, { params: { gameSessionId } });
      return res.data as {
        player: {
          age: number;
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
          message: `🏆 Scholarship awarded: $${data.amount.toLocaleString()}!`,
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

  if (!gameSessionId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You must be in an active game session to view education.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            📚 Zest for Learning
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Invest in your education to unlock better careers
          </Typography>
        </Box>
        {activeEducation && (
          <Chip
            label={`🎓 Enrolled: ${activeEducation.programName}`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600, maxWidth: 260 }}
          />
        )}
      </Stack>

      {/* Academic progress panel */}
      <AcademicProgressPanel
        education={activeEducation}
        playerAge={playerAge}
        onApplyScholarship={() => scholarshipMutation.mutate()}
        applyingScholarship={scholarshipMutation.isPending}
        scholarshipAppliedThisYear={scholarshipAppliedThisYear}
      />

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search programs…"
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
        aria-label="Search education programs"
      />

      {/* Filters */}
      <ProgramFilters
        filters={filters}
        onChange={(partial) => dispatch(setEduFilters(partial))}
        onReset={() => dispatch(resetEduFilters())}
      />

      {/* Results summary */}
      {!programsLoading && !programsError && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {programs.length} program{programs.length !== 1 ? 's' : ''} found
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
      {programsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load programs. Please try again.
        </Alert>
      )}

      {/* Program grid */}
      <Grid container spacing={2}>
        {programsLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton variant="rounded" height={220} />
              </Grid>
            ))
          : programs.map((program) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={program.id}>
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
                />
              </Grid>
            ))}
      </Grid>

      {/* Empty state */}
      {!programsLoading && !programsError && programs.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No programs found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting your filters or turning off "Eligible only"
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
  );
}
