import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PkBattleService } from './pk-battle.service';
import { PkBattleController } from './pk-battle.controller';
import { PkBattleProcessor } from './pk-battle.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'pk-battle' }),
  ],
  controllers: [PkBattleController],
  providers: [PkBattleService, PkBattleProcessor],
  exports: [PkBattleService],
})
export class PkBattleModule {}
