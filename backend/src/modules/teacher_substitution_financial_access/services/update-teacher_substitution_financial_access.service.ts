import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionFinancialAccess } from '../entities/teacher_substitution_financial_access.entity';
import { UpdateTeacherSubstitutionFinancialAccessDto } from '../dto/update-teacher_substitution_financial_access.dto';

@Injectable()
export class UpdateTeacherSubstitutionFinancialAccessService {
  constructor(
    @InjectRepository(TeacherSubstitutionFinancialAccess)
    private readonly repository: Repository<TeacherSubstitutionFinancialAccess>,
  ) {}

  async execute(id: string, dto: UpdateTeacherSubstitutionFinancialAccessDto, organizationId: string): Promise<TeacherSubstitutionFinancialAccess> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
