/**
 * CartDrawer — slide-in cart with real-time validation and checkout.
 * Shows activity TB and PTO split per item, and PTO totals.
 */
import {
  Drawer, Box, Typography, Stack, IconButton, Button,
  List, ListItem, ListItemText, ListItemSecondaryAction, Chip,
  Alert, CircularProgress, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
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
  onUpdatePto?: (actionId: string, timeBlocks: number, ptoBlocks: number) => void;
  ptoRemaining: number;
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
  onUpdatePto,
  ptoRemaining,
  validation,
  validating,
  checkingOut,
}: Props) {
  const totalTB = cart.reduce((s, i) => s + i.timeBlocks, 0);
  const totalPTO = cart.reduce((s, i) => s + i.ptoBlocks, 0);
  const totalCost = cart.reduce((s, i) => s + i.calculatedCost, 0);
  const totalLemons = cart.reduce((s, i) => s + i.calculatedLemons, 0);

  const canCheckout = !validating && !checkingOut && cart.length > 0 && (validation?.valid ?? false);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 400 }, display: 'flex', flexDirection: 'column' } }}
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

      {/* PTO budget summary */}
      {ptoRemaining > 0 && (
        <Box sx={{ px: 2, py: 0.75, bgcolor: '#fff8e1', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            🏖️ PTO: <strong>{totalPTO}</strong> used / <strong>{ptoRemaining}</strong> available
          </Typography>
        </Box>
      )}

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
            {cart.map((item) => {
              const totalItemBlocks = item.timeBlocks + item.ptoBlocks;
              const ptoCommittedElsewhere = cart
                .filter((i) => i.actionId !== item.actionId)
                .reduce((s, i) => s + i.ptoBlocks, 0);
              const availablePTOForItem = ptoRemaining - ptoCommittedElsewhere;
              const canAddPTO = !item.requiresPTO && availablePTOForItem > item.ptoBlocks;
              const canRemovePTO = item.ptoBlocks > 0 && !item.requiresPTO;

              return (
                <ListItem key={item.actionId} divider sx={{ py: 1.5, pr: 6, flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ width: '100%', display: 'flex', alignItems: 'flex-start', pr: 2 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600}>{item.actionName}</Typography>
                      }
                      secondary={
                        <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap">
                          <Chip
                            label={`⏱ ${item.timeBlocks} TB`}
                            size="small" variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                          {item.ptoBlocks > 0 && (
                            <Chip
                              label={`🏖️ ${item.ptoBlocks} PTO`}
                              size="small"
                              sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#fff8e1', color: '#795548' }}
                            />
                          )}
                          {item.calculatedCost > 0 && (
                            <Chip label={`💰 ${fmt(item.calculatedCost)}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                          )}
                          {item.calculatedLemons > 0 && (
                            <Chip label={`🍋 +${item.calculatedLemons}`} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#fff9c4' }} />
                          )}
                        </Stack>
                      }
                    />
                  </Box>

                  {/* PTO adjuster — shown if action supports PTO */}
                  {onUpdatePto && (
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75, pl: 0.25 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.25 }}>
                        PTO split:
                      </Typography>
                      <Tooltip title={!canRemovePTO ? (item.requiresPTO ? 'Required PTO — cannot reduce' : 'No PTO to remove') : 'Use fewer PTO blocks'}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={!canRemovePTO}
                            onClick={() => onUpdatePto(item.actionId, item.timeBlocks + 1, item.ptoBlocks - 1)}
                            sx={{ p: 0.25 }}
                          >
                            <RemoveIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Typography variant="caption" sx={{ minWidth: 48, textAlign: 'center', fontWeight: 600 }}>
                        {item.ptoBlocks} / {totalItemBlocks}
                      </Typography>
                      <Tooltip title={!canAddPTO ? (availablePTOForItem <= 0 ? 'No PTO remaining' : 'All blocks already PTO') : 'Use more PTO blocks'}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={!canAddPTO}
                            onClick={() => onUpdatePto(item.actionId, Math.max(0, item.timeBlocks - 1), item.ptoBlocks + 1)}
                            sx={{ p: 0.25 }}
                          >
                            <AddIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Typography variant="caption" color="text.secondary">
                        (⏱ {item.timeBlocks} + 🏖️ {item.ptoBlocks})
                      </Typography>
                    </Stack>
                  )}

                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end" size="small"
                      onClick={() => onRemove(item.actionId)}
                      aria-label={`Remove ${item.actionName}`}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
        {cart.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Activity Blocks</Typography>
              <Typography variant="body2" fontWeight={700}>
                {totalTB}
                {validation && (
                  <Typography component="span" variant="caption" color={totalTB > validation.availableTimeBlocks ? 'error.main' : 'text.secondary'}>
                    {' '}/ {validation.availableTimeBlocks} available
                  </Typography>
                )}
              </Typography>
            </Stack>
            {totalPTO > 0 && (
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">PTO Blocks</Typography>
                <Typography variant="body2" fontWeight={700} color={totalPTO > ptoRemaining ? 'error.main' : 'warning.dark'}>
                  🏖️ {totalPTO} / {ptoRemaining} available
                </Typography>
              </Stack>
            )}
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

        {validating && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">Validating cart…</Typography>
          </Stack>
        )}
        {!validating && validation && !validation.valid && (
          <Alert severity="error" sx={{ mb: 1.5, py: 0.5, fontSize: '0.75rem' }}>
            {validation.errors.slice(0, 3).map((e, i) => <div key={i}>• {e}</div>)}
            {validation.errors.length > 3 && <div>+{validation.errors.length - 3} more</div>}
          </Alert>
        )}
        {!validating && validation?.valid && cart.length > 0 && (
          <Alert severity="success" sx={{ mb: 1.5, py: 0.5, fontSize: '0.75rem' }}>
            Cart looks good — ready to checkout!
          </Alert>
        )}

        <Stack spacing={1}>
          <Tooltip title={!canCheckout && cart.length > 0 ? 'Fix cart errors before checking out' : ''}>
            <span>
              <Button
                variant="contained" fullWidth disabled={!canCheckout} onClick={onCheckout}
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
