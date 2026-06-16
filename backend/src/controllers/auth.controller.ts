import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { env } from '../config/env';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

export class AuthController {
  static async signup(req: Request, res: Response) {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.format() });
      }

      const { email, password, name } = parsed.data;

      const existingUser = await db.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const passwordHash = await AuthService.hashPassword(password);
      const user = await db.user.create({
        data: {
          email,
          passwordHash,
          name,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        },
      });

      const payload = { id: user.id, email: user.email, name: user.name };
      const accessToken = AuthService.generateAccessToken(payload);
      const refreshToken = AuthService.generateRefreshToken(payload);

      res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 mins
      res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

      logger.info('User registered successfully', { userId: user.id });

      return res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
        accessToken,
      });
    } catch (error) {
      logger.error('Signup error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.format() });
      }

      const { email, password } = parsed.data;

      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = await AuthService.comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const payload = { id: user.id, email: user.email, name: user.name };
      const accessToken = AuthService.generateAccessToken(payload);
      const refreshToken = AuthService.generateRefreshToken(payload);

      res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 mins
      res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

      logger.info('User logged in successfully', { userId: user.id });

      return res.status(200).json({
        user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
        accessToken,
      });
    } catch (error) {
      logger.error('Login error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    logger.info('User logged out');
    return res.status(200).json({ message: 'Logged out successfully' });
  }

  static async refresh(req: Request, res: Response) {
    try {
      let token = req.cookies.refreshToken;

      if (!token && req.body.refreshToken) {
        token = req.body.refreshToken;
      }

      if (!token) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      const decoded = AuthService.verifyRefreshToken(token);
      
      // Fetch latest user data in case name changed or account got deleted
      const user = await db.user.findUnique({ where: { id: decoded.id } });
      if (!user) {
        return res.status(401).json({ error: 'User no longer exists' });
      }

      const payload = { id: user.id, email: user.email, name: user.name };
      const newAccessToken = AuthService.generateAccessToken(payload);

      res.cookie('accessToken', newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });

      return res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
      logger.warn('Token refresh failed', { error });
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await db.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      logger.error('Get profile error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
