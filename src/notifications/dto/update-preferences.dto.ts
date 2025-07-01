import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ChannelPreference } from '../interfaces/channel-preference.interface';

export class UpdatePreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  application?: ChannelPreference;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  reviews?: ChannelPreference;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  posts?: ChannelPreference;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  tasks?: ChannelPreference;
}

