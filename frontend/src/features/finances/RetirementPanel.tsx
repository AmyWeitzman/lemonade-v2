/**
 * RetirementPanel — contribute/withdraw with penalty warning + Recharts history chart.
 * Requirements: Req 6, Req 37
 */
import { useState } from 'react';
import {
  Box, Paper, Typography, Stack, Button, TextField, Alert,
  CircularProgress, Divider, InputAdornment, Chip,
} from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import api from '../../lib/api';
import type { RetirementTransaction } from './types';

const HARVEST_AMBER = '#FFC107';
const HARVEST_GREEN = '#4CAF50';

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

interface Props {
  retirementSavings: number;
  playerMoney: number;
  playerAge: number;
  history: RetirementTransaction[];
}

export default function RetirementPanel({
  retirementSavings,
  playerMoney,
  playerAge,
  history,
}: Props) {
  const queryClient = useQueryClient();
  const { playerId, gameSessionId } = useSelector((s: RootState) => s.auth);

  const [contributeAmount, setContributeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [contributeError, setContributeError] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isEarlyWithdrawal = playerAge < 65;

  // ── Contribute ─────────────────────────────────────────────────────────────
  const contributeMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/finances/retirement', { gameSessionId, amount });
      return data as { contributed: number; newRetirementBalance: number; newMoney: number };
    },
    onSuccess: (data) => {
      setContributeAmount('');
      setContributeError('');
      setSuccessMsg(
        `Contributed ${fmt(data.contributed)} to retirement. New balance: ${fmt(data.newRetirementBalance)}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['finances', playerId] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setContributeError(msg ?? 'Contribution failed');
    },
  });

  // ── Withdraw ───────────────────────────────────────────────────────────────
  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/finances/retirement/withdraw', { gameSessionId, amount });
      return data as {
        withdrawn: number;
        newRetirementBalance: number;
        newMoney: number;
        isEarlyWithdrawal: boolean;
        penaltyNextYear: number;
      };
    },
    onSuccess: (data) => {
      setWithdrawAmount('');
      setWithdrawError('');
      const penaltyNote = data.isEarlyWithdrawal
        ? ` ⚠ 10% penalty of ${fmt(data.penaltyNextYear)} will be charged next year.`
        : '';
      setSuccessMsg(
        `Withdrew ${fmt(data.withdrawn)} from retirement. New balance: ${fmt(data.newRetirementBalance)}.${penaltyNote}`,
      );
      queryClient.invalidateQueries({ queryKey: ['finances', playerId] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setWithdrawError(msg ?? 'Withdrawal failed');
    },
  });

  const handleContribute = () => {
    const amount = parseFloat(contributeAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      setContributeError('Enter a valid positive amount');
      return;
    }
    if (amount > playerMoney) {
      setContributeError(`Insufficient funds (available: ${fmt(playerMoney)})`);
      return;
    }
    setContributeError('');
    contributeMutation.mutate(amount);
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError('Enter a valid positive amount');
      return;
    }
    if (amount > retirementSavings) {
      setWithdrawError(`Exceeds balance (${fmt(retirementSavings)})`);
      return;
    }
    setWithdrawError('');
    withdrawMutation.mutate(amount);
  };

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = buildChartData(history);

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#795548' }}>
        🌻 Retirement Savings
      </Typography>

      {successMsg && (
        <Alert
          severity={successMsg.includes('⚠') ? 'warning' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setSuccessMsg('')}
        >
          {successMsg}
        </Alert>
      )}

      {/* Balance card */}
      <Paper
        variant="outlined"
        sx={{ p: 2, borderRadius: 2, mb: 2, borderColor: HARVEST_AMBER, bgcolor: '#fffde7' }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <SavingsIcon sx={{ color: HARVEST_AMBER, fontSize: 32 }} />
          <Box>
            <Typography variant="caption" color="text.secondary">
              Current Balance
            </Typography>
            <Typography variant="h5" fontWeight={700} color={HARVEST_AMBER}>
              {fmt(retirementSavings)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Earns 5% interest annually
            </Typography>
          </Box>
          {isEarlyWithdrawal && (
            <Chip
              icon={<WarningAmberIcon fontSize="small" />}
              label={`Age ${playerAge} — early withdrawal penalty applies`}
              size="small"
              color="warning"
              sx={{ ml: 'auto !important' }}
            />
          )}
        </Stack>
      </Paper>

      {/* Early withdrawal warning */}
      {isEarlyWithdrawal && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={700}>
            Early Withdrawal Penalty
          </Typography>
          <Typography variant="body2">
            You are under 65. Any retirement withdrawal will incur a{' '}
            <strong>10% penalty charged next year</strong>. For example, withdrawing{' '}
            {fmt(10000)} now will cost you {fmt(1000)} next year.
          </Typography>
        </Alert>
      )}

      {/* Contribute / Withdraw */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {/* Contribute */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: HARVEST_GREEN }}>
            💰 Contribute
          </Typography>
          <Stack spacing={1}>
            <TextField
              size="small"
              label="Amount"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              error={!!contributeError}
              helperText={contributeError || `Available: ${fmt(playerMoney)}`}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleContribute()}
            />
            <Button
              variant="contained"
              onClick={handleContribute}
              disabled={contributeMutation.isPending || !contributeAmount}
              startIcon={
                contributeMutation.isPending ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <SavingsIcon />
                )
              }
              sx={{ bgcolor: HARVEST_GREEN, '&:hover': { bgcolor: '#388e3c' } }}
            >
              Contribute
            </Button>
          </Stack>
        </Paper>

        {/* Withdraw */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: isEarlyWithdrawal ? 'warning.main' : 'text.primary' }}>
            {isEarlyWithdrawal ? '⚠ Withdraw (Penalty)' : '💸 Withdraw'}
          </Typography>
          <Stack spacing={1}>
            <TextField
              size="small"
              label="Amount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              error={!!withdrawError}
              helperText={withdrawError || `Balance: ${fmt(retirementSavings)}`}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleWithdraw()}
            />
            <Button
              variant={isEarlyWithdrawal ? 'outlined' : 'contained'}
              color={isEarlyWithdrawal ? 'warning' : 'primary'}
              onClick={handleWithdraw}
              disabled={withdrawMutation.isPending || !withdrawAmount || retirementSavings === 0}
              startIcon={
                withdrawMutation.isPending ? (
                  <CircularProgress size={14} color="inherit" />
                ) : undefined
              }
            >
              {isEarlyWithdrawal ? 'Withdraw (10% penalty)' : 'Withdraw'}
            </Button>
          </Stack>
        </Paper>
      </Stack>

      {/* History chart */}
      {chartData.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            📈 Retirement Balance History
          </Typography>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="retirementGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={HARVEST_AMBER} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={HARVEST_AMBER} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                formatter={(value: number) => [fmt(value), 'Balance']}
                labelStyle={{ fontWeight: 700 }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="balance"
                name="Balance"
                stroke={HARVEST_AMBER}
                strokeWidth={2}
                fill="url(#retirementGradient)"
                dot={{ r: 3, fill: HARVEST_AMBER }}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Recent transactions */}
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
            Recent Transactions
          </Typography>
          {history.slice(0, 8).map((tx) => (
            <Stack
              key={tx.id}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  {txLabel(tx.type)}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Year {tx.year} · Age {tx.age}
                  {tx.reason ? ` · ${tx.reason}` : ''}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                fontWeight={700}
                color={
                  tx.type === 'contribution' || tx.type === 'interest'
                    ? HARVEST_GREEN
                    : 'error.main'
                }
              >
                {tx.type === 'contribution' || tx.type === 'interest' ? '+' : '-'}
                {fmt(tx.amount)}
              </Typography>
            </Stack>
          ))}
        </Paper>
      )}
    </Box>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txLabel(type: RetirementTransaction['type']): string {
  switch (type) {
    case 'contribution': return '💰 Contribution';
    case 'withdrawal': return '💸 Withdrawal';
    case 'interest': return '📈 Interest';
    case 'penalty': return '⚠ Penalty';
    default: return type;
  }
}

interface ChartPoint {
  label: string;
  balance: number;
}

function buildChartData(history: RetirementTransaction[]): ChartPoint[] {
  if (history.length === 0) return [];
  // Sort ascending by createdAt
  const sorted = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return sorted.map((tx) => ({
    label: `Yr ${tx.year}`,
    balance: tx.balanceAfter,
  }));
}
