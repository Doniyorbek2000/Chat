import { Module, Global } from '@nestjs/common';
import { ZegocloudService } from './zegocloud.service';

@Global()
@Module({
  providers: [ZegocloudService],
  exports: [ZegocloudService],
})
export class ZegocloudModule {}
