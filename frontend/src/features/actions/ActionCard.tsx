/**
 * ActionCard — displays a single action with eligibility, cost, effects,
 * PTO/activity block selector, and add-to-cart.
 *
 * Variable-block actions: one total-block slider + PTO split +/− buttons.
 * Fixed-block actions: radio ⏱ Activity TB | 🏖️ PTO.
 * Required-PTO actions: PTO only (no radio choice).
 */
import { useState } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Chip, Stack,
  Tooltip, IconButton, Button, Collapse, Slider, Radio, RadioGroup,
  FormControlLabel, FormControl, FormLabel,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import type { ActionItem } from './types';
import { CATEGORY_SLUG_TO_LABEL } from './ActionFilters';

// ─── Category colours ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'mental-health':      { bg: '#7e57c2', text: '#fff' },
  'physical-health':    { bg: '#ef5350', text: '#fff' },
  'social-connections': { bg: '#42a5f5', text: '#fff' },
  'family':             { bg: '#ff7043', text: '#fff' },
  'entertainment':      { bg: '#ec407a', text: '#fff' },
  'outdoors':           { bg: '#66bb6a', text: '#fff' },
  'animals':            { bg: '#ab47bc', text: '#fff' },
  'education':          { bg: '#26a69a', text: '#fff' },
  'schoolwork':         { bg: '#29b6f6', text: '#fff' },
  'career':             { bg: '#8d6e63', text: '#fff' },
  'luxury':             { bg: '#ffa726', text: '#fff' },
  'home-auto':          { bg: '#78909c', text: '#fff' },
  'community':          { bg: '#26c6da', text: '#fff' },
  'skill-trait':        { bg: '#5c6bc0', text: '#fff' },
  'other':              { bg: '#bdbdbd', text: '#333' },
  'fitness':            { bg: '#ef5350', text: '#fff' },
  'social':             { bg: '#42a5f5', text: '#fff' },
  'creative':           { bg: '#ec407a', text: '#fff' },
  'travel':             { bg: '#26a69a', text: '#fff' },
  'volunteer':          { bg: '#66bb6a', text: '#fff' },
  'finance':            { bg: '#ffa726', text: '#fff' },
  'wellness':           { bg: '#26c6da', text: '#fff' },
};

function categoryStyle(cat: string): { bg: string; text: string } {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? { bg: '#78909c', text: '#fff' };
}

