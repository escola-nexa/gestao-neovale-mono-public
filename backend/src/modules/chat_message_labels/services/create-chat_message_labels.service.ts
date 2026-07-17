import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageLabels } from '../entities/chat_message_labels.entity';
import { CreateChatMessageLabelsDto } from '../dto/create-chat_message_labels.dto';

@Injectable()
export class CreateChatMessageLabelsService {
  constructor(
    @InjectRepository(ChatMessageLabels)
    private readonly repository: Repository<ChatMessageLabels>,
  ) {}

  async execute(dto: CreateChatMessageLabelsDto, organizationId: string): Promise<ChatMessageLabels> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
