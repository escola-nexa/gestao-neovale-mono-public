import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cities } from '../entities/cities.entity';
import { CreateCitiesDto } from '../dto/create-cities.dto';

@Injectable()
export class CreateCitiesService {
  constructor(
    @InjectRepository(Cities)
    private readonly repository: Repository<Cities>,
  ) {}

  async execute(dto: CreateCitiesDto, organizationId: string): Promise<Cities> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
