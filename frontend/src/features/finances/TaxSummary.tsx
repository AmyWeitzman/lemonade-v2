/**
 * TaxSummary — progressive tax bracket breakdown + tax prep fee.
 * Requirements: Req 37
 */
import {
  Box, Paper, Typography, Stack, Chip, Divider, Table,
  TableBody, TableCell, TableHead, TableRow, Tooltip,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { ExpenseBreakdown } from './types';

const HARVEST_GOLD = '#F5A623';

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

// US 2024-style brackets (mirrored from backend DEFAULT_TAX_BRACKETS)
const SINGLE_BRACKETS = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: null, rate: 0.37 },
];

const MARRIED_BRACKETS = [
  { min: 0, max: 23200, rate: 0.10 },
  { min: 23200, max: 94300, rate: 0.12 },
  { min: 94300, max: 201050, rate: 0.22 },
  { min: 201050, max: 383900, rate: 0.24 },
  { min: 383900, max: 487450, rate: 0.32 },
  { min: 487450, max: 731200, rate: 0.35 },
  { min: 731200, max: null, rate: 0.37 },
];

interface BracketBreakdownItem {
  rate: number;
  incomeInBracket: number;
  taxInBracket: number;
}

interface Props {
  expenses: ExpenseBreakdown;
  taxableIncome: number;
  filingStatus: 'single' | 'married';
  bracketBreakdown: BracketBreakdownItem[];
  earlyWithdrawalPenalty?: number;
}

export default function TaxSummary({
  expenses,
  taxableIncome,
  filingStatus,
  bracketBreakdown,
  earlyWithdrawalPenalty = 0,
}: Props) {
  const brackets = filingStatus === 'married' ? MARRIED_BRACKETS : SINGLE_BRACKETS;
  const totalTax = expenses.taxes;
  const effectiveRate = taxableIncome > 0 ? totalTax / taxableIncome : 0;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#795548' }}>
        🏛 Tax Summary
      </Typography>

      {/* Overview */}
      <Paper
        variant="outlined"
        sx={{ p: 2, borderRadius: 2, mb: 2, borderColor: HARVEST_GOLD, bgcolor: '#fffde7' }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <AccountBalanceIcon sx={{ color: HARVEST_GOLD }} />
          <Typography variant="subtitle1" fontWeight={700}>
            Tax Overview
          </Typography>
          <Chip
            label={filingStatus === 'married' ? '👫 Married Filing Jointly' : '👤 Single'}
            size="small"
            sx={{ bgcolor: HARVEST_GOLD, color: '#fff', fontSize: '0.7rem' }}
          />
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Taxable Income
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {fmt(taxableIncome)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Tax
            </Typography>
            <Typography variant="h6" fontWeight={700} color="error.main">
              {fmt(totalTax)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Effective Rate
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {pct(effectiveRate)}
            </Typography>
          </Box>
          {expenses.taxPrepFee > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Tax Prep Fee
              </Typography>
              <Typography variant="h6" fontWeight={700} color="warning.dark">
                {fmt(expenses.taxPrepFee)}
              </Typography>
            </Box>
          )}
          {expenses.taxPrepFee === 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Tax Prep Fee
              </Typography>
              <Typography variant="h6" fontWeight={700} color="success.main">
                Free ✓
              </Typography>
            </Box>
          )}
        </Stack>

        {expenses.taxPrepFee === 0 && (
          <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
            Simple return or accounting experience — no tax prep fee
          </Typography>
        )}
        {earlyWithdrawalPenalty > 0 && (
          <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
            ⚠ Includes {fmt(earlyWithdrawalPenalty)} early retirement withdrawal penalty (10%)
          </Typography>
        )}
      </Paper>

      {/* Bracket breakdown */}
      {bracketBreakdown.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Your Bracket Breakdown
            </Typography>
            <Tooltip title="Progressive taxation: each bracket only applies to income within that range">
              <InfoOutlinedIcon fontSize="small" color="action" />
            </Tooltip>
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rate</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  Income in Bracket
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  Tax
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bracketBreakdown.map((b, i) => (
                <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? 'action.hover' : 'transparent' }}>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    <Chip
                      label={pct(b.rate)}
                      size="small"
                      sx={{
                        fontSize: '0.65rem',
                        height: 18,
                        bgcolor: bracketColor(b.rate),
                        color: '#fff',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                    {fmt(b.incomeInBracket)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {fmt(b.taxInBracket)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'error.main' }}>
                  {fmt(bracketBreakdown.reduce((s, b) => s + b.taxInBracket, 0))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* All brackets reference */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          {filingStatus === 'married' ? '👫 Married Filing Jointly' : '👤 Single'} — All Brackets
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Rate</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Income Range</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {brackets.map((b, i) => {
              const isActive =
                taxableIncome > b.min && (b.max === null || taxableIncome > b.min);
              return (
                <TableRow
                  key={i}
                  sx={{
                    bgcolor: isActive ? '#fff9c4' : 'transparent',
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  <TableCell sx={{ fontSize: '0.7rem' }}>
                    <Chip
                      label={pct(b.rate)}
                      size="small"
                      sx={{
                        fontSize: '0.65rem',
                        height: 18,
                        bgcolor: bracketColor(b.rate),
                        color: '#fff',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>
                    {fmt(b.min)} – {b.max !== null ? fmt(b.max) : '∞'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Divider sx={{ my: 1 }} />
        <Typography variant="caption" color="text.secondary">
          Brackets shift up $15,000 every 5 years. Married couples file jointly (combined income).
        </Typography>
      </Paper>
    </Box>
  );
}

function bracketColor(rate: number): string {
  if (rate <= 0.10) return '#66bb6a';
  if (rate <= 0.12) return '#26a69a';
  if (rate <= 0.22) return '#42a5f5';
  if (rate <= 0.24) return '#7e57c2';
  if (rate <= 0.32) return '#ffa726';
  if (rate <= 0.35) return '#ef5350';
  return '#b71c1c';
}
