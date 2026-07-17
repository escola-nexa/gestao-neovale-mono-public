import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionDocuments } from '../entities/teacher_substitution_documents.entity';
import { CreateTeacherSubstitutionDocumentsDto } from '../dto/create-teacher_substitution_documents.dto';

@Injectable()
export class CreateTeacherSubstitutionDocumentsService {
  constructor(
    @InjectRepository(TeacherSubstitutionDocuments)
    private readonly repository: Repository<TeacherSubstitutionDocuments>,
  ) {}

  async execute(dto: CreateTeacherSubstitutionDocumentsDto, organizationId: string): Promise<TeacherSubstitutionDocuments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
