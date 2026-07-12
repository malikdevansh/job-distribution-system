import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-default-secret';

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1] || '';

    jwt.verify(token, JWT_SECRET as string, (err, user) => {
      if (err) {
        return res.status(401).json({ error: 'Unauthorized', message: err.message });
      }

      req.user = user as any;
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
