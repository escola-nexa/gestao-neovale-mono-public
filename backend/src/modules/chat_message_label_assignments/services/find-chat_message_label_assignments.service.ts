import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageLabelAssignments } from '../entities/chat_message_label_assignments.entity';

@Injectable()
export class FindChatMessageLabelAssignmentsService {
  constructor(
    @InjectRepository(ChatMessageLabelAssignments)
    private readonly repository: Repository<ChatMessageLabelAssignments>,
  ) {}

  async findAll(organizationId: string): Promise<ChatMessageLabelAssignments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatMessageLabelAssignments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
