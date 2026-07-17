import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { FinanceiroService } from '../services/financeiro.service';

@Controller('financeiro/entries')
@UseGuards(JwtAuthGuard)
export class FinanceiroEntriesController {
  constructor(private readonly finService: FinanceiroService) {}

  @Get()
  async getEntries(@Query() query: any) {
    return this.finService.getEntries(query);
  }

  @Get(':id')
  async getEntry(@Param('id') id: string) {
    return this.finService.getEntry(id);
  }

  @Get(':id/installments')
  async getInstallments(@Param('id') id: string) {
    return this.finService.getEntryInstallments(id);
  }

  @Get(':id/allocations')
  async getAllocations(@Param('id') id: string) {
    return this.finService.getEntryAllocations(id);
  }

  @Get(':id/attachments')
  async getAttachments(@Param('id') id: string) {
    return this.finService.getEntryAttachments(id);
  }

  @Get(':id/approvals')
  async getApprovals(@Param('id') id: string) {
    return this.finService.getEntryApprovals(id);
  }

  @Post()
  async createEntry(@Body() body: any) {
    return this.finService.createEntry(body);
  }

  @Put(':id')
  async updateEntry(@Param('id') id: string, @Body() body: any) {
    return this.finService.updateEntry(id, body);
  }

  @Post('actions/:rpc')
  async runAction(@Param('rpc') rpc: string, @Body() body: any) {
    return this.finService.runEntryAction(rpc, body);
  }

  @Post(':id/attachments')
  async uploadAttachment(@Param('id') id: string, @Body() body: any) {
    // Requires Multipart form data handling
    return { success: true };
  }
}
