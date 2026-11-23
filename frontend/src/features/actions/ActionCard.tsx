/**
 * ActionCard — displays a single action with eligibility, cost, effects,
 * PTO/activity block selector, and add-to-cart.
 *
 * Simple actions configure inline; actions with additional choices use a dialog.
 */
import { useState } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Chip, Stack,
  Tooltip, IconButton, Button, Slider, Radio, RadioGroup,
  FormControlLabel, FormControl, Divider, Checkbox, Select, MenuItem, InputLabel,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import type { ActionItem, ActionUserInput } from './types';
import { CATEGORY_SLUG_TO_LABEL } from './ActionFilters';
import { skillTraitChipSx, SKILL_TRAIT_ICONS } from '../../lib/colorMaps';
import { formatKey } from '../../components/cards/cardComponents';
import GetHousingTransportPicker, { type AcquisitionSelection } from './GetHousingTransportPicker';
import EducationCheckoutFields, { type EducationSelection } from './EducationCheckoutFields';

export type CheckoutSelection = AcquisitionSelection & EducationSelection;

function Stepper({ label, value, decrease, increase, disabled }: {
  label: string; value: string | number; decrease: () => void; increase: () => void;
  disabled: { minus: boolean; plus: boolean };
}) {
  return <Stack direction="row" spacing={0.25} alignItems="center" sx={{ whiteSpace: 'nowrap' }}>
    <IconButton size="small" aria-label={`Decrease ${label}`} disabled={disabled.minus} onClick={decrease}><RemoveIcon fontSize="small" /></IconButton>
    <Typography variant="body2" fontWeight={700} color={disabled.minus && disabled.plus ? 'text.disabled' : 'text.primary'}>{value}</Typography>
    <IconButton size="small" aria-label={`Increase ${label}`} disabled={disabled.plus} onClick={increase}><AddIcon fontSize="small" /></IconButton>
  </Stack>;
}

// ─── Category colours ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'mental-health':       { bg: '#ede7f6', text: '#4a148c' },
  'physical-health':     { bg: '#ffebee', text: '#c62828' },
  'social-connections':  { bg: '#e3f2fd', text: '#0d47a1' },
  'family':              { bg: '#fbe9e7', text: '#bf360c' },
  'entertainment':       { bg: '#fce4ec', text: '#880e4f' },
  'outdoors':            { bg: '#e8f5e9', text: '#1b5e20' },
  'animals':             { bg: '#f3e5f5', text: '#6a1b9a' },
  'education':           { bg: '#e0f2f1', text: '#004d40' },
  'schoolwork':          { bg: '#e1f5fe', text: '#01579b' },
  'career':              { bg: '#efebe9', text: '#4e342e' },
  'luxury':              { bg: '#fff8e1', text: '#e65100' },
  'home-auto':           { bg: '#eceff1', text: '#37474f' },
  'community':           { bg: '#e0f7fa', text: '#006064' },
  'skill-trait':         { bg: '#e8eaf6', text: '#1a237e' },
  'skill-development':   { bg: '#e8eaf6', text: '#1a237e' },
  'other':               { bg: '#f5f5f5', text: '#555' },
  'fitness':             { bg: '#ffebee', text: '#c62828' },
  'social':              { bg: '#e3f2fd', text: '#0d47a1' },
  'creative':            { bg: '#fce4ec', text: '#880e4f' },
  'travel':              { bg: '#e0f2f1', text: '#004d40' },
  'volunteer':           { bg: '#e8f5e9', text: '#1b5e20' },
  'finance':             { bg: '#fff8e1', text: '#e65100' },
  'wellness':            { bg: '#e0f7fa', text: '#006064' },
};

const CATEGORY_ICONS: Record<string, string> = {
  'mental-health':      '🧠',
  'physical-health':    '❤️',
  'social-connections': '🤝',
  'family':             '👨‍👩‍👧',
  'entertainment':      '🎭',
  'outdoors':           '🌿',
  'animals':            '🐾',
  'education':          '📚',
  'schoolwork':         '📝',
  'career':             '💼',
  'luxury':             '✨',
  'home-auto':          '🏠',
  'community':          '🏘️',
  'skill-trait':        '⚙️',
  'skill-development':  '📈',
  'other':              '•',
  'fitness':            '💪',
  'social':             '👥',
  'creative':           '🎨',
  'travel':             '✈️',
  'volunteer':          '🤲',
  'finance':            '💰',
  'wellness':           '🌸',
};

function categoryStyle(cat: string): { bg: string; text: string } {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? { bg: '#78909c', text: '#fff' };
}

function categoryLabel(cat: string): string {
  const icon = CATEGORY_ICONS[cat.toLowerCase()] ?? '';
  const label = CATEGORY_SLUG_TO_LABEL[cat.toLowerCase()]
    ?? cat.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return icon ? `${icon} ${label}` : label;
}

function fmt(n: number) { return '$' + n.toLocaleString(); }

// Split camelCase substrings in a sentence: physicalAbility → physical ability
const humanizeText = (s: string) =>
  s.replace(/([a-z])([A-Z])/g, (_, a, b) => a + ' ' + b.toLowerCase());

// ─── Requirements formatter ───────────────────────────────────────────────────

