/**
 * FinancesPage — "Harvest"
 *
 * Full financial management: summary, expenses, loans, retirement,
 * tax breakdown, and end-of-year payment flow.
 *
 * Requirements: Req 6, Req 18, Req 37
 */
import { useState } from 'react';
import {
  Box, Typography, Stack, Alert, Skeleton, Tabs, Tab, Chip,
  Paper, Snackbar, Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../store';
import api from '../lib/api';
import FinancialSummary from '../features/finances/FinancialSummary';
import ExpensesBreakdown from '../features/finances/ExpensesBreakdown';
import LoanManagement from '../features/finances/LoanManagement';
import RetirementPanel from '../features/finances/RetirementPanel';
import ExpensePaymentFlow from '../features/finances/ExpensePaymentFlow';
import TaxSummary from '../features/finances/TaxSummary';
import type {
  FinancialSummaryData,
  ExpensesData,
  ForecastData,
} from '../features/finances/types';

// ─── Harvest palette ──────────────────────────────────────────────────────────
const HARVEST = {
  gold: '#F5A623',
  green: '#4CAF50',
  orange: '#FF7043',
  amber: '#FFC107',
  brown: '#795548',
  bg: '#fffde7',
};

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

// ─── Tab panel helper ─────────────────────────────────────────────────────────
interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinancesPage() {
  const queryClient = useQueryClient();
  const { playerId, gameSessionId, money, health, stress } = useSelector((s: RootState) => ({
    playerId: s.auth.playerId,
    gameSessionId: s.auth.gameSessionId,
    money: s.auth.money,
    health: s.auth.health,
    stress: s.auth.stress,
  }));

  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // ── Fetch financial summary ────────────────────────────────────────────────
  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['finances', playerId],
    queryFn: async () => {
      const { data } = await api.get(`/finances/${playerId}`, {
        params: { gameSessionId },
      });
      return data as FinancialSummaryData;
    },
    enabled: !!playerId && !!gameSessionId,
    staleTime: 15_000,
  });

  // ── Fetch expenses ─────────────────────────────────────────────────────────
  const {
    data: expensesData,
    isLoading: expensesLoading,
  } = useQuery({
    queryKey: ['financesExpenses', gameSessionId],
    queryFn: async () => {
      const { data } = await api.get('/finances/expenses', {
        params: { gameSessionId },
      });
      return data as ExpensesData;
    },
    enabled: !!gameSessionId,
    staleTime: 15_000,
  });

  // ── Fetch forecast ─────────────────────────────────────────────────────────
  const { data: forecastData } = useQuery({
    queryKey: ['financesForecast', gameSessionId],
    queryFn: async () => {
      const { data } = await api.get('/finances/forecast', {
        params: { gameSessionId },
      });
      return data as ForecastData;
    },
    enabled: !!gameSessionId,
    staleTime: 30_000,
  });

  const handleYearComplete = () => {
    setToast({ message: '🎉 Year complete! All expenses paid.', severity: 'success' });
    queryClient.invalidateQueries({ queryKey: ['finances', playerId] });
    queryClient.invalidateQueries({ queryKey: ['financesExpenses'] });
    queryClient.invalidateQueries({ queryKey: ['financesForecast'] });
  };

  if (!gameSessionId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You must be in an active game session to view finances.</Alert>
      </Box>
    );
  }

  const isLoading = summaryLoading || expensesLoading;

  // Derive tax bracket breakdown from expenses data
  // We compute a simplified breakdown from the summary data
  const taxableIncome = summaryData
    ? summaryData.projectedIncome
    : 0;

  // Determine filing status from loans (joint loans imply married)
  const hasJointLoan = summaryData?.loans.some((l) => l.isJoint) ?? false;
  const filingStatus: 'single' | 'married' = hasJointLoan ? 'married' : 'single';

  // Build bracket breakdown from expenses taxes
  const taxes = expensesData?.expenses.taxes ?? 0;
  const bracketBreakdown = buildBracketBreakdown(taxableIncome, filingStatus, taxes);

  const yearComplete = summaryData?.yearComplete ?? false;

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        pb: 6,
        maxWidth: 1200,
        mx: 'auto',
        bgcolor: HARVEST.bg,
        minHeight: '100vh',
      }}
    >
      {/* Page header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: HARVEST.brown }}>
            🌾 Harvest
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your finances, pay expenses, and plan for the future
          </Typography>
        </Box>

        {/* Quick stats */}
        {summaryData && (
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Chip
              label={`💰 ${fmt(summaryData.money)}`}
              size="small"
              sx={{ bgcolor: HARVEST.green, color: '#fff', fontWeight: 700 }}
            />
            <Chip
              label={`📈 +${fmt(summaryData.projectedIncome)} income`}
              size="small"
              sx={{ bgcolor: HARVEST.gold, color: '#fff', fontWeight: 700 }}
            />
            <Chip
              label={`🌻 ${fmt(summaryData.retirementSavings)} retirement`}
              size="small"
              sx={{ bgcolor: HARVEST.amber, color: '#fff', fontWeight: 700 }}
            />
            {yearComplete && (
              <Chip
                icon={<CheckCircleIcon fontSize="small" />}
                label="Year Complete"
                size="small"
                color="success"
                sx={{ fontWeight: 700 }}
              />
            )}
          </Stack>
        )}
      </Stack>

      {/* Forecast banner */}
      {forecastData && (
        <ForecastBanner forecast={forecastData} />
      )}

      {/* Error state */}
      {summaryError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load financial data. Please try again.
        </Alert>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <Stack spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={80} />
          ))}
        </Stack>
      )}

      {/* Main content tabs */}
      {!isLoading && summaryData && expensesData && (
        <Box>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Tabs
              value={activeTab}
              onChange={(_e, v) => setActiveTab(v as number)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '& .MuiTab-root': { fontWeight: 600, fontSize: '0.8rem' },
                '& .Mui-selected': { color: HARVEST.brown },
                '& .MuiTabs-indicator': { bgcolor: HARVEST.gold },
              }}
            >
              <Tab label="💰 Overview" />
              <Tab label="📋 Expenses" />
              <Tab label="💳 Loans" />
              <Tab label="🌻 Retirement" />
              <Tab label="🏛 Taxes" />
              <Tab
                label={
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <span>💸 Pay Expenses</span>
                    {!yearComplete && (
                      <Chip
                        label="Action needed"
                        size="small"
                        color="error"
                        sx={{ fontSize: '0.6rem', height: 16 }}
                      />
                    )}
                    {yearComplete && (
                      <CheckCircleIcon fontSize="small" color="success" />
                    )}
                  </Stack>
                }
              />
            </Tabs>

            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {/* Tab 0: Overview */}
              <TabPanel value={activeTab} index={0}>
                <FinancialSummary data={summaryData} />
              </TabPanel>

              {/* Tab 1: Expenses */}
              <TabPanel value={activeTab} index={1}>
                <ExpensesBreakdown
                  expenses={expensesData.expenses}
                  total={expensesData.total}
                  pendingPenalties={expensesData.pendingPenalties}
                  availableFunds={expensesData.availableFunds}
                />
              </TabPanel>

              {/* Tab 2: Loans */}
              <TabPanel value={activeTab} index={2}>
                <LoanManagement
                  loans={summaryData.loans}
                  playerMoney={summaryData.money}
                />
              </TabPanel>

              {/* Tab 3: Retirement */}
              <TabPanel value={activeTab} index={3}>
                <RetirementPanel
                  retirementSavings={summaryData.retirementSavings}
                  playerMoney={summaryData.money}
                  playerAge={getPlayerAge()}
                  history={summaryData.retirementHistory}
                />
              </TabPanel>

              {/* Tab 4: Taxes */}
              <TabPanel value={activeTab} index={4}>
                <TaxSummary
                  expenses={expensesData.expenses}
                  taxableIncome={taxableIncome}
                  filingStatus={filingStatus}
                  bracketBreakdown={bracketBreakdown}
                />
              </TabPanel>

              {/* Tab 5: Pay Expenses */}
              <TabPanel value={activeTab} index={5}>
                <ExpensePaymentFlow
                  grandTotal={expensesData.grandTotal}
                  availableFunds={expensesData.availableFunds}
                  retirementSavings={summaryData.retirementSavings}
                  playerAge={getPlayerAge()}
                  yearComplete={yearComplete}
                  onYearComplete={handleYearComplete}
                />
              </TabPanel>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );

  // Helper: get player age from retirement history or default
  function getPlayerAge(): number {
    if (summaryData?.retirementHistory && summaryData.retirementHistory.length > 0) {
      return summaryData.retirementHistory[0].age;
    }
    return 18;
  }
}

