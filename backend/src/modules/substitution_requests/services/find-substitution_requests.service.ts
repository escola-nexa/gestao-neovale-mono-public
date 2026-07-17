import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionRequests } from '../entities/substitution_requests.entity';

@Injectable()
export class FindSubstitutionRequestsService {
  constructor(
    @InjectRepository(SubstitutionRequests)
    private readonly repository: Repository<SubstitutionRequests>,
  ) {}

  async findAll(organizationId: string): Promise<SubstitutionRequests[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SubstitutionRequests | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
