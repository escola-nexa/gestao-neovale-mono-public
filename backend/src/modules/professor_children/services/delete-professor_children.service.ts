import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorChildren } from '../entities/professor_children.entity';

@Injectable()
export class DeleteProfessorChildrenService {
  constructor(
    @InjectRepository(ProfessorChildren)
    private readonly repository: Repository<ProfessorChildren>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
