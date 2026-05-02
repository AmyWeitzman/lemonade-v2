/**
 * ExpensePaymentFlow — allocate payment from money and/or retirement savings.
 * Blocks checkout if insufficient funds.
 * Requirements: Req 6, Req 18
 */
import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Stack, Button, Slider, Alert,
  CircularProgress, Divider, Chip, TextField, InputAdornment,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PaymentIcon from '@mui/icons-material/Payment';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { setPlayerStats } from '../auth/authSlice';
import api from '../../lib/api';

const HARVEST_GREEN = '#4CAF50';
const HARVEST_GOLD = '#F5A623';

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

interface Props {
  grandTotal: number;
  availableFunds: number;
  retirementSavings: number;
  playerAge: number;
  yearComplete: boolean;
  onYearComplete: () => void;
}

export default function ExpensePaymentFlow({
  grandTotal,
  availableFunds,
  retirementSavings,
  playerAge,
  yearComplete,
  onYearComplete,
}: Props) {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { playerId, gameSessionId } = useSelector((s: RootState) => s.auth);

  const isEarlyWithdrawal = playerAge < 65;

  // Determine initial allocation: fill from money first, then retirement
  const defaultFromMoney = Math.min(grandTotal, availableFunds);
  const defaultFromRetirement = Math.max(0, grandTotal - availableFunds);

  const [fromMoney, setFromMoney] = useState(defaultFromMoney);
  const [fromRetirement, setFromRetirement] = useState(defaultFromRetirement);
  const [error, setError] = useState('');

  // Recalculate when props change
  useEffect(() => {
    const newFromMoney = Math.min(grandTotal, availableFunds);
    const newFromRetirement = Math.max(0, grandTotal - availableFunds);
    setFromMoney(newFromMoney);
    setFromRetirement(newFromRetirement);
  }, [grandTotal, availableFunds]);

  const totalAllocated = fromMoney + fromRetirement;
  const shortfall = grandTotal - totalAllocated;
  const canPay = totalAllocated >= grandTotal && fromMoney <= availableFunds && fromRetirement <= retirementSavings;

  const earlyPenaltyPreview = isEarlyWithdrawal && fromRetirement > 0
    ? fromRetirement * 0.1
    : 0;

  // ── Pay expenses mutation ──────────────────────────────────────────────────
  const payMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/finances/pay-expenses', {
        gameSessionId,
        fromMoney,
        fromRetirement,
      });
      return data as {
        yearComplete: boolean;
        paidFromMoney: number;
        paidFromRetirement: number;
        totalPaid: number;
        earlyWithdrawalPenaltyNextYear: number;
        newMoney: number;
        newRetirementSavings: number;
      };
    },
    onSuccess: (data) => {
      dispatch(setPlayerStats({ money: data.newMoney }));
      queryClient.invalidateQueries({ queryKey: ['finances', playerId] });
      queryClient.invalidateQueries({ queryKey: ['financesExpenses'] });
      onYearComplete();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Payment failed');
    },
  });

  if (yearComplete) {
    return (
      <Paper
        variant="outlined"
        sx={{ p: 3, borderRadius: 2, textAlign: 'center', borderColor: HARVEST_GREEN }}
      >
        <CheckCircleIcon sx={{ fontSize: 48, color: HARVEST_GREEN, mb: 1 }} />
        <Typography variant="h6" fontWeight={700} color={HARVEST_GREEN}>
          Year Complete!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          All expenses have been paid for this year.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#795548' }}>
        💸 Pay Annual Expenses
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Summary */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          mb: 2,
          borderColor: canPay ? HARVEST_GREEN : 'error.main',
          bgcolor: canPay ? '#f1f8e9' : '#ffebee',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          {canPay ? (
            <CheckCircleIcon sx={{ color: HARVEST_GREEN }} />
          ) : (
            <BlockIcon color="error" />
          )}
          <Typography variant="subtitle1" fontWeight={700}>
            {canPay ? 'Ready to Pay' : 'Cannot Complete Year'}
          </Typography>
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Due
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {fmt(grandTotal)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              From Money
            </Typography>
            <Typography variant="h6" fontWeight={700} color={HARVEST_GOLD}>
              {fmt(fromMoney)}
            </Typography>
          </Box>
          {fromRetirement > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                From Retirement
              </Typography>
              <Typography variant="h6" fontWeight={700} color={isEarlyWithdrawal ? 'warning.main' : 'text.primary'}>
                {fmt(fromRetirement)}
              </Typography>
            </Box>
          )}
          {!canPay && shortfall > 0 && (
            <Box>
              <Typography variant="caption" color="error.main">
                Shortfall
              </Typography>
              <Typography variant="h6" fontWeight={700} color="error.main">
                {fmt(shortfall)}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Early withdrawal warning */}
      {isEarlyWithdrawal && fromRetirement > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          Using {fmt(fromRetirement)} from retirement before age 65 will incur a{' '}
          <strong>10% penalty of {fmt(earlyPenaltyPreview)}</strong> charged next year.
        </Alert>
      )}

      {/* Allocation controls */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
          Allocate Payment
        </Typography>

        {/* From money */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2">
              💰 From Money + Income
            </Typography>
            <Chip
              label={`Max: ${fmt(availableFunds)}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Slider
              value={fromMoney}
              min={0}
              max={Math.max(availableFunds, grandTotal)}
              step={100}
              onChange={(_e, v) => {
                const val = v as number;
                setFromMoney(val);
                // Auto-adjust retirement to cover remainder
                const remaining = Math.max(0, grandTotal - val);
                setFromRetirement(Math.min(remaining, retirementSavings));
              }}
              sx={{
                flex: 1,
                color: HARVEST_GOLD,
                '& .MuiSlider-thumb': { bgcolor: HARVEST_GOLD },
              }}
            />
            <TextField
              size="small"
              value={Math.round(fromMoney)}
              onChange={(e) => {
                const val = Math.max(0, Math.min(parseFloat(e.target.value) || 0, availableFunds));
                setFromMoney(val);
                const remaining = Math.max(0, grandTotal - val);
                setFromRetirement(Math.min(remaining, retirementSavings));
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              sx={{ width: 120 }}
            />
          </Stack>
        </Box>

        {/* From retirement */}
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2">
              🌻 From Retirement Savings
              {isEarlyWithdrawal && (
                <Chip
                  label="⚠ 10% penalty"
                  size="small"
                  color="warning"
                  sx={{ ml: 1, fontSize: '0.6rem', height: 16 }}
                />
              )}
            </Typography>
            <Chip
              label={`Max: ${fmt(retirementSavings)}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Slider
              value={fromRetirement}
              min={0}
              max={retirementSavings}
              step={100}
              onChange={(_e, v) => {
                const val = v as number;
                setFromRetirement(val);
              }}
              sx={{
                flex: 1,
                color: isEarlyWithdrawal ? '#FFC107' : HARVEST_GREEN,
                '& .MuiSlider-thumb': {
                  bgcolor: isEarlyWithdrawal ? '#FFC107' : HARVEST_GREEN,
                },
              }}
            />
            <TextField
              size="small"
              value={Math.round(fromRetirement)}
              onChange={(e) => {
                const val = Math.max(0, Math.min(parseFloat(e.target.value) || 0, retirementSavings));
                setFromRetirement(val);
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              sx={{ width: 120 }}
            />
          </Stack>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Total allocated
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            color={totalAllocated >= grandTotal ? HARVEST_GREEN : 'error.main'}
          >
            {fmt(totalAllocated)} / {fmt(grandTotal)}
          </Typography>
        </Stack>
      </Paper>

      {/* Checkout button */}
      {!canPay && (
        <Alert severity="error" sx={{ mb: 2 }}>
          You must allocate at least {fmt(grandTotal)} to complete the year.
          {availableFunds + retirementSavings < grandTotal && (
            <> Consider taking out a loan to cover the shortfall.</>
          )}
        </Alert>
      )}

      <Button
        variant="contained"
        fullWidth
        size="large"
        disabled={!canPay || payMutation.isPending}
        onClick={() => payMutation.mutate()}
        startIcon={
          payMutation.isPending ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <PaymentIcon />
          )
        }
        sx={{
          bgcolor: canPay ? HARVEST_GREEN : 'action.disabledBackground',
          '&:hover': { bgcolor: '#388e3c' },
          fontWeight: 700,
          fontSize: '1rem',
          py: 1.5,
        }}
      >
        {payMutation.isPending ? 'Processing…' : `Pay ${fmt(grandTotal)} & Complete Year`}
      </Button>
    </Box>
  );
}
