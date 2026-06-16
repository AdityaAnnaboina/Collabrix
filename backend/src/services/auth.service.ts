import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface UserPayload {
  id: string;
  email: string;
  name: string;
}

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(user: UserPayload): string {
    return jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      env.JWT_ACCESS_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );
  }

  static generateRefreshToken(user: UserPayload): string {
    return jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      env.JWT_REFRESH_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );
  }

  static verifyAccessToken(token: string): UserPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as UserPayload;
  }

  static verifyRefreshToken(token: string): UserPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as UserPayload;
  }
}
