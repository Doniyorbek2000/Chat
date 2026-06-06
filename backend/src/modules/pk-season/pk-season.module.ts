import { Module } from '@nestjs/common';
import { PkSeasonController } from './pk-season.controller';
import { PkSeasonService } from './pk-season.service';

@Module({
  controllers: [PkSeasonController],
  providers: [PkSeasonService],
  exports: [PkSeasonService],
})
export class PkSeasonModule {}
