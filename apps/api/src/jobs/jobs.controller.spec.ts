import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { vitest, describe, beforeEach, it, expect } from 'vitest';

describe('JobsController', () => {
  let controller: JobsController;
  let service: JobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: {
            submitJob: vitest.fn(),
            getJob: vitest.fn(),
            listJobs: vitest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
