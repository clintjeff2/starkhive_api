import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Keep this DTO for creating a feed post
export class CreateFeedPostDto {
  content: string;
  imageUrl?: string;
}

// Keep this DTO for getting saved posts
export class GetSavedPostsDto {
  @ApiProperty({
    description: 'Page number (1-indexed)',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

// This class is empty, but kept for compatibility if needed
export class CreateFeedDto {}