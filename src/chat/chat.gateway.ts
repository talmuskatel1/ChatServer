import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GroupService } from '../group/group.service';
import { MessageService } from '../message/message.service';
import { UserService } from '../user/user.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173', 
    credentials: true,
  },
  transports: ['websocket', 'polling'], 
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ChatGateway');

  constructor(
    private groupService: GroupService,
    private messageService: MessageService,
    private userService: UserService
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    client.emit('sessionExpired');
  }

  @SubscribeMessage('join')
  @SubscribeMessage('join')
async handleJoin(
  @MessageBody() data: { userId: string; room: string },
  @ConnectedSocket() client: Socket,
): Promise<void> {
  try {
    const { userId, room } = data;
    
    const group = await this.groupService.findByName(room);
    if (!group) {
      client.emit('error', { message: 'Group does not exist' });
      return;
    }

    const isMember = await this.groupService.isMember(group._id.toString(), userId);
    if (!isMember) {
      await this.groupService.addMember(group._id.toString(), userId);
    }

    await client.join(room);
    client.emit('joinSuccess', { room });

    const members = await this.groupService.getMembers(group._id.toString());
    this.server.to(room).emit('updateMembers', members);

    const messages = await this.messageService.getGroupMessages(group._id.toString());
    client.emit('loadMessages', messages);
  } catch (error) {
    client.emit('error', { message: 'Failed to join room' });
  }
}
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { userId: string; room: string; content: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { userId, room, content } = data;
    this.server.to(room).emit('message', { userId, room, content });
  }

  @SubscribeMessage('createGroup')
  async handleCreateGroup(
    @MessageBody() data: { userId: string; groupName: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { userId, groupName } = data;
    const group = await this.groupService.create(groupName, userId);
    await this.groupService.addMember(group._id.toString(), userId);
    await this.userService.addGroup(userId, group._id.toString());
    
    client.join(groupName);
    client.emit('groupCreated', { groupId: group._id, groupName });
    this.server.emit('newGroup', { groupId: group._id, groupName });
  }


  @SubscribeMessage('leaveGroup')
  async handleLeaveGroup(
    @MessageBody() data: { userId: string; groupName: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { userId, groupName } = data;
    const group = await this.groupService.findByName(groupName);
    
    if (group) {
      await this.groupService.removeMember(group._id.toString(), userId);
      await this.userService.removeGroup(userId, group._id.toString());
      
      await client.leave(groupName);
      client.emit('leftGroup', { groupName });
      this.server.to(groupName).emit('memberLeft', { userId, groupName });

      const updatedGroup = await this.groupService.findByName(groupName);
      if (updatedGroup.members.length === 0) {
        await this.groupService.deleteGroup(updatedGroup._id.toString());
        this.server.emit('groupDeleted', { groupName });
      }
    }
  }

  @SubscribeMessage('deleteGroup')
  async handleDeleteGroup(
    @MessageBody() data: { userId: string; groupName: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { userId, groupName } = data;
    const group = await this.groupService.findByName(groupName);
    
    if (group) {
      await this.groupService.deleteGroup(group._id.toString());
      
      this.server.to(groupName).emit('groupDeleted', { groupName });
      
      this.server.in(groupName).socketsLeave(groupName);
      
      const members = await this.groupService.getMembers(group._id.toString());
      for (const memberId of members) {
        await this.userService.removeGroup(memberId.toString(), group._id.toString());
      }
    }
  }
}