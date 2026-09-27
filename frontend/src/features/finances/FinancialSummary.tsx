/**
 * FinancialSummary — money, projected income, retirement savings, loans, college fund cards.
 * Requirements: Req 6
 */
import {
  Box, Grid, Paper, Typography, Stack, Chip, Tooltip, Divider,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SavingsIcon from '@mui/icons-material/Savings';
import SchoolIcon from '@mui/icons-material/School';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import type { FinancialSummaryData } from './types';

// ─── Harvest palette ──────────────────────────────────────────────────────────
const HARVEST = {
  gold: '#F5A623',
  green: '#4CAF50',
  orange: '#FF7043',
  amber: '#FFC107',
  brown: '#795548',
};

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bgColor?: string;
}

function StatCard({ icon, label, value, sub, color = HARVEST.gold, bgColor }: StatCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        borderColor: color,
        bgcolor: bgColor ?? 'background.paper',
        height: '100%',
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            {label}
          </Typography>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary">
              {sub}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

interface Props {
  data: FinancialSummaryData;
}

export default function FinancialSummary({ data }: Props) {
  const availableFunds = data.money + data.projectedIncome;

  const playerLoans = data.loans.filter((l) => l.owner === 'player' && !l.isJoint);
  const spouseLoans = data.loans.filter((l) => l.owner === 'spouse' && !l.isJoint);
  const jointLoans = data.loans.filter((l) => l.isJoint);

  const totalLoanBalance = data.loans.reduce((s, l) => s + l.currentBalance, 0);
  const totalMinPayments = data.loans.reduce((s, l) => s + l.minimumPayment, 0);

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: HARVEST.brown }}>
        💰 Financial Overview
      </Typography>

      {/* Top stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AccountBalanceWalletIcon fontSize="small" />}
            label="Current Money"
            value={fmt(data.money)}
            sub={`+ ${fmt(data.projectedIncome)} projected income`}
            color={HARVEST.green}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TrendingUpIcon fontSize="small" />}
            label="Available Funds"
            value={fmt(availableFunds)}
            sub="Money + projected income"
            color={HARVEST.gold}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<SavingsIcon fontSize="small" />}
            label="Retirement Savings"
            value={fmt(data.retirementSavings)}
            sub="5% annual interest"
            color={HARVEST.amber}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<SchoolIcon fontSize="small" />}
            label="College Fund"
            value={fmt(data.collegeFund)}
            sub="1 lemon per 1% contributed"
            color={HARVEST.orange}
          />
        </Grid>
      </Grid>

      {/* Loans section */}
      {data.loans.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: HARVEST.orange }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <CreditCardIcon sx={{ color: HARVEST.orange }} />
            <Typography variant="subtitle1" fontWeight={700}>
              Outstanding Loans
            </Typography>
            <Chip
              label={`${data.loans.length} loan${data.loans.length !== 1 ? 's' : ''}`}
              size="small"
              sx={{ bgcolor: HARVEST.orange, color: '#fff', fontSize: '0.7rem' }}
            />
          </Stack>

          <Grid container spacing={1.5}>
            {/* Player loans */}
            {playerLoans.length > 0 && (
              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  Your Loans
                </Typography>
                {playerLoans.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} />
                ))}
              </Grid>
            )}

            {/* Spouse loans */}
            {spouseLoans.length > 0 && (
              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  Spouse's Loans
                </Typography>
                {spouseLoans.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} />
                ))}
              </Grid>
            )}

            {/* Joint loans */}
            {jointLoans.length > 0 && (
              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  Joint Loans
                </Typography>
                {jointLoans.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} />
                ))}
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 1.5 }} />
          <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Typography variant="body2" color="text.secondary">
              Total balance: <strong>{fmt(totalLoanBalance)}</strong>
            </Typography>
            <Tooltip title="5% of projected balance after 8% interest">
              <Typography variant="body2" color="error.main">
                Min. payments due: <strong>{fmt(totalMinPayments)}</strong>
              </Typography>
            </Tooltip>
          </Stack>
        </Paper>
      )}

      {data.loans.length === 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            🎉 No outstanding loans
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

function LoanRow({ loan }: { loan: FinancialSummaryData['loans'][0] }) {
  return (
    <Box
      sx={{
        p: 1,
        mb: 0.5,
        borderRadius: 1,
        bgcolor: 'action.hover',
        fontSize: '0.75rem',
      }}
    >
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary">
          Balance
        </Typography>
        <Typography variant="caption" fontWeight={700}>
          {fmt(loan.currentBalance)}
        </Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary">
          After interest (8%)
        </Typography>
        <Typography variant="caption" color="warning.dark">
          {fmt(loan.projectedBalance)}
        </Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary">
          Min. payment (5%)
        </Typography>
        <Typography variant="caption" color="error.main">
          {fmt(loan.minimumPayment)}
        </Typography>
      </Stack>
    </Box>
  );
}
