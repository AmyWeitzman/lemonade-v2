/**
 * NotificationBadge — persistent notification count for the navbar.
 * Shows a bell icon with a badge count of undismissed persistent notifications.
 */
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';
import type { RootState, AppDispatch } from '../../store';
import { dismissNotification } from './notificationsSlice';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const typeColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  info: 'info',
  warning: 'warning',
  success: 'success',
  error: 'error',
};

export default function NotificationBadge() {
  const dispatch = useDispatch<AppDispatch>();
  const notifications = useSelector((state: RootState) => state.notifications.items);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  const persistentCount = notifications.filter((n) => n.persistent).length;

  const handleDismiss = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/api/notifications/${id}/dismiss`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch {
      // best-effort
    }
    dispatch(dismissNotification(id));
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="open notifications"
        >
          <Badge badgeContent={persistentCount} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxHeight: 480 } }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ overflowY: 'auto', maxHeight: 400 }}>
            {notifications.map((n) => (
              <ListItem
                key={n.id}
                divider
                alignItems="flex-start"
                sx={{ pr: 6 }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {n.title}
                      </Typography>
                      <Chip
                        label={n.type}
                        size="small"
                        color={typeColors[n.type] ?? 'default'}
                        sx={{ height: 18, fontSize: 10 }}
                      />
                      {n.actionRequired && (
                        <Chip
                          label="Action Required"
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {n.message}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleDismiss(n.id)}
                    aria-label="dismiss notification"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
