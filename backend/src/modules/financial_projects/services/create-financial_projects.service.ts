import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialProjects } from '../entities/financial_projects.entity';
import { CreateFinancialProjectsDto } from '../dto/create-financial_projects.dto';

@Injectable()
export class CreateFinancialProjectsService {
  constructor(
    @InjectRepository(FinancialProjects)
    private readonly repository: Repository<FinancialProjects>,
  ) {}

  async execute(dto: CreateFinancialProjectsDto, organizationId: string): Promise<FinancialProjects> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
