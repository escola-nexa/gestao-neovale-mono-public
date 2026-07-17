import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatMessageReadsDto } from '../dto/create-chat_message_reads.dto';
import { UpdateChatMessageReadsDto } from '../dto/update-chat_message_reads.dto';
import { FindChatMessageReadsService } from '../services/find-chat_message_reads.service';
import { CreateChatMessageReadsService } from '../services/create-chat_message_reads.service';
import { UpdateChatMessageReadsService } from '../services/update-chat_message_reads.service';
import { DeleteChatMessageReadsService } from '../services/delete-chat_message_reads.service';

@Controller('chat-message-reads')
@UseGuards(JwtAuthGuard)
export class ChatMessageReadsController {
  constructor(
    private readonly findService: FindChatMessageReadsService,
    private readonly createService: CreateChatMessageReadsService,
    private readonly updateService: UpdateChatMessageReadsService,
    private readonly deleteService: DeleteChatMessageReadsService,
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
  async create(@Body() dto: CreateChatMessageReadsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatMessageReadsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
