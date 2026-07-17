import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorChildren } from '../entities/professor_children.entity';

@Injectable()
export class FindProfessorChildrenService {
  constructor(
    @InjectRepository(ProfessorChildren)
    private readonly repository: Repository<ProfessorChildren>,
  ) {}

  async findAll(organizationId: string): Promise<ProfessorChildren[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ProfessorChildren | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
