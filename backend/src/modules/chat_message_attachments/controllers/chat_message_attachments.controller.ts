import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatMessageAttachmentsDto } from '../dto/create-chat_message_attachments.dto';
import { UpdateChatMessageAttachmentsDto } from '../dto/update-chat_message_attachments.dto';
import { FindChatMessageAttachmentsService } from '../services/find-chat_message_attachments.service';
import { CreateChatMessageAttachmentsService } from '../services/create-chat_message_attachments.service';
import { UpdateChatMessageAttachmentsService } from '../services/update-chat_message_attachments.service';
import { DeleteChatMessageAttachmentsService } from '../services/delete-chat_message_attachments.service';

@Controller('chat-message-attachments')
@UseGuards(JwtAuthGuard)
export class ChatMessageAttachmentsController {
  constructor(
    private readonly findService: FindChatMessageAttachmentsService,
    private readonly createService: CreateChatMessageAttachmentsService,
    private readonly updateService: UpdateChatMessageAttachmentsService,
    private readonly deleteService: DeleteChatMessageAttachmentsService,
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
  async create(@Body() dto: CreateChatMessageAttachmentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatMessageAttachmentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
