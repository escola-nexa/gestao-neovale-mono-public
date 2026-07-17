import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatMessageLabelsDto } from '../dto/create-chat_message_labels.dto';
import { UpdateChatMessageLabelsDto } from '../dto/update-chat_message_labels.dto';
import { FindChatMessageLabelsService } from '../services/find-chat_message_labels.service';
import { CreateChatMessageLabelsService } from '../services/create-chat_message_labels.service';
import { UpdateChatMessageLabelsService } from '../services/update-chat_message_labels.service';
import { DeleteChatMessageLabelsService } from '../services/delete-chat_message_labels.service';

@Controller('chat-message-labels')
@UseGuards(JwtAuthGuard)
export class ChatMessageLabelsController {
  constructor(
    private readonly findService: FindChatMessageLabelsService,
    private readonly createService: CreateChatMessageLabelsService,
    private readonly updateService: UpdateChatMessageLabelsService,
    private readonly deleteService: DeleteChatMessageLabelsService,
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
  async create(@Body() dto: CreateChatMessageLabelsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatMessageLabelsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
