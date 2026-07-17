import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionRequests } from '../entities/substitution_requests.entity';

@Injectable()
export class DeleteSubstitutionRequestsService {
  constructor(
    @InjectRepository(SubstitutionRequests)
    private readonly repository: Repository<SubstitutionRequests>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
