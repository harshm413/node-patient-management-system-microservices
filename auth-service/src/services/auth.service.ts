import bcrypt from 'bcryptjs';
import userService from './user.service';
import { jwtUtil } from '../utils/jwt.util';

interface LoginRequestDTO {
  email: string;
  password: string;
}

class AuthService {
  async authenticate(dto: LoginRequestDTO): Promise<string | null> {
    const user = await userService.findByEmail(dto.email);
    if (!user) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      return null;
    }

    return jwtUtil.generateToken(user.email, user.role);
  }

  validateToken(token: string): boolean {
    try {
      jwtUtil.validateToken(token);
      return true;
    } catch {
      return false;
    }
  }
}

export default new AuthService();
