import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionPayments } from '../entities/substitution_payments.entity';
import { CreateSubstitutionPaymentsDto } from '../dto/create-substitution_payments.dto';

@Injectable()
export class CreateSubstitutionPaymentsService {
  constructor(
    @InjectRepository(SubstitutionPayments)
    private readonly repository: Repository<SubstitutionPayments>,
  ) {}

  async execute(dto: CreateSubstitutionPaymentsDto, organizationId: string): Promise<SubstitutionPayments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
