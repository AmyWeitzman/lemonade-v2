import { Box, Typography } from '@mui/material';

export default function HomePage() {
  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>🍋 Lemonade</Typography>
      <Typography color="text.secondary">Welcome to the game. More coming soon.</Typography>
    </Box>
  );
}
