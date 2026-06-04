import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PkBattleService } from './pk-battle.service';

@Processor('pk-battle')
export class PkBattleProcessor {
  private readonly logger = new Logger(PkBattleProcessor.name);

  constructor(private pkBattleService: PkBattleService) {}

  @Process('end-battle')
  async handleEndBattle(job: Job<{ battleId: string }>) {
    const { battleId } = job.data;
    this.logger.log(`Auto-ending PK battle ${battleId} via BullMQ`);
    try {
      await this.pkBattleService.endBattle(battleId);
    } catch (err) {
      this.logger.error(`Failed to auto-end PK battle ${battleId}:`, err);
      throw err;
    }
  }
}
