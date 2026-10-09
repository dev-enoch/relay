import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '@relay/database';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get('live')
  @HealthCheck()
  checkLiveness() {
    return { status: 'up', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @HealthCheck()
  async checkReadiness() {
    const { Redis } = await import('ioredis');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
    });

    try {
      return await this.health.check([
        async () => {
          await this.prisma.$queryRaw`SELECT 1 as ok`;
          return { database: { status: 'up' } };
        },
        async () => {
          await redis.connect();
          await redis.ping();
          return { redis: { status: 'up' } };
        },
        () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      ]);
    } finally {
      if (redis.status === 'ready') {
        await redis.quit();
      }
    }
  }
}
