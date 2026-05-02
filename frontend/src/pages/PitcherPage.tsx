/**
 * PitcherPage — "Lemonade Stand"
 *
 * Displays the community lemonade pitcher with:
 * - Animated SVG pitcher that fills as lemons are added
 * - Current lemon count, yearly goal line, recommended per-player contribution
 * - Grace year warning banner
 * - Contributions breakdown by player
 * - Real-time updates via WebSocket `pitcherUpdated` event
 *
 * Requirements: Req 7
 */
import { useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  Alert,
  Chip,
  Paper,
  LinearProgress,
  Skeleton,
  Tooltip,
  Divider,
} from '@mui/material';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import type { RootState } from '../store';
import api from '../lib/api';
import {
  setPitcherState,
  updatePitcherState,
  type PlayerContribution,
} from '../features/pitcher/pitcherSlice';
import { setGameState } from '../features/game/gameSlice';

// ─── Palette ──────────────────────────────────────────────────────────────────

const LEMON = {
  yellow: '#FFD600',
  yellowLight: '#FFF9C4',
  yellowDark: '#F9A825',
  green: '#4CAF50',
  greenLight: '#E8F5E9',
  orange: '#FF6F00',
  orangeLight: '#FFF3E0',
  bg: '#FFFDE7',
  glass: 'rgba(255, 255, 255, 0.7)',
};

// ─── API response type ────────────────────────────────────────────────────────

interface PitcherApiResponse {
  currentLemons: number;
  yearlyGoal: number;
  recommendedPerPlayer: number;
  /** Backend uses `inGraceYear` on the GET endpoint */
  inGraceYear: boolean;
  contributionsByPlayer: Record<string, number>;
}

interface SessionPlayer {
  id: string;
  name: string;
}

interface SessionApiResponse {
  session: {
    players: SessionPlayer[];
  };
}

// ─── Animated Pitcher SVG ─────────────────────────────────────────────────────

interface PitcherSvgProps {
  fillPercent: number; // 0–100
  goalPercent: number; // 0–100 — where the goal line sits
  isSuccess: boolean;
}

