import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function validatePlayerAlive(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const gameSessionId =
    (req.params.gameSessionId as string | undefined) ??
    (req.body?.gameSessionId as string | undefined);

  if (!gameSessionId) {
    res.status(400).json({ error: 'gameSessionId is required' });
    return;
  }

  const player = await prisma.player.findUnique({
    where: {
      userId_gameSessionId: {
        userId: req.user.userId,
        gameSessionId,
      },
    },
  });

  if (!player) {
    res.status(403).json({ error: 'Player not found in this game session' });
    return;
  }

  if (!player.isAlive) {
    res.status(403).json({ error: 'Player is no longer alive' });
    return;
  }

  req.player = player;
  next();
}
