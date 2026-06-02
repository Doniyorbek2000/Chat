import { Module } from '@nestjs/common';
import { CoupleController } from './couple.controller';
import { CoupleService } from './couple.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CoupleController],
  providers: [CoupleService],
  exports: [CoupleService],
})
export class CoupleModule {}
