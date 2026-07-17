import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSubjectModality } from '../entities/class_subject_modality.entity';
import { CreateClassSubjectModalityDto } from '../dto/create-class_subject_modality.dto';

@Injectable()
export class CreateClassSubjectModalityService {
  constructor(
    @InjectRepository(ClassSubjectModality)
    private readonly repository: Repository<ClassSubjectModality>,
  ) {}

  async execute(dto: CreateClassSubjectModalityDto, organizationId: string): Promise<ClassSubjectModality> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
