import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_jwt_secret_change_in_production';

export function authorize(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    req.user = { userId: payload.userId, username: payload.username };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
