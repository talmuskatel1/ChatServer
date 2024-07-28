import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { ChatGateway } from './chat/chat.gateway';
import { GroupModule } from './group/group.module';
import { MessageModule } from './message/message.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/chatapp'),
    UserModule,
    GroupModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [ChatGateway],
})
export class AppModule {}

