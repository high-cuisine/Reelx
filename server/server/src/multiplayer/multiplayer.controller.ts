import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../libs/common/guard/jwt-auth.guard.guard';
import { CurrentUser } from '../../libs/common/decorators/current-user.decorator';
import { MultiplayerService } from './multiplayer.service';
import { MultiplayerGateway } from './multiplayer.gateway';
import { CreateTableDto } from './dto/create-table.dto';

@Controller('multiplayer')
@UseGuards(JwtAuthGuard)
export class MultiplayerController {
  constructor(
    private readonly multiplayerService: MultiplayerService,
    private readonly multiplayerGateway: MultiplayerGateway,
  ) {}

  /**
   * GET /api/multiplayer/tables
   * Lists all active tables from Redis.
   */
  @Get('tables')
  async listTables() {
    const tables = await this.multiplayerService.listTables();
    return { success: true, tables };
  }

  /**
   * POST /api/multiplayer/table
   * Creates a table, charges the owner the bet amount in the chosen currency.
   * Redis key: table-{userId}
   */
  @Post('table')
  @HttpCode(HttpStatus.CREATED)
  async createTable(
    @CurrentUser() userId: string,
    @Body() body: CreateTableDto,
  ) {
    const raw = await this.multiplayerService.createTable(
      userId,
      body.currency,
      body.betAmount,
      body.maxPlayers,
    );
    const table = await this.multiplayerService.enrichTable(raw);
    return { success: true, table };
  }

  /**
   * GET /api/multiplayer/table/:ownerId
   * Returns current state of a table.
   */
  @Get('table/:ownerId')
  async getTable(@Param('ownerId') ownerId: string) {
    const raw = await this.multiplayerService.getTableOrThrow(ownerId);
    const table = await this.multiplayerService.enrichTable(raw);
    return { success: true, table };
  }

  /**
   * POST /api/multiplayer/table/:ownerId/join
   * Joins the table, charges bet in table currency if not already seated.
   */
  @Post('table/:ownerId/join')
  @HttpCode(HttpStatus.OK)
  async joinTable(
    @Param('ownerId') ownerId: string,
    @CurrentUser() userId: string,
  ) {
    const raw = await this.multiplayerService.joinTable(ownerId, userId);
    const table = await this.multiplayerService.enrichTable(raw);
    return { success: true, table };
  }

  /**
   * DELETE /api/multiplayer/table
   * Closes the table, refunds all participants, notifies via socket.
   */
  @Delete('table')
  @HttpCode(HttpStatus.OK)
  async deleteTable(@CurrentUser() userId: string) {
    await this.multiplayerService.deleteTable(userId);
    this.multiplayerGateway.notifyTableDeleted(userId);
    return { success: true };
  }
}
