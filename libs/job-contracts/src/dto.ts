import { IsEnum, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { JobType } from './job-type.enum.js';

export class SubmitJobDto {
  @IsEnum(JobType)
  @IsNotEmpty()
  type!: JobType;

  @IsObject()
  @IsNotEmpty()
  payload!: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
