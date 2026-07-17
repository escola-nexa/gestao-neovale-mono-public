import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelLabelAssignments } from '../entities/chat_channel_label_assignments.entity';

@Injectable()
export class DeleteChatChannelLabelAssignmentsService {
  constructor(
    @InjectRepository(ChatChannelLabelAssignments)
    private readonly repository: Repository<ChatChannelLabelAssignments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
