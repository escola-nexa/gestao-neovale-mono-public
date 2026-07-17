import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalSignatures } from '../entities/digital_signatures.entity';

@Injectable()
export class FindDigitalSignaturesService {
  constructor(
    @InjectRepository(DigitalSignatures)
    private readonly repository: Repository<DigitalSignatures>,
  ) {}

  async findAll(organizationId: string): Promise<DigitalSignatures[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<DigitalSignatures | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
