import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteCities } from '../entities/visit_route_cities.entity';
import { UpdateVisitRouteCitiesDto } from '../dto/update-visit_route_cities.dto';

@Injectable()
export class UpdateVisitRouteCitiesService {
  constructor(
    @InjectRepository(VisitRouteCities)
    private readonly repository: Repository<VisitRouteCities>,
  ) {}

  async execute(id: string, dto: UpdateVisitRouteCitiesDto, organizationId: string): Promise<VisitRouteCities> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
