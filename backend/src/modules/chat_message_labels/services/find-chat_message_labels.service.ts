import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageLabels } from '../entities/chat_message_labels.entity';

@Injectable()
export class FindChatMessageLabelsService {
  constructor(
    @InjectRepository(ChatMessageLabels)
    private readonly repository: Repository<ChatMessageLabels>,
  ) {}

  async findAll(organizationId: string): Promise<ChatMessageLabels[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatMessageLabels | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
