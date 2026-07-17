import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialProjects } from '../entities/financial_projects.entity';
import { UpdateFinancialProjectsDto } from '../dto/update-financial_projects.dto';

@Injectable()
export class UpdateFinancialProjectsService {
  constructor(
    @InjectRepository(FinancialProjects)
    private readonly repository: Repository<FinancialProjects>,
  ) {}

  async execute(id: string, dto: UpdateFinancialProjectsDto, organizationId: string): Promise<FinancialProjects> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
