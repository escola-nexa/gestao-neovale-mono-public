import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatMessageMentionsDto } from '../dto/create-chat_message_mentions.dto';
import { UpdateChatMessageMentionsDto } from '../dto/update-chat_message_mentions.dto';
import { FindChatMessageMentionsService } from '../services/find-chat_message_mentions.service';
import { CreateChatMessageMentionsService } from '../services/create-chat_message_mentions.service';
import { UpdateChatMessageMentionsService } from '../services/update-chat_message_mentions.service';
import { DeleteChatMessageMentionsService } from '../services/delete-chat_message_mentions.service';

@Controller('chat-message-mentions')
@UseGuards(JwtAuthGuard)
export class ChatMessageMentionsController {
  constructor(
    private readonly findService: FindChatMessageMentionsService,
    private readonly createService: CreateChatMessageMentionsService,
    private readonly updateService: UpdateChatMessageMentionsService,
    private readonly deleteService: DeleteChatMessageMentionsService,
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
  async create(@Body() dto: CreateChatMessageMentionsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatMessageMentionsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
