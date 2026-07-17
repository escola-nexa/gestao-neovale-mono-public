import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionStatusHistory } from '../entities/teacher_substitution_status_history.entity';
import { UpdateTeacherSubstitutionStatusHistoryDto } from '../dto/update-teacher_substitution_status_history.dto';

@Injectable()
export class UpdateTeacherSubstitutionStatusHistoryService {
  constructor(
    @InjectRepository(TeacherSubstitutionStatusHistory)
    private readonly repository: Repository<TeacherSubstitutionStatusHistory>,
  ) {}

  async execute(id: string, dto: UpdateTeacherSubstitutionStatusHistoryDto, organizationId: string): Promise<TeacherSubstitutionStatusHistory> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
