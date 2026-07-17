import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelLabelAssignments } from '../entities/chat_channel_label_assignments.entity';
import { UpdateChatChannelLabelAssignmentsDto } from '../dto/update-chat_channel_label_assignments.dto';

@Injectable()
export class UpdateChatChannelLabelAssignmentsService {
  constructor(
    @InjectRepository(ChatChannelLabelAssignments)
    private readonly repository: Repository<ChatChannelLabelAssignments>,
  ) {}

  async execute(id: string, dto: UpdateChatChannelLabelAssignmentsDto, organizationId: string): Promise<ChatChannelLabelAssignments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
