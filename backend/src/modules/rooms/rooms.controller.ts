import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  createRoom(@CurrentUser() user: any, @Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(user.id, dto);
  }

  @Get()
  getRooms(
    @Query('type') type?: string,
    @Query('language') language?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.roomsService.getRooms({ type, language, search, page: +page, limit: +limit });
  }

  @Get(':id')
  getRoom(@Param('id') id: string, @CurrentUser() user: any) {
    return this.roomsService.getRoom(id, user.id);
  }

  @Put(':id')
  updateRoom(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateRoomDto) {
    return this.roomsService.updateRoom(id, user.id, dto);
  }

  @Delete(':id')
  closeRoom(@Param('id') id: string, @CurrentUser() user: any) {
    return this.roomsService.closeRoom(id);
  }

  @Post(':id/join')
  joinRoom(@Param('id') id: string, @CurrentUser() user: any, @Body('password') password?: string) {
    return this.roomsService.joinRoom(id, user.id, password);
  }

  @Post(':id/leave')
  leaveRoom(@Param('id') id: string, @CurrentUser() user: any) {
    return this.roomsService.leaveRoom(id, user.id);
  }

  @Post(':id/seats/:position/take')
  takeSeat(@Param('id') id: string, @Param('position') position: string, @CurrentUser() user: any) {
    return this.roomsService.takeSeat(id, user.id, +position);
  }

  @Post(':id/seats/leave')
  leaveSeat(@Param('id') id: string, @CurrentUser() user: any) {
    return this.roomsService.leaveSeat(id, user.id);
  }

  @Post(':id/mute/:userId')
  muteUser(@Param('id') id: string, @Param('userId') targetId: string, @CurrentUser() user: any) {
    return this.roomsService.muteUser(id, user.id, targetId);
  }

  @Post(':id/unmute/:userId')
  unmuteUser(@Param('id') id: string, @Param('userId') targetId: string, @CurrentUser() user: any) {
    return this.roomsService.unmuteUser(id, user.id, targetId);
  }

  @Post(':id/kick/:userId')
  kickUser(@Param('id') id: string, @Param('userId') targetId: string, @CurrentUser() user: any) {
    return this.roomsService.kickUser(id, user.id, targetId);
  }

  @Post(':id/lock-seat/:position')
  lockSeat(@Param('id') id: string, @Param('position') pos: string, @CurrentUser() user: any) {
    return this.roomsService.lockSeat(id, user.id, +pos);
  }

  @Post(':id/announcement')
  updateAnnouncement(@Param('id') id: string, @CurrentUser() user: any, @Body('announcement') text: string) {
    return this.roomsService.updateAnnouncement(id, user.id, text);
  }

  @Get(':id/members')
  getRoomMembers(@Param('id') id: string, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.roomsService.getRoomMembers(id, +page, +limit);
  }

  @Post(':id/zego-token')
  getZegoToken(@Param('id') id: string, @CurrentUser() user: any) {
    return this.roomsService.generateZegoToken(id, user.id);
  }
}