const PROGRAM_TYPE_LABELS: Record<string, string> = {
  associates: "Associate's",
  bachelors: "Bachelor's",
  masters: "Master's",
  doctorate: 'Doctorate',
};

function formatRequirements(reqs: Record<string, unknown>, requiresPTO: boolean): string[] {
  const items: string[] = [];

  if (typeof reqs.minAge === 'number') items.push(`Age ≥ ${reqs.minAge}`);
  if (typeof reqs.maxAge === 'number') items.push(`Age ≤ ${reqs.maxAge}`);
  if (typeof reqs.health === 'number') items.push(`Health ≥ ${reqs.health}%`);
  if (reqs.isMarried === true) items.push('💍 Married');

  if (requiresPTO) {
    items.push('🏖️ PTO required');
  }

  if (Array.isArray(reqs.certifications) && reqs.certifications.length > 0) {
    (reqs.certifications as string[]).forEach((c) => items.push(`Cert: ${c}`));
  }
  if (reqs.hasCPRCert === true) items.push('CPR certification');
  if (reqs.inSchool === true || reqs.enrolled === true) items.push('🎓 Enrolled');
  if (Array.isArray(reqs.eligibleProgramTypes) && reqs.eligibleProgramTypes.length > 0) {
    const labels = (reqs.eligibleProgramTypes as string[]).map((t) => PROGRAM_TYPE_LABELS[t] ?? t);
    items.push(`🎓 Enrolled: ${labels.join('/')}`);
  }
  if (Array.isArray(reqs.eligibleHousingNames) && reqs.eligibleHousingNames.length > 0) {
    items.push('🏠 Requires owned home');
  }
  if (reqs.hasPool === true) items.push('Has pool');
  if (reqs.hasPool === false) items.push('🏊 No existing pool');
  if (reqs.hasSolarPanels === true) items.push('Has solar panels');
  if (reqs.hasSolarPanels === false) items.push('☀️ No existing solar panels');
  if (reqs.hasGrandkids === true) items.push('Has grandkids');
  if (reqs.minCarSeatsForFamily === true) items.push('Family-size vehicle');

  if (typeof reqs.location === 'string' && reqs.location !== 'both') {
    items.push(reqs.location === 'city' ? '🏙️ City only' : '🏡 Suburb only');
  }

  if (Array.isArray(reqs.job) && reqs.job.length > 0) {
    items.push(`Job: ${(reqs.job as string[]).join(' / ')}`);
  }

  if (reqs.skills && typeof reqs.skills === 'object') {
    Object.entries(reqs.skills as Record<string, number>).forEach(([k, v]) => {
      items.push(`${formatKey(k)} skill ≥ ${v}`);
    });
  }

  const namedTraits: Array<[string, string]> = [
    ['physicalAbility', 'Physical ability'],
    ['compassion', 'Compassion'],
    ['caution', 'Caution'],
    ['goodWithKids', 'Good with kids'],
    ['patience', 'Patience'],
    ['stressTolerance', 'Stress tolerance'],
  ];
  namedTraits.forEach(([key, label]) => {
    if (typeof reqs[key] === 'number') items.push(`${label} ≥ ${reqs[key]}`);
  });

  if (Array.isArray(reqs.other) && reqs.other.length > 0) {
    (reqs.other as string[]).forEach((s) => items.push(s));
  }

  return items;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  action: ActionItem;
  isFavorite: boolean;
  inCart: boolean;
  cartTimeBlocks?: number;
  cartPtoBlocks?: number;
  cartUnpaidBlocks?: number;
  cartSchoolBreakBlocks?: number;
  /** Number of instances of this action in the cart (adjusted from the cart drawer) */
  cartQuantity?: number;
  /** Label of the option selected when this action was added to the cart */
  cartSelectedOptionLabel?: string;
  /** Total PTO blocks the player has remaining (across all jobs) */
  ptoRemaining: number;
  /** PTO blocks already committed in the cart (excluding this action) */
  ptoCommitted: number;
  unpaidRemaining?: number;
  schoolBreakRemaining?: number;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (
    action: ActionItem,
    timeBlocks: number,
    ptoBlocks: number,
    selectedOption?: string,
    selectedOptionLabel?: string,
    quantity?: number,
    unpaidBlocks?: number,
    schoolBreakBlocks?: number,
    selection?: CheckoutSelection,
  ) => void;
  /** Executes this action immediately, bypassing the cart entirely */
  onExpressCheckout: (
    action: ActionItem,
    timeBlocks: number,
    ptoBlocks: number,
    selectedOption?: string,
    selectedOptionLabel?: string,
    quantity?: number,
    unpaidBlocks?: number,
    schoolBreakBlocks?: number,
    selection?: CheckoutSelection,
  ) => void;
  /** True while any express checkout is in flight (disables the button) */
  expressCheckingOut?: boolean;
  onRemoveFromCart: (id: string) => void;
  /** Called when the PTO split changes for an item already in the cart */
  onUpdateCartPto?: (actionId: string, timeBlocks: number, ptoBlocks: number) => void;
  /** Opens the express picker dialog for a "Get Housing" / "Get Transportation" action. */
  expressError?: string | null;
  optionsOpen?: boolean;
  onOpenOptions?: () => void;
  onCloseOptions?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActionCard({
  action,
  isFavorite,
  inCart,
  cartTimeBlocks = 0,
  cartPtoBlocks = 0,
  cartUnpaidBlocks = 0,
  cartSchoolBreakBlocks = 0,
  cartQuantity = 1,
  cartSelectedOptionLabel,
  ptoRemaining,
  ptoCommitted,
  unpaidRemaining = 0,
  schoolBreakRemaining = 0,
  onToggleFavorite,
  onAddToCart,
  onExpressCheckout,
  expressCheckingOut = false,
  onRemoveFromCart,
  onUpdateCartPto,
  expressError, optionsOpen = false, onOpenOptions, onCloseOptions,
}: Props) {
  const [addQty, setAddQty] = useState(1);
  const [education, setEducation] = useState<EducationSelection>({});

  // Actions that acquire something in another system and are configured in the
  // cart (or their own page). Doing them 2× in a year makes no sense.
  const NEEDS_CART_CONFIG = ['Get Housing', 'Get Transportation'];
  const SINGULAR_ACTIONS = [
    'Get Housing', 'Get Transportation', 'Get Childcare', 'Pursue Education',
    'Get CPR Certification', 'Change Major', 'Apply for Scholarships',
  ];
  const needsCartConfig = NEEDS_CART_CONFIG.includes(action.name);
  const needsEducation = action.name === 'Pursue Education' || action.name === 'Change Major';
  const isSingular = SINGULAR_ACTIONS.includes(action.name) || ['once_per_year', 'once_per_two_years'].includes(action.frequency);

  // ── Option variants (userInput) ────────────────────────────────────────────
  const userInput = action.userInput as ActionUserInput | null;
  const hasOptions = !!userInput?.options?.length;
  const configurable = needsCartConfig || needsEducation || hasOptions;
  // "Priced" options carry their own cost/timeBlocks (e.g. Study Abroad plans) —
  // these bypass the normal TB slider/radio entirely, since the plan determines it.
  const isPricedOption =
    hasOptions && userInput!.options.some((o) => o.cost !== undefined || o.timeBlocks !== undefined);

  const [duration, setDuration] = useState<'semester' | 'year'>('semester');
  const [sightseeing, setSightseeing] = useState(false);
  // Plain dropdown options (e.g. Internship focus) have no sensible default — force a pick.
  const [dropdownValue, setDropdownValue] = useState(
    userInput?.type === 'dropdown' ? '' : (userInput?.options?.[0]?.value ?? ''),
  );

  const selectedOptionValue =
    userInput?.type === 'duration_sightseeing'
      ? `${duration}_${sightseeing ? 'sightseeing' : 'no_sightseeing'}`
      : dropdownValue;
  const selectedOption = hasOptions
    ? (userInput!.options.find((o) => o.value === selectedOptionValue) ?? null)
    : null;
  const optionRequiredButUnset = hasOptions && userInput!.type === 'dropdown' && !selectedOption;

  const reqs = action.requirements as Record<string, unknown>;
  // Effects reactively merge in the selected option's effects, if any.
  const effects: Record<string, unknown> = selectedOption?.effects
    ? { ...(action.effects as Record<string, unknown>), ...selectedOption.effects }
    : (action.effects as Record<string, unknown>);
  const isGoodDeed = effects.isGoodDeedOpportunity === true;

  // Whether this action's blocks must be marked as PTO for this player. The server
  // already factors in the "no job + not in school" exemption, so this is authoritative.
  const requiresPTO = action.requiresPTO === true;

  // Some actions (school time, gig/career actions) can never have their blocks marked as PTO
  const ptoAllowed = action.allowsPTO !== false;

  const isVariable = !isPricedOption && action.maxTimeBlocks !== null && action.maxTimeBlocks > action.minTimeBlocks;
  const increment = action.timeBlockIncrement ?? 1;
  const minBlocks = action.minTimeBlocks;
  const maxBlocks = action.maxTimeBlocks ?? minBlocks;

  // Available PTO this action can use (not yet committed elsewhere)
  const qty = isSingular || isVariable || isPricedOption ? 1 : addQty;
  const maxQuantity = Math.min(action.frequency === 'four_per_year' ? 4 : action.frequency === 'twice_per_year' ? 2 : 60,
    minBlocks > 0 ? Math.floor(60 / minBlocks) : 60);
  const availablePTO = ptoAllowed ? Math.max(0, ptoRemaining - ptoCommitted) : 0;
  const availableUnpaid = ptoAllowed ? Math.max(0, unpaidRemaining) : 0;
  const availableBreak = action.name === 'Take a Mental Health Day' ? 0 : Math.max(0, schoolBreakRemaining);

  // ── Local state for block selection ─────────────────────────────────────────

  // For variable-block actions: total slider + PTO split
  // For fixed-block actions: PTO split only (activity is derived: minBlocks - ptoSplit)
  const snapToIncrement = (val: number) =>
    Math.max(minBlocks, Math.round(val / increment) * increment);

  const [totalBlocks, setTotalBlocks] = useState(snapToIncrement(minBlocks));
  const [ptoChoice, setPtoSplit] = useState<number | null>(null);
  const [unpaidChoice, setUnpaidSplit] = useState<number | null>(null);
  const [breakChoice, setBreakSplit] = useState<number | null>(null);
  const durationBlocks = (isPricedOption ? (selectedOption?.timeBlocks ?? minBlocks) : isVariable ? totalBlocks : minBlocks) * qty;
  const requiredTime = requiresPTO ? Math.min(durationBlocks, (typeof reqs.ptoOrUnpaidTimeBlocks === 'number' ? reqs.ptoOrUnpaidTimeBlocks : minBlocks) * qty) : 0;
  const breakSplit = Math.min(availableBreak, durationBlocks, breakChoice ?? requiredTime);
  const ptoSplit = ptoAllowed ? Math.min(availablePTO, durationBlocks - breakSplit, ptoChoice ?? Math.max(0, requiredTime - breakSplit)) : 0;
  const unpaidSplit = Math.min(availableUnpaid, durationBlocks - breakSplit - ptoSplit, unpaidChoice ?? Math.max(0, requiredTime - breakSplit - ptoSplit));

  // Derived splits
  const activitySplit = durationBlocks - ptoSplit - unpaidSplit - breakSplit;

  // Clamp ptoSplit when totalBlocks changes
  const handleTotalChange = (_: Event, val: number | number[]) => {
    const next = snapToIncrement(val as number);
    setTotalBlocks(next);
  };

  const adjustPto = (delta: number) => {
    setPtoSplit(Math.max(0, Math.min(ptoSplit + delta, durationBlocks - breakSplit - unpaidSplit, availablePTO)));
  };

  const changeQuantity = (delta: number) => {
    const next = Math.max(1, Math.min(maxQuantity, addQty + delta));
    const capacity = minBlocks * next;
    const paid = Math.min(ptoSplit, capacity);
    const unpaid = Math.min(unpaidSplit, capacity - paid);
    setPtoSplit(paid);
    setUnpaidSplit(unpaid);
    setBreakSplit(Math.min(breakSplit, capacity - paid - unpaid));
    setAddQty(next);
  };

  // Active TB/PTO for display and cart
  const selectedTB = activitySplit;
  const selectedPTO = ptoSplit;

  // In-cart values for display when already added
  const displayTB = inCart ? cartTimeBlocks : selectedTB;
  const displayPTO = inCart ? cartPtoBlocks : selectedPTO;

  // Effects — separate flat vs per-block rates for display
  const healthFlat = typeof effects.health === 'number' ? effects.health : 0;
  const healthPerBlockRate = typeof effects.healthPerBlock === 'number' ? effects.healthPerBlock : 0;
  const stressFlat = typeof effects.stress === 'number' ? effects.stress : 0;
  const stressPerBlockRate = typeof effects.stressPerBlock === 'number' ? effects.stressPerBlock : 0;
  const stressPerPTOBlock = typeof effects.stressPerPTOBlock === 'number' ? effects.stressPerPTOBlock : null;
  const stressPerTrip = typeof effects.stressPerTrip === 'number' ? effects.stressPerTrip : null;

  // For fixed-block actions, fold per-block rate (and per-trip) into flat total
  const healthDisplay = isVariable
    ? { flat: healthFlat, rate: healthPerBlockRate }
    : { flat: healthFlat + healthPerBlockRate * minBlocks, rate: 0 };
  const stressDisplay = isVariable
    ? { flat: stressFlat, rate: stressPerBlockRate }
    : { flat: stressFlat + stressPerBlockRate * minBlocks + (stressPerTrip ?? 0), rate: 0 };

  // Lemons: rate for variable, flat per-execution for fixed; always prefix "Earn"
  const lemonsPerBlock = typeof effects.lemonsPerBlock === 'number' ? effects.lemonsPerBlock : 0;
  const lemonsPerTrip = typeof effects.lemonsPerTrip === 'number' ? effects.lemonsPerTrip : 0;
  const lemonsFlat = typeof effects.lemons === 'number' ? effects.lemons : 0;
  const pl = (n: number) => `lemon${n !== 1 ? 's' : ''}`;
  const perTBLabel = increment > 1 ? `per ${increment} TB` : 'per TB';
  const lemonsLabel: string | null = (() => {
    if (isVariable && lemonsPerBlock > 0) return `🍋 Earn ${lemonsPerBlock} ${pl(lemonsPerBlock)} ${perTBLabel}`;
    if (!isVariable && lemonsPerBlock > 0) {
      const t = lemonsPerBlock * minBlocks;
      return `🍋 Earn ${t} ${pl(t)}`;
    }
    if (lemonsPerTrip > 0) {
      return isVariable
        ? `🍋 Earn ${lemonsPerTrip} ${pl(lemonsPerTrip)} ${perTBLabel}`
        : `🍋 Earn ${lemonsPerTrip} ${pl(lemonsPerTrip)}`;
    }
    if (lemonsFlat > 0) return `🍋 Earn ${lemonsFlat} ${pl(lemonsFlat)}`;
    if (action.calculatedLemons > 0) {
      return isVariable
        ? `🍋 Earn ${action.calculatedLemons} ${pl(action.calculatedLemons)} ${perTBLabel}`
        : `🍋 Earn ${action.calculatedLemons} ${pl(action.calculatedLemons)}`;
    }
    return null;
  })();

  const SKILL_KEYS = ['math','science','art','music','writing','analysis','homeRepair','technology'];
  const TRAIT_KEYS = ['bravery','perseverance','charisma','compassion','creativity','organization','patience','caution','sociability','stressTolerance','goodWithKids','physicalAbility','communication'];

  const extractNum = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      if (typeof obj.base === 'number') return obj.base;
      if (typeof obj.amount === 'number') return obj.amount;
    }
    return 0;
  };

  // Catch both flat keys (e.g. "math") and per-block keys (e.g. "artPerBlock")
  const skillGains = Object.entries(effects)
    .map(([k, v]) => {
      if (SKILL_KEYS.includes(k)) return { key: k, val: extractNum(v), perBlock: false };
      if (k.endsWith('PerBlock') && SKILL_KEYS.includes(k.replace(/PerBlock$/, '')))
        return { key: k.replace(/PerBlock$/, ''), val: extractNum(v), perBlock: true };
      return null;
    })
    .filter((x): x is { key: string; val: number; perBlock: boolean } => x !== null && x.val > 0);

  const traitGains = Object.entries(effects)
    .map(([k, v]) => {
      if (TRAIT_KEYS.includes(k)) return { key: k, val: extractNum(v), perBlock: false };
      const baseTrip = k.replace(/PerTrip$/, '');
      if (k.endsWith('PerTrip') && TRAIT_KEYS.includes(baseTrip))
        return { key: baseTrip, val: extractNum(v), perBlock: false };
      const baseBlock = k.replace(/PerBlock$/, '');
      if (k.endsWith('PerBlock') && TRAIT_KEYS.includes(baseBlock))
        return { key: baseBlock, val: extractNum(v), perBlock: true };
      return null;
    })
    .filter((x): x is { key: string; val: number; perBlock: boolean } => x !== null && x.val > 0);

  // gainSuffix: for flat per-execution gains on variable actions
  const gainSuffix = isVariable ? ` ${perTBLabel}` : '';

  const requirementItems = formatRequirements(reqs, requiresPTO);
  const isBlocked = !action.eligible || ptoSplit + unpaidSplit + breakSplit < requiredTime || optionRequiredButUnset;

  const handleAdd = (selection?: CheckoutSelection) => {
    onAddToCart(action, selectedTB, selectedPTO, hasOptions ? selectedOptionValue : undefined, selectedOption?.label, qty, unpaidSplit, breakSplit, selection);
    onCloseOptions?.();
  };

  const handleExpress = (selection?: CheckoutSelection) => {
    onExpressCheckout(action, selectedTB, selectedPTO, hasOptions ? selectedOptionValue : undefined, selectedOption?.label, qty, unpaidSplit, breakSplit, selection);
  };

  // When in-cart PTO changes via +/−
  const handleCartPtoAdjust = (delta: number) => {
    if (!onUpdateCartPto) return;
    const newPto = Math.max(
      requiresPTO ? minBlocks : 0,
      Math.min(cartPtoBlocks + delta, cartTimeBlocks + cartPtoBlocks, availablePTO + cartPtoBlocks),
    );
    const newTB = cartTimeBlocks + cartPtoBlocks - newPto;
    onUpdateCartPto(action.id, newTB, newPto);
  };

  const checkoutButtons = (selection?: CheckoutSelection, inDialog = true) => {
    const disabled = isBlocked || expressCheckingOut || (needsCartConfig && !selection) || (needsEducation && !selection?.educationProgramId);
    const buttonSx = inDialog ? undefined : { flex: '1 1 0', fontSize: '0.8rem' };
    return <Stack direction="row" useFlexGap flexWrap="wrap" justifyContent={inDialog ? 'flex-end' : 'space-between'}
      spacing={inDialog ? 3 : 1.5} sx={{ width: inDialog ? 'auto' : '100%' }}>
      {action.executionType !== 'cart' && <Button size="small" variant="contained" disabled={disabled}
        onClick={() => handleExpress(selection)}
        startIcon={expressCheckingOut ? <CircularProgress size={12} color="inherit" /> : <BoltIcon />}
        sx={{ ...buttonSx, bgcolor: '#ffd54f', color: '#333', fontWeight: 700,
          '&:hover': { bgcolor: '#ffca28' },
          '&.Mui-disabled': {
            bgcolor: inDialog ? 'action.disabledBackground' : '#fff9c4',
            color: inDialog ? 'action.disabled' : '#aaa',
          },
        }}>
        {expressCheckingOut ? 'Processing…' : inDialog ? 'Express Checkout' : 'Express'}
      </Button>}
      {action.executionType !== 'express' && <Button size="small" variant="contained" disabled={disabled}
        startIcon={<AddShoppingCartIcon />} onClick={() => handleAdd(selection)} sx={buttonSx}>Add to Cart</Button>}
    </Stack>;
  };

  const checkoutOptions = (
    <Box sx={{ p: 1 }}>
      {needsEducation && <EducationCheckoutFields changeMajor={action.name === 'Change Major'} onChange={setEducation} />}
      {hasOptions && <Box sx={{ mb: 1.5 }}>
        {userInput?.type === 'duration_sightseeing' ? <>
          <Typography variant="caption">{userInput.label ?? 'Choose your plan'}</Typography>
          <RadioGroup row aria-label="Study abroad duration" value={duration} onChange={(_, value) => setDuration(value as 'semester' | 'year')}>
            <FormControlLabel value="semester" control={<Radio size="small" />} label="Semester" />
            <FormControlLabel value="year" control={<Radio size="small" />} label="Full year" />
          </RadioGroup>
          <FormControlLabel control={<Checkbox size="small" checked={sightseeing} onChange={(e) => setSightseeing(e.target.checked)} />} label="Add sightseeing trips" />
        </> : <FormControl fullWidth size="small">
          <InputLabel>{userInput?.label ?? 'Choose an option'}</InputLabel>
          <Select value={dropdownValue} label={userInput?.label ?? 'Choose an option'} onChange={(e) => setDropdownValue(e.target.value)}>
            {userInput?.options?.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>}
        {selectedOption?.cost !== undefined && <Typography variant="caption">Cost: ${selectedOption.cost.toLocaleString()}</Typography>}
      </Box>}
      {isVariable && <Slider aria-label="Total time blocks" value={totalBlocks} min={minBlocks} max={maxBlocks}
        step={increment} onChange={handleTotalChange} size="small" valueLabelDisplay="auto" />}
      <Stack direction="row" flexWrap="wrap" columnGap={{ xs: 3, sm: 4 }} rowGap={1}>
        {!isSingular && !isVariable && !isPricedOption && <Box>
          <Typography variant="body2" fontWeight={700}>Quantity</Typography>
          <Stepper label="quantity" value={qty} decrease={() => changeQuantity(-1)} increase={() => changeQuantity(1)}
            disabled={{ minus: qty <= 1, plus: qty >= maxQuantity }} />
        </Box>}
        {durationBlocks > 0 && <Box>
          <Typography variant="body2" fontWeight={700}>Time blocks</Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minHeight: 30 }}>
            <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>{activitySplit} activity</Typography>
            {ptoAllowed && <>
              <Typography variant="body2">+</Typography>
              <Stepper label="PTO" value={`${ptoSplit} PTO`} decrease={() => adjustPto(-1)} increase={() => adjustPto(1)}
                disabled={{ minus: ptoSplit <= 0, plus: ptoSplit >= availablePTO || activitySplit <= 0 }} />
            </>}
          </Stack>
        </Box>}
      </Stack>
      {availableUnpaid > 0 && durationBlocks > 0 && <FormControl size="small" fullWidth sx={{ mt: 1 }}>
        <Typography variant="body2">Unpaid leave (reduces annual pay)</Typography>
        <Select value={unpaidSplit} onChange={(e) => setUnpaidSplit(Number(e.target.value))} inputProps={{ 'aria-label': 'Unpaid leave blocks' }}>
          {Array.from({ length: Math.min(availableUnpaid, durationBlocks - breakSplit - ptoSplit) + 1 }, (_, n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
        </Select>
      </FormControl>}
      {availableBreak > 0 && durationBlocks > 0 && <FormControl size="small" fullWidth sx={{ mt: 1 }}>
        <Typography variant="body2">School Break blocks</Typography>
        <Select value={breakSplit} onChange={(e) => setBreakSplit(Number(e.target.value))} inputProps={{ 'aria-label': 'School Break blocks' }}>
          {Array.from({ length: Math.min(availableBreak, durationBlocks - ptoSplit - unpaidSplit) + 1 }, (_, n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
        </Select>
      </FormControl>}
    </Box>
  );

  const dialogOpen = configurable && optionsOpen;
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: inCart ? 'primary.main' : action.eligible ? 'divider' : 'grey.500',
        bgcolor: inCart ? 'primary.50' : action.eligible ? 'background.paper' : '#fafafa',
        opacity: action.eligible ? 1 : 0.85,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
        position: 'relative',
      }}
    >
      {/* Favorite button — top right */}
      <Box sx={{ position: 'absolute', top: 6, right: 6, zIndex: 1 }}>
        <IconButton
          size="small"
          onClick={() => onToggleFavorite(action.id)}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          sx={{ color: isFavorite ? 'error.main' : 'text.disabled' }}
        >
          {isFavorite ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
        </IconButton>
      </Box>

      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Title + eligibility */}
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 0.5 }}>
          <Tooltip
            title={action.eligible ? 'You meet all requirements' : action.eligibilityReasons.map(humanizeText).join(' • ')}
            arrow
          >
            <Box sx={{ mt: 0.25, flexShrink: 0 }}>
              {action.eligible
                ? <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                : <BlockIcon sx={{ fontSize: 18, color: 'error.main' }} />
              }
            </Box>
          </Tooltip>
          <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {action.name}
          </Typography>
        </Stack>

        {/* Categories + Senior + Good Deed on same row */}
        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
          {action.category.map((cat) => {
            const style = categoryStyle(cat);
            return (
              <Chip
                key={cat}
                label={categoryLabel(cat)}
                size="small"
                 sx={{ fontSize: '0.82rem', bgcolor: style.bg, color: style.text, fontWeight: 600, '& .MuiChip-label': { px: 1 } }}
              />
            );
          })}
          {isGoodDeed && (
            <Chip label="🤝 Good Deed" size="small" sx={{ fontSize: '0.8rem', bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 600, '& .MuiChip-label': { px: 1 } }} />
          )}
          {action.seniorDiscount && (
            <Chip label="👴 Senior Discount" size="small" sx={{ fontSize: '0.8rem', bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 600, '& .MuiChip-label': { px: 1 } }} />
          )}
        </Stack>

        {/* Description */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {action.description}
        </Typography>

        {/* Stats row */}
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
          <Chip
            label={
              isPricedOption
                ? `⏱ ${selectedOption?.timeBlocks ?? 0} TB`
                : `⏱ Spend ${minBlocks}${action.maxTimeBlocks && action.maxTimeBlocks !== minBlocks ? `–${action.maxTimeBlocks}` : ''} TB`
            }
            size="small" variant="outlined" sx={{ fontSize: '0.8rem' }}
          />
          {(() => {
            const displayCost = isPricedOption ? (selectedOption?.cost ?? action.cost) : action.calculatedCost;
            const basePercent = typeof effects.costBasePercent === 'number' ? effects.costBasePercent : null;
            const perYearPercent = typeof effects.costPerYearOwnedPercent === 'number' ? effects.costPerYearOwnedPercent : null;
            const isHomeValueCost = effects.costBasis === 'originalHomeValue';
            const basisText = isHomeValueCost
              ? `${basePercent ?? 0}% of home value${perYearPercent ? ` + ${perYearPercent}%/yr owned` : ''}`
              : null;

            if (displayCost > 0) {
              return (
                <Tooltip title={basisText ?? ''} disableHoverListener={!basisText}>
                  <Chip
                    label={`💰 Costs ${fmt(displayCost)}`}
                    size="small" variant="outlined" sx={{ fontSize: '0.8rem' }}
                  />
                </Tooltip>
              );
            }
            if (isHomeValueCost) {
              return (
                <Tooltip title="Own an eligible home to see the exact cost">
                  <Chip label={`💰 ${basisText}`} size="small" variant="outlined" sx={{ fontSize: '0.8rem' }} />
                </Tooltip>
              );
            }
            return null;
          })()}
          {lemonsLabel && (
            <Chip label={lemonsLabel} size="small" sx={{ fontSize: '0.8rem', bgcolor: '#fff9c4' }} />
          )}
          {healthDisplay.flat !== 0 && (
            <Chip
              label={`❤️ ${healthDisplay.flat > 0 ? '+' : ''}${healthDisplay.flat}% health${isVariable ? ` ${perTBLabel}` : ''}`}
              size="small"
              sx={{ fontSize: '0.8rem', bgcolor: healthDisplay.flat > 0 ? '#e8f5e9' : '#ffebee', color: healthDisplay.flat > 0 ? 'success.dark' : 'error.dark' }}
            />
          )}
          {healthDisplay.rate !== 0 && (
            <Chip
              label={`❤️ ${healthDisplay.rate > 0 ? '+' : ''}${healthDisplay.rate}% health ${perTBLabel}`}
              size="small"
              sx={{ fontSize: '0.8rem', bgcolor: healthDisplay.rate > 0 ? '#e8f5e9' : '#ffebee', color: healthDisplay.rate > 0 ? 'success.dark' : 'error.dark' }}
            />
          )}
          {stressDisplay.flat !== 0 && (
            <Chip
              label={`😰 ${stressDisplay.flat > 0 ? '+' : ''}${stressDisplay.flat}% stress${isVariable ? ` ${perTBLabel}` : ''}`}
              size="small"
              sx={{ fontSize: '0.8rem', bgcolor: stressDisplay.flat < 0 ? '#e8f5e9' : '#fff3e0', color: stressDisplay.flat < 0 ? 'success.dark' : 'warning.dark' }}
            />
          )}
          {stressDisplay.rate !== 0 && (
            <Chip
              label={`😰 ${stressDisplay.rate > 0 ? '+' : ''}${stressDisplay.rate}% stress ${perTBLabel}`}
              size="small"
              sx={{ fontSize: '0.8rem', bgcolor: stressDisplay.rate < 0 ? '#e8f5e9' : '#fff3e0', color: stressDisplay.rate < 0 ? 'success.dark' : 'warning.dark' }}
            />
          )}
          {stressPerPTOBlock !== null && (
            <Chip
              label={`😰 ${stressPerPTOBlock > 0 ? '+' : ''}${stressPerPTOBlock}% stress per PTO block`}
              size="small"
              sx={{ fontSize: '0.8rem', bgcolor: stressPerPTOBlock < 0 ? '#e8f5e9' : '#fff3e0', color: stressPerPTOBlock < 0 ? 'success.dark' : 'warning.dark' }}
            />
          )}
          {isVariable && stressPerTrip !== null && (
            <Chip
              label={`😰 ${stressPerTrip > 0 ? '+' : ''}${stressPerTrip}% stress ${perTBLabel}`}
              size="small"
              sx={{ fontSize: '0.8rem', bgcolor: stressPerTrip < 0 ? '#e8f5e9' : '#fff3e0', color: stressPerTrip < 0 ? 'success.dark' : 'warning.dark' }}
            />
          )}
        </Stack>

        {/* Requirements */}
        {requirementItems.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>
              📋 Requirements
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {requirementItems.map((item, i) => (
                <Chip key={i} label={item} size="small" sx={{ fontSize: '0.8rem', bgcolor: '#ede7f6', color: '#4a148c', fontWeight: 500 }} />
              ))}
            </Stack>
          </Box>
        )}

        {/* Eligibility reasons */}
        {!action.eligible && action.eligibilityReasons.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {action.eligibilityReasons.slice(0, 2).map((r, i) => (
              <Typography key={i} variant="body2" color="error.main" display="block">• {humanizeText(r)}</Typography>
            ))}
            {action.eligibilityReasons.length > 2 && (
              <Typography variant="body2" color="text.secondary">+{action.eligibilityReasons.length - 2} more…</Typography>
            )}
          </Box>
        )}

        {/* Skill/trait gains */}
        {(skillGains.length > 0 || traitGains.length > 0) && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>📈 Skill/Trait gains</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {[...skillGains, ...traitGains].map(({ key, val, perBlock }) => {
                const icon = SKILL_TRAIT_ICONS[key] ?? '';
                const suffix = perBlock ? ` ${perTBLabel}` : gainSuffix;
                const label = `${icon} ${formatKey(key)} +${val}${suffix}`;
                return (
                  <Chip key={key} label={label} size="small" sx={{ fontSize: '0.8rem', ...skillTraitChipSx(key) }} />
                );
              })}
            </Stack>
          </Box>
        )}

        {/* ── Time block selector (when NOT in cart) ──────────────────────── */}
        {!inCart && (
          <>
          <Divider sx={{ mt: 2, mb: 1 }} />
          <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
            ⚙️ Checkout options
          </Typography>
          {configurable ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button size="small" variant="outlined" sx={{ fontSize: '0.8rem' }} disabled={expressCheckingOut} onClick={() => { setEducation({}); onOpenOptions?.(); }}>View Options</Button>
            </Box>
          ) : checkoutOptions}

          </>
        )}

        {/* ── In-cart PTO split display + adjuster ───────────────────────── */}
        {inCart && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'primary.50', borderRadius: 1.5, border: '1px solid', borderColor: 'primary.light' }}>
            {cartSelectedOptionLabel && (
              <Typography variant="body2" fontWeight={700} color="primary.dark" sx={{ display: 'block', mb: 0.25 }}>
                🎓 {cartSelectedOptionLabel}
              </Typography>
            )}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {cartQuantity > 1 && <>×{cartQuantity}{' '}</>}
                {ptoAllowed
                  ? <>{displayTB} activity + {displayPTO} PTO</>
                  : <>{displayTB} activity</>}
              </Typography>
              {ptoAllowed && !requiresPTO && onUpdateCartPto && displayTB + displayPTO > 0 && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Tooltip title="Use less PTO">
                    <span>
                      <IconButton size="small" onClick={() => handleCartPtoAdjust(-1)} disabled={displayPTO <= 0} sx={{ p: 0, width: 24, height: 24, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}>
                        <RemoveIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>PTO</Typography>
                  <Tooltip title="Use more PTO">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleCartPtoAdjust(1)}
                        disabled={displayTB <= 0 || displayPTO >= availablePTO}
                        sx={{ p: 0, width: 24, height: 24, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}
                      >
                        <AddIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              )}
            </Stack>
          </Box>
        )}

      </CardContent>

      {(inCart || !configurable) && <CardActions sx={{ pt: 0, pb: 2, px: 2, flexDirection: 'column', gap: 0.75 }}>
        {inCart ? (
          <Button
            size="small" variant="outlined" color="error"
            onClick={() => onRemoveFromCart(action.id)}
            sx={{ fontSize: '0.8rem', width: '100%' }}
          >
            Remove ({displayTB + displayPTO + cartUnpaidBlocks + cartSchoolBreakBlocks} TB)
          </Button>
        ) : !configurable && checkoutButtons(undefined, false)}
      </CardActions>}
      {dialogOpen && needsCartConfig && <GetHousingTransportPicker open actionId={action.id}
        kind={action.name === 'Get Housing' ? 'housing' : 'transport'} onClose={() => onCloseOptions?.()}
        pending={expressCheckingOut} error={expressError} checkoutButtons={checkoutButtons}>
        {checkoutOptions}
      </GetHousingTransportPicker>}
      {dialogOpen && !needsCartConfig && <Dialog open onClose={expressCheckingOut ? undefined : onCloseOptions} fullWidth maxWidth="sm">
        <DialogTitle>{action.name} Options</DialogTitle>
        <DialogContent dividers>
          {expressError && <Alert severity="error">{expressError}</Alert>}
          {checkoutOptions}
        </DialogContent>
        <DialogActions disableSpacing sx={{ flexWrap: 'wrap', gap: 2, px: 3 }}>
          <Button disabled={expressCheckingOut} onClick={onCloseOptions} sx={{ mr: 'auto' }}>Cancel</Button>
          {checkoutButtons(needsEducation ? education : undefined)}
        </DialogActions>
      </Dialog>}
    </Card>
  );
}
