import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { BackupTask } from './tasks/backup.task';
import { Backup } from './entities/backup.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Backup]), ScheduleModule.forRoot()],
  controllers: [BackupController],
  providers: [BackupService, BackupTask],
  exports: [BackupService],
})
export class BackupModule {}
