/**
 * Messages Redux Slice — chat state for the Lemon Tea panel.
 * Requirements: Req 25
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Message, MessageReaction } from './types';

export interface MessagesState {
  messages: Message[];
  /** Whether the chat panel drawer is open */
  chatOpen: boolean;
  /** Whether we've loaded the initial batch */
  loaded: boolean;
  /** Whether there are older messages to load (pagination) */
  hasMore: boolean;
  /** Current page for pagination */
  page: number;
}

const initialState: MessagesState = {
  messages: [],
  chatOpen: false,
  loaded: false,
  hasMore: false,
  page: 1,
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    /** Replace all messages (initial load / recent fetch) */
    setMessages(state, action: PayloadAction<{ messages: Message[]; hasMore: boolean }>) {
      state.messages = action.payload.messages;
      state.hasMore = action.payload.hasMore;
      state.loaded = true;
      state.page = 1;
    },
    /** Prepend older messages (loaded on scroll-to-top) */
    prependMessages(state, action: PayloadAction<{ messages: Message[]; hasMore: boolean }>) {
      // Avoid duplicates by id
      const existingIds = new Set(state.messages.map((m) => m.id));
      const newOnes = action.payload.messages.filter((m) => !existingIds.has(m.id));
      state.messages = [...newOnes, ...state.messages];
      state.hasMore = action.payload.hasMore;
      state.page += 1;
    },
    /** Append a single new message received in real-time */
    addMessage(state, action: PayloadAction<Message>) {
      // Avoid duplicates
      if (!state.messages.find((m) => m.id === action.payload.id)) {
        state.messages.push(action.payload);
      }
    },
    /** Update reactions on a specific message */
    updateReaction(
      state,
      action: PayloadAction<{
        messageId: string;
        emoji: string;
        playerIds: string[];
        count: number;
      }>,
    ) {
      const msg = state.messages.find((m) => m.id === action.payload.messageId);
      if (!msg) return;

      const { emoji, playerIds, count } = action.payload;
      const existing = msg.reactions.find((r) => r.emoji === emoji);

      if (count === 0) {
        // Remove the reaction entry
        msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
      } else if (existing) {
        existing.playerIds = playerIds;
        existing.count = count;
      } else {
        msg.reactions.push({ emoji, playerIds, count } as MessageReaction);
      }
    },
    setChatOpen(state, action: PayloadAction<boolean>) {
      state.chatOpen = action.payload;
    },
    clearMessages(state) {
      state.messages = [];
      state.loaded = false;
      state.hasMore = false;
      state.page = 1;
    },
  },
});

export const {
  setMessages,
  prependMessages,
  addMessage,
  updateReaction,
  setChatOpen,
  clearMessages,
} = messagesSlice.actions;

export default messagesSlice.reducer;
