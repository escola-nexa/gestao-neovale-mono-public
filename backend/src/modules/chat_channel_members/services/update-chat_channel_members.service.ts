import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelMembers } from '../entities/chat_channel_members.entity';
import { UpdateChatChannelMembersDto } from '../dto/update-chat_channel_members.dto';

@Injectable()
export class UpdateChatChannelMembersService {
  constructor(
    @InjectRepository(ChatChannelMembers)
    private readonly repository: Repository<ChatChannelMembers>,
  ) {}

  async execute(id: string, dto: UpdateChatChannelMembersDto, organizationId: string): Promise<ChatChannelMembers> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
