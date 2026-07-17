import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatUserInboxState } from '../entities/chat_user_inbox_state.entity';

@Injectable()
export class FindChatUserInboxStateService {
  constructor(
    @InjectRepository(ChatUserInboxState)
    private readonly repository: Repository<ChatUserInboxState>,
  ) {}

  async findAll(organizationId: string): Promise<ChatUserInboxState[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ChatUserInboxState | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
