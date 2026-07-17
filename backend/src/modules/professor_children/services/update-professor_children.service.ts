import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorChildren } from '../entities/professor_children.entity';
import { UpdateProfessorChildrenDto } from '../dto/update-professor_children.dto';

@Injectable()
export class UpdateProfessorChildrenService {
  constructor(
    @InjectRepository(ProfessorChildren)
    private readonly repository: Repository<ProfessorChildren>,
  ) {}

  async execute(id: string, dto: UpdateProfessorChildrenDto, organizationId: string): Promise<ProfessorChildren> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
