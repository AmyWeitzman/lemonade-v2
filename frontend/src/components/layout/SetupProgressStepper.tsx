/**
 * SetupProgressStepper — horizontal MUI Stepper displayed during the profile
 * setup workflow. Shows a single step (Profile Setup) with a checkmark once visited.
 */
import { Box, Paper, Stepper, Step, StepButton, StepLabel } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';

const STEP_LABELS = ['Profile Setup'];

export interface SetupProgressStepperProps {
  activeStep: number;
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
                  icon={isVisited ? <CheckIcon fontSize="small" /> : undefined}
                >
                  <StepLabel>{label}</StepLabel>
                </StepButton>
              </Step>
            );
          })}
        </Stepper>
      </Box>
    </Paper>
  );
}
