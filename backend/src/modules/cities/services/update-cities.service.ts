import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cities } from '../entities/cities.entity';
import { UpdateCitiesDto } from '../dto/update-cities.dto';

@Injectable()
export class UpdateCitiesService {
  constructor(
    @InjectRepository(Cities)
    private readonly repository: Repository<Cities>,
  ) {}

  async execute(id: string, dto: UpdateCitiesDto, organizationId: string): Promise<Cities> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
