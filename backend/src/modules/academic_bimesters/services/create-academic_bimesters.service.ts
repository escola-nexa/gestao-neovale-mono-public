import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicBimesters } from '../entities/academic_bimesters.entity';
import { CreateAcademicBimestersDto } from '../dto/create-academic_bimesters.dto';

@Injectable()
export class CreateAcademicBimestersService {
  constructor(
    @InjectRepository(AcademicBimesters)
    private readonly repository: Repository<AcademicBimesters>,
  ) {}

  async execute(dto: CreateAcademicBimestersDto, organizationId: string): Promise<AcademicBimesters> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
