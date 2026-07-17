import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionSettings } from '../entities/teacher_substitution_settings.entity';
import { UpdateTeacherSubstitutionSettingsDto } from '../dto/update-teacher_substitution_settings.dto';

@Injectable()
export class UpdateTeacherSubstitutionSettingsService {
  constructor(
    @InjectRepository(TeacherSubstitutionSettings)
    private readonly repository: Repository<TeacherSubstitutionSettings>,
  ) {}

  async execute(id: string, dto: UpdateTeacherSubstitutionSettingsDto, organizationId: string): Promise<TeacherSubstitutionSettings> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
