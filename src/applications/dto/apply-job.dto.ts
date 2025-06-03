import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyJobDto {
  @IsNotEmpty()
  @IsString()
  jobId: string;

  @IsNotEmpty()
  @IsString()
  coverLetter: string;
}
