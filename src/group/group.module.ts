import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from './group.model';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { User, UserSchema } from 'src/user/user.model';
import { UserModule } from '../user/user.module';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema },   { name: User.name, schema: UserSchema }]),UserModule
  ],
  providers: [GroupService],
  controllers: [GroupController],
  exports: [GroupService]
})
export class GroupModule {}