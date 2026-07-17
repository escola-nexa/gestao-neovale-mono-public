import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionDocuments } from '../entities/teacher_substitution_documents.entity';

@Injectable()
export class FindTeacherSubstitutionDocumentsService {
  constructor(
    @InjectRepository(TeacherSubstitutionDocuments)
    private readonly repository: Repository<TeacherSubstitutionDocuments>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherSubstitutionDocuments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherSubstitutionDocuments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
