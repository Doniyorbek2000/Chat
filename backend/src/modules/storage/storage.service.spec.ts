import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

// ==================== MOCKS ====================

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url'),
}));

// Persistent S3 send mock — resetMocks clears return value; we re-set it in beforeEach
const mockSend = jest.fn();

const mockConfigService = {
  get: jest.fn((key: string) => {
    const cfg: Record<string, any> = {
      's3.bucket': 'test-bucket',
      's3.endpoint': 'http://localhost:9000',
      's3.region': 'us-east-1',
      's3.accessKey': 'minioadmin',
      's3.secretKey': 'minioadmin',
      'upload.maxSizeMb': 5,
    };
    return cfg[key];
  }),
};

// ==================== TESTS ====================

describe('StorageService — file upload validation', () => {
  let service: StorageService;

  const makeBuffer = (sizeMb: number) => Buffer.alloc(sizeMb * 1024 * 1024);
  const smallBuffer = makeBuffer(1);
  const largeBuffer = makeBuffer(6);

  beforeEach(async () => {
    // Re-apply after resetMocks: true (jest.config resets all mocks before each test)
    mockSend.mockResolvedValue({});
    (S3Client as jest.Mock).mockImplementation(() => ({ send: mockSend }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('MIME type allowlist', () => {
    it.each([['image/jpeg'], ['image/png'], ['image/webp'], ['image/gif']])(
      'allows %s for avatar upload',
      async (mimeType) => {
        await expect(
          service.uploadAvatar(smallBuffer, 'user-1', 'photo.jpg', mimeType),
        ).resolves.toBeDefined();
      },
    );

    it.each([
      ['application/pdf', 'document.pdf'],
      ['application/octet-stream', 'virus.exe'],
      ['application/zip', 'archive.zip'],
      ['text/html', 'index.html'],
      ['video/mp4', 'video.mp4'],
    ])('blocks %s for avatar upload', async (mimeType, filename) => {
      await expect(
        service.uploadAvatar(smallBuffer, 'user-1', filename, mimeType),
      ).rejects.toThrow(BadRequestException);
    });

    it('includes the blocked MIME type in error message', async () => {
      await expect(
        service.uploadAvatar(
          smallBuffer,
          'user-1',
          'bad.pdf',
          'application/pdf',
        ),
      ).rejects.toThrow('application/pdf');
    });

    it('does NOT call S3 send for blocked MIME types', async () => {
      try {
        await service.uploadAvatar(
          smallBuffer,
          'user-1',
          'bad.pdf',
          'application/pdf',
        );
      } catch {
        /* expected */
      }
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('file size validation', () => {
    it('allows file under 5MB limit', async () => {
      await expect(
        service.uploadAvatar(makeBuffer(4), 'user-1', 'ok.jpg', 'image/jpeg'),
      ).resolves.toBeDefined();
    });

    it('blocks file over 5MB', async () => {
      await expect(
        service.uploadAvatar(largeBuffer, 'user-1', 'big.jpg', 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('error message mentions MB', async () => {
      await expect(
        service.uploadAvatar(largeBuffer, 'user-1', 'big.jpg', 'image/jpeg'),
      ).rejects.toThrow(/MB/);
    });

    it('accepts file exactly at 5MB limit', async () => {
      const exactly5mb = makeBuffer(5);
      await expect(
        service.uploadAvatar(exactly5mb, 'user-1', 'exact.png', 'image/png'),
      ).resolves.toBeDefined();
    });

    it('does NOT call S3 send for oversized files', async () => {
      try {
        await service.uploadAvatar(
          largeBuffer,
          'user-1',
          'big.jpg',
          'image/jpeg',
        );
      } catch {
        /* expected */
      }
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('uploadRoomCover validation', () => {
    it('allows valid image types for room cover', async () => {
      await expect(
        service.uploadRoomCover(
          smallBuffer,
          'room-1',
          'cover.png',
          'image/png',
        ),
      ).resolves.toBeDefined();
    });

    it('blocks non-image types for room cover', async () => {
      await expect(
        service.uploadRoomCover(
          smallBuffer,
          'room-1',
          'cover.pdf',
          'application/pdf',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks oversized room cover', async () => {
      await expect(
        service.uploadRoomCover(largeBuffer, 'room-1', 'big.jpg', 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadGiftAnimation — no image validation', () => {
    it('allows JSON for gift animation', async () => {
      await expect(
        service.uploadGiftAnimation(smallBuffer, 'gift-1', 'animation.json'),
      ).resolves.toBeDefined();
    });

    it('allows SVGA for gift animation', async () => {
      await expect(
        service.uploadGiftAnimation(smallBuffer, 'gift-1', 'animation.svga'),
      ).resolves.toBeDefined();
    });

    it('allows mp4 for gift animation', async () => {
      await expect(
        service.uploadGiftAnimation(smallBuffer, 'gift-1', 'animation.mp4'),
      ).resolves.toBeDefined();
    });
  });

  describe('UPLOAD_MAX_SIZE_MB env config', () => {
    it('respects custom max size from UPLOAD_MAX_SIZE_MB', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'upload.maxSizeMb') return 2;
        const cfg: Record<string, any> = {
          's3.bucket': 'test-bucket',
          's3.endpoint': 'http://localhost:9000',
          's3.region': 'us-east-1',
          's3.accessKey': 'minioadmin',
          's3.secretKey': 'minioadmin',
        };
        return cfg[key];
      });

      const module = await Test.createTestingModule({
        providers: [
          StorageService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const svc = module.get<StorageService>(StorageService);

      // 3MB file must fail with 2MB limit
      await expect(
        svc.uploadAvatar(makeBuffer(3), 'u1', 'photo.jpg', 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);

      // 1MB file must pass with 2MB limit
      await expect(
        svc.uploadAvatar(makeBuffer(1), 'u1', 'small.jpg', 'image/jpeg'),
      ).resolves.toBeDefined();
    });
  });
});
