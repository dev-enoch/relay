import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { DatabaseModule } from '@relay/database';

@Module({
  imports: [DatabaseModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
