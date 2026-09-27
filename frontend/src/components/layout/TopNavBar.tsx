/**
 * TopNavBar — primary navigation bar always visible during gameplay.
 * Shows health bar, stress bar, money, mini pitcher, notification badge,
 * message badge, and player name.
 */
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  LinearProgress,
  Tooltip,
  IconButton,
  Badge,
  Chip,
  Stack,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChatIcon from '@mui/icons-material/Chat';
import type { RootState } from '../../store';
import NotificationBadge from '../../features/notifications/NotificationBadge';
import { setChatOpen } from '../../features/messages/messagesSlice';

interface Props {
  onMenuClick: () => void;
}

// ─── Number abbreviation ──────────────────────────────────────────────────────

function abbrevNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `$${Math.floor(n / 100_000) / 10}M`;
  }
  if (abs >= 1_000) {
    return `$${Math.floor(n / 100) / 10}K`;
  }
  return `$${n.toLocaleString()}`;
}

// ─── Mini Pitcher SVG ─────────────────────────────────────────────────────────

function MiniPitcher({ fillPercent }: { fillPercent: number }) {
  const clampedFill = Math.min(Math.max(fillPercent, 0), 100);
  const isSuccess = clampedFill >= 100;

  const BODY_TOP = 4;
  const BODY_BOTTOM = 28;
  const BODY_HEIGHT = BODY_BOTTOM - BODY_TOP;
  const fillY = BODY_TOP + BODY_HEIGHT * (1 - clampedFill / 100);
  const fillH = BODY_HEIGHT * (clampedFill / 100);

  return (
    <svg
      width={20}
      height={32}
      viewBox="0 0 24 34"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id="mini-pitcher-clip">
          <path d={`M 4 ${BODY_TOP} L 20 ${BODY_TOP} L 22 ${BODY_BOTTOM} L 2 ${BODY_BOTTOM} Z`} />
        </clipPath>
      </defs>
      <path
        d={`M 4 ${BODY_TOP} L 20 ${BODY_TOP} L 22 ${BODY_BOTTOM} L 2 ${BODY_BOTTOM} Z`}
        fill="rgba(255,255,255,0.25)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1.2"
      />
      {clampedFill > 0 && (
        <rect
          x={2}
          y={fillY}
          width={20}
          height={fillH}
          fill={isSuccess ? '#66BB6A' : '#FFD600'}
          clipPath="url(#mini-pitcher-clip)"
          opacity={0.9}
        />
      )}
      <path
        d={`M 4 ${BODY_TOP} L 20 ${BODY_TOP} L 22 ${BODY_BOTTOM} L 2 ${BODY_BOTTOM} Z`}
        fill="none"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.2"
      />
      <rect x={3} y={BODY_TOP - 2} width={18} height={3} rx={1} fill="rgba(255,255,255,0.6)" />
      <path
        d={`M 22 ${BODY_TOP + 5} Q 27 ${BODY_TOP + 10} 24 ${BODY_TOP + 18}`}
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x={1} y={BODY_BOTTOM} width={22} height={3} rx={1} fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

export default function TopNavBar({ onMenuClick }: Props) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { username, health, stress, money } = useSelector(
    (state: RootState) => state.auth,
  );
  const { pitcherLemons, pitcherGoal, unreadMessages } = useSelector(
    (state: RootState) => state.game,
  );

  // Loans and retirement from finances slice if available
  const loans = useSelector(
    (state: RootState) =>
      (state as unknown as { finances?: { totalLoanBalance?: number } }).finances
        ?.totalLoanBalance ?? 0,
  );
  const retirement = useSelector(
    (state: RootState) =>
      (state as unknown as { finances?: { retirementSavings?: number } }).finances
        ?.retirementSavings ?? 0,
  );

  const healthColor = health > 60 ? 'success' : health > 30 ? 'warning' : 'error';
  const stressColor = stress < 40 ? 'success' : stress < 70 ? 'warning' : 'error';

  const pitcherPercent =
    pitcherGoal > 0 ? Math.min((pitcherLemons / pitcherGoal) * 100, 100) : 0;

  // Tooltip: loans + retirement only, bigger text, abbreviated numbers
  const moneyTooltip = (
    <Stack spacing={0.75} sx={{ p: 0.5 }}>
      <Typography variant="body2" fontWeight={700}>
        💳 Loans: {abbrevNumber(loans)}
      </Typography>
      <Typography variant="body2" fontWeight={700}>
        🌻 Retirement: {abbrevNumber(retirement)}
      </Typography>
    </Stack>
  );

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ gap: 1, flexWrap: 'nowrap', minHeight: 56 }}>

        {/* Hamburger */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          aria-label="open menu"
          size="small"
        >
          <MenuIcon />
        </IconButton>

        {/* Logo */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mr: 1, flexShrink: 0 }}
          onClick={() => navigate('/')}
          role="button"
          aria-label="Go to home"
        >
          <Typography variant="h6" component="span" sx={{ lineHeight: 1 }}>
            🍋
          </Typography>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
            Lemonade
          </Typography>
        </Box>

        {/* Push health/stress to right side */}
        <Box sx={{ flex: 1 }} />

        {/* Health bar */}
        <Tooltip title={`Health: ${health}%`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: 260, mr: 2 }}>
            <Typography sx={{ color: 'inherit', whiteSpace: 'nowrap', fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>
              ❤️
            </Typography>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={health}
                color={healthColor}
                sx={{ height: 14, borderRadius: 7, bgcolor: 'rgba(255,255,255,0.2)' }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'inherit', minWidth: 30, textAlign: 'right', flexShrink: 0 }}>
              {health}%
            </Typography>
          </Box>
        </Tooltip>

        {/* Stress bar */}
        <Tooltip title={`Stress: ${stress}%`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: 260 }}>
            <Typography sx={{ color: 'inherit', whiteSpace: 'nowrap', fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>
              😰
            </Typography>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={stress}
                color={stressColor}
                sx={{ height: 14, borderRadius: 7, bgcolor: 'rgba(255,255,255,0.2)' }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'inherit', minWidth: 30, textAlign: 'right', flexShrink: 0 }}>
              {stress}%
            </Typography>
          </Box>
        </Tooltip>

        {/* Spacer between stress % and money chip */}
        <Box sx={{ width: 12, flexShrink: 0 }} />

        {/* Money chip — shows abbreviated amount, tooltip shows loans + retirement */}
        <Tooltip title={moneyTooltip} arrow>
          <Chip
            label={abbrevNumber(money)}
            size="small"
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              color: 'inherit',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'default',
              flexShrink: 0,
            }}
          />
        </Tooltip>

        {/* Mini pitcher */}
        <Tooltip title={`Pitcher: ${pitcherLemons}/${pitcherGoal} lemons (${pitcherPercent.toFixed(0)}%)`}>
          <IconButton
            color="inherit"
            size="small"
            onClick={() => navigate('/pitcher')}
            aria-label="view pitcher"
            sx={{ p: 0.5 }}
          >
            <MiniPitcher fillPercent={pitcherPercent} />
          </IconButton>
        </Tooltip>

        {/* Notifications — "Planting and Pruning" */}
        <NotificationBadge tooltipTitle="Planting and Pruning" />

        {/* Chat — "Lemon Tea" */}
        <Tooltip title="Lemon Tea">
          <IconButton
            color="inherit"
            size="small"
            aria-label="open chat"
            onClick={() => dispatch(setChatOpen(true))}
          >
            <Badge badgeContent={unreadMessages || undefined} color="error" max={99}>
              <ChatIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Player (human) username */}
        {username && (
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, whiteSpace: 'nowrap', ml: 0.5, flexShrink: 0 }}
          >
            {username}
          </Typography>
        )}
      </Toolbar>
    </AppBar>
  );
}
