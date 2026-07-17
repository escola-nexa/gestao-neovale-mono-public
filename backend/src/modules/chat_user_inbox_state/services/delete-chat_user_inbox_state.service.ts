import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatUserInboxState } from '../entities/chat_user_inbox_state.entity';

@Injectable()
export class DeleteChatUserInboxStateService {
  constructor(
    @InjectRepository(ChatUserInboxState)
    private readonly repository: Repository<ChatUserInboxState>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
