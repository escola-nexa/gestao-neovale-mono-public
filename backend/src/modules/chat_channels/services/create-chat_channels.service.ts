import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannels } from '../entities/chat_channels.entity';
import { CreateChatChannelsDto } from '../dto/create-chat_channels.dto';

@Injectable()
export class CreateChatChannelsService {
  constructor(
    @InjectRepository(ChatChannels)
    private readonly repository: Repository<ChatChannels>,
  ) {}

  async execute(dto: CreateChatChannelsDto, organizationId: string): Promise<ChatChannels> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
