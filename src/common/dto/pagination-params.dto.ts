import { IsInt, Min, IsOptional, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationParamsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Page must be greater than 0' })
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Limit must be greater than 0' })
  @Max(100, { message: 'Maximum limit is 100' })
  limit = 10;
}
