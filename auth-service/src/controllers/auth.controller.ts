import { Router, Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';

const router = Router();

interface LoginRequestDTO {
  email: string;
  password: string;
}

/**
 * @openapi
 * /login:
 *   post:
 *     summary: Generate token on user login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as LoginRequestDTO;
    const token = await authService.authenticate({ email, password });

    if (!token) {
      res.status(401).send();
      return;
    }

    res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /validate:
 *   get:
 *     summary: Validate Token
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Unauthorized
 */
router.get('/validate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).send();
      return;
    }

    const token = authHeader.substring(7);
    const isValid = authService.validateToken(token);

    if (isValid) {
      res.status(200).send();
    } else {
      res.status(401).send();
    }
  } catch (err) {
    next(err);
  }
});

export default router;
