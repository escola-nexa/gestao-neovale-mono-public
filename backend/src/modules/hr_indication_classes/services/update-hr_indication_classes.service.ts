import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrIndicationClasses } from '../entities/hr_indication_classes.entity';
import { UpdateHrIndicationClassesDto } from '../dto/update-hr_indication_classes.dto';

@Injectable()
export class UpdateHrIndicationClassesService {
  constructor(
    @InjectRepository(HrIndicationClasses)
    private readonly repository: Repository<HrIndicationClasses>,
  ) {}

  async execute(id: string, dto: UpdateHrIndicationClassesDto, organizationId: string): Promise<HrIndicationClasses> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
