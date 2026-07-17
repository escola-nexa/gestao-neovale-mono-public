import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schools } from '../entities/schools.entity';

@Injectable()
export class UpdateSchoolService {
  constructor(
    @InjectRepository(Schools)
    private readonly schoolsRepository: Repository<Schools>,
  ) {}

  async execute(id: string, dto: any, organizationId: string): Promise<Schools> {
    const school = await this.schoolsRepository.findOne({
      where: { id, organizationId },
    });

    if (!school) {
      throw new NotFoundException('School not found or not in your organization');
    }

    Object.assign(school, dto);
    
    return await this.schoolsRepository.save(school);
  }
}
