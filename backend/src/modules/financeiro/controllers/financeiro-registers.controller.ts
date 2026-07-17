import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { FinanceiroService } from '../services/financeiro.service';

@Controller('financeiro/registers')
@UseGuards(JwtAuthGuard)
export class FinanceiroRegistersController {
  constructor(private readonly finService: FinanceiroService) {}

  @Get('projects/summary')
  async getProjectSummary(@Query('organizationId') orgId: string) {
    return this.finService.getProjectSummary(orgId);
  }

  @Post('categories/replace')
  async replaceCategory(@Body() body: any) {
    return this.finService.replaceCategory(body.fromId, body.toId);
  }

  @Post('cost-centers/transfer')
  async transferCostCenter(@Body() body: any) {
    return this.finService.transferCostCenter(body.fromId, body.toId);
  }

  @Get(':table')
  async getRegisters(@Param('table') table: string, @Query('organizationId') orgId: string, @Query('orderBy') orderBy: string) {
    return this.finService.getRegisters(table, orgId, orderBy);
  }

  @Post(':table')
  async createRegister(@Param('table') table: string, @Body() body: any) {
    return this.finService.createRegister(table, body);
  }

  @Put(':table/:id')
  async updateRegister(@Param('table') table: string, @Param('id') id: string, @Body() body: any) {
    return this.finService.updateRegister(table, id, body);
  }

  @Patch(':table/:id/status')
  async updateStatus(@Param('table') table: string, @Param('id') id: string, @Body('active') active: boolean) {
    return this.finService.updateRegisterStatus(table, id, active);
  }

  @Delete(':table/:id')
  async deleteRegister(@Param('table') table: string, @Param('id') id: string) {
    return this.finService.deleteRegister(table, id);
  }
}
