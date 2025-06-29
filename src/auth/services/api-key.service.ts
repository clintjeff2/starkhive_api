import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createKey(
    dto: CreateApiKeyDto,
  ): Promise<{ apiKey: string; label?: string }> {
    // Generate a random API key
    const rawKey = [...Array(32)]
      .map(() => Math.random().toString(36)[2])
      .join('');
    const hashedKey = await bcrypt.hash(rawKey, 10);
    let owner: User | null = null;
    if (dto.ownerId) {
      owner = await this.userRepository.findOne({ where: { id: dto.ownerId } });
    }
    const apiKey = this.apiKeyRepository.create({
      key: hashedKey,
      label: dto.label,
      owner: owner || undefined,
      active: true,
    });
    await this.apiKeyRepository.save(apiKey);
    return { apiKey: rawKey, label: dto.label };
  }

  async validateKey(rawKey: string): Promise<ApiKey> {
    const apiKeys = await this.apiKeyRepository.find({
      where: { active: true, revokedAt: undefined },
    });
    for (const apiKey of apiKeys) {
      if (await bcrypt.compare(rawKey, apiKey.key)) {
        return apiKey;
      }
    }
    throw new UnauthorizedException('Invalid API key');
  }

  async revokeKey(id: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!apiKey) throw new NotFoundException('API key not found');
    apiKey.revokedAt = new Date();
    apiKey.active = false;
    await this.apiKeyRepository.save(apiKey);
  }

  async listKeys(ownerId?: string): Promise<ApiKey[]> {
    if (ownerId) {
      return this.apiKeyRepository.find({ where: { owner: { id: ownerId } } });
    }
    return this.apiKeyRepository.find();
  }
}
