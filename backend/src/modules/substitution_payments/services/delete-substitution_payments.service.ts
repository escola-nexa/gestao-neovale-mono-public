import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionPayments } from '../entities/substitution_payments.entity';

@Injectable()
export class DeleteSubstitutionPaymentsService {
  constructor(
    @InjectRepository(SubstitutionPayments)
    private readonly repository: Repository<SubstitutionPayments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
