import { Controller, Post, Get, Body, Param, Query, ParseIntPipe, DefaultValuePipe, Version, UseGuards, Req } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { SubmitJobDto } from '@relay/job-contracts';
import { ApiKeyAuthGuard } from '../auth/api-key-auth.guard.js';

@UseGuards(ApiKeyAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Version('1')
  @Post()
  async submitJob(@Body() dto: SubmitJobDto, @Req() req: any) {
    const ownerId = req.user.ownerId;
    const job = await this.jobsService.submitJob(dto, ownerId);
    return {
      id: job.id,
      status: job.status,
      createdAt: job.created_at,
    };
  }

  @Version('1')
  @Get(':id')
  getJob(@Param('id') id: string, @Req() req: any) {
    return this.jobsService.getJob(id, req.user.ownerId);
  }

  @Version('1')
  @Get()
  listJobs(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Req() req?: any,
  ) {
    return this.jobsService.listJobs(req.user.ownerId, status, type, limit);
  }

  @Version('1')
  @Post(':id/cancel')
  cancelJob(@Param('id') id: string, @Req() req: any) {
    return this.jobsService.cancelJob(id, req.user.ownerId);
  }
}
