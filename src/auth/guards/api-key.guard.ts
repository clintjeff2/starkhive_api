import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      throw new UnauthorizedException('API key missing');
    }
    const keyEntity = await this.apiKeyService.validateKey(apiKey);
    if (!keyEntity) {
      throw new UnauthorizedException('Invalid API key');
    }
    req['apiKey'] = keyEntity;
    return true;
  }
} 