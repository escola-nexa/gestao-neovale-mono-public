import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannels } from '../entities/chat_channels.entity';
import { UpdateChatChannelsDto } from '../dto/update-chat_channels.dto';

@Injectable()
export class UpdateChatChannelsService {
  constructor(
    @InjectRepository(ChatChannels)
    private readonly repository: Repository<ChatChannels>,
  ) {}

  async execute(id: string, dto: UpdateChatChannelsDto, organizationId: string): Promise<ChatChannels> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
