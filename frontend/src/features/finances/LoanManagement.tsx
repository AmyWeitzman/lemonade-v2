/**
 * LoanManagement — take out loans, make payments (own/spouse/joint), show interest accrual.
 * Requirements: Req 6
 */
import { useState } from 'react';
import {
  Box, Paper, Typography, Stack, Button, TextField, Divider,
  Chip, Alert, CircularProgress, Accordion, AccordionSummary,
  AccordionDetails, Tooltip, InputAdornment,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PaymentIcon from '@mui/icons-material/Payment';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import api from '../../lib/api';
import type { LoanDetail } from './types';

const HARVEST_ORANGE = '#FF7043';

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

interface Props {
  loans: LoanDetail[];
  playerMoney: number;
}

export default function LoanManagement({ loans, playerMoney }: Props) {
  const queryClient = useQueryClient();
  const { playerId, gameSessionId } = useSelector((s: RootState) => s.auth);

  const [newLoanAmount, setNewLoanAmount] = useState('');
  const [newLoanError, setNewLoanError] = useState('');
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // ── Take out loan ──────────────────────────────────────────────────────────
  const takeLoanMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/finances/loan', { gameSessionId, amount });
      return data as { loan: LoanDetail; newMoney: number };
    },
    onSuccess: (data) => {
      setNewLoanAmount('');
      setNewLoanError('');
      setSuccessMsg(`Loan of ${fmt(data.loan.principal)} created. Money updated to ${fmt(data.newMoney)}.`);
      queryClient.invalidateQueries({ queryKey: ['finances', playerId] });
      queryClient.invalidateQueries({ queryKey: ['financesExpenses'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setNewLoanError(msg ?? 'Failed to create loan');
    },
  });

  // ── Make loan payment ──────────────────────────────────────────────────────
  const payLoanMutation = useMutation({
    mutationFn: async (payments: Array<{ loanId: string; amount: number }>) => {
      const { data } = await api.post('/finances/loan/payment', { gameSessionId, payments });
      return data as { payments: unknown[]; totalPaid: number; newMoney: number };
    },
    onSuccess: (data) => {
      setPaymentAmounts({});
      setPaymentErrors({});
      setSuccessMsg(`Paid ${fmt(data.totalPaid)} toward loans. Remaining money: ${fmt(data.newMoney)}.`);
      queryClient.invalidateQueries({ queryKey: ['finances', playerId] });
      queryClient.invalidateQueries({ queryKey: ['financesExpenses'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSuccessMsg('');
      setPaymentErrors((prev) => ({ ...prev, _global: msg ?? 'Payment failed' }));
    },
  });

  const handleTakeLoan = () => {
    const amount = parseFloat(newLoanAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      setNewLoanError('Enter a valid positive amount');
      return;
    }
    setNewLoanError('');
    takeLoanMutation.mutate(amount);
  };

  const handlePayLoan = (loanId: string) => {
    const raw = paymentAmounts[loanId] ?? '';
    const amount = parseFloat(raw.replace(/,/g, ''));
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;

    if (isNaN(amount) || amount <= 0) {
      setPaymentErrors((prev) => ({ ...prev, [loanId]: 'Enter a valid amount' }));
      return;
    }
    if (amount > loan.currentBalance) {
      setPaymentErrors((prev) => ({ ...prev, [loanId]: `Max is ${fmt(loan.currentBalance)}` }));
      return;
    }
    if (amount > playerMoney) {
      setPaymentErrors((prev) => ({ ...prev, [loanId]: 'Insufficient funds' }));
      return;
    }
    setPaymentErrors((prev) => ({ ...prev, [loanId]: '' }));
    payLoanMutation.mutate([{ loanId, amount }]);
  };

  const playerLoans = loans.filter((l) => l.owner === 'player' && !l.isJoint);
  const spouseLoans = loans.filter((l) => l.owner === 'spouse' && !l.isJoint);
  const jointLoans = loans.filter((l) => l.isJoint);

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#795548' }}>
        💳 Loan Management
      </Typography>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}
      {paymentErrors._global && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPaymentErrors({})}>
          {paymentErrors._global}
        </Alert>
      )}

      {/* Take out new loan */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2, borderColor: HARVEST_ORANGE }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <AddCircleOutlineIcon sx={{ color: HARVEST_ORANGE }} />
          <Typography variant="subtitle1" fontWeight={700}>
            Take Out a Loan
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          8% annual interest · 5% minimum annual payment · Funds added to your money immediately
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            size="small"
            label="Loan amount"
            value={newLoanAmount}
            onChange={(e) => setNewLoanAmount(e.target.value)}
            error={!!newLoanError}
            helperText={newLoanError}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            sx={{ flex: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && handleTakeLoan()}
          />
          <Button
            variant="contained"
            onClick={handleTakeLoan}
            disabled={takeLoanMutation.isPending || !newLoanAmount}
            startIcon={
              takeLoanMutation.isPending ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <AddCircleOutlineIcon />
              )
            }
            sx={{ bgcolor: HARVEST_ORANGE, '&:hover': { bgcolor: '#e64a19' }, mt: 0.25 }}
          >
            Borrow
          </Button>
        </Stack>
      </Paper>

      {/* Existing loans */}
      {loans.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No outstanding loans
          </Typography>
        </Paper>
      ) : (
        <Box>
          {playerLoans.length > 0 && (
            <LoanGroup
              title="Your Loans"
              loans={playerLoans}
              playerMoney={playerMoney}
              paymentAmounts={paymentAmounts}
              paymentErrors={paymentErrors}
              paying={payLoanMutation.isPending}
              onAmountChange={(id, val) =>
                setPaymentAmounts((prev) => ({ ...prev, [id]: val }))
              }
              onPay={handlePayLoan}
            />
          )}
          {spouseLoans.length > 0 && (
            <LoanGroup
              title="Spouse's Loans"
              loans={spouseLoans}
              playerMoney={playerMoney}
              paymentAmounts={paymentAmounts}
              paymentErrors={paymentErrors}
              paying={payLoanMutation.isPending}
              onAmountChange={(id, val) =>
                setPaymentAmounts((prev) => ({ ...prev, [id]: val }))
              }
              onPay={handlePayLoan}
            />
          )}
          {jointLoans.length > 0 && (
            <LoanGroup
              title="Joint Loans"
              loans={jointLoans}
              playerMoney={playerMoney}
              paymentAmounts={paymentAmounts}
              paymentErrors={paymentErrors}
              paying={payLoanMutation.isPending}
              onAmountChange={(id, val) =>
                setPaymentAmounts((prev) => ({ ...prev, [id]: val }))
              }
              onPay={handlePayLoan}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── LoanGroup ────────────────────────────────────────────────────────────────

interface LoanGroupProps {
  title: string;
  loans: LoanDetail[];
  playerMoney: number;
  paymentAmounts: Record<string, string>;
  paymentErrors: Record<string, string>;
  paying: boolean;
  onAmountChange: (id: string, val: string) => void;
  onPay: (id: string) => void;
}

function LoanGroup({
  title,
  loans,
  playerMoney,
  paymentAmounts,
  paymentErrors,
  paying,
  onAmountChange,
  onPay,
}: LoanGroupProps) {
  return (
    <Accordion defaultExpanded variant="outlined" sx={{ mb: 1, borderRadius: '8px !important' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CreditCardIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={700}>
            {title}
          </Typography>
          <Chip
            label={`${loans.length}`}
            size="small"
            sx={{ height: 18, fontSize: '0.65rem' }}
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {loans.map((loan, idx) => (
          <Box key={loan.id}>
            {idx > 0 && <Divider sx={{ my: 1.5 }} />}
            <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Original principal
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {fmt(loan.principal)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Current balance
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {fmt(loan.currentBalance)}
                </Typography>
              </Box>
              <Box>
                <Tooltip title="Balance after 8% annual interest is applied at year end">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      After interest
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="warning.dark">
                      {fmt(loan.projectedBalance)}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
              <Box>
                <Tooltip title="5% of projected balance — auto-deducted at year end if not paid">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Min. payment
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="error.main">
                      {fmt(loan.minimumPayment)}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
            </Stack>

            {/* Payment input */}
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                size="small"
                label="Extra payment"
                placeholder={`Min: ${fmt(loan.minimumPayment)}`}
                value={paymentAmounts[loan.id] ?? ''}
                onChange={(e) => onAmountChange(loan.id, e.target.value)}
                error={!!paymentErrors[loan.id]}
                helperText={paymentErrors[loan.id] || `Available: ${fmt(playerMoney)}`}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => onPay(loan.id)}
                disabled={paying || !paymentAmounts[loan.id]}
                startIcon={
                  paying ? (
                    <CircularProgress size={12} color="inherit" />
                  ) : (
                    <PaymentIcon fontSize="small" />
                  )
                }
                sx={{ mt: 0.25 }}
              >
                Pay
              </Button>
            </Stack>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
