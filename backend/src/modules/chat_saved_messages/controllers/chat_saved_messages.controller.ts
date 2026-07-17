import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatSavedMessagesDto } from '../dto/create-chat_saved_messages.dto';
import { UpdateChatSavedMessagesDto } from '../dto/update-chat_saved_messages.dto';
import { FindChatSavedMessagesService } from '../services/find-chat_saved_messages.service';
import { CreateChatSavedMessagesService } from '../services/create-chat_saved_messages.service';
import { UpdateChatSavedMessagesService } from '../services/update-chat_saved_messages.service';
import { DeleteChatSavedMessagesService } from '../services/delete-chat_saved_messages.service';

@Controller('chat-saved-messages')
@UseGuards(JwtAuthGuard)
export class ChatSavedMessagesController {
  constructor(
    private readonly findService: FindChatSavedMessagesService,
    private readonly createService: CreateChatSavedMessagesService,
    private readonly updateService: UpdateChatSavedMessagesService,
    private readonly deleteService: DeleteChatSavedMessagesService,
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
  async create(@Body() dto: CreateChatSavedMessagesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatSavedMessagesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
