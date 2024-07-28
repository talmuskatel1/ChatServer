import { Controller, Post, Body, Get, Param} from '@nestjs/common';
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
      console.error('Error sending message:', error);
    }
  }
  


  @Get('room/:roomId')
  async getGroupMessages(@Param('roomId') roomId: string) {
    return this.messageService.getGroupMessages(roomId);
  }
}