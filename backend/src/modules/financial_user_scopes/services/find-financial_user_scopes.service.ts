import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialUserScopes } from '../entities/financial_user_scopes.entity';

@Injectable()
export class FindFinancialUserScopesService {
  constructor(
    @InjectRepository(FinancialUserScopes)
    private readonly repository: Repository<FinancialUserScopes>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialUserScopes[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialUserScopes | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
