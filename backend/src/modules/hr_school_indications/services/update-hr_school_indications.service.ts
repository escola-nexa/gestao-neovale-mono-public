import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSchoolIndications } from '../entities/hr_school_indications.entity';
import { UpdateHrSchoolIndicationsDto } from '../dto/update-hr_school_indications.dto';

@Injectable()
export class UpdateHrSchoolIndicationsService {
  constructor(
    @InjectRepository(HrSchoolIndications)
    private readonly repository: Repository<HrSchoolIndications>,
  ) {}

  async execute(id: string, dto: UpdateHrSchoolIndicationsDto, organizationId: string): Promise<HrSchoolIndications> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
