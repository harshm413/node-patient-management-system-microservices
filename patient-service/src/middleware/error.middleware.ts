import { Request, Response, NextFunction } from 'express';
import { EmailAlreadyExistsException, PatientNotFoundException } from '../errors/errors';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof EmailAlreadyExistsException) {
    console.warn(`Email address already exist ${err.message}`);
    res.status(400).json({ message: 'Email address already exists' });
    return;
  }

  if (err instanceof PatientNotFoundException) {
    console.warn(`Patient not found ${err.message}`);
    res.status(400).json({ message: 'Patient not found' });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
}
