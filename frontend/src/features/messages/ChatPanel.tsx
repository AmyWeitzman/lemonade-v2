/**
 * ChatPanel — "Lemon Tea" chat drawer accessible from all pages.
 *
 * Features:
 * - Scrollable message history with auto-scroll to bottom on new messages
 * - Load more (older) messages on scroll to top
 * - Player names color-coded by playerId hash
 * - System messages in gray italic
 * - "(Deceased)" tag next to deceased player names
 * - Emoji reaction picker (10 supported emojis) — click to toggle
 * - Reaction counts with reactor names on hover (Tooltip)
 * - Text input with 500 char limit and character counter
 * - Send on Enter (Shift+Enter for newline), send button
 * - Real-time via WebSocket (messageReceived, messageReactionUpdated)
 *
 * Requirements: Req 25
 */
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  KeyboardEvent,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  CircularProgress,
  Stack,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { io, Socket } from 'socket.io-client';
import type { RootState, AppDispatch } from '../../store';
import api from '../../lib/api';
import {
  setMessages,
  prependMessages,
  addMessage,
  updateReaction,
  setChatOpen,
} from './messagesSlice';
import { incrementUnreadMessages, clearUnreadMessages } from '../game/gameSlice';
import type { Message } from './types';
import { SUPPORTED_EMOJIS } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAWER_WIDTH = 360;
const MAX_CHARS = 500;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001';

// ─── Player color palette (MUI-compatible) ────────────────────────────────────

const PLAYER_COLORS = [
  '#1565C0', // blue[800]
  '#2E7D32', // green[800]
  '#6A1B9A', // purple[800]
  '#E65100', // orange[900]
  '#00695C', // teal[800]
  '#AD1457', // pink[800]
  '#4527A0', // deepPurple[800]
  '#558B2F', // lightGreen[800]
  '#00838F', // cyan[800]
  '#F57F17', // yellow[900]
];

function playerColor(playerId: string): string {
  if (!playerId) return '#757575';
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) >>> 0;
  }
  return PLAYER_COLORS[hash % PLAYER_COLORS.length];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  deceasedPlayerIds: Set<string>;
  onReact: (messageId: string, emoji: string) => void;
  currentPlayerId: string;
  playerNames: Record<string, string>; // playerId -> name (for reaction tooltips)
}

function MessageBubble({
  message,
  isOwn,
  deceasedPlayerIds,
  onReact,
  currentPlayerId,
  playerNames,
}: MessageBubbleProps) {
  const [showPicker, setShowPicker] = useState(false);

  const isDeceased = message.playerId && deceasedPlayerIds.has(message.playerId);

  if (message.isSystemMessage) {
    return (
      <Box sx={{ textAlign: 'center', my: 0.5, px: 2 }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontStyle: 'italic' }}
        >
          {message.content}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        mb: 1,
        px: 1.5,
      }}
    >
      {/* Sender name + time */}
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: playerColor(message.playerId),
          }}
        >
          {message.playerName}
        </Typography>
        {isDeceased && (
          <Typography
            variant="caption"
            sx={{ color: 'text.disabled', fontStyle: 'italic' }}
          >
            (Deceased)
          </Typography>
        )}
        <Typography variant="caption" color="text.disabled">
          {formatTime(message.timestamp)}
        </Typography>
      </Stack>

      {/* Bubble */}
      <Paper
        elevation={0}
        sx={{
          px: 1.5,
          py: 0.75,
          maxWidth: '85%',
          bgcolor: isOwn ? 'primary.main' : 'grey.100',
          color: isOwn ? 'primary.contrastText' : 'text.primary',
          borderRadius: isOwn
            ? '16px 16px 4px 16px'
            : '16px 16px 16px 4px',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        <Typography variant="body2">{message.content}</Typography>
      </Paper>

      {/* Reactions row */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
        {message.reactions.map((reaction) => {
          const hasReacted = reaction.playerIds.includes(currentPlayerId);
          const reactorNames = reaction.playerIds
            .map((pid) => playerNames[pid] ?? pid)
            .join(', ');

          return (
            <Tooltip
              key={reaction.emoji}
              title={reactorNames || reaction.emoji}
              placement="top"
              arrow
            >
              <Chip
                label={`${reaction.emoji} ${reaction.count}`}
                size="small"
                onClick={() => onReact(message.id, reaction.emoji)}
                sx={{
                  height: 22,
                  fontSize: 12,
                  cursor: 'pointer',
                  bgcolor: hasReacted ? 'primary.light' : 'grey.200',
                  color: hasReacted ? 'primary.contrastText' : 'text.primary',
                  '&:hover': { bgcolor: hasReacted ? 'primary.main' : 'grey.300' },
                  border: hasReacted ? '1px solid' : 'none',
                  borderColor: 'primary.main',
                }}
              />
            </Tooltip>
          );
        })}

        {/* Add reaction button */}
        <Tooltip title="Add reaction" placement="top">
          <Box sx={{ position: 'relative' }}>
            <IconButton
              size="small"
              onClick={() => setShowPicker((v) => !v)}
              sx={{ width: 22, height: 22, fontSize: 14, color: 'text.secondary' }}
              aria-label="add reaction"
            >
              😊
            </IconButton>

            {/* Emoji picker popover */}
            {showPicker && (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  bottom: '100%',
                  [isOwn ? 'right' : 'left']: 0,
                  zIndex: 1300,
                  p: 0.75,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.25,
                  width: 180,
                  borderRadius: 2,
                }}
                onMouseLeave={() => setShowPicker(false)}
              >
                {SUPPORTED_EMOJIS.map((emoji) => (
                  <IconButton
                    key={emoji}
                    size="small"
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowPicker(false);
                    }}
                    sx={{ fontSize: 18, width: 32, height: 32 }}
                    aria-label={`react with ${emoji}`}
                  >
                    {emoji}
                  </IconButton>
                ))}
              </Paper>
            )}
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

