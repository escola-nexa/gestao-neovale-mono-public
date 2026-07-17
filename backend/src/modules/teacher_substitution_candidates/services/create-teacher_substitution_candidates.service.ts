import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionCandidates } from '../entities/teacher_substitution_candidates.entity';
import { CreateTeacherSubstitutionCandidatesDto } from '../dto/create-teacher_substitution_candidates.dto';

@Injectable()
export class CreateTeacherSubstitutionCandidatesService {
  constructor(
    @InjectRepository(TeacherSubstitutionCandidates)
    private readonly repository: Repository<TeacherSubstitutionCandidates>,
  ) {}

  async execute(dto: CreateTeacherSubstitutionCandidatesDto, organizationId: string): Promise<TeacherSubstitutionCandidates> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
