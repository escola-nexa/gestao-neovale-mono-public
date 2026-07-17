import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalSignatures } from '../entities/digital_signatures.entity';

@Injectable()
export class DeleteDigitalSignaturesService {
  constructor(
    @InjectRepository(DigitalSignatures)
    private readonly repository: Repository<DigitalSignatures>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
