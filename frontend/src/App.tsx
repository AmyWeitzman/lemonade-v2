import { Routes, Route } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';

function HomePage() {
  return (
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          🍋 Lemonade
        </Typography>
        <Typography variant="h5" color="text.secondary">
          A multiplayer life simulation game
        </Typography>
      </Box>
    </Container>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}
