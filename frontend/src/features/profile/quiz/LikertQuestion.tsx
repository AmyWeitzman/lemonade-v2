/**
 * LikertQuestion — renders a single quiz question row with five selectable
 * Likert-scale option buttons (1 = Strongly Disagree … 5 = Strongly Agree).
 *
 * Container background: background.default + primary.light overlay = matches page.
 * Button background (unselected): background.paper (white) with blue text.
 * Button background (selected): primary.main (blue) with white text.
 */
import { Box, Button, Typography } from '@mui/material';

export const LIKERT_LABELS: Record<number, string> = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Neutral',
  4: 'Agree',
  5: 'Strongly Agree',
};

interface LikertQuestionProps {
  questionKey: string;
  prompt: string;
  selectedValue: number | undefined;
  onSelect: (key: string, value: number) => void;
  disabledOptions: Set<number>;
  hasError: boolean;
}

export default function LikertQuestion({
  questionKey,
  prompt,
  selectedValue,
  onSelect,
  disabledOptions,
  hasError,
}: LikertQuestionProps) {
  const showError = hasError && selectedValue === undefined;

  return (
    <Box
      sx={{
        mb: 1.5,
        borderRadius: 1,
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* primary.light overlay — together with background.default matches the page */}
      <Box
        sx={{
          bgcolor: showError ? 'error.light' : 'primary.light',
          p: 1.5,
        }}
      >
        {/* Skill/trait name */}
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ mb: 1.25, color: showError ? 'error.main' : 'text.primary', fontSize: '1.15rem' }}
        >
          {prompt}
        </Typography>

        {/* Likert buttons — equal width, fill container */}
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {([1, 2, 3, 4, 5] as const).map((value) => {
            const isSelected = selectedValue === value;
            const isDisabled = disabledOptions.has(value);

            return (
              <Button
                key={value}
                variant={isSelected ? 'contained' : 'outlined'}
                disabled={isDisabled}
                aria-label={`${value} - ${LIKERT_LABELS[value]}`}
                onClick={() => onSelect(questionKey, value)}
                sx={{
                  flex: 1,
                  flexDirection: 'column',
                  py: 1,
                  px: 0.25,
                  minWidth: 0,
                  gap: 0.25,
                  ...(isSelected
                    ? {}
                    : {
                        color: 'primary.main',
                        borderColor: 'primary.main',
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main' },
                      }),
                  ...(showError && !isSelected && !isDisabled
                    ? { borderColor: 'error.main', color: 'error.main' }
                    : {}),
                }}
              >
                <Typography
                  component="span"
                  sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.2, textTransform: 'none', whiteSpace: 'normal', textAlign: 'center' }}
                >
                  {LIKERT_LABELS[value]}
                </Typography>
                <Typography
                  component="span"
                  sx={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1, textTransform: 'none' }}
                >
                  {value}
                </Typography>
              </Button>
            );
          })}
        </Box>

        {showError && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
            Please select an option.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
