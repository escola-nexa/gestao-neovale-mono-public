import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionSettings } from '../entities/teacher_substitution_settings.entity';
import { CreateTeacherSubstitutionSettingsDto } from '../dto/create-teacher_substitution_settings.dto';

@Injectable()
export class CreateTeacherSubstitutionSettingsService {
  constructor(
    @InjectRepository(TeacherSubstitutionSettings)
    private readonly repository: Repository<TeacherSubstitutionSettings>,
  ) {}

  async execute(dto: CreateTeacherSubstitutionSettingsDto, organizationId: string): Promise<TeacherSubstitutionSettings> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
