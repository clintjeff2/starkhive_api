import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BackupService } from './backup.service';
import {
  BackupConfigDto,
  BackupResponseDto,
  RestoreConfigDto,
} from './dto/backup-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Backup')
@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new backup' })
  @ApiResponse({
    status: 201,
    description: 'Backup created successfully',
    type: BackupResponseDto,
  })
  async createBackup(
    @Body() config: BackupConfigDto,
  ): Promise<BackupResponseDto> {
    return this.backupService.createBackup(config);
  }

  @Post('restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restore from backup' })
  @ApiResponse({ status: 200, description: 'Backup restored successfully' })
  async restoreBackup(
    @Body() config: RestoreConfigDto,
  ): Promise<{ message: string }> {
    return this.backupService.restoreBackup(config);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all backups' })
  @ApiResponse({ status: 200, description: 'Backups retrieved successfully' })
  async getBackups(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ data: BackupResponseDto[]; total: number }> {
    return this.backupService.getBackups(page, limit);
  }

  @Get('health')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get backup system health' })
  @ApiResponse({
    status: 200,
    description: 'Backup health retrieved successfully',
  })
  async getBackupHealth(): Promise<{
    status: string;
    lastBackup: Date | null;
    totalBackups: number;
    failedBackups: number;
  }> {
    return this.backupService.getBackupHealth();
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a backup' })
  @ApiResponse({ status: 200, description: 'Backup deleted successfully' })
  async deleteBackup(@Param('id') id: string): Promise<{ message: string }> {
    return this.backupService.deleteBackup(id);
  }
}
