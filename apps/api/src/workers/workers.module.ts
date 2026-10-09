import { Module } from '@nestjs/common';
import { JobsProcessor } from './jobs.processor.js';
import { DatabaseModule } from '@relay/database';

@Module({
  imports: [DatabaseModule],
  providers: [JobsProcessor],
})
export class WorkersModule {}
