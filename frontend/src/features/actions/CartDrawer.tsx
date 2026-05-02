/**
 * CartDrawer — slide-in cart with real-time validation and checkout.
 */
import {
  Drawer, Box, Typography, Stack, IconButton, Button, Divider,
  List, ListItem, ListItemText, ListItemSecondaryAction, Chip,
  Alert, CircularProgress, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import type { CartItem } from '../actions/actionsSlice';

interface ValidationResult {
  valid: boolean;
  totalTimeBlocks: number;
  availableTimeBlocks: number;
  totalCost: number;
  availableMoney: number;
  errors: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemove: (actionId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  validation: ValidationResult | null;
  validating: boolean;
  checkingOut: boolean;
}

function fmt(n: number) {
  return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function CartDrawer({
  open,
  onClose,
  cart,
  onRemove,
  onClear,
  onCheckout,
  validation,
  validating,
  checkingOut,
}: Props) {
  const totalTB = cart.reduce((s, i) => s + i.timeBlocks, 0);
  const totalCost = cart.reduce((s, i) => s + i.calculatedCost, 0);
  const totalLemons = cart.reduce((s, i) => s + i.calculatedLemons, 0);

  const canCheckout = !validating && !checkingOut && cart.length > 0 && (validation?.valid ?? false);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 380 }, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={700}>
          🛒 Cart ({cart.length})
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close cart">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Cart items */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {cart.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              Your cart is empty. Add actions from the catalog.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {cart.map((item) => (
              <ListItem
                key={item.actionId}
                divider
                sx={{ py: 1.5, pr: 6 }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600}>
                      {item.actionName}
                    </Typography>
                  }
                  secondary={
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap">
                      <Chip label={`⏱ ${item.timeBlocks} TB`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                      {item.calculatedCost > 0 && (
                        <Chip label={`💰 ${fmt(item.calculatedCost)}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                      )}
                      {item.calculatedLemons > 0 && (
                        <Chip label={`🍋 +${item.calculatedLemons}`} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#fff9c4' }} />
                      )}
                    </Stack>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => onRemove(item.actionId)}
                    aria-label={`Remove ${item.actionName}`}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
        {/* Totals */}
        {cart.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Time Blocks</Typography>
              <Typography variant="body2" fontWeight={700}>
                {totalTB}
                {validation && (
                  <Typography component="span" variant="caption" color={totalTB > validation.availableTimeBlocks ? 'error.main' : 'text.secondary'}>
                    {' '}/ {validation.availableTimeBlocks} available
                  </Typography>
                )}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Total Cost</Typography>
              <Typography variant="body2" fontWeight={700}>
                {fmt(totalCost)}
                {validation && (
                  <Typography component="span" variant="caption" color={totalCost > validation.availableMoney ? 'error.main' : 'text.secondary'}>
                    {' '}/ {fmt(validation.availableMoney)} available
                  </Typography>
                )}
              </Typography>
            </Stack>
            {totalLemons > 0 && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Lemons to Earn</Typography>
                <Typography variant="body2" fontWeight={700} color="warning.dark">🍋 +{totalLemons}</Typography>
              </Stack>
            )}
          </Box>
        )}

        {/* Validation errors */}
        {validating && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">Validating cart…</Typography>
          </Stack>
        )}
        {!validating && validation && !validation.valid && (
          <Alert severity="error" sx={{ mb: 1.5, py: 0.5, fontSize: '0.75rem' }}>
            {validation.errors.slice(0, 3).map((e, i) => (
              <div key={i}>• {e}</div>
            ))}
            {validation.errors.length > 3 && <div>+{validation.errors.length - 3} more</div>}
          </Alert>
        )}
        {!validating && validation?.valid && cart.length > 0 && (
          <Alert severity="success" sx={{ mb: 1.5, py: 0.5, fontSize: '0.75rem' }}>
            Cart looks good — ready to checkout!
          </Alert>
        )}

        {/* Actions */}
        <Stack spacing={1}>
          <Tooltip title={!canCheckout && cart.length > 0 ? 'Fix cart errors before checking out' : ''}>
            <span>
              <Button
                variant="contained"
                fullWidth
                disabled={!canCheckout}
                onClick={onCheckout}
                startIcon={checkingOut ? <CircularProgress size={16} color="inherit" /> : <ShoppingCartCheckoutIcon />}
                sx={{ fontWeight: 700 }}
              >
                {checkingOut ? 'Processing…' : 'Checkout'}
              </Button>
            </span>
          </Tooltip>
          {cart.length > 0 && (
            <Button variant="text" color="inherit" size="small" onClick={onClear} fullWidth>
              Clear cart
            </Button>
          )}
        </Stack>
      </Box>
    </Drawer>
  );
}
