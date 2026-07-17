import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrIndicationClasses } from '../entities/hr_indication_classes.entity';
import { CreateHrIndicationClassesDto } from '../dto/create-hr_indication_classes.dto';

@Injectable()
export class CreateHrIndicationClassesService {
  constructor(
    @InjectRepository(HrIndicationClasses)
    private readonly repository: Repository<HrIndicationClasses>,
  ) {}

  async execute(dto: CreateHrIndicationClassesDto, organizationId: string): Promise<HrIndicationClasses> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
