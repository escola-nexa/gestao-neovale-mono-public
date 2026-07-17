import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { RhService } from '../services/rh.service';

@Controller('rh/indications')
@UseGuards(JwtAuthGuard)
export class RhIndicationsController {
  constructor(private readonly rhService: RhService) {}

  @Get()
  async getIndications(@Query() query: any) {
    return this.rhService.getIndications(query);
  }

  @Get(':id')
  async getIndicationById(@Param('id') id: string) {
    return this.rhService.getIndicationById(id);
  }

  @Delete(':id')
  async deleteIndication(@Param('id') id: string) {
    return this.rhService.deleteIndication(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.rhService.updateIndicationStatus(id, body.status, body.motivo);
  }

  @Post('assign-vaga')
  async assignVaga(@Body() body: any) {
    return this.rhService.assignVaga(body);
  }

  @Post(':id/convert')
  async convertIndication(@Param('id') id: string) {
    return this.rhService.convertIndication(id);
  }

  @Post('draft')
  async saveDraft(@Body() body: any) {
    return this.rhService.saveIndicationDraft(body);
  }
}
