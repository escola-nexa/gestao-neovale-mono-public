import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSubjectModality } from '../entities/class_subject_modality.entity';
import { UpdateClassSubjectModalityDto } from '../dto/update-class_subject_modality.dto';

@Injectable()
export class UpdateClassSubjectModalityService {
  constructor(
    @InjectRepository(ClassSubjectModality)
    private readonly repository: Repository<ClassSubjectModality>,
  ) {}

  async execute(id: string, dto: UpdateClassSubjectModalityDto, organizationId: string): Promise<ClassSubjectModality> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
