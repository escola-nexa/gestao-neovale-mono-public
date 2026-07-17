import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorChildren } from '../entities/professor_children.entity';
import { CreateProfessorChildrenDto } from '../dto/create-professor_children.dto';

@Injectable()
export class CreateProfessorChildrenService {
  constructor(
    @InjectRepository(ProfessorChildren)
    private readonly repository: Repository<ProfessorChildren>,
  ) {}

  async execute(dto: CreateProfessorChildrenDto, organizationId: string): Promise<ProfessorChildren> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
