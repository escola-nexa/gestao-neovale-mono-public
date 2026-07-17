import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionSettings } from '../entities/teacher_substitution_settings.entity';

@Injectable()
export class DeleteTeacherSubstitutionSettingsService {
  constructor(
    @InjectRepository(TeacherSubstitutionSettings)
    private readonly repository: Repository<TeacherSubstitutionSettings>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
