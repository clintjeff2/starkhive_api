import { Controller, Post, Body, Get, Param, Patch, Delete } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  create(@Body() dto: SetAvailabilityDto) {
    return this.availabilityService.create(dto);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.availabilityService.findByUser(userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: SetAvailabilityDto) {
    return this.availabilityService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.availabilityService.delete(id);
  }
}
