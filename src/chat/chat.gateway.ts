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
  transports: ['websocket'], 
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
async handleJoin(
  @MessageBody() data: { userId: string; room: string },
  @ConnectedSocket() client: Socket,
): Promise<void> {

  try {
    const { userId, room } = data;
    const name  = (await this.groupService.findById(room)).name;
    const group = await this.groupService.findByName(name);
    console.log(room);
    if (!group) {
      client.emit('error', { message: 'Group does not exist' });
      return;
    }

    const isMember = await this.groupService.isMember(group._id.toString(), userId);
    if (!isMember) {
      throw new Error('User is not a member of this group');
    }
    await client.join(room);
    console.log(`User ${userId} joined room ${room}`);

    const members = await this.groupService.getMembers(room);

    client.emit('joinSuccess', { room, members });

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
  if (!userId) {
    console.error('Received message with undefined userId');
    return;
  }
  const message = await this.messageService.create(userId, room, content);
  this.server.to(room).emit('message', message);
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
    @MessageBody() data: { userId: string; groupId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { userId, groupId } = data;
    try {
      const group = await this.groupService.findById(groupId);
      
      if (group) {
        await this.groupService.leaveGroup(userId, groupId);
        
        client.leave(groupId);
        client.emit('leftGroup', { userId, groupId });
        this.server.to(groupId).emit('memberLeft', { userId, groupId });
  
        const updatedGroup = await this.groupService.findById(groupId);
        if (updatedGroup.members.length === 0) {
          await this.groupService.deleteGroup(groupId);
          this.server.emit('groupDeleted', { groupId });
        }
      }
      console.log(`User ${userId} left group ${groupId}`);
    } catch (error) {
      console.error('Error in handleLeaveGroup:', error);
      client.emit('error', { message: 'Failed to leave group' });
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