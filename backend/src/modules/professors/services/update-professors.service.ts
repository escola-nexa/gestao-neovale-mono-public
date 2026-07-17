import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Professors } from '../entities/professors.entity';
import { UpdateProfessorsDto } from '../dto/update-professors.dto';

@Injectable()
export class UpdateProfessorsService {
  constructor(
    @InjectRepository(Professors)
    private readonly repository: Repository<Professors>,
  ) {}

  async execute(id: string, dto: UpdateProfessorsDto, organizationId: string): Promise<Professors> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
