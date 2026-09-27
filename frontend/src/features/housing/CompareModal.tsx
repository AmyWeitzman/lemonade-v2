/**
 * CompareModal — side-by-side housing comparison (up to 3 on desktop, 1 at a time on mobile).
 * Requirements: Req 12, Req 36
 */
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Stack, Chip, Divider, IconButton,
  useMediaQuery, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import type { HousingItem } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '$' + n.toLocaleString();
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    parent: '👨‍👩‍👧 Parents',
    dorm: '🏫 Dorm',
    apartment: '🏢 Apartment',
    house: '🏡 House',
  };
  return labels[type] ?? type;
}

// ─── Row helper ───────────────────────────────────────────────────────────────

interface RowProps {
  label: string;
  values: (string | number | null | undefined)[];
  highlight?: boolean;
}

function CompareRow({ label, values, highlight }: RowProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `140px repeat(${values.length}, 1fr)`,
        gap: 1,
        py: 0.75,
        px: 1,
        bgcolor: highlight ? 'action.hover' : 'transparent',
        borderRadius: 1,
        alignItems: 'center',
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
        {label}
      </Typography>
      {values.map((v, i) => (
        <Typography key={i} variant="caption" sx={{ fontSize: '0.75rem', textAlign: 'center' }}>
          {v ?? '—'}
        </Typography>
      ))}
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  housing: HousingItem[];
  onClose: () => void;
  onSelect: (housing: HousingItem) => void;
  onRemove: (id: string) => void;
}

export default function CompareModal({ open, housing, onClose, onSelect, onRemove }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // On mobile, show only the first item
  const displayHousing = isMobile ? housing.slice(0, 1) : housing;

  if (housing.length === 0) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>
            🏠 Compare Housing
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Close compare">
            <CloseIcon />
          </IconButton>
        </Stack>
        {isMobile && housing.length > 1 && (
          <Typography variant="caption" color="text.secondary">
            Showing 1 of {housing.length} selected (desktop shows all side-by-side)
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Header row — housing names */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `140px repeat(${displayHousing.length}, 1fr)`,
            gap: 1,
            p: 2,
            pb: 1,
            bgcolor: 'grey.50',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box />
          {displayHousing.map((h) => (
            <Box key={h.id} sx={{ textAlign: 'center', position: 'relative' }}>
              <IconButton
                size="small"
                onClick={() => onRemove(h.id)}
                sx={{ position: 'absolute', top: -8, right: -8 }}
                aria-label={`Remove ${h.name} from compare`}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                {h.name}
              </Typography>
              <Chip
                label={typeLabel(h.type)}
                size="small"
                sx={{ fontSize: '0.6rem', height: 18, mt: 0.25 }}
              />
              {h.isCurrentHome && (
                <Chip
                  label="Current"
                  size="small"
                  color="success"
                  sx={{ fontSize: '0.6rem', height: 18, mt: 0.25, ml: 0.5 }}
                />
              )}
            </Box>
          ))}
        </Box>

        {/* Comparison rows */}
        <Box sx={{ p: 1 }}>
          {/* Eligibility */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `140px repeat(${displayHousing.length}, 1fr)`,
              gap: 1,
              py: 0.75,
              px: 1,
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
              Eligible
            </Typography>
            {displayHousing.map((h) => (
              <Box key={h.id} sx={{ textAlign: 'center' }}>
                {h.eligible || h.isCurrentHome ? (
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <BlockIcon sx={{ fontSize: 16, color: 'error.main' }} />
                )}
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 0.5 }} />

          {/* Costs */}
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 1, display: 'block', mb: 0.5, mt: 1 }}>
            COSTS
          </Typography>

          <CompareRow
            label="Type"
            values={displayHousing.map((h) => (h.isRental ? '🔑 Rental' : '🏦 Purchase'))}
          />
          <CompareRow
            label="Rent / Year"
            values={displayHousing.map((h) => (h.isRental ? fmt(h.rentPerYear ?? 0) : '—'))}
            highlight
          />
          <CompareRow
            label="Purchase Price"
            values={displayHousing.map((h) => (!h.isRental ? fmt(h.purchasePrice ?? 0) : '—'))}
          />
          <CompareRow
            label="Utilities Base"
            values={displayHousing.map((h) => fmt(h.utilitiesBase))}
            highlight
          />
          <CompareRow
            label="Utilities / Person"
            values={displayHousing.map((h) => fmt(h.utilitiesPerPerson))}
          />
          <CompareRow
            label="Insurance / Year"
            values={displayHousing.map((h) =>
              h.insurancePerYear ? fmt(h.insurancePerYear) : '—'
            )}
            highlight
          />
          <CompareRow
            label="Est. Annual Cost"
            values={displayHousing.map((h) => fmt(h.estimatedAnnualCost))}
          />

          <Divider sx={{ my: 0.5 }} />

          {/* Occupancy */}
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 1, display: 'block', mb: 0.5, mt: 1 }}>
            OCCUPANCY
          </Typography>

          <CompareRow
            label="Recommended"
            values={displayHousing.map((h) => `${h.recommendedOccupancy} people`)}
            highlight
          />
          <CompareRow
            label="Max Occupancy"
            values={displayHousing.map((h) => `${h.maxOccupancy} people`)}
          />
          <CompareRow
            label="Max Kids"
            values={displayHousing.map((h) =>
              h.maxKids === -1 ? 'No limit' : h.maxKids === 0 ? 'None' : String(h.maxKids)
            )}
            highlight
          />
          <CompareRow
            label="Large Pets"
            values={displayHousing.map((h) => String(h.petLimitLarge))}
          />
          <CompareRow
            label="Small Pets"
            values={displayHousing.map((h) => String(h.petLimitSmall))}
            highlight
          />

          <Divider sx={{ my: 0.5 }} />

          {/* Improvements */}
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 1, display: 'block', mb: 0.5, mt: 1 }}>
            IMPROVEMENTS
          </Typography>

          <CompareRow
            label="Remodel"
            values={displayHousing.map((h) => (h.allowsRemodeling ? '✅' : '❌'))}
            highlight
          />
          <CompareRow
            label="Pool"
            values={displayHousing.map((h) => (h.allowsPool ? '✅' : '❌'))}
          />
          <CompareRow
            label="Solar Panels"
            values={displayHousing.map((h) => (h.allowsSolarPanels ? '✅' : '❌'))}
            highlight
          />

          {/* Restrictions */}
          {displayHousing.some((h) => h.ageLimit || h.requiresEnrollment) && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 1, display: 'block', mb: 0.5, mt: 1 }}>
                RESTRICTIONS
              </Typography>
              <CompareRow
                label="Age Limit"
                values={displayHousing.map((h) => (h.ageLimit ? `≤ ${h.ageLimit}` : '—'))}
                highlight
              />
              <CompareRow
                label="Enrollment Req."
                values={displayHousing.map((h) => (h.requiresEnrollment ? '✅ Required' : '—'))}
              />
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose} size="small">
          Close
        </Button>
        {displayHousing
          .filter((h) => h.eligible && !h.isCurrentHome)
          .map((h) => (
            <Button
              key={h.id}
              size="small"
              variant="contained"
              onClick={() => {
                onSelect(h);
                onClose();
              }}
            >
              {h.isRental ? 'Rent' : 'Buy'} {h.name}
            </Button>
          ))}
      </DialogActions>
    </Dialog>
  );
}
