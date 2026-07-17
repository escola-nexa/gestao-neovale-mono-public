import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionOccurrences } from '../entities/teacher_substitution_occurrences.entity';

@Injectable()
export class FindTeacherSubstitutionOccurrencesService {
  constructor(
    @InjectRepository(TeacherSubstitutionOccurrences)
    private readonly repository: Repository<TeacherSubstitutionOccurrences>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherSubstitutionOccurrences[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherSubstitutionOccurrences | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