// ─── ForecastBanner ───────────────────────────────────────────────────────────

function ForecastBanner({ forecast }: { forecast: ForecastData }) {
  const { canAfford, remainingFunds, stressImpact } = forecast.forecast;

  if (canAfford && remainingFunds > 10000) return null;

  const severity = !canAfford ? 'error' : stressImpact >= 3 ? 'warning' : 'info';
  const icon = !canAfford ? '🚨' : stressImpact >= 3 ? '⚠' : 'ℹ';

  return (
    <Alert severity={severity} sx={{ mb: 2 }}>
      <Typography variant="body2" fontWeight={700}>
        {icon} Financial Forecast
      </Typography>
      <Typography variant="body2">
        {!canAfford
          ? `You cannot cover this year's expenses (${fmt(forecast.estimatedTotal)}) with available funds (${fmt(forecast.currentMoney + forecast.projectedIncome)}). Consider a loan or retirement withdrawal.`
          : `After expenses you'll have ${fmt(remainingFunds)} remaining.${stressImpact > 0 ? ` This will add +${stressImpact}% stress.` : ''}`}
      </Typography>
    </Alert>
  );
}

// ─── Tax bracket breakdown helper ────────────────────────────────────────────

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

function buildBracketBreakdown(
  income: number,
  filingStatus: 'single' | 'married',
  _totalTax: number,
): Array<{ rate: number; incomeInBracket: number; taxInBracket: number }> {
  const brackets = filingStatus === 'married' ? MARRIED_BRACKETS : SINGLE_BRACKETS;
  const result: Array<{ rate: number; incomeInBracket: number; taxInBracket: number }> = [];

  for (const bracket of brackets) {
    if (income <= bracket.min) break;
    const bracketMax = bracket.max ?? Infinity;
    const incomeInBracket = Math.min(income, bracketMax) - bracket.min;
    if (incomeInBracket <= 0) continue;
    result.push({
      rate: bracket.rate,
      incomeInBracket,
      taxInBracket: incomeInBracket * bracket.rate,
    });
  }

  return result;
}
