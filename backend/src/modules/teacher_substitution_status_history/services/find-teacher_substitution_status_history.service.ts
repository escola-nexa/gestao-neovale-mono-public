import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionStatusHistory } from '../entities/teacher_substitution_status_history.entity';

@Injectable()
export class FindTeacherSubstitutionStatusHistoryService {
  constructor(
    @InjectRepository(TeacherSubstitutionStatusHistory)
    private readonly repository: Repository<TeacherSubstitutionStatusHistory>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherSubstitutionStatusHistory[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherSubstitutionStatusHistory | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
