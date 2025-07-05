import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class PaymentPreferenceDto {
  @ApiProperty({
    description: 'Preferred payment currency/token (ETH, USDC, STRK, etc.)',
    example: 'ETH',
  })
  @IsString()
  @IsNotEmpty()
  preferredCurrency: string;
}
