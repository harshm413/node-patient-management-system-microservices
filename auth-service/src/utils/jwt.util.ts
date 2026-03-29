import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'Y2hhVEc3aHJnb0hYTzMyZ2ZqVkpiZ1RkZG93YWxrUkM=';

export class JwtUtil {
  private readonly secret: Buffer;

  constructor(secret: string) {
    this.secret = Buffer.from(secret, 'base64');
  }

  generateToken(email: string, role: string): string {
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
      {
        sub: email,
        role,
        iat: now,
        exp: now + 60 * 60 * 10, // 10 hours
      },
      this.secret,
      { algorithm: 'HS256' }
    );
  }

  validateToken(token: string): void {
    try {
      jwt.verify(token, this.secret, { algorithms: ['HS256'] });
    } catch (err) {
      if (err instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid JWT');
      }
      throw err;
    }
  }
}

export const jwtUtil = new JwtUtil(JWT_SECRET);
