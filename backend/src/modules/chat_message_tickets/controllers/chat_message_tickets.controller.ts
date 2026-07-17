import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatMessageTicketsDto } from '../dto/create-chat_message_tickets.dto';
import { UpdateChatMessageTicketsDto } from '../dto/update-chat_message_tickets.dto';
import { FindChatMessageTicketsService } from '../services/find-chat_message_tickets.service';
import { CreateChatMessageTicketsService } from '../services/create-chat_message_tickets.service';
import { UpdateChatMessageTicketsService } from '../services/update-chat_message_tickets.service';
import { DeleteChatMessageTicketsService } from '../services/delete-chat_message_tickets.service';

@Controller('chat-message-tickets')
@UseGuards(JwtAuthGuard)
export class ChatMessageTicketsController {
  constructor(
    private readonly findService: FindChatMessageTicketsService,
    private readonly createService: CreateChatMessageTicketsService,
    private readonly updateService: UpdateChatMessageTicketsService,
    private readonly deleteService: DeleteChatMessageTicketsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateChatMessageTicketsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatMessageTicketsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
