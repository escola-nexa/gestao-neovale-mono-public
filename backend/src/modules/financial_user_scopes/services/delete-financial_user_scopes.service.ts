import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialUserScopes } from '../entities/financial_user_scopes.entity';

@Injectable()
export class DeleteFinancialUserScopesService {
  constructor(
    @InjectRepository(FinancialUserScopes)
    private readonly repository: Repository<FinancialUserScopes>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
