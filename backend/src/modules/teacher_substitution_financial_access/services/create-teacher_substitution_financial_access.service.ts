import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionFinancialAccess } from '../entities/teacher_substitution_financial_access.entity';
import { CreateTeacherSubstitutionFinancialAccessDto } from '../dto/create-teacher_substitution_financial_access.dto';

@Injectable()
export class CreateTeacherSubstitutionFinancialAccessService {
  constructor(
    @InjectRepository(TeacherSubstitutionFinancialAccess)
    private readonly repository: Repository<TeacherSubstitutionFinancialAccess>,
  ) {}

  async execute(dto: CreateTeacherSubstitutionFinancialAccessDto, organizationId: string): Promise<TeacherSubstitutionFinancialAccess> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
