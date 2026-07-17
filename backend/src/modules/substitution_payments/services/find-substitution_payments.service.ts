import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionPayments } from '../entities/substitution_payments.entity';

@Injectable()
export class FindSubstitutionPaymentsService {
  constructor(
    @InjectRepository(SubstitutionPayments)
    private readonly repository: Repository<SubstitutionPayments>,
  ) {}

  async findAll(organizationId: string): Promise<SubstitutionPayments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SubstitutionPayments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
