import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanLists } from '../entities/kanban_lists.entity';
import { CreateKanbanListsDto } from '../dto/create-kanban_lists.dto';

@Injectable()
export class CreateKanbanListsService {
  constructor(
    @InjectRepository(KanbanLists)
    private readonly repository: Repository<KanbanLists>,
  ) {}

  async execute(dto: CreateKanbanListsDto, organizationId: string): Promise<KanbanLists> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
