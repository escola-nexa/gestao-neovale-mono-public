import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteCities } from '../entities/visit_route_cities.entity';
import { CreateVisitRouteCitiesDto } from '../dto/create-visit_route_cities.dto';

@Injectable()
export class CreateVisitRouteCitiesService {
  constructor(
    @InjectRepository(VisitRouteCities)
    private readonly repository: Repository<VisitRouteCities>,
  ) {}

  async execute(dto: CreateVisitRouteCitiesDto, organizationId: string): Promise<VisitRouteCities> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
