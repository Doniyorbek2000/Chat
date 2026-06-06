import { Module } from '@nestjs/common';
import { HostLevelController } from './host-level.controller';
import { HostLevelService } from './host-level.service';

@Module({
  controllers: [HostLevelController],
  providers: [HostLevelService],
  exports: [HostLevelService],
})
export class HostLevelModule {}
