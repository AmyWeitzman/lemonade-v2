/**
 * SideNavDrawer — secondary navigation drawer.
 * Contains: Tending the Garden (profile), Lemon Tea (chat),
 * Planting & Pruning (notifications), Nutrients (settings).
 *
 * On desktop (>1024px): persistent full sidebar with primary nav items.
 * On tablet (768-1024px): temporary side drawer.
 * On mobile (<768px): hidden (bottom tabs used instead).
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './NavItems';
import { useNavPreferences } from '../../hooks/useNavPreferences';
import type { RootState } from '../../store';
import { setChatOpen } from '../../features/messages/messagesSlice';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED_WIDTH = 64;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called when the user clicks "Tending the Garden" to open the profile drawer */
  onOpenProfile?: () => void;
}

export default function SideNavDrawer({ open, onClose, onOpenProfile }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg')); // >1024px
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg')); // 768-1024px

  const isAlive = useSelector((state: RootState) => state.auth.isAlive);
  const visibleNavItems = PRIMARY_NAV_ITEMS.filter(
    (item) => item.path !== '/scrapbook' || !isAlive,
  );

  const dispatch = useDispatch();
  const { prefs, setSidebarCollapsed } = useNavPreferences();
  const [collapsed, setCollapsed] = useState(prefs.sidebarCollapsed);

  useEffect(() => {
    setCollapsed(prefs.sidebarCollapsed);
  }, [prefs.sidebarCollapsed]);

  const handleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    setSidebarCollapsed(next);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (!isDesktop) onClose();
  };

  const drawerWidth = isDesktop && collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  const drawerContent = (
    <Box
      sx={{
        width: drawerWidth,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Toolbar spacer */}
      <Box sx={{ minHeight: 56 }} />

      {/* Primary nav items */}
      <List dense>
        {visibleNavItems.map(({ label, path, Icon }) => {
          const active = location.pathname === path;
          return (
            <Tooltip
              key={path}
              title={collapsed ? label : ''}
              placement="right"
              disableHoverListener={!collapsed}
            >
              <ListItemButton
                selected={active}
                onClick={() => handleNavClick(path)}
                sx={{ minHeight: 44, px: collapsed ? 2 : 2.5 }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36 }}>
                  <Icon fontSize="small" color={active ? 'primary' : 'inherit'} />
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Divider />

      {/* Secondary nav items */}
      <List dense>
        {SECONDARY_NAV_ITEMS.map(({ label, key, Icon }) => (
          <Tooltip
            key={key}
            title={collapsed ? label : ''}
            placement="right"
            disableHoverListener={!collapsed}
          >
            <ListItemButton
              sx={{ minHeight: 44, px: collapsed ? 2 : 2.5 }}
              onClick={() => {
                if (key === 'profile') {
                  onOpenProfile?.();
                  if (!isDesktop) onClose();
                } else if (key === 'chat') {
                  dispatch(setChatOpen(true));
                  if (!isDesktop) onClose();
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>

      <Box sx={{ flex: 1 }} />

      {/* Collapse toggle — desktop only */}
      {isDesktop && (
        <>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', p: 0.5 }}>
            <IconButton size="small" onClick={handleCollapse} aria-label="toggle sidebar">
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Box>
        </>
      )}
    </Box>
  );

  // Desktop: persistent drawer
  if (isDesktop) {
    return (
      <Drawer
        variant="permanent"
        open
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Tablet: temporary side drawer
  if (isTablet) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Mobile: hidden (BottomNavBar handles navigation)
  return null;
}
