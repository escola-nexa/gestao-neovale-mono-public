import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSubjectModality } from '../entities/class_subject_modality.entity';

@Injectable()
export class FindClassSubjectModalityService {
  constructor(
    @InjectRepository(ClassSubjectModality)
    private readonly repository: Repository<ClassSubjectModality>,
  ) {}

  async findAll(organizationId: string): Promise<ClassSubjectModality[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ClassSubjectModality | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
