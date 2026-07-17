import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionStatusHistory } from '../entities/teacher_substitution_status_history.entity';
import { CreateTeacherSubstitutionStatusHistoryDto } from '../dto/create-teacher_substitution_status_history.dto';

@Injectable()
export class CreateTeacherSubstitutionStatusHistoryService {
  constructor(
    @InjectRepository(TeacherSubstitutionStatusHistory)
    private readonly repository: Repository<TeacherSubstitutionStatusHistory>,
  ) {}

  async execute(dto: CreateTeacherSubstitutionStatusHistoryDto, organizationId: string): Promise<TeacherSubstitutionStatusHistory> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
