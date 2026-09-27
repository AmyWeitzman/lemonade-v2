/**
 * ImprovementsModal — home improvements UI for owned homes.
 * Supports remodel (investment input), pool (cost calculation), solar panels.
 * Requirements: Req 42
 */
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Stack, Chip, Divider, TextField,
  Alert, CircularProgress, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BuildIcon from '@mui/icons-material/Build';
import type { HousingItem, HomeImprovement } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  housing: HousingItem | null;
  ownership: {
    purchasePrice: number;
    yearsLived: number;
    improvements: HomeImprovement[];
  } | null;
  playerMoney: number;
  currentMarketValue: number;
  onClose: () => void;
  onApply: (type: 'remodel' | 'pool' | 'solar_panels', investmentAmount?: number) => void;
  applying: boolean;
}

export default function ImprovementsModal({
  open,
  housing,
  ownership,
  playerMoney,
  currentMarketValue,
  onClose,
  onApply,
  applying,
}: Props) {
  const [remodelAmount, setRemodelAmount] = useState('');
  const [selectedType, setSelectedType] = useState<'remodel' | 'pool' | 'solar_panels' | null>(null);

  if (!housing || !ownership) return null;

  const improvements = ownership.improvements ?? [];
  const hasPool = improvements.some((i) => i.type === 'pool');
  const hasSolar = improvements.some((i) => i.type === 'solar_panels');
  const purchasePrice = ownership.purchasePrice ?? 0;
  const yearsLived = ownership.yearsLived ?? 0;

  // Pool cost calculation
  const poolPct = (10 + 2 * yearsLived) / 100;
  const poolInstallCost = purchasePrice * poolPct;
  const poolValueIncrease = purchasePrice * 0.15;
  const poolAnnualMaintenance = 2000;

  // Solar panels cost calculation
  const solarPct = (5 + 2 * yearsLived) / 100;
  const solarCost = purchasePrice * solarPct;
  const solarValueIncrease = 15000;

  // Remodel preview
  const remodelAmountNum = parseFloat(remodelAmount) || 0;
  const remodelMinIncrease = remodelAmountNum * 0.5;
  const remodelMaxIncrease = remodelAmountNum * 0.8;

  const handleApply = () => {
    if (!selectedType) return;
    if (selectedType === 'remodel') {
      onApply('remodel', remodelAmountNum);
    } else {
      onApply(selectedType);
    }
  };

  const canAffordPool = playerMoney >= poolInstallCost;
  const canAffordSolar = playerMoney >= solarCost;
  const canAffordRemodel = remodelAmountNum > 0 && playerMoney >= remodelAmountNum;

  const canApply =
    selectedType === 'remodel'
      ? canAffordRemodel
      : selectedType === 'pool'
      ? canAffordPool && !hasPool
      : selectedType === 'solar_panels'
      ? canAffordSolar && !hasSolar
      : false;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <BuildIcon color="secondary" />
            <Typography variant="h6" fontWeight={700}>
              Home Improvements
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {housing.name}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Current home value */}
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Current Market Value
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} color="success.main">
              {fmt(currentMarketValue)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Your Money
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {fmt(playerMoney)}
            </Typography>
          </Stack>
        </Box>

        {/* Existing improvements */}
        {improvements.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.75 }}>
              Installed Improvements
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {improvements.map((imp, i) => (
                <Chip
                  key={i}
                  label={
                    imp.type === 'remodel'
                      ? `🔨 Remodel (+${fmt(imp.valueIncrease)})`
                      : imp.type === 'pool'
                      ? `🏊 Pool (+${fmt(imp.valueIncrease)})`
                      : `☀️ Solar Panels (+${fmt(imp.valueIncrease)})`
                  }
                  size="small"
                  color="success"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
            </Stack>
            <Divider sx={{ mt: 1.5 }} />
          </Box>
        )}

        {/* Improvement options */}
        <Stack spacing={1.5}>
          {/* Remodel */}
          {housing.allowsRemodeling && (
            <Box
              onClick={() => setSelectedType('remodel')}
              sx={{
                p: 1.5,
                border: '1px solid',
                borderColor: selectedType === 'remodel' ? 'primary.main' : 'divider',
                borderRadius: 1.5,
                cursor: 'pointer',
                bgcolor: selectedType === 'remodel' ? 'primary.50' : 'background.paper',
                transition: 'all 0.15s',
                '&:hover': { borderColor: 'primary.light', bgcolor: 'primary.50' },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                <Typography variant="body2" fontWeight={700}>🔨 Remodel</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Invest any amount. Home value increases by 50–80% of your investment (random).
                Can be done multiple times.
              </Typography>

              {selectedType === 'remodel' && (
                <Box onClick={(e) => e.stopPropagation()}>
                  <TextField
                    size="small"
                    label="Investment Amount ($)"
                    type="number"
                    value={remodelAmount}
                    onChange={(e) => setRemodelAmount(e.target.value)}
                    inputProps={{ min: 1, step: 1000 }}
                    fullWidth
                    sx={{ mb: 1 }}
                    autoFocus
                  />
                  {remodelAmountNum > 0 && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Expected value increase:
                      </Typography>
                      <Typography variant="caption" fontWeight={600} color="success.main">
                        {fmt(remodelMinIncrease)} – {fmt(remodelMaxIncrease)}
                      </Typography>
                    </Stack>
                  )}
                  {remodelAmountNum > 0 && !canAffordRemodel && (
                    <Alert severity="error" sx={{ mt: 1, py: 0.25 }}>
                      <Typography variant="caption">
                        You need {fmt(remodelAmountNum)} but only have {fmt(playerMoney)}.
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Pool */}
          {housing.allowsPool && (
            <Box
              onClick={() => !hasPool && setSelectedType('pool')}
              sx={{
                p: 1.5,
                border: '1px solid',
                borderColor: hasPool
                  ? 'success.main'
                  : selectedType === 'pool'
                  ? 'primary.main'
                  : 'divider',
                borderRadius: 1.5,
                cursor: hasPool ? 'default' : 'pointer',
                bgcolor: hasPool
                  ? 'success.50'
                  : selectedType === 'pool'
                  ? 'primary.50'
                  : 'background.paper',
                opacity: hasPool ? 0.8 : 1,
                transition: 'all 0.15s',
                '&:hover': hasPool ? {} : { borderColor: 'primary.light', bgcolor: 'primary.50' },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="body2" fontWeight={700}>🏊 Pool</Typography>
                {hasPool && <Chip label="Installed" size="small" color="success" sx={{ fontSize: '0.65rem', height: 18 }} />}
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                Install a pool. Unlocks pool-related actions.
              </Typography>
              <Stack spacing={0.25}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Install cost:</Typography>
                  <Typography variant="caption" fontWeight={600} color={canAffordPool ? 'text.primary' : 'error.main'}>
                    {fmt(poolInstallCost)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Annual maintenance:</Typography>
                  <Typography variant="caption" fontWeight={600}>{fmt(poolAnnualMaintenance)}/yr</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Value increase:</Typography>
                  <Typography variant="caption" fontWeight={600} color="success.main">+{fmt(poolValueIncrease)}</Typography>
                </Stack>
              </Stack>
              {!hasPool && !canAffordPool && (
                <Alert severity="warning" sx={{ mt: 1, py: 0.25 }}>
                  <Typography variant="caption">
                    Need {fmt(poolInstallCost - playerMoney)} more to afford this.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}

          {/* Solar Panels */}
          {housing.allowsSolarPanels && (
            <Box
              onClick={() => !hasSolar && setSelectedType('solar_panels')}
              sx={{
                p: 1.5,
                border: '1px solid',
                borderColor: hasSolar
                  ? 'success.main'
                  : selectedType === 'solar_panels'
                  ? 'primary.main'
                  : 'divider',
                borderRadius: 1.5,
                cursor: hasSolar ? 'default' : 'pointer',
                bgcolor: hasSolar
                  ? 'success.50'
                  : selectedType === 'solar_panels'
                  ? 'primary.50'
                  : 'background.paper',
                opacity: hasSolar ? 0.8 : 1,
                transition: 'all 0.15s',
                '&:hover': hasSolar ? {} : { borderColor: 'primary.light', bgcolor: 'primary.50' },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="body2" fontWeight={700}>☀️ Solar Panels</Typography>
                {hasSolar && <Chip label="Installed" size="small" color="success" sx={{ fontSize: '0.65rem', height: 18 }} />}
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                Reduce utility bills by 60% and earn 2 lemons per year.
              </Typography>
              <Stack spacing={0.25}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Install cost:</Typography>
                  <Typography variant="caption" fontWeight={600} color={canAffordSolar ? 'text.primary' : 'error.main'}>
                    {fmt(solarCost)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Utility reduction:</Typography>
                  <Typography variant="caption" fontWeight={600} color="success.main">−60%/yr</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Annual lemons:</Typography>
                  <Typography variant="caption" fontWeight={600} color="success.main">+2 🍋/yr</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Value increase:</Typography>
                  <Typography variant="caption" fontWeight={600} color="success.main">+{fmt(solarValueIncrease)}</Typography>
                </Stack>
              </Stack>
              {!hasSolar && !canAffordSolar && (
                <Alert severity="warning" sx={{ mt: 1, py: 0.25 }}>
                  <Typography variant="caption">
                    Need {fmt(solarCost - playerMoney)} more to afford this.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} disabled={applying}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="secondary"
          disabled={!canApply || applying}
          onClick={handleApply}
          startIcon={applying ? <CircularProgress size={14} /> : <BuildIcon />}
        >
          {applying ? 'Applying…' : 'Apply Improvement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
