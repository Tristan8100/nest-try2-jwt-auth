import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service'; 
import { SignInDto } from './dto/sign-in-dto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { EmailVerification } from './entities/email-verification.entity';

@Injectable()
export class AuthService {
    constructor(
        // ENTITIES
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(EmailVerification)
        private emailVerificationRepository: Repository<EmailVerification>,

        // SERVICES
        private usersService: UsersService,
        private jwtService: JwtService
    ) {}

    private async sendVerificationCode(email: string) {
        const val = Math.floor(100000 + Math.random() * 900000).toString();

        const val2 = this.emailVerificationRepository.create({
            email: email,
            code: val,
        })

        await this.emailVerificationRepository.save(val2);
        // SEND EMAIL
        return val;
    }

    async signIn(email: string, password: string): Promise<any> {
        const user = await this.usersRepository.findOne({
        where: { email },
        });

        if(!user){
            throw new UnauthorizedException('User not found');
        } else {
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials, password does not match');
            }

            const payload = { sub: user.id, email: user.email };
            const token = this.jwtService.sign(payload);

            return { message: 'Login success', token };
        }
    }

    async register(register: CreateUserDto): Promise<User> {
        const user = await this.usersService.create(register);
        return user;
    }
}
