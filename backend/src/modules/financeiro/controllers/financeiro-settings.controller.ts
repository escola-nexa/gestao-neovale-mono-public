import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { FinanceiroService } from '../services/financeiro.service';

@Controller('financeiro')
@UseGuards(JwtAuthGuard)
export class FinanceiroSettingsController {
  constructor(private readonly finService: FinanceiroService) {}

  @Get('settings')
  async getSettings(@Query('organizationId') orgId: string, @CurrentUser() user: any) {
    return this.finService.getSettings(orgId || user.organizationId || user.id);
  }

  @Get('permissions/access')
  async getPermissions(@Query('organizationId') orgId: string, @CurrentUser() user: any) {
    return this.finService.getPermissions(orgId || user.organizationId || user.id, user.id);
  }

  @Delete('permissions/scopes/:id')
  async deleteScope(@Param('id') id: string) {
    return this.finService.deletePermissionScope(id);
  }

  @Get('lookups/:table')
  async getLookups(@Param('table') table: string) {
    return this.finService.getLookups(table);
  }

  @Get('attachments/url')
  async getAttachmentUrl(@Query('path') path: string) {
    return { url: '' };
  }

  @Get('installments/payable')
  async getPayableInstallments(@Query('organizationId') orgId: string, @CurrentUser() user: any) {
    return this.finService.getPayableInstallments(orgId || user.organizationId || user.id);
  }
}
