import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrIndicationClasses } from '../entities/hr_indication_classes.entity';

@Injectable()
export class FindHrIndicationClassesService {
  constructor(
    @InjectRepository(HrIndicationClasses)
    private readonly repository: Repository<HrIndicationClasses>,
  ) {}

  async findAll(organizationId: string): Promise<HrIndicationClasses[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HrIndicationClasses | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
