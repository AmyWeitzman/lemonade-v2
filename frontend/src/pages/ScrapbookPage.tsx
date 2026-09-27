/**
 * ScrapbookPage — "Life's Lemons"
 *
 * Displays the player's life summary after death.
 * Includes a share button that copies a public shareable link to the clipboard.
 */
import { useState } from 'react';
import {
  Box, Typography, Button, Snackbar, Alert, Tooltip, Stack,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export default function ScrapbookPage() {
  const { playerId, playerName } = useSelector((s: RootState) => s.auth);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleShare = async () => {
    // Build a shareable URL pointing to this player's scrapbook
    // Anyone with the link can view it (read-only public view)
    const shareUrl = `${window.location.origin}/scrapbook/${playerId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setToast(`Link copied! Share it with anyone to show them ${playerName ?? 'your'} life story.`);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback: prompt the user to copy manually
      setToast(`Share this link: ${shareUrl}`);
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        minHeight: '100vh',
        bgcolor: (t) => t.palette.primary.light,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>📖 Life's Lemons</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {playerName ? `${playerName}'s life story` : 'Your life story'}
          </Typography>
        </Box>

        <Tooltip title="Copy a link so anyone can view this scrapbook">
          <Button
            variant="outlined"
            startIcon={copied ? <CheckIcon /> : <ShareIcon />}
            endIcon={!copied && <ContentCopyIcon sx={{ fontSize: '0.9rem !important' }} />}
            onClick={handleShare}
            color={copied ? 'success' : 'primary'}
            sx={{ fontWeight: 600 }}
          >
            {copied ? 'Copied!' : 'Share Scrapbook'}
          </Button>
        </Tooltip>
      </Stack>

      {/* Placeholder content — scrapbook features coming soon */}
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          bgcolor: 'rgba(255,255,255,0.5)',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          📖 Scrapbook coming soon
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your life story, achievements, and memories will appear here.
        </Typography>
      </Box>

      <Snackbar
        open={!!toast}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
