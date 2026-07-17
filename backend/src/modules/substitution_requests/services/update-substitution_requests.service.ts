import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionRequests } from '../entities/substitution_requests.entity';
import { UpdateSubstitutionRequestsDto } from '../dto/update-substitution_requests.dto';

@Injectable()
export class UpdateSubstitutionRequestsService {
  constructor(
    @InjectRepository(SubstitutionRequests)
    private readonly repository: Repository<SubstitutionRequests>,
  ) {}

  async execute(id: string, dto: UpdateSubstitutionRequestsDto, organizationId: string): Promise<SubstitutionRequests> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
