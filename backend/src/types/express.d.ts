import { Player } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
      };
      player?: Player;
    }
  }
}

export {};
