import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionStatusHistory } from '../entities/teacher_substitution_status_history.entity';

@Injectable()
export class DeleteTeacherSubstitutionStatusHistoryService {
  constructor(
    @InjectRepository(TeacherSubstitutionStatusHistory)
    private readonly repository: Repository<TeacherSubstitutionStatusHistory>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
