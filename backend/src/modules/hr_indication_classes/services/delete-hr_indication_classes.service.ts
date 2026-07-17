import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrIndicationClasses } from '../entities/hr_indication_classes.entity';

@Injectable()
export class DeleteHrIndicationClassesService {
  constructor(
    @InjectRepository(HrIndicationClasses)
    private readonly repository: Repository<HrIndicationClasses>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
