import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  unlinkSync,
  statSync,
} from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { join } from 'path';
import { Readable } from 'stream';
import { Backup } from './entities/backup.entity';
import {
  BackupConfigDto,
  BackupResponseDto,
  RestoreConfigDto,
  BackupStatus,
  BackupType,
} from './dto/backup-config.dto';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly s3Client: S3Client;
  private readonly backupDir: string;

  constructor(
    @InjectRepository(Backup)
    private readonly backupRepository: Repository<Backup>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.backupDir =
      this.configService.get<string>('BACKUP_DIR') || './backups';

    // Initialize S3 client if AWS credentials are provided
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const region = this.configService.get<string>('AWS_REGION');

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: region || 'us-east-1',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  async createBackup(config: BackupConfigDto): Promise<BackupResponseDto> {
    const backup = this.backupRepository.create({
      type: config.type,
      database: config.database,
      filePath: '',
      compression: config.compression,
      crossRegion: config.crossRegion,
      retentionDays: config.retentionDays,
    });

    const savedBackup = await this.backupRepository.save(backup);

    // Start backup process asynchronously
    this.performBackup(savedBackup.id, config).catch((error) => {
      this.logger.error(`Backup ${savedBackup.id} failed:`, error);
    });

    return this.mapToResponseDto(savedBackup);
  }

  private async performBackup(
    backupId: string,
    config: BackupConfigDto,
  ): Promise<void> {
    const backup = await this.backupRepository.findOne({
      where: { id: backupId },
    });
    if (!backup) return;

    try {
      backup.status = BackupStatus.IN_PROGRESS;
      await this.backupRepository.save(backup);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${config.database}_${timestamp}.sql${config.compression ? '.gz' : ''}`;
      const filePath = join(this.backupDir, filename);

      // Create backup directory if it doesn't exist
      await execAsync(`mkdir -p ${this.backupDir}`);

      // Generate PostgreSQL dump
      const dumpCommand = this.buildDumpCommand(config, filePath);
      await execAsync(dumpCommand);

      // Calculate file size and checksum
      const stats = statSync(filePath);
      const checksum = await this.calculateChecksum(filePath);

      backup.filePath = filePath;
      backup.size = stats.size;
      backup.checksum = checksum;
      backup.completedAt = new Date();
      backup.status = BackupStatus.COMPLETED;

      // Upload to S3 if configured
      if (this.s3Client && config.crossRegion) {
        const s3Key = await this.uploadToS3(filePath, filename);
        backup.s3Key = s3Key;
      }

      await this.backupRepository.save(backup);
      this.logger.log(`Backup ${backupId} completed successfully`);
    } catch (error) {
      backup.status = BackupStatus.FAILED;
      backup.error = error.message;
      await this.backupRepository.save(backup);
      this.logger.error(`Backup ${backupId} failed:`, error);
    }
  }

  private buildDumpCommand(config: BackupConfigDto, filePath: string): string {
    const host = this.configService.get<string>('DB_HOST');
    const port = this.configService.get<string>('DB_PORT');
    const username = this.configService.get<string>('DB_USERNAME');
    const password = this.configService.get<string>('DB_PASSWORD');

    let command = `PGPASSWORD=${password} pg_dump -h ${host} -p ${port} -U ${username} -d ${config.database} --verbose --clean --no-owner --no-privileges`;

    if (config.compression) {
      command += ` | gzip > ${filePath}`;
    } else {
      command += ` > ${filePath}`;
    }

    return command;
  }

  private async uploadToS3(
    filePath: string,
    filename: string,
  ): Promise<string> {
    const bucketName = this.configService.get<string>('AWS_BACKUP_BUCKET');
    if (!bucketName) {
      throw new Error('AWS_BACKUP_BUCKET not configured');
    }

    const s3Key = `backups/${filename}`;
    const fileStream = createReadStream(filePath);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileStream,
      ServerSideEncryption: 'AES256',
    });

    await this.s3Client.send(command);
    return s3Key;
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async restoreBackup(config: RestoreConfigDto): Promise<{ message: string }> {
    const backup = await this.backupRepository.findOne({
      where: { id: config.backupId },
    });
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new Error('Backup is not in completed state');
    }

    try {
      let filePath = backup.filePath;

      // Download from S3 if needed
      if (backup.s3Key && !existsSync(filePath)) {
        filePath = await this.downloadFromS3(backup.s3Key);
      }

      // Verify backup integrity
      await this.verifyBackup(backup, filePath);

      // Perform restore
      const targetDb = config.targetDatabase || backup.database;
      await this.performRestore(filePath, targetDb, backup.compression);

      this.logger.log(
        `Backup ${config.backupId} restored successfully to ${targetDb}`,
      );
      return { message: 'Backup restored successfully' };
    } catch (error) {
      this.logger.error(`Restore failed for backup ${config.backupId}:`, error);
      throw error;
    }
  }

  private async downloadFromS3(s3Key: string): Promise<string> {
    const bucketName = this.configService.get<string>('AWS_BACKUP_BUCKET');
    const fileName = s3Key.split('/').pop();
    if (!fileName) {
      throw new Error('Invalid S3 key: cannot extract filename');
    }
    const localPath = join(this.backupDir, 'temp', fileName);

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    const response = await this.s3Client.send(command);
    const writeStream = createWriteStream(localPath);

    return new Promise((resolve, reject) => {
      if (!response.Body) {
        reject(new Error('No response body from S3'));
        return;
      }

      const readableStream = response.Body as NodeJS.ReadableStream;
      readableStream
        .pipe(writeStream)
        .on('finish', () => resolve(localPath))
        .on('error', reject);
    });
  }

  private async verifyBackup(backup: Backup, filePath: string): Promise<void> {
    if (!existsSync(filePath)) {
      throw new Error('Backup file not found');
    }

    const currentChecksum = await this.calculateChecksum(filePath);
    if (currentChecksum !== backup.checksum) {
      throw new Error('Backup file integrity check failed');
    }
  }

  private async performRestore(
    filePath: string,
    database: string,
    compressed: boolean,
  ): Promise<void> {
    const host = this.configService.get<string>('DB_HOST');
    const port = this.configService.get<string>('DB_PORT');
    const username = this.configService.get<string>('DB_USERNAME');
    const password = this.configService.get<string>('DB_PASSWORD');

    let command: string;
    if (compressed) {
      command = `gunzip -c ${filePath} | PGPASSWORD=${password} psql -h ${host} -p ${port} -U ${username} -d ${database}`;
    } else {
      command = `PGPASSWORD=${password} psql -h ${host} -p ${port} -U ${username} -d ${database} < ${filePath}`;
    }

    await execAsync(command);
  }

  async getBackups(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: BackupResponseDto[]; total: number }> {
    const [backups, total] = await this.backupRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: backups.map((backup) => this.mapToResponseDto(backup)),
      total,
    };
  }

  async deleteBackup(id: string): Promise<{ message: string }> {
    const backup = await this.backupRepository.findOne({ where: { id } });
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    // Delete local file
    if (existsSync(backup.filePath)) {
      unlinkSync(backup.filePath);
    }

    // Delete from S3
    if (backup.s3Key && this.s3Client) {
      const command = new DeleteObjectCommand({
        Bucket: this.configService.get<string>('AWS_BACKUP_BUCKET'),
        Key: backup.s3Key,
      });
      await this.s3Client.send(command);
    }

    await this.backupRepository.remove(backup);
    return { message: 'Backup deleted successfully' };
  }

  async cleanupOldBackups(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Default 30 days retention

    const oldBackups = await this.backupRepository.find({
      where: {
        createdAt: { $lt: cutoffDate } as any,
      },
    });

    for (const backup of oldBackups) {
      try {
        await this.deleteBackup(backup.id);
        this.logger.log(`Cleaned up old backup: ${backup.id}`);
      } catch (error) {
        this.logger.error(`Failed to cleanup backup ${backup.id}:`, error);
      }
    }
  }

  async getBackupHealth(): Promise<{
    status: string;
    lastBackup: Date | null;
    totalBackups: number;
    failedBackups: number;
  }> {
    const [totalBackups, failedBackups] = await Promise.all([
      this.backupRepository.count(),
      this.backupRepository.count({ where: { status: BackupStatus.FAILED } }),
    ]);

    const lastBackup = await this.backupRepository.findOne({
      where: { status: BackupStatus.COMPLETED },
      order: { completedAt: 'DESC' },
    });

    const status = failedBackups === 0 && lastBackup ? 'healthy' : 'warning';

    return {
      status,
      lastBackup: lastBackup?.completedAt || null,
      totalBackups,
      failedBackups,
    };
  }

  private mapToResponseDto(backup: Backup): BackupResponseDto {
    return {
      id: backup.id,
      status: backup.status,
      filePath: backup.filePath,
      size: Number(backup.size),
      createdAt: backup.createdAt,
      completedAt: backup.completedAt,
      error: backup.error,
    };
  }
}
