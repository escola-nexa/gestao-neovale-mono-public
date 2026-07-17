import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionDocuments } from '../entities/teacher_substitution_documents.entity';
import { UpdateTeacherSubstitutionDocumentsDto } from '../dto/update-teacher_substitution_documents.dto';

@Injectable()
export class UpdateTeacherSubstitutionDocumentsService {
  constructor(
    @InjectRepository(TeacherSubstitutionDocuments)
    private readonly repository: Repository<TeacherSubstitutionDocuments>,
  ) {}

  async execute(id: string, dto: UpdateTeacherSubstitutionDocumentsDto, organizationId: string): Promise<TeacherSubstitutionDocuments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
