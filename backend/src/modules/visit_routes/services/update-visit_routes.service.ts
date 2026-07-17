import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRoutes } from '../entities/visit_routes.entity';
import { UpdateVisitRoutesDto } from '../dto/update-visit_routes.dto';

@Injectable()
export class UpdateVisitRoutesService {
  constructor(
    @InjectRepository(VisitRoutes)
    private readonly repository: Repository<VisitRoutes>,
  ) {}

  async execute(id: string, dto: UpdateVisitRoutesDto, organizationId: string): Promise<VisitRoutes> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
