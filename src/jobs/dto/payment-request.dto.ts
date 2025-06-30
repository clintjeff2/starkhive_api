import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class PaymentRequestDto {
  @ApiProperty({ description: 'Starknet address of the recipient' })
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @ApiProperty({ description: 'Amount to send' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description: 'Type of transaction (e.g., payment, reputation)',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Optional extra info' })
  @IsOptional()
  metadata?: any;

  @ApiProperty({ description: 'Contract address to interact with' })
  contractAddress?: string;

  @ApiProperty({ description: 'Contract ABI' })
  abi?: any;
}
