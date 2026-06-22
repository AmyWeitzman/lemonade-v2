/**
 * SideNavDrawer — primary navigation drawer.
 *
 * Uses temporary (overlay) variant on all breakpoints above mobile so opening
 * the drawer never causes a layout shift in the page content.
 *
 * The hamburger in TopNavBar controls open/close.
 * Mobile (<768px): hidden — BottomNavBar handles navigation.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  useMediaQuery,
  useTheme,
  Typography,
} from '@mui/material';
import { PRIMARY_NAV_ITEMS } from './NavItems';
import type { RootState } from '../../store';

const DRAWER_WIDTH = 240;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Kept for API compatibility but no longer used */
  onOpenProfile?: () => void;
}

export default function SideNavDrawer({ open, onClose }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // <768px

  const isAlive = useSelector((state: RootState) => state.auth.isAlive);
  const visibleNavItems = PRIMARY_NAV_ITEMS.filter(
    (item) => item.path !== '/scrapbook' || !isAlive,
  );

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose();
  };

  // Mobile: BottomNavBar handles navigation — no drawer
  if (isMobile) return null;

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          overflowX: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          width: DRAWER_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Toolbar spacer */}
        <Box sx={{ minHeight: 56 }} />

        {/* Primary nav items */}
        <List dense sx={{ pt: 1 }}>
          {visibleNavItems.map(({ label, subtext, path, Icon }) => {
            const active = location.pathname === path;
            return (
              <ListItemButton
                key={path}
                selected={active}
                onClick={() => handleNavClick(path)}
                sx={{ minHeight: 52, px: 2.5, alignItems: 'flex-start', py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                  <Icon
                    fontSize="small"
                    sx={{ color: active ? 'primary.main' : 'text.primary' }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" noWrap fontWeight={active ? 700 : 400}>
                      {label}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ color: 'text.disabled', fontSize: '0.85rem' }}
                    >
                      {subtext}
                    </Typography>
                  }
                  disableTypography
                />
              </ListItemButton>
            );
          })}
        </List>

        <Box sx={{ flex: 1 }} />
      </Box>
    </Drawer>
  );
}
