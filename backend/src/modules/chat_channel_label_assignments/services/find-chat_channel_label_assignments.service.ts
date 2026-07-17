import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelLabelAssignments } from '../entities/chat_channel_label_assignments.entity';

@Injectable()
export class FindChatChannelLabelAssignmentsService {
  constructor(
    @InjectRepository(ChatChannelLabelAssignments)
    private readonly repository: Repository<ChatChannelLabelAssignments>,
  ) {}

  async findAll(organizationId: string): Promise<ChatChannelLabelAssignments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatChannelLabelAssignments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
