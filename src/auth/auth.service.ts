import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service'; 
import { SignInDto } from './dto/sign-in-dto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,

        private usersService: UsersService,
        private jwtService: JwtService
    ) {}

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
}
