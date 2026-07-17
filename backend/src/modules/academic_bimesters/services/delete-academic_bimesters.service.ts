import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicBimesters } from '../entities/academic_bimesters.entity';

@Injectable()
export class DeleteAcademicBimestersService {
  constructor(
    @InjectRepository(AcademicBimesters)
    private readonly repository: Repository<AcademicBimesters>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
