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
import { transporter } from '../../lib/transporter';
import { SendOtpDto } from './dto/send-otp-dto';
import { send } from 'process';

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

        // Check if record already exists for this email
        const existing = await this.emailVerificationRepository.findOne({
            where: { email },
        });

        if (existing) {
            // Update existing record
            await this.emailVerificationRepository.update(
            { email: email },
            { code: val }
            );
        } else {
            // Create new record
            const newRecord = this.emailVerificationRepository.create({
            email,
            code: val,
            });
            await this.emailVerificationRepository.save(newRecord);
        }

        // SEND EMAIL
         try {
            await transporter.sendMail({
                from: `"ECHOMIND" <${process.env.MAIL_FROM_ADDRESS}>`,
                to: email,
                subject: 'Your Echomind Verification Code',
                html: `
                <div style="font-family: Arial, sans-serif; padding: 16px; border-radius: 8px; background: #f9f9f9;">
                    <h2 style="color:#333;">Verify your email</h2>
                    <p>Hey there 👋,</p>
                    <p>Your verification code is:</p>
                    <div style="font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #2563eb;">
                    ${val}
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                    <p>– The Echomind Team</p>
                </div>
                `,
            });

            console.log(`✅ Verification email sent to ${email}`);
            } catch (err) {
            console.error(`❌ Failed to send verification email to ${email}:`, err);
            }

            return val;
    }

    async signIn(email: string, password: string): Promise<any> {
        const user = await this.usersRepository.findOne({
        where: { email },
        });

        if(!user){
            throw new UnauthorizedException('User not found');
        } else {
            if(!user.email_verified_at){
                throw new UnauthorizedException('Email not verified');
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials, password does not match');
            }

            const payload = { sub: user.id, email: user.email };
            const token = this.jwtService.sign(payload);

            return { message: 'Login success', token };
        }
    }

    async register(register: CreateUserDto): Promise<any> {
        const user = await this.usersService.create(register);
        const val =await this.sendVerificationCode(user.email);
        return val;
    }

    async sendOtp(sendOtpDto: SendOtpDto): Promise<any> {
        const user = await this.usersRepository.findOne({
            where: { email: sendOtpDto.email },
        });

        if(!user){
            throw new UnauthorizedException('User not found');
        } if(user.email_verified_at){
            throw new UnauthorizedException('Email already verified');
        }

        const val = await this.sendVerificationCode(sendOtpDto.email);
        return { message: 'OTP sent successfully', code: val };
    }

    async verifyEmail(email: string, code: string): Promise<any> {
        const record = await this.emailVerificationRepository.findOne({
            where: { email, code },
        });

        const [{ now }] = await this.emailVerificationRepository.query('SELECT NOW() as now'); // REALTIME
        const dbNow = new Date(now).getTime();

        if (!record) {
            console.log(record);
            console.log(email, code);
            throw new UnauthorizedException('Invalid verification code');
        } else if (record.updated_at.getTime() + 10 * 60 * 1000 < dbNow) {
            throw new UnauthorizedException('Verification code expired');
        }

        console.log("db record time" + record.updated_at.getTime());
        console.log("current time" + dbNow);

        const user = await this.usersRepository.update(
            { email: email },
            { email_verified_at: new Date() }
        )

        await this.emailVerificationRepository.delete({ email });

        return { message: 'Email verified successfully' };
    }
}
