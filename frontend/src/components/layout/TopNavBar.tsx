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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChatIcon from '@mui/icons-material/Chat';
import type { RootState } from '../../store';
import NotificationBadge from '../../features/notifications/NotificationBadge';
import { setChatOpen } from '../../features/messages/messagesSlice';

interface Props {
  onMenuClick: () => void;
}

// ─── Mini Pitcher SVG ─────────────────────────────────────────────────────────

function MiniPitcher({ fillPercent }: { fillPercent: number }) {
  const clampedFill = Math.min(Math.max(fillPercent, 0), 100);
  const isSuccess = clampedFill >= 100;

  // Pitcher body: 24×32 viewBox
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
      {/* Body background */}
      <path
        d={`M 4 ${BODY_TOP} L 20 ${BODY_TOP} L 22 ${BODY_BOTTOM} L 2 ${BODY_BOTTOM} Z`}
        fill="rgba(255,255,255,0.25)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1.2"
      />
      {/* Fill */}
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
      {/* Outline on top */}
      <path
        d={`M 4 ${BODY_TOP} L 20 ${BODY_TOP} L 22 ${BODY_BOTTOM} L 2 ${BODY_BOTTOM} Z`}
        fill="none"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.2"
      />
      {/* Rim */}
      <rect x={3} y={BODY_TOP - 2} width={18} height={3} rx={1} fill="rgba(255,255,255,0.6)" />
      {/* Handle */}
      <path
        d={`M 22 ${BODY_TOP + 5} Q 27 ${BODY_TOP + 10} 24 ${BODY_TOP + 18}`}
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Base */}
      <rect x={1} y={BODY_BOTTOM} width={22} height={3} rx={1} fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

export default function TopNavBar({ onMenuClick }: Props) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { playerName, health, stress, money } = useSelector(
    (state: RootState) => state.auth,
  );
  const { pitcherLemons, pitcherGoal, unreadMessages } = useSelector(
    (state: RootState) => state.game,
  );

  const healthColor =
    health > 60 ? 'success' : health > 30 ? 'warning' : 'error';
  const stressColor =
    stress < 40 ? 'success' : stress < 70 ? 'warning' : 'error';

  const pitcherPercent =
    pitcherGoal > 0 ? Math.min((pitcherLemons / pitcherGoal) * 100, 100) : 0;

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ gap: 1.5, flexWrap: 'nowrap', minHeight: 56 }}>
        {/* Hamburger — opens secondary drawer */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          aria-label="open menu"
          size="small"
        >
          <MenuIcon />
        </IconButton>

        {/* App title / logo */}
        <Typography
          variant="h6"
          component="div"
          sx={{ fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', mr: 1 }}
          onClick={() => navigate('/')}
        >
          🍋
        </Typography>

        {/* Health bar */}
        <Tooltip title={`Health: ${health}%`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 80 }}>
            <Typography variant="caption" sx={{ color: 'inherit', whiteSpace: 'nowrap' }}>
              ❤️
            </Typography>
            <Box sx={{ flex: 1, minWidth: 60 }}>
              <LinearProgress
                variant="determinate"
                value={health}
                color={healthColor}
                sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.2)' }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'inherit', minWidth: 28 }}>
              {health}%
            </Typography>
          </Box>
        </Tooltip>

        {/* Stress bar */}
        <Tooltip title={`Stress: ${stress}%`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 80 }}>
            <Typography variant="caption" sx={{ color: 'inherit', whiteSpace: 'nowrap' }}>
              😰
            </Typography>
            <Box sx={{ flex: 1, minWidth: 60 }}>
              <LinearProgress
                variant="determinate"
                value={stress}
                color={stressColor}
                sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.2)' }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'inherit', minWidth: 28 }}>
              {stress}%
            </Typography>
          </Box>
        </Tooltip>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Money display */}
        <Tooltip title="Your money">
          <Chip
            label={`$${money.toLocaleString()}`}
            size="small"
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              color: 'inherit',
              fontWeight: 600,
              fontSize: 12,
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

        {/* Notification badge (existing component) */}
        <NotificationBadge />

        {/* Message badge */}
        <Tooltip title="Chat">
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

        {/* Player name */}
        {playerName && (
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, whiteSpace: 'nowrap', ml: 0.5 }}
          >
            {playerName}
          </Typography>
        )}
      </Toolbar>
    </AppBar>
  );
}
