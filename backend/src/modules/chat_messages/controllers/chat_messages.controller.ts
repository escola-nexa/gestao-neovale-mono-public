import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatMessagesDto } from '../dto/create-chat_messages.dto';
import { UpdateChatMessagesDto } from '../dto/update-chat_messages.dto';
import { FindChatMessagesService } from '../services/find-chat_messages.service';
import { CreateChatMessagesService } from '../services/create-chat_messages.service';
import { UpdateChatMessagesService } from '../services/update-chat_messages.service';
import { DeleteChatMessagesService } from '../services/delete-chat_messages.service';

@Controller('chat-messages')
@UseGuards(JwtAuthGuard)
export class ChatMessagesController {
  constructor(
    private readonly findService: FindChatMessagesService,
    private readonly createService: CreateChatMessagesService,
    private readonly updateService: UpdateChatMessagesService,
    private readonly deleteService: DeleteChatMessagesService,
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
  async create(@Body() dto: CreateChatMessagesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatMessagesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
