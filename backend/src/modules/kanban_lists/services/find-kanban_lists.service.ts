import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanLists } from '../entities/kanban_lists.entity';

@Injectable()
export class FindKanbanListsService {
  constructor(
    @InjectRepository(KanbanLists)
    private readonly repository: Repository<KanbanLists>,
  ) {}

  async findAll(organizationId: string): Promise<KanbanLists[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<KanbanLists | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
