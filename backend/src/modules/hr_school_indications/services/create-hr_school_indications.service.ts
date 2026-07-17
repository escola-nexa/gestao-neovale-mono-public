import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSchoolIndications } from '../entities/hr_school_indications.entity';
import { CreateHrSchoolIndicationsDto } from '../dto/create-hr_school_indications.dto';

@Injectable()
export class CreateHrSchoolIndicationsService {
  constructor(
    @InjectRepository(HrSchoolIndications)
    private readonly repository: Repository<HrSchoolIndications>,
  ) {}

  async execute(dto: CreateHrSchoolIndicationsDto, organizationId: string): Promise<HrSchoolIndications> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
