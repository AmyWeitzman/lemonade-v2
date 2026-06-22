import { Box, Typography } from '@mui/material';

export default function HomePage() {
  return (
    <Box sx={{ p: 3, textAlign: 'center', minHeight: '100vh', bgcolor: (t) => t.palette.primary.light }}>
      <Typography variant="h4" gutterBottom>🍋 Lemonade</Typography>
    </Box>
  );
}
