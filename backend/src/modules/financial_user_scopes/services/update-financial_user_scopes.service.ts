import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialUserScopes } from '../entities/financial_user_scopes.entity';
import { UpdateFinancialUserScopesDto } from '../dto/update-financial_user_scopes.dto';

@Injectable()
export class UpdateFinancialUserScopesService {
  constructor(
    @InjectRepository(FinancialUserScopes)
    private readonly repository: Repository<FinancialUserScopes>,
  ) {}

  async execute(id: string, dto: UpdateFinancialUserScopesDto, organizationId: string): Promise<FinancialUserScopes> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
