import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialUserScopes } from '../entities/financial_user_scopes.entity';
import { CreateFinancialUserScopesDto } from '../dto/create-financial_user_scopes.dto';

@Injectable()
export class CreateFinancialUserScopesService {
  constructor(
    @InjectRepository(FinancialUserScopes)
    private readonly repository: Repository<FinancialUserScopes>,
  ) {}

  async execute(dto: CreateFinancialUserScopesDto, organizationId: string): Promise<FinancialUserScopes> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
