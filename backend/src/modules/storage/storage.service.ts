import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(private configService: ConfigService) {
    this.bucket = configService.get<string>('s3.bucket');
    this.endpoint = configService.get<string>('s3.endpoint');

    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: configService.get<string>('s3.region'),
      credentials: {
        accessKeyId: configService.get<string>('s3.accessKey'),
        secretAccessKey: configService.get<string>('s3.secretKey'),
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await this.s3Client.send(command);
    return this.getPublicUrl(key);
  }

  async uploadFromPath(
    buffer: Buffer,
    folder: string,
    originalName: string,
    contentType: string,
  ): Promise<string> {
    const ext = originalName.split('.').pop();
    const key = `${folder}/${uuidv4()}.${ext}`;
    return this.uploadFile(buffer, key, contentType);
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3Client.send(command);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  getPublicUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  extractKeyFromUrl(url: string): string {
    const prefix = `${this.endpoint}/${this.bucket}/`;
    return url.replace(prefix, '');
  }

  async uploadAvatar(buffer: Buffer, userId: string, originalName: string): Promise<string> {
    const ext = originalName.split('.').pop() || 'jpg';
    const key = `avatars/${userId}/${uuidv4()}.${ext}`;
    return this.uploadFile(buffer, key, `image/${ext}`);
  }

  async uploadGiftAnimation(buffer: Buffer, giftId: string, originalName: string): Promise<string> {
    const ext = originalName.split('.').pop() || 'json';
    const key = `gifts/animations/${giftId}/${uuidv4()}.${ext}`;
    const contentTypeMap: Record<string, string> = {
      json: 'application/json',
      svga: 'application/octet-stream',
      mp4: 'video/mp4',
      png: 'image/png',
      jpg: 'image/jpeg',
      webp: 'image/webp',
    };
    return this.uploadFile(buffer, key, contentTypeMap[ext] || 'application/octet-stream');
  }

  async uploadRoomCover(buffer: Buffer, roomId: string, originalName: string): Promise<string> {
    const ext = originalName.split('.').pop() || 'jpg';
    const key = `rooms/${roomId}/cover.${ext}`;
    return this.uploadFile(buffer, key, `image/${ext}`);
  }
}
