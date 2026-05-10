/**
 * TraitSliderRow — memoized slider row for a single trait adjustment.
 * Shows the rolled base value, current adjusted value, and delta.
 */
import { memo, useState } from 'react';
import { Box, Slider, Typography } from '@mui/material';

interface TraitSliderRowProps {
  statKey: string;
  label: string;
  base: number;
  delta: number;
  sliderMin: number;
  sliderMax: number;
  onChange: (key: string, newDelta: number) => void;
}

const TraitSliderRow = memo(function TraitSliderRow({
  statKey,
  label,
  base,
  delta,
  sliderMin,
  sliderMax,
  onChange,
}: TraitSliderRowProps) {
  const [displayCurrent, setDisplayCurrent] = useState(
    Math.max(0, Math.min(100, base + delta)),
  );

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
        {label}
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <Slider
          defaultValue={Math.max(0, Math.min(100, base + delta))}
          min={sliderMin}
          max={sliderMax}
          step={1}
          marks={[
            { value: sliderMin, label: `min ${sliderMin}%` },
            { value: sliderMax, label: `max ${sliderMax}%` },
          ]}
          onChange={(_e, v) => setDisplayCurrent(v as number)}
          onChangeCommitted={(_e, v) => onChange(statKey, (v as number) - base)}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${v}%`}
          sx={{
            color: 'primary.main',
            '& .MuiSlider-thumb': { width: 16, height: 16 },
            '& .MuiSlider-track': { height: 6 },
            '& .MuiSlider-rail': { height: 6 },
            '& .MuiSlider-markLabel': { fontSize: '1rem', color: 'text.secondary' },
            '& .MuiSlider-markLabel[data-index="0"]': { transform: 'translateX(0%)' },
            '& .MuiSlider-markLabel[data-index="1"]': { transform: 'translateX(-100%)' },
          }}
        />
        <Typography
          variant="body1"
          fontWeight={700}
          sx={{
            position: 'absolute',
            bottom: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            color: 'text.primary',
            pointerEvents: 'none',
          }}
        >
          {displayCurrent === base ? (
            `${base}%`
          ) : (
            <>
              {base}%{' '}
              <span style={{ color: displayCurrent > base ? '#4caf50' : '#f44336' }}>
                {displayCurrent > base
                  ? `+ ${displayCurrent - base}%`
                  : `− ${base - displayCurrent}%`}
              </span>
              {' = '}
              {displayCurrent}%
            </>
          )}
        </Typography>
      </Box>
    </Box>
  );
});

export default TraitSliderRow;
