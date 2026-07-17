import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatMessageReactionsDto } from '../dto/create-chat_message_reactions.dto';
import { UpdateChatMessageReactionsDto } from '../dto/update-chat_message_reactions.dto';
import { FindChatMessageReactionsService } from '../services/find-chat_message_reactions.service';
import { CreateChatMessageReactionsService } from '../services/create-chat_message_reactions.service';
import { UpdateChatMessageReactionsService } from '../services/update-chat_message_reactions.service';
import { DeleteChatMessageReactionsService } from '../services/delete-chat_message_reactions.service';

@Controller('chat-message-reactions')
@UseGuards(JwtAuthGuard)
export class ChatMessageReactionsController {
  constructor(
    private readonly findService: FindChatMessageReactionsService,
    private readonly createService: CreateChatMessageReactionsService,
    private readonly updateService: UpdateChatMessageReactionsService,
    private readonly deleteService: DeleteChatMessageReactionsService,
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
  async create(@Body() dto: CreateChatMessageReactionsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatMessageReactionsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
