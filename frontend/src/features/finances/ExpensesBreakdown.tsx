/**
 * ExpensesBreakdown — itemized mandatory expenses with totals.
 * Requirements: Req 18
 */
import {
  Box, Paper, Typography, Stack, Divider, Chip, LinearProgress,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import PetsIcon from '@mui/icons-material/Pets';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import SchoolIcon from '@mui/icons-material/School';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import type { ExpenseBreakdown } from './types';

const HARVEST_GOLD = '#F5A623';
const HARVEST_GREEN = '#4CAF50';

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

interface ExpenseRowProps {
  icon: React.ReactNode;
  label: string;
  amount: number;
  total: number;
  note?: string;
  highlight?: boolean;
}

function ExpenseRow({ icon, label, amount, total, note, highlight }: ExpenseRowProps) {
  if (amount === 0) return null;
  const pct = total > 0 ? (amount / total) * 100 : 0;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ color: highlight ? 'error.main' : 'text.secondary', display: 'flex' }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={highlight ? 700 : 400}>
              {label}
            </Typography>
            {note && (
              <Typography variant="caption" color="text.secondary">
                {note}
              </Typography>
            )}
          </Box>
        </Stack>
        <Typography
          variant="body2"
          fontWeight={700}
          color={highlight ? 'error.main' : 'text.primary'}
        >
          {fmt(amount)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': {
            bgcolor: highlight ? 'error.main' : HARVEST_GOLD,
          },
        }}
      />
    </Box>
  );
}

interface Props {
  expenses: ExpenseBreakdown;
  total: number;
  pendingPenalties: number;
  availableFunds: number;
}

export default function ExpensesBreakdown({
  expenses,
  total,
  pendingPenalties,
  availableFunds,
}: Props) {
  const grandTotal = total + pendingPenalties;
  const canAfford = availableFunds >= grandTotal;
  const shortfall = grandTotal - availableFunds;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#795548' }}>
          📋 Annual Expenses
        </Typography>
        <Chip
          label={canAfford ? '✓ Covered' : `⚠ Shortfall ${fmt(shortfall)}`}
          size="small"
          color={canAfford ? 'success' : 'error'}
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        {/* Housing */}
        <ExpenseRow
          icon={<HomeIcon fontSize="small" />}
          label="Housing"
          amount={expenses.housing}
          total={grandTotal}
          note="Rent/mortgage + utilities + insurance"
        />

        {/* Transportation */}
        <ExpenseRow
          icon={<DirectionsCarIcon fontSize="small" />}
          label="Transportation"
          amount={expenses.transportation}
          total={grandTotal}
          note="Your vehicle(s)"
        />
        <ExpenseRow
          icon={<DirectionsCarIcon fontSize="small" />}
          label="Spouse Transportation"
          amount={expenses.spouseVehicleCosts}
          total={grandTotal}
          note="Spouse vehicle(s)"
        />

        {/* Insurance */}
        <ExpenseRow
          icon={<HealthAndSafetyIcon fontSize="small" />}
          label="Health Insurance"
          amount={expenses.healthInsurance}
          total={grandTotal}
          note="Annual premium"
        />

        {/* Childcare */}
        <ExpenseRow
          icon={<ChildCareIcon fontSize="small" />}
          label="Childcare"
          amount={expenses.childcare}
          total={grandTotal}
        />
        <ExpenseRow
          icon={<ChildCareIcon fontSize="small" />}
          label="Child Expenses"
          amount={expenses.childExpenses}
          total={grandTotal}
          note="$11,000 per child under 18"
        />

        {/* Pets */}
        <ExpenseRow
          icon={<PetsIcon fontSize="small" />}
          label="Pet Expenses"
          amount={expenses.petExpenses}
          total={grandTotal}
          note="Food + vet"
        />

        {/* Groceries */}
        <ExpenseRow
          icon={<ShoppingCartIcon fontSize="small" />}
          label="Groceries"
          amount={expenses.groceries}
          total={grandTotal}
          note="Bulk discount at 3+ household members"
        />

        {/* Miscellaneous */}
        <ExpenseRow
          icon={<MiscellaneousServicesIcon fontSize="small" />}
          label="Miscellaneous"
          amount={expenses.miscellaneous}
          total={grandTotal}
          note="$1,200 per person"
        />

        {/* Chronic conditions */}
        <ExpenseRow
          icon={<LocalHospitalIcon fontSize="small" />}
          label="Chronic Conditions"
          amount={expenses.chronicConditions}
          total={grandTotal}
          note="$3k/condition (insured) or $5k (uninsured)"
        />

        {/* Tuition */}
        <ExpenseRow
          icon={<SchoolIcon fontSize="small" />}
          label="Tuition"
          amount={expenses.tuition}
          total={grandTotal}
          note="Your education program"
        />
        <ExpenseRow
          icon={<SchoolIcon fontSize="small" />}
          label="Spouse Tuition"
          amount={expenses.spouseTuition}
          total={grandTotal}
        />
        <ExpenseRow
          icon={<ReceiptIcon fontSize="small" />}
          label="Spouse CPR Renewal"
          amount={expenses.spouseCprRenewal}
          total={grandTotal}
        />

        {/* Tax prep fee */}
        <ExpenseRow
          icon={<ReceiptIcon fontSize="small" />}
          label="Tax Preparation Fee"
          amount={expenses.taxPrepFee}
          total={grandTotal}
          note="Waived for simple returns or accounting experience"
        />

        {/* Taxes */}
        <ExpenseRow
          icon={<AccountBalanceIcon fontSize="small" />}
          label="Income Taxes"
          amount={expenses.taxes}
          total={grandTotal}
          highlight
        />

        {/* Loan minimum payments */}
        <ExpenseRow
          icon={<CreditCardIcon fontSize="small" />}
          label="Loan Minimum Payments"
          amount={expenses.loanMinPayments}
          total={grandTotal}
          note="5% of balance after 8% interest"
          highlight
        />

        {/* Pending penalties */}
        {pendingPenalties > 0 && (
          <ExpenseRow
            icon={<ReceiptIcon fontSize="small" />}
            label="Early Withdrawal Penalty"
            amount={pendingPenalties}
            total={grandTotal}
            note="10% penalty from prior year retirement withdrawal"
            highlight
          />
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* Totals */}
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Subtotal
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {fmt(total)}
          </Typography>
        </Stack>
        {pendingPenalties > 0 && (
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" color="error.main">
              + Penalties
            </Typography>
            <Typography variant="body2" fontWeight={600} color="error.main">
              {fmt(pendingPenalties)}
            </Typography>
          </Stack>
        )}
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="subtitle2" fontWeight={700}>
            Grand Total
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} color={canAfford ? HARVEST_GREEN : 'error.main'}>
            {fmt(grandTotal)}
          </Typography>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Available funds (money + income)
          </Typography>
          <Typography variant="body2" fontWeight={600} color={canAfford ? HARVEST_GREEN : 'error.main'}>
            {fmt(availableFunds)}
          </Typography>
        </Stack>
        {!canAfford && (
          <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
            ⚠ You're {fmt(shortfall)} short — consider using retirement savings or taking a loan.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
