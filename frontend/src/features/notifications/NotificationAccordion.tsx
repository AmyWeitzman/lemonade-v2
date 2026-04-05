/**
 * NotificationAccordion — collapsible notification panel for actions and expenses pages.
 * Shows all current notifications grouped by category.
 */
import { useSelector, useDispatch } from 'react-redux';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
  IconButton,
  Alert,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';
import type { RootState, AppDispatch } from '../../store';
import { dismissNotification } from './notificationsSlice';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const severityMap: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
  info: 'info',
  warning: 'warning',
  success: 'success',
  error: 'error',
};

interface Props {
  /** Filter to only show specific categories (e.g. ['job', 'family']). Shows all if omitted. */
  categories?: string[];
  defaultExpanded?: boolean;
}

export default function NotificationAccordion({ categories, defaultExpanded = false }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const allNotifications = useSelector((state: RootState) => state.notifications.items);

  const notifications = categories
    ? allNotifications.filter((n) => categories.includes(n.category))
    : allNotifications;

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

  if (notifications.length === 0) return null;

  const actionRequiredCount = notifications.filter((n) => n.actionRequired).length;

  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsIcon fontSize="small" color="action" />
          <Typography variant="subtitle2">
            Notifications
          </Typography>
          <Chip
            label={notifications.length}
            size="small"
            color="primary"
            sx={{ height: 20, fontSize: 11 }}
          />
          {actionRequiredCount > 0 && (
            <Chip
              label={`${actionRequiredCount} action required`}
              size="small"
              color="error"
              sx={{ height: 20, fontSize: 11 }}
            />
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
        <Stack spacing={1}>
          {notifications.map((n) => (
            <Alert
              key={n.id}
              severity={severityMap[n.type] ?? 'info'}
              action={
                <IconButton
                  size="small"
                  onClick={() => handleDismiss(n.id)}
                  aria-label="dismiss"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
              sx={{ alignItems: 'flex-start' }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {n.title}
                  {n.actionRequired && (
                    <Chip
                      label="Action Required"
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ ml: 1, height: 18, fontSize: 10 }}
                    />
                  )}
                </Typography>
                <Typography variant="caption">{n.message}</Typography>
              </Box>
            </Alert>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
