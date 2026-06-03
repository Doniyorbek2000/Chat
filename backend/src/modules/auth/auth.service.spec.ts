import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';


// ==================== MOCKS ====================

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
  decode: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'jwt.secret': 'test-jwt-secret-min-32-chars-long-xxx',
      'jwt.refreshSecret': 'test-refresh-secret-min-32-chars-xxx',
      'jwt.expiresIn': '15m',
      'jwt.refreshExpiresIn': '30d',
      'google.clientId': 'test-google-client-id',
      'google.clientSecret': 'test-google-client-secret',
    };
    return config[key];
  }),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
};

// ==================== FIXTURES ====================

const mockUser = {
  id: 'user-id-001',
  uid: 'VOXO12345678',
  phone: '+998901234567',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  role: 'USER',
  isBanned: false,
  isVerified: true,
  googleId: null,
  appleId: null,
  referralCode: 'VOXOABCDEF',
  deviceId: 'device-001',
  isOnline: false,
  lastSeen: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ==================== TESTS ====================

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'default_IORedisModuleConnectionToken', useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== TEST 1: Service Instantiation ====================
  describe('Service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ==================== TEST 2: sendOtp - Success ====================
  describe('sendOtp', () => {
    it('should send OTP successfully when no previous attempts', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.sendOtp('+998901234567');

      expect(result).toEqual({ message: 'OTP sent successfully' });
      expect(mockRedis.set).toHaveBeenCalledWith(
        'otp:+998901234567',
        expect.any(String),
        'EX',
        300,
      );
    });

    // ==================== TEST 3: sendOtp - Rate Limited ====================
    it('should throw BadRequestException when too many OTP requests', async () => {
      mockRedis.get.mockResolvedValue('5');

      await expect(service.sendOtp('+998901234567')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.sendOtp('+998901234567')).rejects.toThrow(
        'Too many OTP requests. Please try again after 1 hour.',
      );
    });
  });

  // ==================== TEST 4: verifyOtp - Expired/Missing OTP ====================
  describe('verifyOtp', () => {
    it('should throw BadRequestException when OTP is expired or not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.verifyOtp('+998901234567', '123456'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.verifyOtp('+998901234567', '123456'),
      ).rejects.toThrow('OTP expired or not found');
    });

    // ==================== TEST 5: verifyOtp - Invalid OTP ====================
    it('should throw BadRequestException when OTP is incorrect', async () => {
      mockRedis.get.mockResolvedValue('654321');

      await expect(
        service.verifyOtp('+998901234567', '123456'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.verifyOtp('+998901234567', '123456'),
      ).rejects.toThrow('Invalid OTP');
    });

    // ==================== TEST 6: verifyOtp - New User Registration ====================
    it('should create a new user when OTP is valid and user does not exist', async () => {
      mockRedis.get.mockResolvedValue('123456');
      mockRedis.del.mockResolvedValue(1);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // user by phone not found
        .mockResolvedValueOnce(null) // uid uniqueness check
        .mockResolvedValueOnce(null); // referral code check
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-456');
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.verifyOtp(
        '+998901234567',
        '123456',
        'device-001',
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '+998901234567',
            deviceId: 'device-001',
          }),
        }),
      );
    });

    // ==================== TEST 7: verifyOtp - Existing User Login ====================
    it('should update and return existing user when OTP is valid', async () => {
      mockRedis.get.mockResolvedValue('123456');
      mockRedis.del.mockResolvedValue(1);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        isOnline: true,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-456');
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.verifyOtp('+998901234567', '123456');

      expect(result.user.isOnline).toBe(true);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({ isOnline: true }),
        }),
      );
    });
  });

  // ==================== TEST 8: refreshToken - Invalid Token ====================
  describe('refreshToken', () => {
    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    // ==================== TEST 9: refreshToken - Wrong Token Type ====================
    it('should throw UnauthorizedException when token type is not refresh', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        uid: mockUser.uid,
        role: 'USER',
        type: 'access', // wrong type
      });

      await expect(service.refreshToken('access-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('access-token')).rejects.toThrow(
        'Invalid token type',
      );
    });

    // ==================== TEST 10: refreshToken - Revoked Token ====================
    it('should throw UnauthorizedException when refresh token is revoked', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        uid: mockUser.uid,
        role: 'USER',
        type: 'refresh',
      });
      mockRedis.get.mockResolvedValue('different-stored-token');

      await expect(service.refreshToken('my-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('my-refresh-token')).rejects.toThrow(
        'Refresh token revoked',
      );
    });

    // ==================== TEST 11: refreshToken - Success ====================
    it('should return new tokens when refresh token is valid', async () => {
      const refreshToken = 'valid-refresh-token';
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        uid: mockUser.uid,
        role: 'USER',
        type: 'refresh',
      });
      mockRedis.get.mockResolvedValue(refreshToken);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
      expect(result).toHaveProperty('user');
    });

    // ==================== TEST 12: refreshToken - User Not Found ====================
    it('should throw UnauthorizedException when user no longer exists', async () => {
      const refreshToken = 'valid-refresh-token';
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'deleted-user-id',
        uid: 'VOXO99999999',
        role: 'USER',
        type: 'refresh',
      });
      mockRedis.get.mockResolvedValue(refreshToken);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        'User not found',
      );
    });
  });

  // ==================== TEST 13: logout ====================
  describe('logout', () => {
    it('should clear refresh token and mark user offline on logout', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        isOnline: false,
      });

      await service.logout(mockUser.id);

      expect(mockRedis.del).toHaveBeenCalledWith(
        `refresh_token:${mockUser.id}`,
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          isOnline: false,
          lastSeen: expect.any(Date),
        },
      });
    });
  });

  // ==================== TEST 14: loginWithGoogle - Invalid Token ====================
  describe('loginWithGoogle', () => {
    it('should throw UnauthorizedException when Google token is invalid', async () => {
      // Mock Google OAuth2Client to throw an error
      const originalMethod = (service as any).googleClient.verifyIdToken;
      (service as any).googleClient.verifyIdToken = jest
        .fn()
        .mockRejectedValue(new Error('Invalid token'));

      await expect(
        service.loginWithGoogle('invalid-google-token'),
      ).rejects.toThrow(UnauthorizedException);

      (service as any).googleClient.verifyIdToken = originalMethod;
    });
  });

  // ==================== TEST 15: guestLogin ====================
  describe('guestLogin', () => {
    it('should create a guest user with a generated UID', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const guestUser = { ...mockUser, phone: null, email: null };
      mockPrismaService.user.create.mockResolvedValue(guestUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('guest-access-token')
        .mockResolvedValueOnce('guest-refresh-token');
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.guestLogin('guest-device-001');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceId: 'guest-device-001',
          }),
        }),
      );
    });
  });
});
