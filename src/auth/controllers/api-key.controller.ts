import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { AdminGuard } from '../admin.guard';

@Controller('api-keys')
@UseGuards(AdminGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  async create(@Body() dto: CreateApiKeyDto) {
    return this.apiKeyService.createKey(dto);
  }

  @Get()
  async list(@Request() req) {
    // Optionally filter by owner
    return this.apiKeyService.listKeys(req.user?.id);
  }

  @Delete(':id')
  async revoke(@Param('id') id: string) {
    await this.apiKeyService.revokeKey(id);
    return { success: true };
  }
}
