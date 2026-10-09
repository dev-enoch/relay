import { Controller, Post, Get, Body, Param, Query, ParseIntPipe, DefaultValuePipe, Version } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { SubmitJobDto } from '@relay/job-contracts';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Version('1')
  @Post()
  async submitJob(@Body() dto: SubmitJobDto) {
    const job = await this.jobsService.submitJob(dto);
    return {
      id: job.id,
      status: job.status,
      createdAt: job.created_at,
    };
  }

  @Version('1')
  @Get(':id')
  getJob(@Param('id') id: string) {
    return this.jobsService.getJob(id);
  }

  @Version('1')
  @Get()
  listJobs(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.jobsService.listJobs(status, type, limit);
  }
}
