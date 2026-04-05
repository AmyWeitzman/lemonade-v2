/**
 * Messaging utilities — system message helper.
 * Import sendSystemMessage wherever automated events need to post to chat.
 */

import { prisma } from './prisma';
import { getIO } from '../socket';

/**
 * Create a system message for a game session and broadcast it via socket.
 * System messages have isSystemMessage=true and no playerId.
 */
export async function sendSystemMessage(
  gameSessionId: string,
  content: string,
): Promise<void> {
  // Sanitize content
  const sanitized = stripHtml(content).trim().slice(0, 500);
  if (!sanitized) return;

  const message = await prisma.message.create({
    data: {
      gameSessionId,
      playerId: null,
      playerName: 'System',
      content: sanitized,
      isSystemMessage: true,
      reactions: [],
    },
  });

  try {
    const io = getIO();
    io.to(`game:${gameSessionId}`).emit('messageReceived', {
      id: message.id,
      gameSessionId: message.gameSessionId,
      playerId: message.playerId ?? '',
      playerName: message.playerName,
      content: message.content,
      timestamp: message.createdAt.toISOString(),
      reactions: [],
      isSystemMessage: true,
    });
  } catch {
    // Socket may not be initialized in tests — non-fatal
  }
}

/**
 * Strip HTML tags from a string.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}
