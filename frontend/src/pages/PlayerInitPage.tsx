import { useState, memo, useCallback } from 'react';
import {
  Box, Button, Typography, CircularProgress, Alert,
  Chip, Tooltip, LinearProgress, Divider, Paper, Stack, useTheme, Slider,
  Collapse, IconButton,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { RootState } from '../store';
import { setPlayerInitialized, setPlayerStats } from '../features/auth/authSlice';
import api from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerData {
  traits: Record<string, number>;
  skills: Record<string, number>;
  money: number;
  collegeFund: number;
  chronicConditions: string[];
  parentContributions: {
    car: string | null;
    collegeFund: number;
    maxParentAge: number | null;
    weddingContribution: number;
  };
}

interface JobPreview {
  id: string;
  title: string;
  baseSalary: number;
  qualifies: boolean;
  requirements?: unknown;
}

interface ProgramPreview {
  id: string;
  name: string;
  type: string;
  tuitionFullTime: number;
  qualifies: boolean;
  requirements?: unknown;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRAIT_LABELS: Record<string, string> = {
  bravery: 'Bravery', perseverance: 'Perseverance', charisma: 'Charisma',
  compassion: 'Compassion', creativity: 'Creativity', organization: 'Organization',
  patience: 'Patience', caution: 'Caution', sociability: 'Sociability',
  stressTolerance: 'Stress Tolerance', goodWithKids: 'Good With Kids',
  physicalAbility: 'Physical Ability', communication: 'Communication',
};

const SKILL_LABELS: Record<string, string> = {
  math: 'Math', science: 'Science', art: 'Art', music: 'Music',
  writing: 'Writing', analysis: 'Analysis', homeRepair: 'Home Repair', technology: 'Technology',
};



const CAR_LABELS: Record<string, string> = {
  affordable_5seat_gas_10yr: 'Affordable 5-Seater (10yr gas)',
  affordable_5seat_gas_5yr: 'Affordable 5-Seater (5yr gas)',
  affordable_5seat_gas_new: 'Affordable 5-Seater (new gas)',
  bike: 'Bike',
  luxury_2seat_electric_new: 'Luxury 2-Seater (new electric)',
};

function barColor(v: number) {
  return v >= 70 ? '#4caf50' : v >= 40 ? '#ff9800' : '#f44336';
}

function fmt(n: number) {
  return '$' + n.toLocaleString();
}

// ─── StatBar ──────────────────────────────────────────────────────────────────

// In adjust mode: value = current (base + delta), base = rolled value so we can show the marker.
// In review mode: base === value, no marker needed.
function StatBar({ label, value, base, tip }: { label: string; value: number; base?: number; tip?: string }) {
  const delta = base !== undefined ? value - base : 0;
  const color = barColor(value);
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="body2" fontWeight={600}>{label}</Typography>
          {tip && (
            <Tooltip title={tip} arrow placement="top">
              <InfoOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          )}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          {delta !== 0 && (
            <Typography variant="caption" sx={{ color: delta > 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
              {delta > 0 ? `+${delta}` : delta}%
            </Typography>
          )}
          <Typography variant="body2" fontWeight={700} sx={{ color, minWidth: 36, textAlign: 'right' }}>
            {value}%
          </Typography>
        </Stack>
      </Stack>
      <Box sx={{ position: 'relative', height: 8, borderRadius: 4, bgcolor: 'grey.200', overflow: 'visible' }}>
        {/* Filled bar up to current value */}
        <Box sx={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${value}%`, bgcolor: color, borderRadius: 4, transition: 'width 0.2s' }} />
        {/* Base marker line (only shown when adjusted) */}
        {base !== undefined && delta !== 0 && (
          <Box sx={{ position: 'absolute', left: `${base}%`, top: -2, width: 2, height: 12, bgcolor: 'text.secondary', borderRadius: 1, transform: 'translateX(-50%)' }} />
        )}
      </Box>
    </Box>
  );
}

// ─── BudgetMeter ──────────────────────────────────────────────────────────────

function BudgetMeter({ label, budget, used, remaining }: {
  label: string;
  budget: number;
  used: number;
  remaining: number;
}) {
  const over = remaining < 0;
  const pct = Math.min(100, budget > 0 ? (used / budget) * 100 : 0);
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body1" fontWeight={600}>{label}</Typography>
        <Typography variant="body2" fontWeight={700} sx={{ color: over ? 'error.main' : remaining === 0 ? 'warning.main' : 'text.primary' }}>
          {budget}%{' budget '}− {used}% used{' = '}{remaining}% remaining
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 10, borderRadius: 5, bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            bgcolor: over ? 'error.main' : pct >= 100 ? 'warning.main' : 'primary.main',
            borderRadius: 5,
          },
        }}
      />
    </Box>
  );
}

// ─── QualificationPanel ───────────────────────────────────────────────────────

function QualificationPanel({ jobs, programs }: { jobs: JobPreview[]; programs: ProgramPreview[] }) {
  const [showJobs, setShowJobs] = useState(false);
  const [showPrograms, setShowPrograms] = useState(false);

  function getReqChips(requirements: unknown) {
    if (!requirements || typeof requirements !== 'object') return [];
    const reqs = requirements as Record<string, unknown>;
    const chips: { key: string; label: string }[] = [];
    if (reqs.skills && typeof reqs.skills === 'object') {
      for (const k of Object.keys(reqs.skills as Record<string, number>)) {
        chips.push({ key: `skill-${k}`, label: SKILL_LABELS[k] ?? k });
      }
    }
    if (reqs.traits && typeof reqs.traits === 'object') {
      for (const k of Object.keys(reqs.traits as Record<string, number>)) {
        chips.push({ key: `trait-${k}`, label: TRAIT_LABELS[k] ?? k });
      }
    }
    return chips;
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ mb: 1.5, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, cursor: 'pointer' }} onClick={() => setShowJobs((v) => !v)}>
          <Typography variant="body2" fontWeight={700}>Job Requirements</Typography>
          <IconButton size="small">{showJobs ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}</IconButton>
        </Stack>
        <Collapse in={showJobs}>
          <Divider />
          <Box sx={{ px: 2, py: 1.5, maxHeight: 300, overflowY: 'auto' }}>
            {jobs.length === 0
              ? <Typography variant="body2" color="text.secondary">Loading…</Typography>
              : jobs.map((job) => {
                  const chips = getReqChips(job.requirements);
                  return (
                    <Box key={job.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: chips.length ? 0.5 : 0 }}>
                        <Typography variant="body2" fontWeight={600}>{job.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{fmt(job.baseSalary)}/yr</Typography>
                      </Stack>
                      {chips.length > 0
                        ? <Stack direction="row" flexWrap="wrap" gap={0.5}>
                            {chips.map((c) => (
                              <Chip key={c.key} label={c.label} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                            ))}
                          </Stack>
                        : <Typography variant="caption" color="text.secondary">No skill/trait requirements</Typography>
                      }
                    </Box>
                  );
                })}
          </Box>
        </Collapse>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, cursor: 'pointer' }} onClick={() => setShowPrograms((v) => !v)}>
          <Typography variant="body2" fontWeight={700}>Education Program Requirements</Typography>
          <IconButton size="small">{showPrograms ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}</IconButton>
        </Stack>
        <Collapse in={showPrograms}>
          <Divider />
          <Box sx={{ px: 2, py: 1.5, maxHeight: 300, overflowY: 'auto' }}>
            {programs.length === 0
              ? <Typography variant="body2" color="text.secondary">Loading…</Typography>
              : programs.map((prog) => {
                  const chips = getReqChips(prog.requirements);
                  return (
                    <Box key={prog.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: chips.length ? 0.5 : 0 }}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <Typography variant="body2" fontWeight={600}>{prog.name}</Typography>
                          <Chip label={prog.type} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{fmt(prog.tuitionFullTime)}/yr</Typography>
                      </Stack>
                      {chips.length > 0
                        ? <Stack direction="row" flexWrap="wrap" gap={0.5}>
                            {chips.map((c) => (
                              <Chip key={c.key} label={c.label} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                            ))}
                          </Stack>
                        : <Typography variant="caption" color="text.secondary">No skill/trait requirements</Typography>
                      }
                    </Box>
                  );
                })}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
}

// ─── TraitSliderRow / SkillSliderRow ──────────────────────────────────────────
// Memoized so only the changed row re-renders on slider move.

const TraitSliderRow = memo(function TraitSliderRow({
  statKey, label, base, delta, sliderMin, sliderMax, onChange,
}: {
  statKey: string;
  label: string;
  base: number;
  delta: number;
  sliderMin: number;
  sliderMax: number;
  onChange: (key: string, newDelta: number) => void;
}) {
  const [displayCurrent, setDisplayCurrent] = useState(Math.max(0, Math.min(100, base + delta)));

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>{label}</Typography>
      <Box sx={{ position: 'relative' }}>
        <Slider
          defaultValue={Math.max(0, Math.min(100, base + delta))}
          min={sliderMin}
          max={sliderMax}
          step={1}
          marks={[
            { value: sliderMin, label: `min ${sliderMin}%` },
            { value: sliderMax, label: `max ${sliderMax}%` },
          ]}
          onChange={(_e, v) => setDisplayCurrent(v as number)}
          onChangeCommitted={(_e, v) => onChange(statKey, (v as number) - base)}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${v}%`}
          sx={{
            color: 'primary.main',
            '& .MuiSlider-thumb': { width: 16, height: 16 },
            '& .MuiSlider-track': { height: 6 },
            '& .MuiSlider-rail': { height: 6 },
            '& .MuiSlider-markLabel': { fontSize: '1rem', color: 'text.secondary' },
            '& .MuiSlider-markLabel[data-index="0"]': { transform: 'translateX(0%)' },
            '& .MuiSlider-markLabel[data-index="1"]': { transform: 'translateX(-100%)' },
          }}
        />
        <Typography variant="body1" fontWeight={700} sx={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', color: 'text.primary', pointerEvents: 'none' }}>
          {displayCurrent === base
            ? `${base}%`
            : <>{base}%{' '}<span style={{ color: displayCurrent > base ? '#4caf50' : '#f44336' }}>{displayCurrent > base ? `+ ${displayCurrent - base}%` : `− ${base - displayCurrent}%`}</span>{' = '}{displayCurrent}%</>
          }
        </Typography>
      </Box>
    </Box>
  );
});

const SkillSliderRow = memo(function SkillSliderRow({
  statKey, label, base, delta, sliderMin, sliderMax, onChange,
}: {
  statKey: string;
  label: string;
  base: number;
  delta: number;
  sliderMin: number;
  sliderMax: number;
  onChange: (key: string, newDelta: number) => void;
}) {
  const [displayCurrent, setDisplayCurrent] = useState(Math.max(0, Math.min(100, base + delta)));

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>{label}</Typography>
      <Box sx={{ position: 'relative' }}>
        <Slider
          defaultValue={Math.max(0, Math.min(100, base + delta))}
          min={sliderMin}
          max={sliderMax}
          step={1}
          marks={[
            { value: sliderMin, label: `min ${sliderMin}%` },
            { value: sliderMax, label: `max ${sliderMax}%` },
          ]}
          onChange={(_e, v) => setDisplayCurrent(v as number)}
          onChangeCommitted={(_e, v) => onChange(statKey, (v as number) - base)}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${v}%`}
          sx={{
            color: 'primary.main',
            '& .MuiSlider-thumb': { width: 16, height: 16 },
            '& .MuiSlider-track': { height: 6 },
            '& .MuiSlider-rail': { height: 6 },
            '& .MuiSlider-markLabel': { fontSize: '1rem', color: 'text.secondary' },
            '& .MuiSlider-markLabel[data-index="0"]': { transform: 'translateX(0%)' },
            '& .MuiSlider-markLabel[data-index="1"]': { transform: 'translateX(-100%)' },
          }}
        />
        <Typography variant="body1" fontWeight={700} sx={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', color: 'text.primary', pointerEvents: 'none' }}>
          {displayCurrent === base
            ? `${base}%`
            : <>{base}%{' '}<span style={{ color: displayCurrent > base ? '#4caf50' : '#f44336' }}>{displayCurrent > base ? `+ ${displayCurrent - base}%` : `− ${base - displayCurrent}%`}</span>{' = '}{displayCurrent}%</>
          }
        </Typography>
      </Box>
    </Box>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlayerInitPage() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const playerId = useSelector((state: RootState) => state.auth.playerId);
  const playerName = useSelector((state: RootState) => state.auth.playerName);

  const [activeStep, setActiveStep] = useState(0);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [traitDeltas, setTraitDeltas] = useState<Record<string, number>>({});
  const [skillDeltas, setSkillDeltas] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // ── Roll ───────────────────────────────────────────────────────────────────
  const rollMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/players/${playerId}/initialize`);
      return data as { player: PlayerData; alreadyRolled: boolean };
    },
    onSuccess: ({ player: data, alreadyRolled }) => {
      setPlayer(data);
      // If resuming after a refresh, restore deltas to zero (rolled values are already saved)
      if (!alreadyRolled) {
        setTraitDeltas({});
        setSkillDeltas({});
      }
      setActiveStep(1);
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to roll stats.';
      setError(msg);
    },
  });

  // ── Requirements preview ───────────────────────────────────────────────────
  const { data: previewData } = useQuery({
    queryKey: ['requirements-preview', playerId],
    queryFn: async () => {
      const { data } = await api.get(`/players/${playerId}/requirements-preview`);
      return data as { jobs: JobPreview[]; educationPrograms: ProgramPreview[] };
    },
    enabled: activeStep === 1 && !!player,
    staleTime: 0,
  });

  // ── Adjust (preview only — saves deltas locally, confirm applies them) ────
  // Kept for potential future use (e.g. mid-session re-roll). Currently unused.

  // ── Confirm ────────────────────────────────────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/players/${playerId}/initialize/confirm`, {
        traitAdjustments: traitDeltas,
        skillAdjustments: skillDeltas,
      });
      return data.player as PlayerData;
    },
    onSuccess: (data) => {
      dispatch(setPlayerStats({ money: data.money }));
      dispatch(setPlayerInitialized());
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to confirm profile.';
      setError(msg);
    },
  });

  // ── Budget ─────────────────────────────────────────────────────────────────
  const TRAIT_BASE = 50;
  const SKILL_BASE = 10;

  // Decreases expand the budget; increases spend it
  const traitDecreases = Object.values(traitDeltas).reduce((s, v) => s + Math.max(0, -v), 0);
  const traitIncreases = Object.values(traitDeltas).reduce((s, v) => s + Math.max(0, v), 0);
  const traitBudget = TRAIT_BASE + traitDecreases;
  const traitRemaining = traitBudget - traitIncreases;

  const skillDecreases = Object.values(skillDeltas).reduce((s, v) => s + Math.max(0, -v), 0);
  const skillIncreases = Object.values(skillDeltas).reduce((s, v) => s + Math.max(0, v), 0);
  const skillBudget = SKILL_BASE + skillDecreases;
  const skillRemaining = skillBudget - skillIncreases;

  const handleTraitChange = useCallback((trait: string, newDelta: number) => {
    setTraitDeltas((prev) => {
      const decreases = Object.entries(prev).filter(([k]) => k !== trait).reduce((s, [, v]) => s + Math.max(0, -v), 0);
      const increases = Object.entries(prev).filter(([k]) => k !== trait).reduce((s, [, v]) => s + Math.max(0, v), 0);
      const budget = TRAIT_BASE + decreases + Math.max(0, -newDelta);
      const maxUp = Math.min(10, budget - increases);
      const final = Math.max(-10, Math.min(maxUp, newDelta));
      return { ...prev, [trait]: final };
    });
  }, []);

  const handleSkillChange = useCallback((skill: string, newDelta: number) => {
    setSkillDeltas((prev) => {
      const decreases = Object.entries(prev).filter(([k]) => k !== skill).reduce((s, [, v]) => s + Math.max(0, -v), 0);
      const increases = Object.entries(prev).filter(([k]) => k !== skill).reduce((s, [, v]) => s + Math.max(0, v), 0);
      const budget = SKILL_BASE + decreases + Math.max(0, -newDelta);
      const maxUp = Math.min(2, budget - increases);
      const final = Math.max(-2, Math.min(maxUp, newDelta));
      return { ...prev, [skill]: final };
    });
  }, []);

  function handleProceedToReview() {
    setActiveStep(2);
  }

  // ─── Step 0: Roll ──────────────────────────────────────────────────────────
  function renderRollStep() {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: '1.6rem', md: '2rem' } }}>
          Welcome, {playerName}!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 520, mx: 'auto' }}>
          Roll the dice to discover your starting traits, skills, and
          what your parents have set you up with. You'll get a chance to fine-tune things before
          the game starts.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>{error}</Alert>}
        <Button
          variant="contained" size="large"
          onClick={() => rollMutation.mutate()}
          disabled={rollMutation.isPending}
          sx={{ fontWeight: 700, px: 5, py: 1.5, fontSize: '1.1rem' }}
        >
          {rollMutation.isPending ? <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} /> : null}
          🎲 Generate My Profile
        </Button>
      </Box>
    );
  }

  // ─── Step 1: Adjust ────────────────────────────────────────────────────────
  function renderAdjustStep() {
    if (!player) return null;
    const traits = player.traits;
    const skills = player.skills;

    return (
      <Box>
        <Paper variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
          <Typography variant="body1" fontWeight={700} sx={{ mb: 1 }}>How adjustments work</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            You start with <strong>50% to distribute across traits</strong> and <strong>10% across skills</strong> (max ±10% per trait, ±2% per skill).
            Decreasing a skill or trait below its rolled value <em>adds</em> to your available budget — so lowering one trait by 3% gives you 3 extra to spend elsewhere.
          </Typography>
        </Paper>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <BudgetMeter label="Traits Budget" budget={traitBudget} used={traitIncreases} remaining={traitRemaining} />
            <BudgetMeter label="Skills Budget" budget={skillBudget} used={skillIncreases} remaining={skillRemaining} />
          </Box>
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          {/* Traits column */}
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Traits</Typography>
            {Object.entries(TRAIT_LABELS).map(([key, label]) => {
              const base = traits[key] ?? 0;
              const delta = traitDeltas[key] ?? 0;
              const otherIncreases = Object.entries(traitDeltas).filter(([k]) => k !== key).reduce((s, [, v]) => s + Math.max(0, v), 0);
              const otherDecreases = Object.entries(traitDeltas).filter(([k]) => k !== key).reduce((s, [, v]) => s + Math.max(0, -v), 0);
              const effectiveBudget = TRAIT_BASE + otherDecreases + Math.max(0, -delta);
              const maxUp = Math.min(10, effectiveBudget - otherIncreases);
              const sliderMin = Math.max(0, base - 10);
              const sliderMax = Math.min(100, base + maxUp);
              return (
                <TraitSliderRow
                  key={key}
                  statKey={key}
                  label={label}
                  base={base}
                  delta={delta}
                  sliderMin={sliderMin}
                  sliderMax={sliderMax}
                  onChange={handleTraitChange}
                />
              );
            })}
          </Box>

          {/* Skills + qualification column */}
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Skills</Typography>
            {Object.entries(SKILL_LABELS).map(([key, label]) => {
              const base = skills[key] ?? 0;
              const delta = skillDeltas[key] ?? 0;
              const otherIncreases = Object.entries(skillDeltas).filter(([k]) => k !== key).reduce((s, [, v]) => s + Math.max(0, v), 0);
              const otherDecreases = Object.entries(skillDeltas).filter(([k]) => k !== key).reduce((s, [, v]) => s + Math.max(0, -v), 0);
              const effectiveBudget = SKILL_BASE + otherDecreases + Math.max(0, -delta);
              const maxUp = Math.min(2, effectiveBudget - otherIncreases);
              const sliderMin = Math.max(0, base - 2);
              const sliderMax = Math.min(100, base + maxUp);
              return (
                <SkillSliderRow
                  key={key}
                  statKey={key}
                  label={label}
                  base={base}
                  delta={delta}
                  sliderMin={sliderMin}
                  sliderMax={sliderMax}
                  onChange={handleSkillChange}
                />
              );
            })}

            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>What You Qualify For</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Updates live as you adjust your stats.
            </Typography>
            <QualificationPanel
              jobs={previewData?.jobs ?? []}
              programs={previewData?.educationPrograms ?? []}
            />
          </Box>
        </Box>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 4 }}>
          <Button
            variant="contained" size="large"
            onClick={handleProceedToReview}
            disabled={traitRemaining < 0 || skillRemaining < 0}
            sx={{ fontWeight: 700, px: 4 }}
          >
            Review →
          </Button>
        </Stack>
      </Box>
    );
  }

  // ─── Step 2: Review ────────────────────────────────────────────────────────
  function renderReviewStep() {
    if (!player) return null;
    // Show final values: rolled base + pending deltas
    const traits = Object.fromEntries(
      Object.entries(player.traits).map(([k, v]) => [k, Math.max(0, Math.min(100, v + (traitDeltas[k] ?? 0)))])
    );
    const skills = Object.fromEntries(
      Object.entries(player.skills).map(([k, v]) => [k, Math.max(0, Math.min(100, v + (skillDeltas[k] ?? 0)))])
    );
    const pc = player.parentContributions;

    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Here's your final character. Once you confirm, the game begins and these values are locked in.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          {/* Traits */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Traits</Typography>
            {Object.entries(TRAIT_LABELS).map(([key, label]) => (
              <StatBar key={key} label={label} value={traits[key] ?? 0} />
            ))}
          </Paper>

          {/* Skills */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Skills</Typography>
            {Object.entries(SKILL_LABELS).map(([key, label]) => (
              <StatBar key={key} label={label} value={skills[key] ?? 0} />
            ))}
          </Paper>

          {/* Starting situation */}
          <Box>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Starting Finances</Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Starting Money</Typography>
                  <Typography variant="body2" fontWeight={700} color="success.main">{fmt(player.money)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">College Fund</Typography>
                  <Typography variant="body2" fontWeight={700}>{fmt(player.collegeFund)}</Typography>
                </Stack>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Parent Contributions</Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Vehicle Gift</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {pc?.car ? (CAR_LABELS[pc.car] ?? pc.car) : 'None'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Wedding Contribution</Typography>
                  <Typography variant="body2" fontWeight={600}>{fmt(pc?.weddingContribution ?? 0)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Tooltip title="You can live with your parents rent-free up to this age" arrow>
                    <Typography variant="body2" color="text.secondary" sx={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                      Live With Parents Until
                    </Typography>
                  </Tooltip>
                  <Typography variant="body2" fontWeight={600}>
                    {pc?.maxParentAge === null ? 'N/A' : pc?.maxParentAge === -1 ? 'Always' : `Age ${pc.maxParentAge}`}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            {player.chronicConditions.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: 'warning.main' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: 'warning.dark' }}>
                  ⚠️ Chronic Condition
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You have a chronic health condition that caps your maximum health and reduces
                  health gain effectiveness by 80%.
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
          <Button variant="outlined" onClick={() => setActiveStep(1)} disabled={confirmMutation.isPending}>
            ← Back to Adjust
          </Button>
          <Button
            variant="contained" size="large"
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
            sx={{ fontWeight: 700, px: 5 }}
          >
            {confirmMutation.isPending ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
            🍋 Let's Play!
          </Button>
        </Stack>
      </Box>
    );
  }

  // ─── Layout ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.primary.light, display: 'flex', flexDirection: 'column', alignItems: 'center', py: { xs: 3, md: 5 }, px: { xs: 2, md: 4 } }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
          🍋 Profile Setup
        </Typography>
      </Box>

      <Paper elevation={2} sx={{ width: '100%', maxWidth: activeStep === 1 ? 1400 : 900, borderRadius: 3, p: { xs: 2.5, md: 4 } }}>
        {activeStep === 0 && renderRollStep()}
        {activeStep === 1 && renderAdjustStep()}
        {activeStep === 2 && renderReviewStep()}
      </Paper>
    </Box>
  );
}
