import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schools } from '../entities/schools.entity';

@Injectable()
export class CreateSchoolService {
  constructor(
    @InjectRepository(Schools)
    private readonly schoolsRepository: Repository<Schools>,
  ) {}

  async execute(dto: any, organizationId: string): Promise<Schools> {
    const school = this.schoolsRepository.create({
      ...dto,
      organizationId,
    });
    return await this.schoolsRepository.save(school as any);
  }
}
