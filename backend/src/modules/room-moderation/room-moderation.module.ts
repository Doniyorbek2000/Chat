import { Module } from '@nestjs/common';
import { RoomModerationController } from './room-moderation.controller';
import { RoomModerationService } from './room-moderation.service';

@Module({
  controllers: [RoomModerationController],
  providers: [RoomModerationService],
  exports: [RoomModerationService],
})
export class RoomModerationModule {}
