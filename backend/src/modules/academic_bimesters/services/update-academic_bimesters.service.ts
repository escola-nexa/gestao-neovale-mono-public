import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicBimesters } from '../entities/academic_bimesters.entity';
import { UpdateAcademicBimestersDto } from '../dto/update-academic_bimesters.dto';

@Injectable()
export class UpdateAcademicBimestersService {
  constructor(
    @InjectRepository(AcademicBimesters)
    private readonly repository: Repository<AcademicBimesters>,
  ) {}

  async execute(id: string, dto: UpdateAcademicBimestersDto, organizationId: string): Promise<AcademicBimesters> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
