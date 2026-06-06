import { Module } from '@nestjs/common';
import { AgencySalaryController } from './agency-salary.controller';
import { AgencySalaryService } from './agency-salary.service';

@Module({
  controllers: [AgencySalaryController],
  providers: [AgencySalaryService],
  exports: [AgencySalaryService],
})
export class AgencySalaryModule {}
