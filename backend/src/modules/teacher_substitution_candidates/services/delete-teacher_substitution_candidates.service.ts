import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionCandidates } from '../entities/teacher_substitution_candidates.entity';

@Injectable()
export class DeleteTeacherSubstitutionCandidatesService {
  constructor(
    @InjectRepository(TeacherSubstitutionCandidates)
    private readonly repository: Repository<TeacherSubstitutionCandidates>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
