import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelLabelAssignments } from '../entities/chat_channel_label_assignments.entity';
import { CreateChatChannelLabelAssignmentsDto } from '../dto/create-chat_channel_label_assignments.dto';

@Injectable()
export class CreateChatChannelLabelAssignmentsService {
  constructor(
    @InjectRepository(ChatChannelLabelAssignments)
    private readonly repository: Repository<ChatChannelLabelAssignments>,
  ) {}

  async execute(dto: CreateChatChannelLabelAssignmentsDto, organizationId: string): Promise<ChatChannelLabelAssignments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
