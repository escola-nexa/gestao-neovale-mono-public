import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionCandidates } from '../entities/teacher_substitution_candidates.entity';
import { UpdateTeacherSubstitutionCandidatesDto } from '../dto/update-teacher_substitution_candidates.dto';

@Injectable()
export class UpdateTeacherSubstitutionCandidatesService {
  constructor(
    @InjectRepository(TeacherSubstitutionCandidates)
    private readonly repository: Repository<TeacherSubstitutionCandidates>,
  ) {}

  async execute(id: string, dto: UpdateTeacherSubstitutionCandidatesDto, organizationId: string): Promise<TeacherSubstitutionCandidates> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
