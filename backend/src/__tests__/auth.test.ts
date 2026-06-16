import request from 'supertest';
import app from '../server';
import { db } from '../config/db';
import { AuthService } from '../services/auth.service';

// Mock the Prisma DB client
jest.mock('../config/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Authentication API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('should successfully register a new user', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@meethub.com',
        name: 'Test User',
        passwordHash: 'hashedpassword',
        avatarUrl: 'https://avatar.url',
      };

      (db.user.findUnique as any).mockResolvedValue(null);
      (db.user.create as any).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@meethub.com',
          password: 'securePassword123',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@meethub.com');
      expect(response.body).toHaveProperty('accessToken');
    });

    it('should return 400 validation error if parameters are missing', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'not-an-email',
          password: '123', // less than 6 characters
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login and issue tokens', async () => {
      const hash = await AuthService.hashPassword('myPassword');
      const mockUser = {
        id: 'user-id-123',
        email: 'test@meethub.com',
        name: 'Test User',
        passwordHash: hash,
        avatarUrl: 'https://avatar.url',
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@meethub.com',
          password: 'myPassword',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe('test@meethub.com');
    });

    it('should reject login for wrong credentials', async () => {
      (db.user.findUnique as any).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@meethub.com',
          password: 'wrongPassword',
        });

      expect(response.status).toBe(401);
    });
  });
});
