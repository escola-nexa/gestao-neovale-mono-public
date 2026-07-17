import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionSettings } from '../entities/teacher_substitution_settings.entity';

@Injectable()
export class FindTeacherSubstitutionSettingsService {
  constructor(
    @InjectRepository(TeacherSubstitutionSettings)
    private readonly repository: Repository<TeacherSubstitutionSettings>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherSubstitutionSettings[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherSubstitutionSettings | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
