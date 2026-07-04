import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';

export interface ZegoToken {
  token: string;
  expiresAt: number;
}

export interface ZegoRoomInfo {
  roomId: string;
  roomName: string;
  userCount: number;
  maxUserCount: number;
  createTime: number;
}

export interface ZegoUserPrivilege {
  loginRoom: boolean;
  publishStream: boolean;
}

@Injectable()
export class ZegocloudService {
  private readonly logger = new Logger(ZegocloudService.name);
  private readonly appId: number;
  private readonly serverSecret: string;
  private readonly apiBaseUrl = 'https://rtc-api.zego.im';
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<number>('zegocloud.appId');
    this.serverSecret = this.configService.get<string>(
      'zegocloud.serverSecret',
    );

    if (!this.appId || !this.serverSecret) {
      this.logger.warn(
        'ZEGOCLOUD credentials not configured. Voice rooms will not function.',
      );
    }

    this.httpClient = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate a ZEGOCLOUD Token04 for a user to join a room.
   *
   * Implements the official Token04 format (zego_server_assistant):
   * AES-CBC-encrypted JSON packed as
   * [expire int64 BE][iv len uint16 BE][iv][cipher len uint16 BE][cipher],
   * base64-encoded and prefixed with "04".
   */
  generateToken(
    userId: string,
    roomId: string,
    privileges: ZegoUserPrivilege = { loginRoom: true, publishStream: true },
    expirySeconds = 3600,
  ): ZegoToken {
    if (!this.appId || !this.serverSecret) {
      throw new BadRequestException('ZEGOCLOUD is not configured');
    }

    const key = Buffer.from(this.serverSecret, 'utf8');
    const algorithmByKeyLength: Record<number, string> = {
      16: 'aes-128-cbc',
      24: 'aes-192-cbc',
      32: 'aes-256-cbc',
    };
    const algorithm = algorithmByKeyLength[key.length];
    if (!algorithm) {
      throw new BadRequestException(
        `ZEGOCLOUD server secret must be 16/24/32 bytes, got ${key.length}`,
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const expireAt = now + expirySeconds;

    // Room-level privileges (used when "token privilege" is enabled in the
    // ZEGO console; ignored otherwise, so it is always safe to include).
    const payload = JSON.stringify({
      room_id: roomId,
      privilege: {
        1: privileges.loginRoom ? 1 : 0, // LOGIN_ROOM
        2: privileges.publishStream ? 1 : 0, // PUBLISH_STREAM
      },
      stream_id_list: null,
    });

    const tokenInfo = JSON.stringify({
      app_id: this.appId,
      user_id: userId,
      nonce: crypto.randomInt(-2147483648, 2147483648),
      ctime: now,
      expire: expireAt,
      payload,
    });

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(tokenInfo, 'utf8'),
      cipher.final(),
    ]);

    const packed = Buffer.alloc(8 + 2 + iv.length + 2 + encrypted.length);
    let offset = 0;
    packed.writeBigInt64BE(BigInt(expireAt), offset);
    offset += 8;
    packed.writeUInt16BE(iv.length, offset);
    offset += 2;
    iv.copy(packed, offset);
    offset += iv.length;
    packed.writeUInt16BE(encrypted.length, offset);
    offset += 2;
    encrypted.copy(packed, offset);

    const formattedToken = `04${packed.toString('base64')}`;

    this.logger.debug(
      `Generated ZEGOCLOUD token for user=${userId} room=${roomId} expires=${expireAt}`,
    );

    return {
      token: formattedToken,
      expiresAt: expireAt,
    };
  }

