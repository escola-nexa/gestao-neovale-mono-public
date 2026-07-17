import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionOccurrences } from '../entities/teacher_substitution_occurrences.entity';

@Injectable()
export class DeleteTeacherSubstitutionOccurrencesService {
  constructor(
    @InjectRepository(TeacherSubstitutionOccurrences)
    private readonly repository: Repository<TeacherSubstitutionOccurrences>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
