import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageLabels } from '../entities/chat_message_labels.entity';
import { UpdateChatMessageLabelsDto } from '../dto/update-chat_message_labels.dto';

@Injectable()
export class UpdateChatMessageLabelsService {
  constructor(
    @InjectRepository(ChatMessageLabels)
    private readonly repository: Repository<ChatMessageLabels>,
  ) {}

  async execute(id: string, dto: UpdateChatMessageLabelsDto, organizationId: string): Promise<ChatMessageLabels> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
