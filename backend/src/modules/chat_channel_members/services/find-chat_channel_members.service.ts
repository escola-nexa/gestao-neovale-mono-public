import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelMembers } from '../entities/chat_channel_members.entity';

@Injectable()
export class FindChatChannelMembersService {
  constructor(
    @InjectRepository(ChatChannelMembers)
    private readonly repository: Repository<ChatChannelMembers>,
  ) {}

  async findAll(organizationId: string): Promise<ChatChannelMembers[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatChannelMembers | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
