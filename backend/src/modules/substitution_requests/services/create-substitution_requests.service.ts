import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionRequests } from '../entities/substitution_requests.entity';
import { CreateSubstitutionRequestsDto } from '../dto/create-substitution_requests.dto';

@Injectable()
export class CreateSubstitutionRequestsService {
  constructor(
    @InjectRepository(SubstitutionRequests)
    private readonly repository: Repository<SubstitutionRequests>,
  ) {}

  async execute(dto: CreateSubstitutionRequestsDto, organizationId: string): Promise<SubstitutionRequests> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
