import { Box, CircularProgress, IconButton } from '@mui/material';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';

interface BookmarkToggleProps {
  itemId: string;
  itemName: string;
  type: 'job' | 'education';
  isBookmarked: boolean;
  onToggle: (itemId: string, type: 'job' | 'education') => void;
  loading?: boolean;
}

export default function BookmarkToggle({
  itemId,
  itemName,
  type,
  isBookmarked,
  onToggle,
  loading = false,
}: BookmarkToggleProps) {
  const ariaLabel = isBookmarked
    ? `Remove bookmark for ${itemName}`
    : `Bookmark ${itemName}`;

  return (
    <IconButton
      aria-label={ariaLabel}
      disabled={loading}
      onClick={() => onToggle(itemId, type)}
      size="small"
    >
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
          }}
        >
          <CircularProgress size={20} />
        </Box>
      ) : isBookmarked ? (
        <BookmarkIcon sx={{ color: '#F9A825' }} />
      ) : (
        <BookmarkBorderIcon />
      )}
    </IconButton>
  );
}
