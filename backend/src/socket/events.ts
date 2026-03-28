/**
 * Typed Socket.IO event definitions for the Lemonade game.
 * Import these interfaces on both server and (eventually) client for type safety.
 */

// ─── Shared Payload Types ─────────────────────────────────────────────────────

export interface PlayerSummary {
  id: string;
  name: string;
  age: number;
  isAlive: boolean;
  yearComplete: boolean;
}

export interface PitcherState {
  currentLemons: number;
  yearlyGoal: number;
  graceYearUsed: boolean;
  contributionsByPlayer: Record<string, number>;
}

export interface NotificationPayload {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: string;
  title: string;
  message: string;
  persistent: boolean;
  actionRequired: boolean;
  actionUrl?: string;
}

export interface CardDrawnPayload {
  cardId: string;
  cardName: string;
  cardType: 'good' | 'bad';
  description: string;
  effects: {
    cost?: number;
    healthTemporary?: number;
    healthPermanent?: number;
    stress?: number;
    lemons?: number;
  };
  isGoodDeedOpportunity: boolean;
  goodDeedLemonReward?: number;
}

export interface GoodDeedOpportunityPayload {
  cardId: string;
  cardEventId: string;
  sourcePlayerName: string;
  lemonReward: number;
  description: string;
}

export interface MessagePayload {
  id: string;
  gameSessionId: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: string;
  isSystemMessage: boolean;
  reactions: { emoji: string; playerIds: string[]; count: number }[];
}

export interface MessageReactionPayload {
  messageId: string;
  emoji: string;
  playerIds: string[];
  count: number;
}

export interface PlayerState {
  money: number;
  projectedIncome: number;
  health: number;
  maxHealth: number;
  stress: number;
  age: number;
  isAlive: boolean;
  isRetired: boolean;
  yearComplete: boolean;
  totalLemonsEarned: number;
}

// ─── Server → Client Event Payload Interfaces ─────────────────────────────────

export interface PlayerJoinedEvent {
  playerId: string;
  playerName: string;
  gameSessionId: string;
}

export interface PlayerLeftEvent {
  playerId: string;
  playerName: string;
  gameSessionId: string;
}

export interface YearStartedEvent {
  year: number;
  gameSessionId: string;
  playerAges: Record<string, number>;
}

export interface LemonAddedEvent {
  playerId: string;
  lemonsAdded: number;
  totalLemons: number;
  pitcherGoal: number;
}

export interface PitcherUpdatedEvent {
  currentLemons: number;
  yearlyGoal: number;
  graceYearUsed: boolean;
  contributionsByPlayer: Record<string, number>;
}

export interface CardDrawnEvent {
  playerId: string;
  card: {
    id: string;
    name: string;
    description: string;
    type: 'good' | 'bad';
    effects: Record<string, unknown>;
  };
}

export interface GoodDeedOpportunityEvent {
  fromPlayerId: string;
  cardId: string;
  lemonReward: number;
  expiresAt: string;
}

export interface NotificationEvent {
  id: string;
  playerId: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: string;
  title: string;
  message: string;
  persistent: boolean;
  actionRequired: boolean;
}

export interface PlayerStateChangedEvent {
  playerId: string;
  changes: Partial<PlayerState>;
}

export interface MessageReceivedEvent {
  id: string;
  gameSessionId: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: string;
  reactions: { emoji: string; playerIds: string[]; count: number }[];
  isSystemMessage: boolean;
}

export interface GameEndedEvent {
  reason: 'pitcher_failed' | 'all_deceased' | 'player_ended';
  finalStats: Record<string, unknown>;
}

export interface MessageReactionUpdatedEvent {
  messageId: string;
  emoji: string;
  playerIds: string[];
  count: number;
}

export interface PlayerDiedEvent {
  playerId: string;
  playerName: string;
  age: number;
}

// ─── Client → Server Events ───────────────────────────────────────────────────

export interface ClientToServerEvents {
  /** Join a game session room after authenticating */
  joinGame: (payload: { gameSessionId: string }) => void;
  /** Leave a game session room */
  leaveGame: (payload: { gameSessionId: string }) => void;
  /** Send a chat message */
  sendMessage: (payload: { gameSessionId: string; content: string }) => void;
  /** Respond to a good deed opportunity */
  respondToGoodDeed: (payload: { cardId: string; accepted: boolean }) => void;
  /** React to a chat message with an emoji */
  reactToMessage: (payload: { messageId: string; emoji: string }) => void;
}

// ─── Server → Client Events ───────────────────────────────────────────────────

export interface ServerToClientEvents {
  /** A new player joined the session */
  playerJoined: (payload: PlayerJoinedEvent) => void;
  /** A player left or disconnected from the session */
  playerLeft: (payload: PlayerLeftEvent) => void;
  /** All players finished the previous year; a new year has begun */
  yearStarted: (payload: YearStartedEvent) => void;
  /** A lemon was added to the pitcher */
  lemonAdded: (payload: LemonAddedEvent) => void;
  /** Pitcher goal or state changed */
  pitcherUpdated: (payload: PitcherUpdatedEvent) => void;
  /** A card was drawn for a player */
  cardDrawn: (payload: CardDrawnEvent) => void;
  /** Another player's card created a good deed opportunity */
  goodDeedOpportunity: (payload: GoodDeedOpportunityEvent) => void;
  /** General notification for this player */
  notification: (payload: NotificationEvent) => void;
  /** A player's state changed */
  playerStateChanged: (payload: PlayerStateChangedEvent) => void;
  /** A chat message was sent in this session */
  messageReceived: (payload: MessageReceivedEvent) => void;
  /** The game has ended */
  gameEnded: (payload: GameEndedEvent) => void;
  /** An emoji reaction was added or removed from a message */
  messageReactionUpdated: (payload: MessageReactionUpdatedEvent) => void;
  /** A player has died */
  playerDied: (payload: PlayerDiedEvent) => void;
}

// ─── Inter-server Events (for future Redis adapter / clustering) ──────────────

export interface InterServerEvents {
  ping: () => void;
}

// ─── Per-socket Data ──────────────────────────────────────────────────────────

export interface SocketData {
  userId: string;
  username: string;
  /** The game session room this socket is currently in (if any) */
  gameSessionId?: string;
  /** The player record id for the active session */
  playerId?: string;
  /** The player's display name */
  playerName?: string;
}

// ─── Emit Helpers ─────────────────────────────────────────────────────────────

import type { Server } from 'socket.io';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

type EventPayload<E extends keyof ServerToClientEvents> =
  ServerToClientEvents[E] extends (arg: infer P) => void ? P : never;

/** Emit an event to all sockets in a game session room */
export function emitToGame<E extends keyof ServerToClientEvents>(
  io: IO,
  gameSessionId: string,
  event: E,
  data: EventPayload<E>,
): void {
  (io.to(`game:${gameSessionId}`) as unknown as { emit: (ev: string, d: unknown) => void }).emit(
    event as string,
    data,
  );
}

/** Emit an event to a specific socket by socket ID */
export function emitToPlayer<E extends keyof ServerToClientEvents>(
  io: IO,
  socketId: string,
  event: E,
  data: EventPayload<E>,
): void {
  (io.to(socketId) as unknown as { emit: (ev: string, d: unknown) => void }).emit(
    event as string,
    data,
  );
}
