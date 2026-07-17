import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialProjects } from '../entities/financial_projects.entity';

@Injectable()
export class FindFinancialProjectsService {
  constructor(
    @InjectRepository(FinancialProjects)
    private readonly repository: Repository<FinancialProjects>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialProjects[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialProjects | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
