import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteCities } from '../entities/visit_route_cities.entity';

@Injectable()
export class DeleteVisitRouteCitiesService {
  constructor(
    @InjectRepository(VisitRouteCities)
    private readonly repository: Repository<VisitRouteCities>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
