import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionOccurrences } from '../entities/teacher_substitution_occurrences.entity';
import { CreateTeacherSubstitutionOccurrencesDto } from '../dto/create-teacher_substitution_occurrences.dto';

@Injectable()
export class CreateTeacherSubstitutionOccurrencesService {
  constructor(
    @InjectRepository(TeacherSubstitutionOccurrences)
    private readonly repository: Repository<TeacherSubstitutionOccurrences>,
  ) {}

  async execute(dto: CreateTeacherSubstitutionOccurrencesDto, organizationId: string): Promise<TeacherSubstitutionOccurrences> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
