import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelLabels } from '../entities/chat_channel_labels.entity';
import { CreateChatChannelLabelsDto } from '../dto/create-chat_channel_labels.dto';

@Injectable()
export class CreateChatChannelLabelsService {
  constructor(
    @InjectRepository(ChatChannelLabels)
    private readonly repository: Repository<ChatChannelLabels>,
  ) {}

  async execute(dto: CreateChatChannelLabelsDto, organizationId: string): Promise<ChatChannelLabels> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
