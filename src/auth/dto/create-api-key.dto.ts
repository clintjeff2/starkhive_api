import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateApiKeyDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
