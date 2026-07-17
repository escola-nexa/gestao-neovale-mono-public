import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalSignatures } from '../entities/digital_signatures.entity';
import { UpdateDigitalSignaturesDto } from '../dto/update-digital_signatures.dto';

@Injectable()
export class UpdateDigitalSignaturesService {
  constructor(
    @InjectRepository(DigitalSignatures)
    private readonly repository: Repository<DigitalSignatures>,
  ) {}

  async execute(id: string, dto: UpdateDigitalSignaturesDto, organizationId: string): Promise<DigitalSignatures> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
