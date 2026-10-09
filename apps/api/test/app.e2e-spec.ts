import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from '@relay/database';

describe('Jobs API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    const prisma = app.get(PrismaService);
    await prisma.apiKey.upsert({
      where: { key: 'demo-secret-key' },
      update: {},
      create: { key: 'demo-secret-key', owner_id: 'test-owner', description: 'Test Key' },
    });
  });

  it('/v1/jobs (POST) - should submit a job', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/jobs')
      .set('x-api-key', 'demo-secret-key')
      .send({
        type: 'webhook.deliver',
        payload: { url: 'https://example.com/webhook', method: 'POST', body: { event: 'user.created' } },
        idempotencyKey: 'test-key-1',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe('PENDING');
  });

  afterAll(async () => {
    await app.close();
  });
});
