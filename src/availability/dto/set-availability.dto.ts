import { IsBoolean, IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class SetAvailabilityDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsBoolean()
  isBusy: boolean;
}
