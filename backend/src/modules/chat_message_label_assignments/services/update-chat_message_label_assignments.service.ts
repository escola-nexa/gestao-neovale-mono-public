import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageLabelAssignments } from '../entities/chat_message_label_assignments.entity';
import { UpdateChatMessageLabelAssignmentsDto } from '../dto/update-chat_message_label_assignments.dto';

@Injectable()
export class UpdateChatMessageLabelAssignmentsService {
  constructor(
    @InjectRepository(ChatMessageLabelAssignments)
    private readonly repository: Repository<ChatMessageLabelAssignments>,
  ) {}

  async execute(id: string, dto: UpdateChatMessageLabelAssignmentsDto, organizationId: string): Promise<ChatMessageLabelAssignments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
