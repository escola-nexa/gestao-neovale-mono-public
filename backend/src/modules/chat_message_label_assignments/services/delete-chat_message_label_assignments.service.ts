import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageLabelAssignments } from '../entities/chat_message_label_assignments.entity';

@Injectable()
export class DeleteChatMessageLabelAssignmentsService {
  constructor(
    @InjectRepository(ChatMessageLabelAssignments)
    private readonly repository: Repository<ChatMessageLabelAssignments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
