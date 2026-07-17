import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatUnreadController {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  @Get('unread-count/:userId')
  async getUnreadCount(@Param('userId') userId: string) {
    try {
      const result = await this.entityManager.query(`
        SELECT COUNT(*) as count 
        FROM chat_channel_members 
        WHERE user_id = $1
      `, [userId]);
      return { count: parseInt(result[0]?.count || '0', 10) };
    } catch (e) {
      return { count: 0 };
    }
  }
}
