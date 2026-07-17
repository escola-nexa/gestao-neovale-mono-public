import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Professors } from '../entities/professors.entity';
import { CreateProfessorsDto } from '../dto/create-professors.dto';

@Injectable()
export class CreateProfessorsService {
  constructor(
    @InjectRepository(Professors)
    private readonly repository: Repository<Professors>,
  ) {}

  async execute(dto: CreateProfessorsDto, organizationId: string): Promise<Professors> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
