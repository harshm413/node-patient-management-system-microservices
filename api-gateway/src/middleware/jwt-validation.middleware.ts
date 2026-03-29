import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4005';

export async function jwtValidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).end();
    return;
  }

  try {
    await axios.get(`${AUTH_SERVICE_URL}/validate`, {
      headers: { Authorization: authHeader },
    });
    next();
  } catch {
    res.status(401).end();
  }
}
