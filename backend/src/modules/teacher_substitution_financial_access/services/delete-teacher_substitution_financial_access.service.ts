import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionFinancialAccess } from '../entities/teacher_substitution_financial_access.entity';

@Injectable()
export class DeleteTeacherSubstitutionFinancialAccessService {
  constructor(
    @InjectRepository(TeacherSubstitutionFinancialAccess)
    private readonly repository: Repository<TeacherSubstitutionFinancialAccess>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
