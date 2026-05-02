/**
 * Shared types for the Messaging (Lemon Tea) feature.
 * Requirements: Req 25
 */

export interface MessageReaction {
  emoji: string;
  playerIds: string[];
  count: number;
}

export interface Message {
  id: string;
  gameSessionId: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: string; // ISO string
  reactions: MessageReaction[];
  isSystemMessage: boolean;
}

export const SUPPORTED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🍋', '💪', '🤔', '👏'] as const;
export type SupportedEmoji = (typeof SUPPORTED_EMOJIS)[number];
