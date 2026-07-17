import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTicketsDto } from '../dto/create-tickets.dto';
import { UpdateTicketsDto } from '../dto/update-tickets.dto';
import { FindTicketsService } from '../services/find-tickets.service';
import { CreateTicketsService } from '../services/create-tickets.service';
import { UpdateTicketsService } from '../services/update-tickets.service';
import { DeleteTicketsService } from '../services/delete-tickets.service';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    private readonly findService: FindTicketsService,
    private readonly createService: CreateTicketsService,
    private readonly updateService: UpdateTicketsService,
    private readonly deleteService: DeleteTicketsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('role') role?: string,
    @Query('userId') userId?: string,
  ) {
    return this.findService.findAll(user.organizationId || user.id, role, userId);
  }

  @Get('with-media')
  async getTicketsWithMedia(@CurrentUser() user: any) {
    return this.findService.getTicketsWithMedia(user.organizationId || user.id);
  }

  @Get('activity')
  async getTicketActivityMessages(@Query('ids') ids: string) {
    return this.findService.getTicketActivityMessages(ids.split(','));
  }

  @Get('enrichment')
  async getTicketsEnrichmentData(
    @CurrentUser() user: any,
    @Query('ids') ids: string,
  ) {
    return this.findService.getTicketsEnrichmentData(user.organizationId || user.id, ids.split(','));
  }

  @Get('tags')
  async getTicketTags(@CurrentUser() user: any) {
    return this.findService.getTicketTags(user.organizationId || user.id);
  }

  @Get(':id/assignees')
  async getAssignees(@Param('id') id: string) {
    return this.findService.getAssignees(id);
  }

  @Delete(':id/assignees')
  async deleteAssignees(@Param('id') id: string) {
    return this.deleteService.deleteAssignees(id);
  }

  @Get(':id/labels')
  async getTicketLabels(@Param('id') id: string) {
    return this.findService.getTicketLabels(id);
  }

  @Post(':id/labels')
  async updateTicketLabel(@Param('id') id: string, @Body('labelId') labelId: string) {
    return this.createService.addTicketLabel(id, labelId);
  }

  @Delete(':id/labels/:labelId')
  async removeTicketLabel(@Param('id') id: string, @Param('labelId') labelId: string) {
    return this.deleteService.removeTicketLabel(id, labelId);
  }

  @Post('labels/bulk')
  async insertTicketLabels(@Body() payload: any[]) {
    return this.createService.insertTicketLabelsBulk(payload);
  }

  @Get(':id/checklists')
  async getTicketChecklists(@Param('id') id: string) {
    return this.findService.getTicketChecklists(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateTicketsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
