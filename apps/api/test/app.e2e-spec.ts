import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

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
  });

  it('/v1/jobs (POST) - should submit a job', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/jobs')
      .send({
        type: 'demo.report',
        payload: { reportId: '123' },
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
