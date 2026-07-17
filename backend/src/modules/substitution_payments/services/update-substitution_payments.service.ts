import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionPayments } from '../entities/substitution_payments.entity';
import { UpdateSubstitutionPaymentsDto } from '../dto/update-substitution_payments.dto';

@Injectable()
export class UpdateSubstitutionPaymentsService {
  constructor(
    @InjectRepository(SubstitutionPayments)
    private readonly repository: Repository<SubstitutionPayments>,
  ) {}

  async execute(id: string, dto: UpdateSubstitutionPaymentsDto, organizationId: string): Promise<SubstitutionPayments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
