/**
 * BottomNavBar — mobile bottom tabs navigation (<768px).
 * Hides the scrapbook route until the player has died.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { PRIMARY_NAV_ITEMS } from './NavItems';
import type { RootState } from '../../store';

export default function BottomNavBar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // <768px
  const navigate = useNavigate();
  const location = useLocation();
  const isAlive = useSelector((state: RootState) => state.auth.isAlive);

  if (!isMobile) return null;

  const visibleNavItems = PRIMARY_NAV_ITEMS.filter(
    (item) => item.path !== '/scrapbook' || !isAlive,
  );

  const currentIndex = visibleNavItems.findIndex((item) => item.path === location.pathname);

  return (
    <Paper
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: (t) => t.zIndex.appBar }}
      elevation={3}
    >
      <BottomNavigation
        value={currentIndex >= 0 ? currentIndex : 0}
        onChange={(_, newValue: number) => {
          navigate(visibleNavItems[newValue].path);
        }}
        showLabels
        sx={{ height: 56 }}
      >
        {visibleNavItems.map(({ label, Icon }) => (
          <BottomNavigationAction
            key={label}
            label={label}
            icon={<Icon fontSize="small" />}
            sx={{
              minWidth: 0,
              px: 0.5,
              '& .MuiBottomNavigationAction-label': {
                fontSize: 9,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 64,
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
