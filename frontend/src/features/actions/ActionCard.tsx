/**
 * ActionCard — displays a single action with eligibility, cost, effects, and add-to-cart.
 */
import { useState } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Chip, Stack,
  Tooltip, IconButton, Button, Collapse, Slider,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import type { ActionItem } from './types';

const CATEGORY_COLORS: Record<string, string> = {
  fitness: '#ef5350',
  social: '#42a5f5',
  education: '#7e57c2',
  creative: '#ec407a',
  travel: '#26a69a',
  family: '#ff7043',
  volunteer: '#66bb6a',
  finance: '#ffa726',
  wellness: '#26c6da',
  career: '#8d6e63',
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? '#78909c';
}

function fmt(n: number) {
  return '$' + n.toLocaleString();
}

interface Props {
  action: ActionItem;
  isFavorite: boolean;
  inCart: boolean;
  cartTimeBlocks?: number;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (action: ActionItem, timeBlocks: number) => void;
  onRemoveFromCart: (id: string) => void;
}

export default function ActionCard({
  action,
  isFavorite,
  inCart,
  cartTimeBlocks,
  onToggleFavorite,
  onAddToCart,
  onRemoveFromCart,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const isVariable = action.maxTimeBlocks !== null && action.maxTimeBlocks > action.minTimeBlocks;
  const increment = action.timeBlockIncrement ?? 1;
  const [selectedBlocks, setSelectedBlocks] = useState(action.minTimeBlocks || 1);

  const effects = action.effects as Record<string, unknown>;
  const isGoodDeed = effects.isGoodDeedOpportunity === true;
  const isExpress = action.executionType === 'express';

  // Compute display cost for selected blocks
  const displayCost = action.calculatedCost;
  const displayLemons = action.calculatedLemons;

  const healthDelta = (() => {
    let d = 0;
    if (typeof effects.health === 'number') d += effects.health;
    if (typeof effects.healthPerBlock === 'number') d += effects.healthPerBlock * selectedBlocks;
    return d;
  })();

  const stressDelta = (() => {
    let d = 0;
    if (typeof effects.stress === 'number') d += effects.stress;
    if (typeof effects.stressPerBlock === 'number') d += effects.stressPerBlock * selectedBlocks;
    return d;
  })();

  const skillGains = Object.entries(effects)
    .filter(([k]) => ['math','science','art','music','writing','analysis','homeRepair','technology'].includes(k))
    .map(([k, v]) => ({ key: k, val: v as number }));

  const traitGains = Object.entries(effects)
    .filter(([k]) => ['bravery','perseverance','charisma','compassion','creativity','organization','patience','caution','sociability','stressTolerance','goodWithKids','physicalAbility','communication'].includes(k))
    .map(([k, v]) => ({ key: k, val: v as number }));

  const handleAdd = () => {
    onAddToCart(action, selectedBlocks);
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
      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5, zIndex: 1 }}>
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
        {action.requiresPTO && (
          <Tooltip title="Requires PTO">
            <Chip label="🏖️ PTO" size="small" color="warning" sx={{ fontSize: '0.65rem', height: 20 }} />
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
            title={
              action.eligible
                ? 'You meet all requirements'
                : action.eligibilityReasons.join(' • ')
            }
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
          {action.category.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              size="small"
              sx={{ fontSize: '0.6rem', height: 18, bgcolor: categoryColor(cat), color: '#fff' }}
            />
          ))}
        </Stack>

        {/* Description */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8rem' }}>
          {action.description}
        </Typography>

        {/* Stats row */}
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
          {/* Time blocks */}
          <Tooltip title="Time blocks required">
            <Chip
              label={`⏱ ${action.minTimeBlocks}${action.maxTimeBlocks && action.maxTimeBlocks !== action.minTimeBlocks ? `–${action.maxTimeBlocks}` : ''} TB`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Tooltip>

          {/* Cost */}
          {displayCost > 0 && (
            <Tooltip title="Estimated cost">
              <Chip
                label={`💰 ${fmt(displayCost)}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}

          {/* Lemons */}
          {displayLemons > 0 && (
            <Tooltip title="Lemons earned for the pitcher">
              <Chip
                label={`🍋 +${displayLemons}`}
                size="small"
                sx={{ fontSize: '0.7rem', bgcolor: '#fff9c4' }}
              />
            </Tooltip>
          )}

          {/* Health */}
          {healthDelta !== 0 && (
            <Tooltip title={healthDelta > 0 ? 'Health gain' : 'Health loss'}>
              <Chip
                label={`❤️ ${healthDelta > 0 ? '+' : ''}${healthDelta}%`}
                size="small"
                sx={{
                  fontSize: '0.7rem',
                  bgcolor: healthDelta > 0 ? '#e8f5e9' : '#ffebee',
                  color: healthDelta > 0 ? 'success.dark' : 'error.dark',
                }}
              />
            </Tooltip>
          )}

          {/* Stress */}
          {stressDelta !== 0 && (
            <Tooltip title={stressDelta < 0 ? 'Stress reduction' : 'Stress increase'}>
              <Chip
                label={`😰 ${stressDelta > 0 ? '+' : ''}${stressDelta}%`}
                size="small"
                sx={{
                  fontSize: '0.7rem',
                  bgcolor: stressDelta < 0 ? '#e8f5e9' : '#fff3e0',
                  color: stressDelta < 0 ? 'success.dark' : 'warning.dark',
                }}
              />
            </Tooltip>
          )}
        </Stack>

        {/* Eligibility reasons */}
        {!action.eligible && action.eligibilityReasons.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {action.eligibilityReasons.slice(0, 2).map((r, i) => (
              <Typography key={i} variant="caption" color="error.main" display="block" sx={{ fontSize: '0.7rem' }}>
                • {r}
              </Typography>
            ))}
            {action.eligibilityReasons.length > 2 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                +{action.eligibilityReasons.length - 2} more…
              </Typography>
            )}
          </Box>
        )}

        {/* Variable time block slider */}
        {isVariable && (
          <Box sx={{ mt: 1, px: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Time blocks: <strong>{selectedBlocks}</strong>
            </Typography>
            <Slider
              value={selectedBlocks}
              min={action.minTimeBlocks}
              max={action.maxTimeBlocks!}
              step={increment}
              onChange={(_e, v) => setSelectedBlocks(v as number)}
              size="small"
              marks
              sx={{ mt: 0.5 }}
            />
          </Box>
        )}

        {/* Expandable: skill/trait gains */}
        {(skillGains.length > 0 || traitGains.length > 0) && (
          <Box>
            <Box
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mt: 0.5 }}
              onClick={() => setExpanded((v) => !v)}
            >
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                Skill/Trait gains
              </Typography>
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
        {/* Favorite toggle */}
        <IconButton
          size="small"
          onClick={() => onToggleFavorite(action.id)}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          sx={{ color: isFavorite ? 'error.main' : 'text.disabled' }}
        >
          {isFavorite ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
        </IconButton>

        {/* Cart button */}
        {inCart ? (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => onRemoveFromCart(action.id)}
            sx={{ fontSize: '0.7rem' }}
          >
            Remove ({cartTimeBlocks} TB)
          </Button>
        ) : (
          <Button
            size="small"
            variant={action.eligible ? 'contained' : 'outlined'}
            color={action.eligible ? 'primary' : 'inherit'}
            disabled={!action.eligible}
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
