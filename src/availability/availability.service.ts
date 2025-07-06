import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Availability } from './entities/availability.entity';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private readonly availabilityRepo: Repository<Availability>,
  ) {}

  async create(dto: SetAvailabilityDto) {
    const availability = this.availabilityRepo.create(dto);
    return this.availabilityRepo.save(availability);
  }

  async findByUser(userId: string) {
    return this.availabilityRepo.find({ where: { userId }, order: { startDate: 'ASC' } });
  }

  async update(id: string, dto: SetAvailabilityDto) {
    const availability = await this.availabilityRepo.findOne({ where: { id } });
    if (!availability) throw new NotFoundException('Availability not found');

    Object.assign(availability, dto);
    return this.availabilityRepo.save(availability);
  }

  async delete(id: string) {
    const availability = await this.availabilityRepo.findOne({ where: { id } });
    if (!availability) throw new NotFoundException('Availability not found');

    return this.availabilityRepo.remove(availability);
  }
}