export default function ChatPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const { token, gameSessionId, playerId, playerName } = useSelector(
    (s: RootState) => s.auth,
  );
  const { chatOpen, messages, loaded, hasMore, page } = useSelector(
    (s: RootState) => s.messages,
  );
  // Deceased player ids from game state (players list)
  const gamePlayers = useSelector((s: RootState) =>
    'players' in s.game ? (s.game as { players?: { id: string; isAlive: boolean; name: string }[] }).players ?? [] : [],
  );

  const deceasedPlayerIds = new Set<string>(
    gamePlayers.filter((p) => !p.isAlive).map((p) => p.id),
  );

  // Build a playerId -> name map for reaction tooltips
  const playerNames: Record<string, string> = {};
  gamePlayers.forEach((p) => {
    playerNames[p.id] = p.name;
  });
  // Also include current player
  if (playerId && playerName) playerNames[playerId] = playerName;

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  // Track whether we should auto-scroll (true when near bottom)
  const shouldAutoScroll = useRef(true);

  // ── Load recent messages when panel opens ─────────────────────────────────
  useEffect(() => {
    if (!chatOpen || !gameSessionId || loaded) return;

    setInitialLoading(true);
    api
      .get<{ messages: Message[] }>(`/messages/${gameSessionId}/recent`)
      .then((res) => {
        dispatch(
          setMessages({
            messages: res.data.messages,
            hasMore: res.data.messages.length >= 50,
          }),
        );
      })
      .catch((err) => console.error('[chat] load recent error:', err))
      .finally(() => setInitialLoading(false));
  }, [chatOpen, gameSessionId, loaded, dispatch]);

  // ── Clear unread count when panel opens ───────────────────────────────────
  useEffect(() => {
    if (chatOpen) {
      dispatch(clearUnreadMessages());
    }
  }, [chatOpen, dispatch]);

  // ── Auto-scroll to bottom on new messages ─────────────────────────────────
  useEffect(() => {
    if (shouldAutoScroll.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // ── Socket setup ──────────────────────────────────────────────────────────
  const handleMessageReceived = useCallback(
    (payload: Message) => {
      dispatch(addMessage(payload));
      if (!chatOpen) {
        dispatch(incrementUnreadMessages());
      }
    },
    [dispatch, chatOpen],
  );

  const handleReactionUpdated = useCallback(
    (payload: { messageId: string; emoji: string; playerIds: string[]; count: number }) => {
      dispatch(updateReaction(payload));
    },
    [dispatch],
  );

  useEffect(() => {
    if (!token || !gameSessionId) return;

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.emit('joinGame', { gameSessionId });
    socket.on('messageReceived', handleMessageReceived);
    socket.on('messageReactionUpdated', handleReactionUpdated);

    return () => {
      socket.off('messageReceived', handleMessageReceived);
      socket.off('messageReactionUpdated', handleReactionUpdated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, gameSessionId, handleMessageReceived, handleReactionUpdated]);

  // ── Scroll handler: detect top for load-more ──────────────────────────────
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Near bottom → enable auto-scroll
    const distFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScroll.current = distFromBottom < 80;

    // Near top → load more
    if (container.scrollTop < 60 && hasMore && !loadingMore && gameSessionId) {
      setLoadingMore(true);
      const nextPage = page + 1;
      api
        .get<{ messages: Message[]; pagination: { totalPages: number } }>(
          `/messages/${gameSessionId}?page=${nextPage}&limit=20`,
        )
        .then((res) => {
          const { messages: older, pagination } = res.data;
          // Reverse because API returns desc order
          const chronological = [...older].reverse();
          dispatch(
            prependMessages({
              messages: chronological,
              hasMore: nextPage < pagination.totalPages,
            }),
          );
          // Restore scroll position after prepend
          const prevScrollHeight = container.scrollHeight;
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          });
        })
        .catch((err) => console.error('[chat] load more error:', err))
        .finally(() => setLoadingMore(false));
    }
  }, [hasMore, loadingMore, gameSessionId, page, dispatch]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || !gameSessionId || sending) return;

    setSending(true);
    try {
      // Use socket if connected, otherwise fall back to HTTP
      if (socketRef.current?.connected) {
        socketRef.current.emit('sendMessage', { gameSessionId, content });
        setInputValue('');
      } else {
        await api.post('/messages', { gameSessionId, content });
        setInputValue('');
      }
    } catch (err) {
      console.error('[chat] send error:', err);
    } finally {
      setSending(false);
    }
  }, [inputValue, gameSessionId, sending]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── React to message ──────────────────────────────────────────────────────
  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      if (!socketRef.current?.connected) {
        // Fall back to HTTP
        api
          .post(`/messages/${messageId}/react`, { emoji })
          .catch((err) => console.error('[chat] react error:', err));
        return;
      }
      socketRef.current.emit('reactToMessage', { messageId, emoji });
    },
    [],
  );

  const charCount = inputValue.length;
  const charCountColor =
    charCount > 450 ? 'error' : charCount > 400 ? 'warning.main' : 'text.disabled';

  return (
    <Drawer
      anchor="right"
      open={chatOpen}
      onClose={() => dispatch(setChatOpen(false))}
      variant="temporary"
      ModalProps={{ keepMounted: true }}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 2,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          🍵 Lemon Tea
        </Typography>
        <IconButton
          size="small"
          onClick={() => dispatch(setChatOpen(false))}
          sx={{ color: 'inherit' }}
          aria-label="close chat"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Messages area */}
      <Box
        ref={messagesContainerRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Load more indicator */}
        {loadingMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <CircularProgress size={20} />
          </Box>
        )}

        {/* Load more hint */}
        {hasMore && !loadingMore && (
          <Box sx={{ textAlign: 'center', py: 0.5 }}>
            <Typography variant="caption" color="text.disabled">
              Scroll up to load older messages
            </Typography>
          </Box>
        )}

        {/* Initial loading */}
        {initialLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {/* Empty state */}
        {!initialLoading && loaded && messages.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No messages yet. Say hello! 🍋
            </Typography>
          </Box>
        )}

        {/* Message list */}
        {messages.map((msg, idx) => {
          const prevMsg = messages[idx - 1];
          const showDateDivider =
            !prevMsg ||
            new Date(msg.timestamp).toDateString() !==
              new Date(prevMsg.timestamp).toDateString();

          return (
            <Box key={msg.id}>
              {showDateDivider && (
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2, my: 1 }}>
                  <Divider sx={{ flex: 1 }} />
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ px: 1, whiteSpace: 'nowrap' }}
                  >
                    {new Date(msg.timestamp).toLocaleDateString()}
                  </Typography>
                  <Divider sx={{ flex: 1 }} />
                </Box>
              )}
              <MessageBubble
                message={msg}
                isOwn={msg.playerId === playerId}
                deceasedPlayerIds={deceasedPlayerIds}
                onReact={handleReact}
                currentPlayerId={playerId ?? ''}
                playerNames={playerNames}
              />
            </Box>
          );
        })}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          p: 1.5,
          flexShrink: 0,
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <TextField
            multiline
            maxRows={4}
            fullWidth
            size="small"
            placeholder="Type a message… (Enter to send)"
            value={inputValue}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setInputValue(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={sending || !gameSessionId}
            inputProps={{ 'aria-label': 'chat message input' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
          <IconButton
            color="primary"
            onClick={sendMessage}
            disabled={!inputValue.trim() || sending || !gameSessionId}
            aria-label="send message"
            sx={{ mb: 0.25 }}
          >
            {sending ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </Box>

        {/* Character counter */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: charCountColor }}>
            {charCount}/{MAX_CHARS}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
