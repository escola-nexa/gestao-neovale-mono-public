import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSubjectModality } from '../entities/class_subject_modality.entity';

@Injectable()
export class DeleteClassSubjectModalityService {
  constructor(
    @InjectRepository(ClassSubjectModality)
    private readonly repository: Repository<ClassSubjectModality>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