function PitcherSvg({ fillPercent, goalPercent, isSuccess }: PitcherSvgProps) {
  // Spring-animate the fill level
  const springFill = useSpring(fillPercent, { stiffness: 60, damping: 20 });

  // SVG pitcher dimensions
  const W = 200;
  const H = 280;
  const PITCHER_TOP = 40;
  const PITCHER_BOTTOM = 240;
  const PITCHER_HEIGHT = PITCHER_BOTTOM - PITCHER_TOP;

  // The fill rect Y position (fills from bottom up)
  const fillY = useTransform(
    springFill,
    (v) => PITCHER_TOP + PITCHER_HEIGHT * (1 - Math.min(v, 100) / 100),
  );
  const fillHeight = useTransform(
    springFill,
    (v) => PITCHER_HEIGHT * (Math.min(v, 100) / 100),
  );

  // Goal line Y position
  const goalY = PITCHER_TOP + PITCHER_HEIGHT * (1 - Math.min(goalPercent, 100) / 100);

  const fillColor = isSuccess ? '#66BB6A' : LEMON.yellow;
  const fillColorDark = isSuccess ? '#388E3C' : LEMON.yellowDark;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
      <svg
        width={W}
        height={H + 20}
        viewBox={`0 0 ${W} ${H + 20}`}
        aria-label="Lemonade pitcher"
        role="img"
      >
        {/* Drop shadow filter */}
        <defs>
          <filter id="pitcher-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.15" />
          </filter>
          <clipPath id="pitcher-clip">
            {/* Pitcher body shape — trapezoid narrower at top */}
            <path d={`
              M 55 ${PITCHER_TOP}
              L 145 ${PITCHER_TOP}
              L 160 ${PITCHER_BOTTOM}
              L 40 ${PITCHER_BOTTOM}
              Z
            `} />
          </clipPath>
          <linearGradient id="fill-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={fillColorDark} stopOpacity="0.9" />
            <stop offset="50%" stopColor={fillColor} stopOpacity="1" />
            <stop offset="100%" stopColor={fillColorDark} stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="glass-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
        </defs>

        {/* Pitcher body outline */}
        <path
          d={`
            M 55 ${PITCHER_TOP}
            L 145 ${PITCHER_TOP}
            L 160 ${PITCHER_BOTTOM}
            L 40 ${PITCHER_BOTTOM}
            Z
          `}
          fill="rgba(255,255,255,0.85)"
          stroke="#BDBDBD"
          strokeWidth="2"
          filter="url(#pitcher-shadow)"
        />

        {/* Animated fill */}
        <motion.rect
          x={40}
          width={120}
          style={{ y: fillY, height: fillHeight }}
          fill="url(#fill-gradient)"
          clipPath="url(#pitcher-clip)"
        />

        {/* Lemon slices floating in the fill (decorative) */}
        {fillPercent > 10 && (
          <motion.g
            clipPath="url(#pitcher-clip)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {[
              { cx: 75, cy: 200, r: 10 },
              { cx: 120, cy: 185, r: 8 },
              { cx: 95, cy: 215, r: 7 },
            ].map((lemon, i) => (
              <g key={i}>
                <circle cx={lemon.cx} cy={lemon.cy} r={lemon.r} fill="#FFF176" stroke="#F9A825" strokeWidth="1" />
                <line x1={lemon.cx - lemon.r} y1={lemon.cy} x2={lemon.cx + lemon.r} y2={lemon.cy} stroke="#F9A825" strokeWidth="0.8" />
                <line x1={lemon.cx} y1={lemon.cy - lemon.r} x2={lemon.cx} y2={lemon.cy + lemon.r} stroke="#F9A825" strokeWidth="0.8" />
              </g>
            ))}
          </motion.g>
        )}

        {/* Glass shine overlay */}
        <path
          d={`
            M 60 ${PITCHER_TOP + 5}
            L 80 ${PITCHER_TOP + 5}
            L 85 ${PITCHER_BOTTOM - 10}
            L 65 ${PITCHER_BOTTOM - 10}
            Z
          `}
          fill="url(#glass-gradient)"
          clipPath="url(#pitcher-clip)"
        />

        {/* Pitcher outline (on top of fill) */}
        <path
          d={`
            M 55 ${PITCHER_TOP}
            L 145 ${PITCHER_TOP}
            L 160 ${PITCHER_BOTTOM}
            L 40 ${PITCHER_BOTTOM}
            Z
          `}
          fill="none"
          stroke="#9E9E9E"
          strokeWidth="2"
        />

        {/* Pitcher rim / top */}
        <rect
          x={50}
          y={PITCHER_TOP - 8}
          width={100}
          height={10}
          rx={4}
          fill="#E0E0E0"
          stroke="#BDBDBD"
          strokeWidth="1.5"
        />

        {/* Handle */}
        <path
          d={`
            M 160 ${PITCHER_TOP + 30}
            Q 185 ${PITCHER_TOP + 60} 175 ${PITCHER_TOP + 100}
            Q 165 ${PITCHER_TOP + 130} 155 ${PITCHER_TOP + 120}
          `}
          fill="none"
          stroke="#BDBDBD"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`
            M 160 ${PITCHER_TOP + 30}
            Q 185 ${PITCHER_TOP + 60} 175 ${PITCHER_TOP + 100}
            Q 165 ${PITCHER_TOP + 130} 155 ${PITCHER_TOP + 120}
          `}
          fill="none"
          stroke="#F5F5F5"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Spout */}
        <path
          d={`M 55 ${PITCHER_TOP + 5} Q 30 ${PITCHER_TOP - 5} 35 ${PITCHER_TOP - 20}`}
          fill="none"
          stroke="#BDBDBD"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Goal line */}
        <line
          x1={38}
          y1={goalY}
          x2={162}
          y2={goalY}
          stroke="#F44336"
          strokeWidth="2.5"
          strokeDasharray="6 3"
        />
        <text
          x={165}
          y={goalY + 4}
          fontSize="10"
          fill="#F44336"
          fontWeight="bold"
        >
          Goal
        </text>

        {/* Base */}
        <rect
          x={35}
          y={PITCHER_BOTTOM}
          width={130}
          height={10}
          rx={4}
          fill="#E0E0E0"
          stroke="#BDBDBD"
          strokeWidth="1.5"
        />

        {/* Success sparkles */}
        {isSuccess && (
          <motion.g
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {['✨', '🌟', '⭐'].map((star, i) => (
              <text
                key={i}
                x={[30, 160, 95][i]}
                y={[60, 55, 30][i]}
                fontSize="18"
                textAnchor="middle"
              >
                {star}
              </text>
            ))}
          </motion.g>
        )}
      </svg>
    </Box>
  );
}

