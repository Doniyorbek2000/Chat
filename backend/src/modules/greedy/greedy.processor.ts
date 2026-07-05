import { Process, Processor, InjectQueue } from '@nestjs/bull';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import { GreedyService } from './greedy.service';

/**
 * Drives the Greedy round loop with a repeatable Bull job every 3 seconds.
 * Bull deduplicates repeatable jobs by key, so multiple instances share a
 * single loop, and the loop survives process restarts.
 */
@Processor('greedy')
export class GreedyProcessor implements OnModuleInit {
  private readonly logger = new Logger(GreedyProcessor.name);

  constructor(
    private readonly greedyService: GreedyService,
    @InjectQueue('greedy') private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.queue.add(
      'tick',
      {},
      {
        repeat: { every: 3000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    this.logger.log('Greedy tick job scheduled (every 3s)');
  }

  @Process('tick')
  async handleTick() {
    try {
      await this.greedyService.tick();
    } catch (error) {
      this.logger.error(`Greedy tick failed: ${error.message}`);
    }
  }
}
