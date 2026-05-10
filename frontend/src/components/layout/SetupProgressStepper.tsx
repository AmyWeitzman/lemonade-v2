/**
 * SetupProgressStepper — horizontal MUI Stepper displayed during the profile
 * setup workflow. Shows three steps (Browse Jobs, Browse Education, Profile Setup),
 * marks visited steps with a checkmark, allows clicking to navigate between steps,
 * and provides back/forward buttons for sequential navigation.
 */
import { Box, Paper, Stepper, Step, StepButton, StepLabel, Button } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const STEP_LABELS = ['Bookmark Jobs', 'Bookmark Education', 'Profile Setup'];
const MAX_STEP = STEP_LABELS.length - 1;

export interface SetupProgressStepperProps {
  activeStep: number; // 0 | 1 | 2
  visitedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

export default function SetupProgressStepper({
  activeStep,
  visitedSteps,
  onStepClick,
}: SetupProgressStepperProps) {
  return (
    <Paper
      elevation={1}
      sx={{
        px: 2,
        py: 2,
        borderBottom: 0,
        borderRadius: 0,
        bgcolor: (t) => t.palette.primary.main,
        color: '#212121',
      }}
    >
      <Box sx={{ maxWidth: 900, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, color: '#212121' }}>
        {/* Back button */}
        <Button
          variant="contained"
          size="small"
          disabled={activeStep <= 0}
          onClick={() => onStepClick(activeStep - 1)}
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: 'none', fontWeight: 600, px: 2, bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' }, '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.5)' } }}
          aria-label="Go to previous step"
        >
          Back
        </Button>

        {/* Stepper */}
        <Box>
          <Stepper
            activeStep={activeStep}
            nonLinear
            alternativeLabel={false}
            sx={{
              '& .MuiStepLabel-label': { color: 'rgba(33,33,33,0.7)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', '&.Mui-active': { color: '#212121', fontWeight: 700, textDecoration: 'underline' }, '&.Mui-completed': { color: 'rgba(33,33,33,0.85)' } },
              '& .MuiStepButton-root': { cursor: 'pointer' },
              '& .MuiStepIcon-root': { color: 'rgba(33,33,33,0.4)', '&.Mui-active': { color: '#212121' }, '&.Mui-completed': { color: 'rgba(33,33,33,0.85)' } },
              '& .MuiStepConnector-line': { borderColor: 'rgba(33,33,33,0.25)' },
              '& .MuiStepConnector-root': { maxWidth: 40 },
            }}
          >
            {STEP_LABELS.map((label, index) => {
              const isVisited = visitedSteps.has(index);
              return (
                <Step key={label} completed={isVisited}>
                  <StepButton
                    onClick={() => onStepClick(index)}
                    aria-label={`Go to step: ${label}`}
                    icon={
                      isVisited ? (
                        <CheckIcon fontSize="small" />
                      ) : undefined
                    }
                  >
                    <StepLabel>{label}</StepLabel>
                  </StepButton>
                </Step>
              );
            })}
          </Stepper>
        </Box>

        {/* Forward button */}
        <Button
          variant="contained"
          size="small"
          disabled={activeStep >= MAX_STEP}
          onClick={() => onStepClick(activeStep + 1)}
          endIcon={<ArrowForwardIcon />}
          sx={{ textTransform: 'none', fontWeight: 600, px: 2, bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' }, '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.5)' } }}
          aria-label="Go to next step"
        >
          Next
        </Button>
      </Box>
    </Paper>
  );
}