// ─── Contribution Row ─────────────────────────────────────────────────────────

interface ContributionRowProps {
  contribution: PlayerContribution;
  recommendedPerPlayer: number;
  isCurrentPlayer: boolean;
}

function ContributionRow({ contribution, recommendedPerPlayer, isCurrentPlayer }: ContributionRowProps) {
  const pct = recommendedPerPlayer > 0
    ? Math.min((contribution.lemons / recommendedPerPlayer) * 100, 100)
    : 0;

  const barColor = pct >= 100 ? 'success' : pct >= 50 ? 'warning' : 'error';

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        bgcolor: isCurrentPlayer ? LEMON.yellowLight : 'background.paper',
        border: isCurrentPlayer ? `1px solid ${LEMON.yellowDark}` : '1px solid transparent',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" fontWeight={isCurrentPlayer ? 700 : 400}>
            {contribution.playerName}
          </Typography>
          {isCurrentPlayer && (
            <Chip label="You" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: LEMON.yellowDark, color: '#fff' }} />
          )}
        </Stack>
        <Typography variant="body2" fontWeight={600}>
          🍋 {contribution.lemons}
          {recommendedPerPlayer > 0 && (
            <Typography component="span" variant="caption" color="text.secondary">
              {' '}/ {recommendedPerPlayer} rec.
            </Typography>
          )}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={barColor}
        sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.08)' }}
      />
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PitcherPage() {
  const dispatch = useDispatch();
  const { gameSessionId, playerId, token } = useSelector((s: RootState) => ({
    gameSessionId: s.auth.gameSessionId,
    playerId: s.auth.playerId,
    token: s.auth.token,
  }));

  const pitcher = useSelector((s: RootState) => s.pitcher);
  const socketRef = useRef<Socket | null>(null);

  // ── Fetch pitcher data ─────────────────────────────────────────────────────
  const { isLoading, error, refetch } = useQuery({
    queryKey: ['pitcher', gameSessionId],
    queryFn: async () => {
      const [pitcherRes, sessionRes] = await Promise.all([
        api.get<PitcherApiResponse>(`/pitcher/${gameSessionId}`),
        api.get<SessionApiResponse>(`/sessions/${gameSessionId}`),
      ]);

      const pitcherData = pitcherRes.data;
      const playerMap: Record<string, string> = {};
      (sessionRes.data.session?.players ?? []).forEach((p) => {
        playerMap[p.id] = p.name;
      });

      const contributions: PlayerContribution[] = Object.entries(
        pitcherData.contributionsByPlayer ?? {},
      ).map(([pid, lemons]) => ({
        playerId: pid,
        playerName: playerMap[pid] ?? 'Unknown Player',
        lemons: lemons as number,
      }));

      // Sort by lemons descending
      contributions.sort((a, b) => b.lemons - a.lemons);

      dispatch(
        setPitcherState({
          currentLemons: pitcherData.currentLemons,
          yearlyGoal: pitcherData.yearlyGoal,
          recommendedPerPlayer: pitcherData.recommendedPerPlayer,
          graceYearUsed: pitcherData.inGraceYear,
          contributionsByPlayer: contributions,
        }),
      );

      // Also sync game slice for navbar
      dispatch(
        setGameState({
          pitcherLemons: pitcherData.currentLemons,
          pitcherGoal: pitcherData.yearlyGoal,
        }),
      );

      return pitcherData;
    },
    enabled: !!gameSessionId,
    staleTime: 30_000,
  });

  // ── Socket: listen for pitcherUpdated ─────────────────────────────────────
  const handlePitcherUpdated = useCallback(
    (payload: {
      currentLemons: number;
      yearlyGoal: number;
      recommendedPerPlayer: number;
      graceYearUsed: boolean;
      contributionsByPlayer: Record<string, number>;
    }) => {
      // Re-fetch to get player names mapped to contributions
      refetch();

      // Immediately update game slice for navbar
      dispatch(
        setGameState({
          pitcherLemons: payload.currentLemons,
          pitcherGoal: payload.yearlyGoal,
        }),
      );
    },
    [dispatch, refetch],
  );

  useEffect(() => {
    if (!token || !gameSessionId) return;

    const socket = io('http://localhost:3001', { auth: { token } });
    socketRef.current = socket;

    socket.emit('joinGame', { gameSessionId });
    socket.on('pitcherUpdated', handlePitcherUpdated);

    return () => {
      socket.off('pitcherUpdated', handlePitcherUpdated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, gameSessionId, handlePitcherUpdated]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const { currentLemons, yearlyGoal, recommendedPerPlayer, graceYearUsed, contributionsByPlayer } =
    pitcher;

  const fillPercent = yearlyGoal > 0 ? Math.min((currentLemons / yearlyGoal) * 100, 100) : 0;
  const isSuccess = currentLemons >= yearlyGoal && yearlyGoal > 0;

  // Goal line sits at 100% of the pitcher height (the top of the fill area)
  // We show it at the 100% mark always — the fill rises to meet it
  const goalPercent = 100;

  if (!gameSessionId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You must be in an active game session to view the pitcher.</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        pb: 6,
        maxWidth: 900,
        mx: 'auto',
        bgcolor: LEMON.bg,
        minHeight: '100vh',
      }}
    >
      {/* Page header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: LEMON.orange }}>
            🍹 Lemonade Stand
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fill the community pitcher together — every lemon counts
          </Typography>
        </Box>

        {/* Quick stats chips */}
        {pitcher.loaded && (
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Chip
              label={`🍋 ${currentLemons} lemons`}
              size="small"
              sx={{ bgcolor: LEMON.yellow, color: '#5D4037', fontWeight: 700 }}
            />
            <Chip
              label={`🎯 Goal: ${yearlyGoal}`}
              size="small"
              sx={{ bgcolor: isSuccess ? LEMON.green : '#EF9A9A', color: '#fff', fontWeight: 700 }}
            />
            {fillPercent > 0 && (
              <Chip
                label={`${fillPercent.toFixed(0)}% full`}
                size="small"
                color={isSuccess ? 'success' : 'default'}
                sx={{ fontWeight: 700 }}
              />
            )}
          </Stack>
        )}
      </Stack>

      {/* Grace year warning */}
      {graceYearUsed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Alert
            severity="warning"
            sx={{
              mb: 2,
              bgcolor: LEMON.orangeLight,
              border: `1px solid ${LEMON.orange}`,
              '& .MuiAlert-icon': { color: LEMON.orange },
            }}
          >
            <Typography variant="body2" fontWeight={700}>
              ⚠️ Grace Year Active
            </Typography>
            <Typography variant="body2">
              The pitcher goal was missed last year. This is your grace year — if the goal is missed
              again, the game ends. Fill that pitcher!
            </Typography>
          </Alert>
        </motion.div>
      )}

      {/* Success banner */}
      {isSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Alert
            severity="success"
            sx={{ mb: 2, bgcolor: LEMON.greenLight, border: `1px solid ${LEMON.green}` }}
          >
            <Typography variant="body2" fontWeight={700}>
              🎉 Pitcher Goal Reached!
            </Typography>
            <Typography variant="body2">
              Amazing teamwork! You've filled the pitcher for this year.
            </Typography>
          </Alert>
        </motion.div>
      )}

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load pitcher data. Please try again.
        </Alert>
      )}

      {/* Main content */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        alignItems={{ xs: 'center', md: 'flex-start' }}
      >
        {/* Left: Pitcher visualization */}
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: LEMON.glass,
            backdropFilter: 'blur(8px)',
            minWidth: 260,
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {isLoading ? (
            <Skeleton variant="rounded" width={200} height={300} sx={{ mx: 'auto' }} />
          ) : (
            <>
              <PitcherSvg
                fillPercent={fillPercent}
                goalPercent={goalPercent}
                isSuccess={isSuccess}
              />

              {/* Lemon count */}
              <motion.div
                key={currentLemons}
                initial={{ scale: 1.2, color: LEMON.yellowDark }}
                animate={{ scale: 1, color: '#5D4037' }}
                transition={{ duration: 0.4 }}
              >
                <Typography variant="h3" fontWeight={800} sx={{ color: LEMON.orange, lineHeight: 1 }}>
                  {currentLemons}
                </Typography>
              </motion.div>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                lemons in pitcher
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              {/* Goal info */}
              <Stack spacing={0.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Yearly goal</Typography>
                  <Typography variant="body2" fontWeight={700}>{yearlyGoal} 🍋</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Remaining</Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={isSuccess ? 'success.main' : 'error.main'}
                  >
                    {isSuccess ? '✅ Done!' : `${Math.max(0, yearlyGoal - currentLemons)} 🍋`}
                  </Typography>
                </Stack>
                {recommendedPerPlayer > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Tooltip title="Recommended lemons per player to hit the goal">
                      <Typography variant="body2" color="text.secondary" sx={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                        Rec. per player
                      </Typography>
                    </Tooltip>
                    <Typography variant="body2" fontWeight={700} sx={{ color: LEMON.orange }}>
                      {recommendedPerPlayer} 🍋
                    </Typography>
                  </Stack>
                )}
              </Stack>

              {/* Fill progress bar */}
              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={fillPercent}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: 'rgba(0,0,0,0.08)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: isSuccess ? LEMON.green : LEMON.yellow,
                      borderRadius: 5,
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {fillPercent.toFixed(1)}% of yearly goal
                </Typography>
              </Box>
            </>
          )}
        </Paper>

        {/* Right: Contributions breakdown */}
        <Box sx={{ flex: 1, width: '100%' }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: LEMON.glass }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: LEMON.orange }}>
              🏆 Player Contributions
            </Typography>

            {isLoading ? (
              <Stack spacing={1.5}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={60} />
                ))}
              </Stack>
            ) : contributionsByPlayer.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No contributions yet this year. Start earning lemons!
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {contributionsByPlayer.map((c) => (
                  <motion.div
                    key={c.playerId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ContributionRow
                      contribution={c}
                      recommendedPerPlayer={recommendedPerPlayer}
                      isCurrentPlayer={c.playerId === playerId}
                    />
                  </motion.div>
                ))}
              </Stack>
            )}

            {/* Total */}
            {contributionsByPlayer.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={700} color="text.secondary">
                    Total contributed
                  </Typography>
                  <Typography variant="body1" fontWeight={800} sx={{ color: LEMON.orange }}>
                    🍋 {contributionsByPlayer.reduce((sum, c) => sum + c.lemons, 0)}
                  </Typography>
                </Stack>
              </>
            )}
          </Paper>

          {/* How lemons are earned info card */}
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 3, bgcolor: LEMON.glass, mt: 2 }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: LEMON.orange }}>
              🍋 Age-Based Lemon Requirements
            </Typography>
            <Stack spacing={0.5}>
              {[
                { range: 'Ages 20–22', lemons: 10 },
                { range: 'Ages 23–30', lemons: 20 },
                { range: 'Ages 31–50', lemons: 40 },
                { range: 'Ages 51–65', lemons: 60 },
                { range: 'Ages 66+', lemons: 80 },
              ].map(({ range, lemons }) => (
                <Stack key={range} direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">{range}</Typography>
                  <Typography variant="caption" fontWeight={600}>{lemons} lemons/player</Typography>
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              The yearly goal is the sum of all living players' requirements.
            </Typography>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}
