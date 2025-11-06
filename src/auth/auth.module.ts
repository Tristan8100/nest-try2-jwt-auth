import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt'; // also import this on @module below since it's a module
import { TypeOrmModule } from '@nestjs/typeorm';
import { jwtConstants } from './constants';
import { EmailVerification } from './entities/email-verification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, EmailVerification]),
  UsersModule,
  JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '1d' },
    }),], // import if gonna use in this module
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
