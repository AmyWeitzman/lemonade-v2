/**
 * ProfileDrawer — "Tending the Garden" collapsible profile panel.
 * Accessible from the secondary nav. Shows skills, traits, health/stress,
 * finances, family, certifications, timeline, and notes.
 *
 * Requirements: Req 23
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip,
  Stack,
  Chip,
  Divider,
  TextField,
  Button,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import AddIcon from '@mui/icons-material/Add';
import type { RootState } from '../../store';
import api from '../../lib/api';
import DrawingCanvas from './DrawingCanvas';

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAWER_WIDTH = 400;

const SKILL_LABELS: Record<string, string> = {
  math: 'Math',
  science: 'Science',
  art: 'Art',
  music: 'Music',
  writing: 'Writing',
  analysis: 'Analysis',
  homeRepair: 'Home Repair',
  technology: 'Technology',
};

const TRAIT_LABELS: Record<string, string> = {
  bravery: 'Bravery',
  perseverance: 'Perseverance',
  charisma: 'Charisma',
  compassion: 'Compassion',
  creativity: 'Creativity',
  organization: 'Organization',
  patience: 'Patience',
  caution: 'Caution',
  sociability: 'Sociability',
  stressTolerance: 'Stress Tolerance',
  goodWithKids: 'Good With Kids',
  physicalAbility: 'Physical Ability',
  communication: 'Communication',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerProfile {
  id: string;
  name: string;
  age: number;
  health: number;
  maxHealth: number;
  stress: number;
  money: number;
  projectedIncome: number;
  retirementSavings: number;
  collegeFund: number;
  skills: Record<string, number>;
  traits: Record<string, number>;
  chronicConditions: string[];
  certifications: Certification[];
  maritalStatus: string;
  spouse: SpouseData | null;
  children: ChildData[];
  pets: PetData[];
  loans: LoanData[];
  employments: EmploymentData[];
  educations: EducationData[];
  actionHistory: ActionHistoryItem[];
}

interface Certification {
  type: string;
  expiryYear?: number;
}

interface SpouseData {
  name: string;
  age?: number;
  job?: string;
}

interface ChildData {
  id: string;
  age: number;
  isAdopted: boolean;
  hasChildren: boolean;
  childrenCount: number;
}

interface PetData {
  id: string;
  type: string;
  age: number;
  isAlive: boolean;
}

interface LoanData {
  id: string;
  currentBalance: number;
  owner: string;
  isJoint: boolean;
}

interface EmploymentData {
  jobId: string;
  startAge: number;
  currentSalary: number;
  isActive: boolean;
  job?: { title: string };
}

interface EducationData {
  programId: string;
  startAge: number;
  graduated: boolean;
  graduationAge?: number;
  program?: { name: string; type: string };
}

interface ActionHistoryItem {
  actionId: string;
  year: number;
  count: number;
  lemonsEarned: number;
  action?: { name: string; category: string[] };
}

interface Note {
  id: string;
  text: string;
  drawingDataUrl?: string;
  timelineAge?: number;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function healthBarColor(value: number): string {
  if (value > 70) return '#4caf50';
  if (value >= 50) return '#ff9800';
  return '#f44336';
}

function stressBarColor(value: number): string {
  if (value < 40) return '#4caf50';
  if (value <= 70) return '#ff9800';
  return '#f44336';
}

function fmtCurrency(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

function fmtAge(age: number): string {
  return `Age ${age}`;
}

// ─── StatBar ──────────────────────────────────────────────────────────────────

function StatBar({ label, value, color }: { label: string; value: number; color?: string }) {
  const barColor = color ?? healthBarColor(value);
  return (
    <Box sx={{ mb: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
        <Typography variant="caption" fontWeight={600} sx={{ color: 'text.primary' }}>
          {label}
        </Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color: barColor }}>
          {value}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, value))}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 3 },
        }}
      />
    </Box>
  );
}

// ─── HealthBar with max health cap ───────────────────────────────────────────

function HealthBar({ health, maxHealth, chronicConditions }: {
  health: number;
  maxHealth: number;
  chronicConditions: string[];
}) {
  const hasChronicCap = chronicConditions.length > 0 && maxHealth < 100;
  const filledPct = Math.min(health, maxHealth);
  const cappedPct = hasChronicCap ? maxHealth : 100;
  const grayedPct = cappedPct - filledPct; // region between current health and maxHealth
  const barColor = healthBarColor(health);

  return (
    <Box sx={{ mb: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
        <Typography variant="caption" fontWeight={600}>Health</Typography>
        <Stack direction="row" spacing={0.75} alignItems="center">
          {hasChronicCap && (
            <Chip
              label={`Cap: ${maxHealth}%`}
              size="small"
              sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'grey.300' }}
            />
          )}
          <Typography variant="caption" fontWeight={700} sx={{ color: barColor }}>
            {Math.round(health)}%
          </Typography>
        </Stack>
      </Stack>

      {/* Segmented health bar */}
      <Tooltip
        title={
          hasChronicCap
            ? `Your chronic condition(s) cap your maximum health at ${maxHealth}%. Health gains above this threshold have no effect.`
            : `Health: ${Math.round(health)}%`
        }
        placement="top"
        arrow
      >
        <Box sx={{ position: 'relative', height: 8, borderRadius: 4, bgcolor: 'grey.200', overflow: 'hidden' }}>
          {/* Filled portion (current health) */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${filledPct}%`,
              bgcolor: barColor,
              borderRadius: 4,
              transition: 'width 0.3s',
            }}
          />
          {/* Grayed-out region (between current health and maxHealth cap) */}
          {hasChronicCap && grayedPct > 0 && (
            <Box
              sx={{
                position: 'absolute',
                left: `${filledPct}%`,
                top: 0,
                height: '100%',
                width: `${grayedPct}%`,
                bgcolor: 'grey.400',
                opacity: 0.6,
              }}
            />
          )}
          {/* Cap marker line */}
          {hasChronicCap && (
            <Box
              sx={{
                position: 'absolute',
                left: `${cappedPct}%`,
                top: 0,
                width: 2,
                height: '100%',
                bgcolor: 'error.main',
                transform: 'translateX(-50%)',
              }}
            />
          )}
        </Box>
      </Tooltip>

      {hasChronicCap && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
          Chronic condition limits max health to {maxHealth}%
        </Typography>
      )}
    </Box>
  );
}

// ─── Notes Section ────────────────────────────────────────────────────────────

function NotesSection({ playerId, currentAge }: { playerId: string; currentAge: number }) {
  const STORAGE_KEY = `lemonade_notes_${playerId}`;

  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Note[]) : [];
    } catch {
      return [];
    }
  });

  const [noteText, setNoteText] = useState('');
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | undefined>(undefined);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported] = useState(
    () => !!(window.SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition),
  );
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Persist notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes, STORAGE_KEY]);

  const handleAddNote = () => {
    if (!noteText.trim() && !drawingDataUrl) return;
    const newNote: Note = {
      id: Date.now().toString(),
      text: noteText.trim(),
      drawingDataUrl,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setNoteText('');
    setDrawingDataUrl(undefined);
  };

  const handleAddToTimeline = (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, timelineAge: currentAge } : n)),
    );
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleSpeechToggle = useCallback(() => {
    if (!speechSupported) return;

    const SpeechRecognitionClass =
      window.SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition as typeof SpeechRecognition;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setNoteText((prev) => prev + transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, speechSupported]);

  return (
    <Box>
      {/* Input area */}
      <TextField
        multiline
        minRows={3}
        maxRows={6}
        fullWidth
        placeholder="Write a note..."
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        size="small"
        sx={{ mb: 1 }}
      />

      {/* Drawing canvas */}
      <DrawingCanvas
        onChange={setDrawingDataUrl}
        width={360}
        height={160}
      />

      {/* Action buttons */}
      <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
        {speechSupported && (
          <Tooltip title={isListening ? 'Stop listening' : 'Speech to text'}>
            <IconButton
              size="small"
              onClick={handleSpeechToggle}
              color={isListening ? 'error' : 'default'}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              {isListening ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddNote}
          disabled={!noteText.trim() && !drawingDataUrl}
          sx={{ fontWeight: 600 }}
        >
          Add Note
        </Button>
      </Stack>

      {/* Saved notes list */}
      {notes.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Saved Notes ({notes.length})
          </Typography>
          <Stack spacing={1}>
            {notes.map((note) => (
              <Paper key={note.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                {note.text && (
                  <Typography variant="body2" sx={{ mb: note.drawingDataUrl ? 1 : 0, whiteSpace: 'pre-wrap' }}>
                    {note.text}
                  </Typography>
                )}
                {note.drawingDataUrl && (
                  <Box
                    component="img"
                    src={note.drawingDataUrl}
                    alt="Drawing"
                    sx={{ width: '100%', borderRadius: 1, border: '1px solid', borderColor: 'divider', mb: 0.5 }}
                  />
                )}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {note.timelineAge !== undefined ? (
                      <Chip label={`Timeline: Age ${note.timelineAge}`} size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                    ) : (
                      <Tooltip title={`Add to timeline at Age ${currentAge}`}>
                        <Button
                          size="small"
                          variant="text"
                          sx={{ fontSize: '0.65rem', py: 0, px: 0.5, minWidth: 0 }}
                          onClick={() => handleAddToTimeline(note.id)}
                        >
                          + Timeline
                        </Button>
                      </Tooltip>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                      {new Date(note.createdAt).toLocaleDateString()}
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    color="error"
                    variant="text"
                    sx={{ fontSize: '0.65rem', py: 0, px: 0.5, minWidth: 0 }}
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    Delete
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

// ─── Main ProfileDrawer Component ────────────────────────────────────────────

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const playerId = useSelector((state: RootState) => state.auth.playerId);
  const playerName = useSelector((state: RootState) => state.auth.playerName);
  const authHealth = useSelector((state: RootState) => state.auth.health);
  const authStress = useSelector((state: RootState) => state.auth.stress);
  const authMoney = useSelector((state: RootState) => state.auth.money);
  const currentYear = useSelector((state: RootState) => state.game.currentYear);

  // Fetch full player profile
  const { data: profile } = useQuery<PlayerProfile>({
    queryKey: ['player-profile', playerId],
    queryFn: async () => {
      const { data } = await api.get(`/players/${playerId}/profile`);
      return data.player as PlayerProfile;
    },
    enabled: !!playerId && open,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Derive display values — prefer full profile data, fall back to auth state
  const health = profile?.health ?? authHealth;
  const maxHealth = profile?.maxHealth ?? 100;
  const stress = profile?.stress ?? authStress;
  const money = profile?.money ?? authMoney;
  const skills = profile?.skills ?? {};
  const traits = profile?.traits ?? {};
  const chronicConditions = profile?.chronicConditions ?? [];
  const certifications = profile?.certifications ?? [];
  const children = profile?.children ?? [];
  const pets = profile?.pets ?? [];
  const loans = profile?.loans ?? [];
  const employments = profile?.employments ?? [];
  const educations = profile?.educations ?? [];
  const actionHistory = profile?.actionHistory ?? [];
  const currentAge = profile?.age ?? (18 + currentYear - 1);

  // Build timeline events from player state
  const timelineEvents: { age: number; label: string }[] = [];

  // Employment events
  employments.forEach((emp) => {
    const jobTitle = emp.job?.title ?? 'Job';
    timelineEvents.push({ age: emp.startAge, label: `Started: ${jobTitle}` });
    if (!emp.isActive && emp.job) {
      timelineEvents.push({ age: currentAge, label: `Left: ${jobTitle}` });
    }
  });

  // Education events
  educations.forEach((edu) => {
    const progName = edu.program?.name ?? 'Program';
    timelineEvents.push({ age: edu.startAge, label: `Enrolled: ${progName}` });
    if (edu.graduated && edu.graduationAge) {
      timelineEvents.push({ age: edu.graduationAge, label: `Graduated: ${progName}` });
    }
  });

  // Family events
  if (profile?.maritalStatus === 'married' && profile.spouse) {
    timelineEvents.push({ age: currentAge, label: `Married: ${profile.spouse.name}` });
  }
  children.forEach((child) => {
    const childAge = child.age;
    const playerAgeAtBirth = currentAge - childAge;
    timelineEvents.push({
      age: playerAgeAtBirth,
      label: child.isAdopted ? 'Adopted a child' : 'Had a child',
    });
  });

  // Sort timeline by age
  timelineEvents.sort((a, b) => a.age - b.age);

  // Total loan balance
  const totalLoanBalance = loans.reduce((sum, l) => sum + l.currentBalance, 0);

  // Grandchildren count
  const grandchildrenCount = children.reduce((sum, c) => sum + (c.childrenCount ?? 0), 0);

  const drawerContent = (
    <Box
      sx={{
        width: isMobile ? '100vw' : DRAWER_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            🌱 Tending the Garden
          </Typography>
          {playerName && (
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {playerName} · Age {currentAge}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'inherit' }} aria-label="close profile drawer">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 0 }}>
        {/* ── Skills ── */}
        <Accordion defaultExpanded disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 44 }}>
            <Typography variant="body2" fontWeight={700}>📚 Skills</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
            {Object.entries(SKILL_LABELS).map(([key, label]) => (
              <StatBar key={key} label={label} value={skills[key] ?? 0} />
            ))}
            {Object.keys(skills).length === 0 && (
              <Typography variant="caption" color="text.secondary">No skill data available yet.</Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ── Traits ── */}
        <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 44 }}>
            <Typography variant="body2" fontWeight={700}>✨ Traits</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
            {Object.entries(TRAIT_LABELS).map(([key, label]) => (
              <StatBar key={key} label={label} value={traits[key] ?? 0} />
            ))}
            {Object.keys(traits).length === 0 && (
              <Typography variant="caption" color="text.secondary">No trait data available yet.</Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ── Health & Stress ── */}
        <Accordion defaultExpanded disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 44 }}>
            <Typography variant="body2" fontWeight={700}>❤️ Health & Stress</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
            <HealthBar health={health} maxHealth={maxHealth} chronicConditions={chronicConditions} />
            <StatBar
              label="Stress"
              value={Math.round(stress)}
              color={stressBarColor(stress)}
            />
            {chronicConditions.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Chronic Conditions:
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                  {chronicConditions.map((c, i) => (
                    <Chip key={i} label={c.replace(/_/g, ' ')} size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                  ))}
                </Stack>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ── Finances ── */}
        <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 44 }}>
            <Typography variant="body2" fontWeight={700}>💰 Finances</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
            <Stack spacing={0.75}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Current Money</Typography>
                <Typography variant="caption" fontWeight={700} color="success.main">{fmtCurrency(money)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Projected Income</Typography>
                <Typography variant="caption" fontWeight={600}>{fmtCurrency(profile?.projectedIncome ?? 0)}/yr</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Retirement Savings</Typography>
                <Typography variant="caption" fontWeight={600}>{fmtCurrency(profile?.retirementSavings ?? 0)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Total Loan Balance</Typography>
                <Typography variant="caption" fontWeight={600} color={totalLoanBalance > 0 ? 'error.main' : 'text.primary'}>
                  {fmtCurrency(totalLoanBalance)}
                </Typography>
              </Stack>
              {(profile?.collegeFund ?? 0) > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">College Fund</Typography>
                  <Typography variant="caption" fontWeight={600}>{fmtCurrency(profile?.collegeFund ?? 0)}</Typography>
                </Stack>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ── Family ── */}
        <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 44 }}>
            <Typography variant="body2" fontWeight={700}>👨‍👩‍👧 Family</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
            {/* Spouse */}
            {profile?.maritalStatus === 'married' && profile.spouse ? (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Spouse
                </Typography>
                <Paper variant="outlined" sx={{ p: 1, mt: 0.5, borderRadius: 1.5 }}>
                  <Typography variant="body2" fontWeight={600}>{profile.spouse.name}</Typography>
                  {profile.spouse.age && (
                    <Typography variant="caption" color="text.secondary">Age {profile.spouse.age}</Typography>
                  )}
                  {profile.spouse.job && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{profile.spouse.job}</Typography>
                  )}
                </Paper>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {profile?.maritalStatus === 'divorced' ? 'Divorced' : 'Single'}
              </Typography>
            )}

            {/* Children */}
            {children.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Children ({children.length})
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  {children.map((child) => (
                    <Stack key={child.id} direction="row" alignItems="center" spacing={0.75}>
                      <Typography variant="caption">👶 Age {child.age}</Typography>
                      {child.isAdopted && (
                        <Chip label="Adopted" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                      )}
                      {child.hasChildren && (
                        <Chip label={`${child.childrenCount} grandchild${child.childrenCount !== 1 ? 'ren' : ''}`} size="small" color="secondary" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                      )}
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Grandchildren summary */}
            {grandchildrenCount > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                👴 {grandchildrenCount} grandchild{grandchildrenCount !== 1 ? 'ren' : ''}
              </Typography>
            )}

            {/* Pets */}
            {pets.filter((p) => p.isAlive).length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Pets ({pets.filter((p) => p.isAlive).length})
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  {pets.filter((p) => p.isAlive).map((pet) => (
                    <Stack key={pet.id} direction="row" alignItems="center" spacing={0.75}>
                      <Typography variant="caption">
                        {pet.type === 'large' ? '🐕' : '🐈'} {pet.type === 'large' ? 'Large' : 'Small'} pet · Age {pet.age}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            {children.length === 0 && pets.filter((p) => p.isAlive).length === 0 && profile?.maritalStatus !== 'married' && (
              <Typography variant="caption" color="text.secondary">No family members yet.</Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ── Certifications ── */}
        <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 44 }}>
            <Typography variant="body2" fontWeight={700}>🏅 Certifications</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
            {certifications.length > 0 ? (
              <Stack spacing={0.75}>
                {certifications.map((cert, i) => (
                  <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" fontWeight={600}>
                      {cert.type === 'CPR' ? '🫀 CPR Certification' : cert.type}
                    </Typography>
                    {cert.expiryYear !== undefined && (
                      <Chip
                        label={`Expires: Year ${cert.expiryYear}`}
                        size="small"
                        color={cert.expiryYear <= currentYear + 1 ? 'warning' : 'default'}
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.6rem' }}
                      />
                    )}
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary">No certifications yet.</Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ── Timeline ── */}
        <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 44 }}>
            <Typography variant="body2" fontWeight={700}>📅 Timeline</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
            {timelineEvents.length > 0 ? (
              <Box sx={{ position: 'relative', pl: 2 }}>
                {/* Vertical line */}
                <Box sx={{ position: 'absolute', left: 6, top: 4, bottom: 4, width: 2, bgcolor: 'primary.light', borderRadius: 1 }} />
                <Stack spacing={1}>
                  {timelineEvents.map((event, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          flexShrink: 0,
                          mt: 0.3,
                          ml: -1.5,
                          zIndex: 1,
                        }}
                      />
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {fmtAge(event.age)}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 500 }}>
                          {event.label}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">No timeline events yet.</Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ── Notes ── */}
        <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 44 }}>
            <Typography variant="body2" fontWeight={700}>📝 Notes</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
            {playerId ? (
              <NotesSection playerId={playerId} currentAge={currentAge} />
            ) : (
              <Typography variant="caption" color="text.secondary">Sign in to use notes.</Typography>
            )}
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant={isMobile ? 'temporary' : 'temporary'}
      ModalProps={{ keepMounted: true }}
      sx={{
        zIndex: (t) => t.zIndex.drawer + 2,
        '& .MuiDrawer-paper': {
          width: isMobile ? '100vw' : DRAWER_WIDTH,
          boxSizing: 'border-box',
          mt: '56px',
          height: 'calc(100% - 56px)',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
