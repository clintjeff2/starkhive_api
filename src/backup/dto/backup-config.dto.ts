import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
}

export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class BackupConfigDto {
  @ApiProperty({ description: 'Backup type' })
  @IsEnum(BackupType)
  type: BackupType;

  @ApiProperty({ description: 'Database name to backup' })
  @IsString()
  database: string;

  @ApiProperty({ description: 'Backup retention days', required: false })
  @IsOptional()
  @IsNumber()
  retentionDays?: number = 30;

  @ApiProperty({ description: 'Enable compression', required: false })
  @IsOptional()
  @IsBoolean()
  compression?: boolean = true;

  @ApiProperty({ description: 'Cross-region backup enabled', required: false })
  @IsOptional()
  @IsBoolean()
  crossRegion?: boolean = true;
}

export class BackupResponseDto {
  @ApiProperty({ description: 'Backup ID' })
  id: string;

  @ApiProperty({ description: 'Backup status' })
  status: BackupStatus;

  @ApiProperty({ description: 'Backup file path' })
  filePath: string;

  @ApiProperty({ description: 'Backup size in bytes' })
  size: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Completed timestamp', required: false })
  completedAt?: Date;

  @ApiProperty({ description: 'Error message if failed', required: false })
  error?: string;
}

export class RestoreConfigDto {
  @ApiProperty({ description: 'Backup ID to restore from' })
  @IsString()
  backupId: string;

  @ApiProperty({ description: 'Target database name', required: false })
  @IsOptional()
  @IsString()
  targetDatabase?: string;

  @ApiProperty({ description: 'Point in time to restore to', required: false })
  @IsOptional()
  pointInTime?: Date;
}
