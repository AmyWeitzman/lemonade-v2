/**
 * SetupProgressStepper — horizontal MUI Stepper displayed during the profile
 * setup workflow. Shows three steps (Browse Jobs, Browse Education, Profile Setup),
 * marks visited steps with a checkmark, and allows clicking to navigate between steps.
 */
import { Box, Paper, Stepper, Step, StepButton, StepLabel } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';

const STEP_LABELS = ['Browse Jobs', 'Browse Education', 'Profile Setup'];

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
      elevation={0}
      sx={{
        px: 3,
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        borderRadius: 0,
      }}
    >
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <Stepper activeStep={activeStep} alternativeLabel={false}>
          {STEP_LABELS.map((label, index) => {
            const isVisited = visitedSteps.has(index);

            return (
              <Step key={label} completed={isVisited && index !== activeStep}>
                <StepButton
                  onClick={() => onStepClick(index)}
                  aria-label={`Go to step: ${label}`}
                  icon={
                    isVisited && index !== activeStep ? (
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
    </Paper>
  );
}
