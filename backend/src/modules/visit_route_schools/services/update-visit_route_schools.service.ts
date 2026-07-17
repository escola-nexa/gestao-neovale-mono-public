import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteSchools } from '../entities/visit_route_schools.entity';
import { UpdateVisitRouteSchoolsDto } from '../dto/update-visit_route_schools.dto';

@Injectable()
export class UpdateVisitRouteSchoolsService {
  constructor(
    @InjectRepository(VisitRouteSchools)
    private readonly repository: Repository<VisitRouteSchools>,
  ) {}

  async execute(id: string, dto: UpdateVisitRouteSchoolsDto, organizationId: string): Promise<VisitRouteSchools> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
