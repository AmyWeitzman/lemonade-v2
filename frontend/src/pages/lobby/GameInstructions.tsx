import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const sections = [
  {
    title: '🎯 Objective',
    content:
      'Work together to fill the community Lemonade Pitcher with lemons before the game ends. Each player manages their own life — education, career, housing, family — while contributing lemons to the shared pitcher.',
  },
  {
    title: '📅 How a Year Works',
    content:
      'Each year you have 60 Time Blocks to spend. Sleep takes 20, your job takes its share, and the rest are yours for activities. Choose actions from the catalog to earn lemons, improve skills, and manage your health and stress.',
  },
  {
    title: '🍋 Earning Lemons',
    content:
      'Lemons are earned by completing actions. The more you do, the more you contribute to the pitcher. Good deeds multiply your lemon earnings — be kind to other players when they draw bad cards!',
  },
  {
    title: '❤️ Health & Stress',
    content:
      'Your health decreases with age and stress. High stress reduces health each year. Keep stress low by balancing work, family, and leisure. If health hits 0, your character passes away — but you can still watch and chat.',
  },
  {
    title: '💰 Finances',
    content:
      'Earn a salary from your job, pay taxes, housing, transportation, and other expenses each year. Take out loans if needed (8% interest). Save for retirement — withdrawals before 65 incur a 10% penalty.',
  },
  {
    title: '🎓 Education & Careers',
    content:
      'Enroll in education programs to unlock better jobs. Skills and traits affect what you qualify for. Jobs provide salary, PTO, and skill gains. You can hold multiple jobs if time blocks allow.',
  },
  {
    title: '🏠 Housing & Transport',
    content:
      'Choose housing based on your family size, budget, and location. Own or rent. Vehicles have annual costs — insurance, gas, maintenance. Bikes are cheap but restrict travel.',
  },
  {
    title: '👨‍👩‍👧 Family',
    content:
      'Get married, have children, adopt pets. Family adds joy (and stress). Children cost ~$11k/year. Pets need food and vet care. Marriage combines finances — divorce splits them.',
  },
];

export default function GameInstructions() {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          How to Play
        </Typography>
        <Chip label="Tutorial" size="small" color="primary" variant="outlined" />
      </Stack>

      {sections.map((s) => (
        <Accordion key={s.title} disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 0.5, borderRadius: '8px !important', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>{s.title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
              {s.content}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
