import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteSchools } from '../entities/visit_route_schools.entity';
import { CreateVisitRouteSchoolsDto } from '../dto/create-visit_route_schools.dto';

@Injectable()
export class CreateVisitRouteSchoolsService {
  constructor(
    @InjectRepository(VisitRouteSchools)
    private readonly repository: Repository<VisitRouteSchools>,
  ) {}

  async execute(dto: CreateVisitRouteSchoolsDto, organizationId: string): Promise<VisitRouteSchools> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
