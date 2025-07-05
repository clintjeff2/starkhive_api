import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';

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
  @IsString()
  @IsOptional()
  // Simple regex for hex address (0x-prefixed, 40+ hex chars); adjust as needed for Starknet
  // You can use @Matches(/^0x[a-fA-F0-9]{40,}$/) for stricter validation
  contractAddress?: string;

  @ApiProperty({ description: 'Contract ABI' })
  @IsOptional()
  @IsArray({ each: true }) // ABI is typically an array of objects
  abi?: Record<string, any>[];
}
