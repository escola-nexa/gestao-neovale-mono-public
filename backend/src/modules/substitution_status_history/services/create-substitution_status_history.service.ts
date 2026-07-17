import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionStatusHistory } from '../entities/substitution_status_history.entity';
import { CreateSubstitutionStatusHistoryDto } from '../dto/create-substitution_status_history.dto';

@Injectable()
export class CreateSubstitutionStatusHistoryService {
  constructor(
    @InjectRepository(SubstitutionStatusHistory)
    private readonly repository: Repository<SubstitutionStatusHistory>,
  ) {}

  async execute(dto: CreateSubstitutionStatusHistoryDto, organizationId: string): Promise<SubstitutionStatusHistory> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
