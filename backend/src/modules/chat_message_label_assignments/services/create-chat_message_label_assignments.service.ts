import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageLabelAssignments } from '../entities/chat_message_label_assignments.entity';
import { CreateChatMessageLabelAssignmentsDto } from '../dto/create-chat_message_label_assignments.dto';

@Injectable()
export class CreateChatMessageLabelAssignmentsService {
  constructor(
    @InjectRepository(ChatMessageLabelAssignments)
    private readonly repository: Repository<ChatMessageLabelAssignments>,
  ) {}

  async execute(dto: CreateChatMessageLabelAssignmentsDto, organizationId: string): Promise<ChatMessageLabelAssignments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
