import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cities } from '../entities/cities.entity';

@Injectable()
export class FindCitiesService {
  constructor(
    @InjectRepository(Cities)
    private readonly repository: Repository<Cities>,
  ) {}

  async findAll(organizationId: string): Promise<Cities[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<Cities | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
