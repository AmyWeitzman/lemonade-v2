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
import LockIcon from '@mui/icons-material/Lock';
import { useState } from 'react';
import type { CartItem } from '../actions/actionsSlice';
import GetHousingTransportPicker from './GetHousingTransportPicker';

const GET_HOUSING_ACTION = 'Get Housing';
const GET_TRANSPORT_ACTION = 'Get Transportation';

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
  onUpdateQuantity?: (actionId: string, quantity: number) => void;
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
  onUpdateQuantity,
  ptoRemaining,
  validation,
  validating,
  checkingOut,
}: Props) {
  const totalTB = cart.reduce((s, i) => s + i.timeBlocks * i.quantity, 0);
  const totalPTO = cart.reduce((s, i) => s + i.ptoBlocks * i.quantity, 0);
  const totalCost = cart.reduce((s, i) => s + i.calculatedCost * i.quantity, 0);
  const totalLemons = cart.reduce((s, i) => s + i.calculatedLemons * i.quantity, 0);

  // Which cart line's home/vehicle picker is open (by actionId), if any.
  const [pickerFor, setPickerFor] = useState<CartItem | null>(null);

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
              const ptoCommittedElsewhere = cart
                .filter((i) => i.actionId !== item.actionId)
                .reduce((s, i) => s + i.ptoBlocks * i.quantity, 0);
              const availablePTOForItem = ptoRemaining - ptoCommittedElsewhere;
              const canAddPTO = !item.requiresPTO && availablePTOForItem > item.ptoBlocks * item.quantity;
              const canRemovePTO = item.ptoBlocks > 0 && !item.requiresPTO;

              return (
                <ListItem key={item.actionId} divider sx={{ py: 1.5, pr: 6, flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ width: '100%', display: 'flex', alignItems: 'flex-start', pr: 2 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600}>
                          {item.actionName}
                          {item.selectedOptionLabel && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75, fontWeight: 400 }}>
                              — {item.selectedOptionLabel}
                            </Typography>
                          )}
                        </Typography>
                      }
                      secondary={
                        <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap">
                          <Chip
                            label={`⏱ ${item.timeBlocks * item.quantity} TB`}
                            size="small" variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                          {item.ptoBlocks > 0 && (
                            <Chip
                              label={`🏖️ ${item.ptoBlocks * item.quantity} PTO`}
                              size="small"
                              sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#fff8e1', color: '#795548' }}
                            />
                          )}
                          {item.calculatedCost > 0 && (
                            <Chip label={`💰 ${fmt(item.calculatedCost * item.quantity)}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                          )}
                          {item.calculatedLemons > 0 && (
                            <Chip label={`🍋 +${item.calculatedLemons * item.quantity}`} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#fff9c4' }} />
                          )}
                        </Stack>
                      }
                    />
                  </Box>

                  {/* "Get Housing" / "Get Transportation" — home / vehicle picker */}
                  {(item.actionName === GET_HOUSING_ACTION || item.actionName === GET_TRANSPORT_ACTION) && (
                    <Box sx={{ mt: 0.75, pl: 0.25, width: '100%' }}>
                      {(() => {
                        const isHousing = item.actionName === GET_HOUSING_ACTION;
                        const chosen = isHousing ? item.selectedHousingLabel : item.selectedVehicleLabel;
                        return (
                          <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                            <Typography variant="caption" color={chosen ? 'text.secondary' : 'error.main'} fontWeight={chosen ? 400 : 700}>
                              {chosen
                                ? `${isHousing ? '🏠' : '🚗'} ${chosen}${isHousing && item.housingLocation ? ` (${item.housingLocation})` : ''}`
                                : `⚠ Choose a ${isHousing ? 'home' : 'vehicle'}`}
                            </Typography>
                            <Button size="small" variant="text" sx={{ minWidth: 0, px: 0.5, fontSize: '0.7rem' }} onClick={() => setPickerFor(item)}>
                              {chosen ? 'Change' : 'Choose…'}
                            </Button>
                          </Stack>
                        );
                      })()}
                    </Box>
                  )}

                  {/* Quantity adjuster — how many times this action is being done */}
                  {onUpdateQuantity && !item.locked && (
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75, pl: 0.25 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.25 }}>
                        Times:
                      </Typography>
                      <Tooltip title="Do this one fewer time">
                        <span>
                          <IconButton
                            size="small"
                            disabled={item.quantity <= 1}
                            onClick={() => onUpdateQuantity(item.actionId, item.quantity - 1)}
                            sx={{ p: 0.25 }}
                          >
                            <RemoveIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Typography variant="caption" sx={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>
                        {item.quantity}
                      </Typography>
                      <Tooltip title="Do this one more time">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onUpdateQuantity(item.actionId, item.quantity + 1)}
                            sx={{ p: 0.25 }}
                          >
                            <AddIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  )}

                  {/* PTO adjuster — shown if action supports PTO. Applies to each instance. */}
                  {item.allowsPTO && onUpdatePto && (
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.5, pl: 0.25 }} flexWrap="wrap">
                      <Tooltip title={!canRemovePTO ? (item.requiresPTO ? 'Required PTO — cannot reduce' : 'No PTO to remove') : 'Move a block from PTO to activity'}>
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
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        ⏱ {item.timeBlocks} activity&nbsp;&nbsp;🏖️ {item.ptoBlocks} PTO{item.quantity > 1 ? ' (per time)' : ''}
                      </Typography>
                      <Tooltip title={!canAddPTO ? (availablePTOForItem <= 0 ? 'No PTO remaining' : 'All blocks already PTO') : 'Move a block from activity to PTO'}>
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
                    </Stack>
                  )}

                  <ListItemSecondaryAction>
                    {item.locked ? (
                      <Tooltip title="Required this year — can't be removed">
                        <LockIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                      </Tooltip>
                    ) : (
                      <IconButton
                        edge="end" size="small"
                        onClick={() => onRemove(item.actionId)}
                        aria-label={`Remove ${item.actionName}`}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      {pickerFor && (
        <GetHousingTransportPicker
          open
          onClose={() => setPickerFor(null)}
          kind={pickerFor.actionName === GET_HOUSING_ACTION ? 'housing' : 'transport'}
          actionId={pickerFor.actionId}
          currentId={pickerFor.selectedHousingId ?? pickerFor.selectedVehicleId}
          currentLocation={pickerFor.housingLocation}
        />
      )}

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
            <Stack spacing={0.5}>
              {validation.errors.slice(0, 3).map((e, i) => <span key={i}>{e}</span>)}
              {validation.errors.length > 3 && <span>+{validation.errors.length - 3} more</span>}
            </Stack>
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