function categoryLabel(cat: string): string {
  return CATEGORY_SLUG_TO_LABEL[cat.toLowerCase()]
    ?? cat.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmt(n: number) { return '$' + n.toLocaleString(); }

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  action: ActionItem;
  isFavorite: boolean;
  inCart: boolean;
  cartTimeBlocks?: number;
  cartPtoBlocks?: number;
  /** Total PTO blocks the player has remaining (across all jobs) */
  ptoRemaining: number;
  /** PTO blocks already committed in the cart (excluding this action) */
  ptoCommitted: number;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (action: ActionItem, timeBlocks: number, ptoBlocks: number) => void;
  onRemoveFromCart: (id: string) => void;
  /** Called when the PTO split changes for an item already in the cart */
  onUpdateCartPto?: (actionId: string, timeBlocks: number, ptoBlocks: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActionCard({
  action,
  isFavorite,
  inCart,
  cartTimeBlocks = 0,
  cartPtoBlocks = 0,
  ptoRemaining,
  ptoCommitted,
  onToggleFavorite,
  onAddToCart,
  onRemoveFromCart,
  onUpdateCartPto,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const effects = action.effects as Record<string, unknown>;
  const reqs = action.requirements as Record<string, unknown>;
  const isGoodDeed = effects.isGoodDeedOpportunity === true;
  const isExpress = action.executionType === 'express';

  // Determine PTO requirement type
  const requiresPTO =
    action.requiresPTO === true ||
    reqs.hasPTOOrUnpaidTimeBlocks === true ||
    reqs.hasPTODaysAvailable === true ||
    (typeof reqs.ptoOrUnpaidTimeBlocks === 'number' && reqs.ptoOrUnpaidTimeBlocks > 0);

  const isVariable = action.maxTimeBlocks !== null && action.maxTimeBlocks > action.minTimeBlocks;
  const increment = action.timeBlockIncrement ?? 1;
  const minBlocks = action.minTimeBlocks || 1;
  const maxBlocks = action.maxTimeBlocks ?? minBlocks;

  // Available PTO this action can use (not yet committed elsewhere)
  const availablePTO = ptoRemaining - ptoCommitted;

  // PTO disabled reasons
  const ptoDisabledReason: string | null = (() => {
    if (availablePTO <= 0 && ptoRemaining <= 0) return 'No PTO available — get a job with PTO benefits';
    if (availablePTO <= 0) return 'All PTO committed to other cart items';
    return null;
  })();

  const ptoDisabled = ptoDisabledReason !== null;

  // ── Local state for block selection ─────────────────────────────────────────

  // For fixed-block actions: radio 'activity' | 'pto'
  const [fixedMode, setFixedMode] = useState<'activity' | 'pto'>(
    requiresPTO ? 'pto' : 'activity',
  );

  // For variable-block actions: total slider + PTO split
  const snapToIncrement = (val: number) =>
    Math.max(minBlocks, Math.round(val / increment) * increment);

  const [totalBlocks, setTotalBlocks] = useState(snapToIncrement(minBlocks));
  const [ptoSplit, setPtoSplit] = useState(requiresPTO ? snapToIncrement(minBlocks) : 0);

  // Derived splits
  const activitySplit = Math.max(0, totalBlocks - ptoSplit);

  // Clamp ptoSplit when totalBlocks changes
  const handleTotalChange = (_: Event, val: number | number[]) => {
    const next = snapToIncrement(val as number);
    setTotalBlocks(next);
    setPtoSplit((prev) => Math.min(prev, Math.min(next, availablePTO)));
  };

  const adjustPto = (delta: number) => {
    setPtoSplit((prev) => {
      const next = prev + delta;
      return Math.max(requiresPTO ? minBlocks : 0, Math.min(next, totalBlocks, availablePTO));
    });
  };

  // Active TB/PTO for display and cart
  const selectedTB = isVariable ? activitySplit : (fixedMode === 'activity' ? minBlocks : 0);
  const selectedPTO = isVariable ? ptoSplit : (fixedMode === 'pto' ? minBlocks : 0);
  const totalSelected = selectedTB + selectedPTO;

  // In-cart values for display when already added
  const displayTB = inCart ? cartTimeBlocks : selectedTB;
  const displayPTO = inCart ? cartPtoBlocks : selectedPTO;

  // Effects preview
  const healthDelta = (() => {
    let d = 0;
    if (typeof effects.health === 'number') d += effects.health;
    if (typeof effects.healthPerBlock === 'number') d += effects.healthPerBlock * totalSelected;
    return d;
  })();

  const stressDelta = (() => {
    let d = 0;
    if (typeof effects.stress === 'number') d += effects.stress;
    if (typeof effects.stressPerBlock === 'number') d += effects.stressPerBlock * totalSelected;
    return d;
  })();

  const skillGains = Object.entries(effects)
    .filter(([k]) => ['math','science','art','music','writing','analysis','homeRepair','technology'].includes(k))
    .map(([k, v]) => ({ key: k, val: v as number }));

  const traitGains = Object.entries(effects)
    .filter(([k]) => ['bravery','perseverance','charisma','compassion','creativity','organization','patience','caution','sociability','stressTolerance','goodWithKids','physicalAbility','communication'].includes(k))
    .map(([k, v]) => ({ key: k, val: v as number }));

  const handleAdd = () => {
    onAddToCart(action, selectedTB, selectedPTO);
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

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: inCart ? 'primary.main' : action.eligible ? 'divider' : 'error.light',
        bgcolor: inCart ? 'primary.50' : action.eligible ? 'background.paper' : 'action.hover',
        opacity: action.eligible ? 1 : 0.85,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
        position: 'relative',
      }}
    >
      {/* Badges row */}
      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5, zIndex: 1, flexWrap: 'wrap', maxWidth: 140, justifyContent: 'flex-end' }}>
        {isGoodDeed && (
          <Tooltip title="Good deed opportunity">
            <Chip label="🤝 Good Deed" size="small" color="success" sx={{ fontSize: '0.65rem', height: 20 }} />
          </Tooltip>
        )}
        {action.seniorDiscount && (
          <Tooltip title="Senior discount available (age 65+)">
            <Chip label="👴 Senior" size="small" color="info" sx={{ fontSize: '0.65rem', height: 20 }} />
          </Tooltip>
        )}
        {requiresPTO && (
          <Tooltip title="Requires PTO — cannot use activity time blocks">
            <Chip label="🏖️ PTO req." size="small" color="warning" sx={{ fontSize: '0.65rem', height: 20 }} />
          </Tooltip>
        )}
        {isExpress && (
          <Tooltip title="Express action — executes immediately">
            <Chip label="⚡ Express" size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#ffd54f' }} />
          </Tooltip>
        )}
      </Box>

      <CardContent sx={{ pb: 0, pr: 10 }}>
        {/* Title + eligibility */}
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 0.5 }}>
          <Tooltip
            title={action.eligible ? 'You meet all requirements' : action.eligibilityReasons.join(' • ')}
            arrow
          >
            <Box sx={{ mt: 0.25, flexShrink: 0 }}>
              {action.eligible
                ? <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                : <BlockIcon sx={{ fontSize: 18, color: 'error.main' }} />
              }
            </Box>
          </Tooltip>
          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {action.name}
          </Typography>
        </Stack>

        {/* Categories */}
        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
          {action.category.map((cat) => {
            const style = categoryStyle(cat);
            return (
              <Chip
                key={cat}
                label={categoryLabel(cat)}
                size="small"
                sx={{ fontSize: '0.72rem', height: 22, bgcolor: style.bg, color: style.text, fontWeight: 600, '& .MuiChip-label': { px: 1 } }}
              />
            );
          })}
        </Stack>

        {/* Description */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8rem' }}>
          {action.description}
        </Typography>

        {/* Stats row */}
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
          <Tooltip title="Time blocks required">
            <Chip
              label={`⏱ ${action.minTimeBlocks}${action.maxTimeBlocks && action.maxTimeBlocks !== action.minTimeBlocks ? `–${action.maxTimeBlocks}` : ''} TB`}
              size="small" variant="outlined" sx={{ fontSize: '0.7rem' }}
            />
          </Tooltip>
          {action.calculatedCost > 0 && (
            <Tooltip title="Estimated cost">
              <Chip label={`💰 ${fmt(action.calculatedCost)}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            </Tooltip>
          )}
          {action.calculatedLemons > 0 && (
            <Tooltip title="Lemons earned for the pitcher">
              <Chip label={`🍋 +${action.calculatedLemons}`} size="small" sx={{ fontSize: '0.7rem', bgcolor: '#fff9c4' }} />
            </Tooltip>
          )}
          {healthDelta !== 0 && (
            <Tooltip title={healthDelta > 0 ? 'Health gain' : 'Health loss'}>
              <Chip
                label={`❤️ ${healthDelta > 0 ? '+' : ''}${healthDelta}%`}
                size="small"
                sx={{ fontSize: '0.7rem', bgcolor: healthDelta > 0 ? '#e8f5e9' : '#ffebee', color: healthDelta > 0 ? 'success.dark' : 'error.dark' }}
              />
            </Tooltip>
          )}
          {stressDelta !== 0 && (
            <Tooltip title={stressDelta < 0 ? 'Stress reduction' : 'Stress increase'}>
              <Chip
                label={`😰 ${stressDelta > 0 ? '+' : ''}${stressDelta}%`}
                size="small"
                sx={{ fontSize: '0.7rem', bgcolor: stressDelta < 0 ? '#e8f5e9' : '#fff3e0', color: stressDelta < 0 ? 'success.dark' : 'warning.dark' }}
              />
            </Tooltip>
          )}
        </Stack>

        {/* Eligibility reasons */}
        {!action.eligible && action.eligibilityReasons.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {action.eligibilityReasons.slice(0, 2).map((r, i) => (
              <Typography key={i} variant="caption" color="error.main" display="block" sx={{ fontSize: '0.7rem' }}>• {r}</Typography>
            ))}
            {action.eligibilityReasons.length > 2 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>+{action.eligibilityReasons.length - 2} more…</Typography>
            )}
          </Box>
        )}

        {/* ── Time block selector (when NOT in cart) ──────────────────────── */}
        {!inCart && (
          <Box sx={{ mt: 1, p: 1.25, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1.5 }}>
            {/* Required-PTO action with no PTO available — whole selector disabled */}
            {requiresPTO && ptoDisabled && (
              <Typography variant="caption" color="error.main" sx={{ display: 'block', fontWeight: 600 }}>
                🏖️ Requires PTO — {ptoDisabledReason}
              </Typography>
            )}

            {!(requiresPTO && ptoDisabled) && isVariable ? (
              /* Variable-block: total slider + PTO split */
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Total blocks</Typography>
                  <Typography variant="caption" fontWeight={700}>{totalBlocks}</Typography>
                </Stack>
                <Slider
                  value={totalBlocks}
                  min={minBlocks}
                  max={maxBlocks}
                  step={increment}
                  onChange={handleTotalChange}
                  size="small"
                  marks
                  sx={{ mt: 0, mb: 1 }}
                />
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      ⏱ {activitySplit} activity
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mx: 0.75 }}>+</Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        color: requiresPTO ? 'warning.dark' : ptoDisabled ? 'text.disabled' : 'primary.main',
                        fontWeight: 600,
                      }}
                    >
                      🏖️ {ptoSplit} PTO
                    </Typography>
                  </Box>
                  {!requiresPTO && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconButton
                        size="small"
                        onClick={() => adjustPto(-1)}
                        disabled={ptoSplit <= 0}
                        sx={{ p: 0.25 }}
                      >
                        <RemoveIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 24, textAlign: 'center' }}>
                        PTO
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => adjustPto(1)}
                        disabled={ptoDisabled || ptoSplit >= totalBlocks || ptoSplit >= availablePTO}
                        sx={{ p: 0.25 }}
                      >
                        <AddIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>
                {/* Inline red reason when PTO +/− is disabled */}
                {ptoDisabled && !requiresPTO && (
                  <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                    🏖️ PTO unavailable — {ptoDisabledReason}
                  </Typography>
                )}
              </>
            ) : !(requiresPTO && ptoDisabled) ? (
              /* Fixed-block: radio Activity | PTO */
              <FormControl component="fieldset" disabled={!action.eligible}>
                <FormLabel component="legend" sx={{ fontSize: '0.7rem', mb: 0.25 }}>
                  Use {minBlocks} block{minBlocks !== 1 ? 's' : ''} from:
                </FormLabel>
                <RadioGroup
                  row
                  value={fixedMode}
                  onChange={(_, v) => setFixedMode(v as 'activity' | 'pto')}
                >
                  <FormControlLabel
                    value="activity"
                    control={<Radio size="small" sx={{ py: 0.25 }} />}
                    label={<Typography variant="caption">⏱ Activity TB</Typography>}
                    disabled={requiresPTO}
                  />
                  <FormControlLabel
                    value="pto"
                    control={<Radio size="small" sx={{ py: 0.25 }} />}
                    label={
                      <Typography variant="caption" sx={{ color: ptoDisabled ? 'text.disabled' : 'inherit' }}>
                        🏖️ PTO
                      </Typography>
                    }
                    disabled={ptoDisabled}
                  />
                </RadioGroup>
                {/* Inline red reason when PTO is disabled */}
                {ptoDisabled && (
                  <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.25 }}>
                    🏖️ PTO unavailable — {ptoDisabledReason}
                  </Typography>
                )}
                {/* Explain why Activity TB is not an option for required-PTO actions */}
                {requiresPTO && !ptoDisabled && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    This action requires PTO — activity blocks cannot be used.
                  </Typography>
                )}
              </FormControl>
            ) : null}
          </Box>
        )}

        {/* ── In-cart PTO split display + adjuster ───────────────────────── */}
        {inCart && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'primary.50', borderRadius: 1.5, border: '1px solid', borderColor: 'primary.light' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                ⏱ {displayTB} activity  +  🏖️ {displayPTO} PTO
                {' '}= {displayTB + displayPTO} total blocks
              </Typography>
              {!requiresPTO && onUpdateCartPto && (
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title={ptoDisabledReason ?? 'Use less PTO'}>
                    <span>
                      <IconButton size="small" onClick={() => handleCartPtoAdjust(-1)} disabled={displayPTO <= 0} sx={{ p: 0.25 }}>
                        <RemoveIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>PTO</Typography>
                  <Tooltip title={ptoDisabledReason ?? 'Use more PTO'}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleCartPtoAdjust(1)}
                        disabled={ptoDisabled || displayPTO >= displayTB + displayPTO || displayPTO >= availablePTO + displayPTO}
                        sx={{ p: 0.25 }}
                      >
                        <AddIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              )}
            </Stack>
          </Box>
        )}

        {/* Expandable: skill/trait gains */}
        {(skillGains.length > 0 || traitGains.length > 0) && (
          <Box sx={{ mt: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded((v) => !v)}>
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>Skill/Trait gains</Typography>
              <IconButton size="small" sx={{ p: 0, ml: 0.25 }}>
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Box>
            <Collapse in={expanded}>
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                {skillGains.map(({ key, val }) => (
                  <Chip key={key} label={`${key} +${val}`} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#e3f2fd' }} />
                ))}
                {traitGains.map(({ key, val }) => (
                  <Chip key={key} label={`${key} +${val}`} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#f3e5f5' }} />
                ))}
              </Stack>
            </Collapse>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0.5, pb: 1, px: 2, justifyContent: 'space-between' }}>
        <IconButton
          size="small"
          onClick={() => onToggleFavorite(action.id)}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          sx={{ color: isFavorite ? 'error.main' : 'text.disabled' }}
        >
          {isFavorite ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
        </IconButton>

        {inCart ? (
          <Button
            size="small" variant="outlined" color="error"
            onClick={() => onRemoveFromCart(action.id)}
            sx={{ fontSize: '0.7rem' }}
          >
            Remove ({displayTB + displayPTO} TB)
          </Button>
        ) : (
          <Button
            size="small"
            variant={action.eligible && !(requiresPTO && ptoDisabled) ? 'contained' : 'outlined'}
            color={action.eligible && !(requiresPTO && ptoDisabled) ? 'primary' : 'inherit'}
            disabled={!action.eligible || (requiresPTO && ptoDisabled)}
            onClick={handleAdd}
            startIcon={<AddShoppingCartIcon sx={{ fontSize: '0.9rem !important' }} />}
            sx={{ fontSize: '0.7rem' }}
          >
            Add to Cart
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
