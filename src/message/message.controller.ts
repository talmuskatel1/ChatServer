import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { MessageService } from './message.service';

@Controller('messages')
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Post('send')
  async sendMessage(@Body() messageData: { senderId: string; groupId: string; content: string }) {
    try {
      const message = await this.messageService.create(messageData.senderId, messageData.groupId, messageData.content);
      return message;
    } catch (error) {
      throw new HttpException('Error sending message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('room/:roomId')
  async getGroupMessages(@Param('roomId') roomId: string) {
    return await this.messageService.getGroupMessages(roomId);
  }
}