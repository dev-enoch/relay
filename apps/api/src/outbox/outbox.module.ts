import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OutboxService } from './outbox.service.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'jobs-queue',
    }),
  ],
  providers: [OutboxService],
})
export class OutboxModule {}
