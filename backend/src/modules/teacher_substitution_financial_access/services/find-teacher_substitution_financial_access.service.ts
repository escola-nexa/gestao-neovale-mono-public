import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionFinancialAccess } from '../entities/teacher_substitution_financial_access.entity';

@Injectable()
export class FindTeacherSubstitutionFinancialAccessService {
  constructor(
    @InjectRepository(TeacherSubstitutionFinancialAccess)
    private readonly repository: Repository<TeacherSubstitutionFinancialAccess>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherSubstitutionFinancialAccess[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherSubstitutionFinancialAccess | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
