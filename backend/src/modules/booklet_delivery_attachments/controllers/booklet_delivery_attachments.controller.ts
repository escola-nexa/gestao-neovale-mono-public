import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateBookletDeliveryAttachmentsDto } from '../dto/create-booklet_delivery_attachments.dto';
import { UpdateBookletDeliveryAttachmentsDto } from '../dto/update-booklet_delivery_attachments.dto';
import { FindBookletDeliveryAttachmentsService } from '../services/find-booklet_delivery_attachments.service';
import { CreateBookletDeliveryAttachmentsService } from '../services/create-booklet_delivery_attachments.service';
import { UpdateBookletDeliveryAttachmentsService } from '../services/update-booklet_delivery_attachments.service';
import { DeleteBookletDeliveryAttachmentsService } from '../services/delete-booklet_delivery_attachments.service';

@Controller('booklet-delivery-attachments')
@UseGuards(JwtAuthGuard)
export class BookletDeliveryAttachmentsController {
  constructor(
    private readonly findService: FindBookletDeliveryAttachmentsService,
    private readonly createService: CreateBookletDeliveryAttachmentsService,
    private readonly updateService: UpdateBookletDeliveryAttachmentsService,
    private readonly deleteService: DeleteBookletDeliveryAttachmentsService,
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
  async create(@Body() dto: CreateBookletDeliveryAttachmentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBookletDeliveryAttachmentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
