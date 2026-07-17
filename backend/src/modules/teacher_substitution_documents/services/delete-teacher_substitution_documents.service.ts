import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionDocuments } from '../entities/teacher_substitution_documents.entity';

@Injectable()
export class DeleteTeacherSubstitutionDocumentsService {
  constructor(
    @InjectRepository(TeacherSubstitutionDocuments)
    private readonly repository: Repository<TeacherSubstitutionDocuments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
