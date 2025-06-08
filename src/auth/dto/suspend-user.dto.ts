import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuspendUserDto {
  @ApiProperty({ description: 'The ID of the user to suspend/unsuspend' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;
}
