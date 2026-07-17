import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionOccurrences } from '../entities/teacher_substitution_occurrences.entity';
import { UpdateTeacherSubstitutionOccurrencesDto } from '../dto/update-teacher_substitution_occurrences.dto';

@Injectable()
export class UpdateTeacherSubstitutionOccurrencesService {
  constructor(
    @InjectRepository(TeacherSubstitutionOccurrences)
    private readonly repository: Repository<TeacherSubstitutionOccurrences>,
  ) {}

  async execute(id: string, dto: UpdateTeacherSubstitutionOccurrencesDto, organizationId: string): Promise<TeacherSubstitutionOccurrences> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
