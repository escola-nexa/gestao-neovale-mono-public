import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatUserInboxStateDto } from '../dto/create-chat_user_inbox_state.dto';
import { UpdateChatUserInboxStateDto } from '../dto/update-chat_user_inbox_state.dto';
import { FindChatUserInboxStateService } from '../services/find-chat_user_inbox_state.service';
import { CreateChatUserInboxStateService } from '../services/create-chat_user_inbox_state.service';
import { UpdateChatUserInboxStateService } from '../services/update-chat_user_inbox_state.service';
import { DeleteChatUserInboxStateService } from '../services/delete-chat_user_inbox_state.service';

@Controller('chat-user-inbox-state')
@UseGuards(JwtAuthGuard)
export class ChatUserInboxStateController {
  constructor(
    private readonly findService: FindChatUserInboxStateService,
    private readonly createService: CreateChatUserInboxStateService,
    private readonly updateService: UpdateChatUserInboxStateService,
    private readonly deleteService: DeleteChatUserInboxStateService,
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
  async create(@Body() dto: CreateChatUserInboxStateDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatUserInboxStateDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
