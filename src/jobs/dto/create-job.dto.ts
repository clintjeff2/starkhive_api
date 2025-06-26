import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Budget must be a number' })
  budget?: number;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Deadline must be a valid ISO 8601 date string' },
  )
  deadline?: string;
}
