import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionCandidates } from '../entities/teacher_substitution_candidates.entity';

@Injectable()
export class FindTeacherSubstitutionCandidatesService {
  constructor(
    @InjectRepository(TeacherSubstitutionCandidates)
    private readonly repository: Repository<TeacherSubstitutionCandidates>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherSubstitutionCandidates[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherSubstitutionCandidates | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
