import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRoutes } from '../entities/visit_routes.entity';
import { CreateVisitRoutesDto } from '../dto/create-visit_routes.dto';

@Injectable()
export class CreateVisitRoutesService {
  constructor(
    @InjectRepository(VisitRoutes)
    private readonly repository: Repository<VisitRoutes>,
  ) {}

  async execute(dto: CreateVisitRoutesDto, organizationId: string): Promise<VisitRoutes> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
