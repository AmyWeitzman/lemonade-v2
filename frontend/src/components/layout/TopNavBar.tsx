/**
 * TopNavBar — primary navigation bar always visible during gameplay.
 * Shows health bar, stress bar, money, mini pitcher, notification badge,
 * message badge, and player name.
 */
import { useSelector } from 'react-redux';
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
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import type { RootState } from '../../store';
import NotificationBadge from '../../features/notifications/NotificationBadge';

interface Props {
  onMenuClick: () => void;
}

export default function TopNavBar({ onMenuClick }: Props) {
  const navigate = useNavigate();
  const { playerName, health, stress, money, lemons } = useSelector(
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
          >
            <Badge
              badgeContent={lemons > 0 ? lemons : undefined}
              color="secondary"
              max={99}
            >
              <LocalDrinkIcon fontSize="small" />
            </Badge>
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
            onClick={() => {
              /* chat drawer opened via secondary nav */
            }}
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