  /**
   * Generate API authorization signature for server-side ZEGOCLOUD API calls.
   */
  private generateApiSignature(timestamp: number, nonce: string): string {
    const content = `${this.appId}${timestamp}${nonce}${this.serverSecret}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Get common API request parameters.
   */
  private getApiParams(): Record<string, string | number> {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(4).toString('hex');
    const signature = this.generateApiSignature(timestamp, nonce);

    return {
      AppId: this.appId,
      Signature: signature,
      SignatureNonce: nonce,
      SignatureVersion: '2.0',
      Timestamp: timestamp,
    };
  }

  /**
   * Get list of active rooms from ZEGOCLOUD.
   */
  async getRoomList(
    page = 1,
    pageSize = 20,
  ): Promise<{ rooms: ZegoRoomInfo[]; total: number }> {
    if (!this.appId || !this.serverSecret) {
      return { rooms: [], total: 0 };
    }

    try {
      const params = this.getApiParams();
      const response = await this.httpClient.get(
        '/room/v2/describeuserinroom',
        {
          params: {
            ...params,
            RoomId: '',
            PageIndex: page - 1,
            PageSize: pageSize,
          },
        },
      );

      if (response.data.Code !== 0) {
        this.logger.error(
          `ZEGOCLOUD getRoomList error: ${response.data.Message}`,
        );
        return { rooms: [], total: 0 };
      }

      const rooms: ZegoRoomInfo[] = (response.data.Data?.RoomList || []).map(
        (room: Record<string, any>) => ({
          roomId: room.RoomId,
          roomName: room.RoomName || room.RoomId,
          userCount: room.UserCount || 0,
          maxUserCount: room.MaxUserCount || 0,
          createTime: room.CreateTime || 0,
        }),
      );

      return {
        rooms,
        total: response.data.Data?.TotalCount || rooms.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get ZEGOCLOUD room list: ${error.message}`);
      return { rooms: [], total: 0 };
    }
  }

  /**
   * Kick a user out of a room.
   */
  async kickUser(roomId: string, userId: string): Promise<boolean> {
    if (!this.appId || !this.serverSecret) {
      throw new BadRequestException('ZEGOCLOUD is not configured');
    }

    try {
      const params = this.getApiParams();
      const response = await this.httpClient.post('/room/v2/kickoutuser', {
        ...params,
        RoomId: roomId,
        UserId: [userId],
      });

      if (response.data.Code !== 0) {
        this.logger.error(
          `ZEGOCLOUD kickUser failed: roomId=${roomId} userId=${userId} error=${response.data.Message}`,
        );
        return false;
      }

      this.logger.log(`Kicked user ${userId} from room ${roomId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `ZEGOCLOUD kickUser exception: roomId=${roomId} userId=${userId} error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Mute a user's microphone in a room via custom signaling.
   */
  async muteUser(
    roomId: string,
    userId: string,
    muted = true,
  ): Promise<boolean> {
    if (!this.appId || !this.serverSecret) {
      throw new BadRequestException('ZEGOCLOUD is not configured');
    }

    try {
      const params = this.getApiParams();

      // ZEGOCLOUD uses custom commands to send mute signals
      const response = await this.httpClient.post('/room/v2/sendroommessage', {
        ...params,
        RoomId: roomId,
        MessageType: 2, // Custom signaling message
        MessageContent: JSON.stringify({
          action: muted ? 'mute_user' : 'unmute_user',
          targetUserId: userId,
          timestamp: Date.now(),
        }),
      });

      if (response.data.Code !== 0) {
        this.logger.error(
          `ZEGOCLOUD muteUser failed: roomId=${roomId} userId=${userId} error=${response.data.Message}`,
        );
        return false;
      }

      this.logger.log(
        `${muted ? 'Muted' : 'Unmuted'} user ${userId} in room ${roomId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `ZEGOCLOUD muteUser exception: roomId=${roomId} userId=${userId} error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get the count of users currently in a room.
   */
  async getRoomUserCount(roomId: string): Promise<number> {
    if (!this.appId || !this.serverSecret) {
      return 0;
    }

    try {
      const params = this.getApiParams();
      const response = await this.httpClient.get('/room/v2/describeusers', {
        params: {
          ...params,
          RoomId: roomId,
          Limit: 1,
          Offset: 0,
        },
      });

      if (response.data.Code !== 0) {
        return 0;
      }

      return response.data.Data?.TotalCount || 0;
    } catch (error) {
      this.logger.error(
        `Failed to get room user count: roomId=${roomId} error=${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Destroy a room (end it for all users).
   */
  async destroyRoom(roomId: string): Promise<boolean> {
    if (!this.appId || !this.serverSecret) {
      throw new BadRequestException('ZEGOCLOUD is not configured');
    }

    try {
      const params = this.getApiParams();
      const response = await this.httpClient.post('/room/v2/destroyroom', {
        ...params,
        RoomId: roomId,
      });

      if (response.data.Code !== 0) {
        this.logger.error(
          `ZEGOCLOUD destroyRoom failed: roomId=${roomId} error=${response.data.Message}`,
        );
        return false;
      }

      this.logger.log(`Destroyed room ${roomId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `ZEGOCLOUD destroyRoom exception: roomId=${roomId} error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Send a custom message to all users in a room (for system notifications).
   */
  async sendRoomMessage(
    roomId: string,
    message: Record<string, unknown>,
  ): Promise<boolean> {
    if (!this.appId || !this.serverSecret) {
      return false;
    }

    try {
      const params = this.getApiParams();
      const response = await this.httpClient.post('/room/v2/sendroommessage', {
        ...params,
        RoomId: roomId,
        MessageType: 2,
        MessageContent: JSON.stringify(message),
      });

      return response.data.Code === 0;
    } catch (error) {
      this.logger.error(
        `Failed to send room message: roomId=${roomId} error=${error.message}`,
      );
      return false;
    }
  }

  getAppId(): number {
    return this.appId;
  }
}
