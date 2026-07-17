import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanLists } from '../entities/kanban_lists.entity';

@Injectable()
export class DeleteKanbanListsService {
  constructor(
    @InjectRepository(KanbanLists)
    private readonly repository: Repository<KanbanLists>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
