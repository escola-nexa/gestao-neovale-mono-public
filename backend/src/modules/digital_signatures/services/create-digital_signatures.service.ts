import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalSignatures } from '../entities/digital_signatures.entity';
import { CreateDigitalSignaturesDto } from '../dto/create-digital_signatures.dto';

@Injectable()
export class CreateDigitalSignaturesService {
  constructor(
    @InjectRepository(DigitalSignatures)
    private readonly repository: Repository<DigitalSignatures>,
  ) {}

  async execute(dto: CreateDigitalSignaturesDto, organizationId: string): Promise<DigitalSignatures> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
