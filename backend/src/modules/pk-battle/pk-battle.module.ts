import { Module } from '@nestjs/common';
import { PkBattleService } from './pk-battle.service';
import { PkBattleController } from './pk-battle.controller';

@Module({
  controllers: [PkBattleController],
  providers: [PkBattleService],
  exports: [PkBattleService],
})
export class PkBattleModule {}
