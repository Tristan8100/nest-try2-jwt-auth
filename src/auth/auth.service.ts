import { ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { ResetPasswordDto, SendOtpDto, VetifyCodeDto } from './dto/send-otp-dto';
import { send } from 'process';
import { PasswordReset } from './entities/password-reset.entity';
import crypto from "crypto";

@Injectable()
export class AuthService {
    constructor(
        // ENTITIES
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(EmailVerification)
        private emailVerificationRepository: Repository<EmailVerification>,
        @InjectRepository(PasswordReset)
        private passwordResetRepository: Repository<PasswordReset>,

        // SERVICES
        private usersService: UsersService,
        private jwtService: JwtService
    ) {}

    // HELPERS
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
            throw new ConflictException("Failed to send verification email");
        }
        return val;
    }

    // SERVICES
    async signIn(email: string, password: string): Promise<any> {
        const user = await this.usersRepository.findOne({
        where: { email },
        });

        if(!user){
            throw new UnauthorizedException('User not found');
        } else {
            if(!user.email_verified_at){
                console.log(user.email_verified_at);
                //throw new UnauthorizedException('Email not verified');
                this.sendVerificationCode(user.email);

                throw new ForbiddenException('Email not verified');
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials, password does not match');
            }

            const payload = { id: user.id, email: user.email }; //changed to id key
            const token = this.jwtService.sign(payload);

            return { 
                message: 'Login success',
                token: token,
                status: "success",
                response_code: 200,
                user_info: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }

            };
        }
    }

    async register(register: CreateUserDto): Promise<any> {
        const user = await this.usersService.create(register);
        const val =await this.sendVerificationCode(user.email);
        return { 
            response_code: 200,
            message: 'Registration success',
            email: user.email,
            code: val 
        };
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
        return { message: 'OTP sent successfully', code: val, email: sendOtpDto.email }; //REMOVE CODE
    }

    async verifyEmail(email: string, code: string): Promise<any> {
        const record = await this.emailVerificationRepository.findOne({
            where: { email, code: code },
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

    async user(data: any): Promise<any> {
        const user = await this.usersRepository.findOne({
            where: { email: data.email },
        })

        return { 
            message: 'User details',
            user_info: {
                id: user?.id,
                name: user?.name,
                email: user?.email
            }
        };
    }

    // RESET PASSWORDS
    async resetLink(sendResetLink: SendOtpDto): Promise<any>{
        const email = sendResetLink.email;

        const user = await this.usersRepository.findOne({
            where: {email: email}
        });

        if(!user){
            throw new UnauthorizedException('User not found');
        }

        const check = await this.passwordResetRepository.findOne(
            {where: {email: email}}
        );
        
        const code = Math.floor(100000 + Math.random() * 900000);

        if(!check){
            const data = await this.passwordResetRepository.create({
                email: email,
                code: code.toString(),
            })
            await this.passwordResetRepository.save(data);
        } else {
            await this.passwordResetRepository.update(
                {email: email},
                {code: code.toString()}
            )
        }

        // SEND EMAIL
         try {
            await transporter.sendMail({
                from: `"ECHOMIND" <${process.env.MAIL_FROM_ADDRESS}>`,
                to: email,
                subject: 'Your Echomind Password Reset Code',
                html: `
                <div style="font-family: Arial, sans-serif; padding: 16px; border-radius: 8px; background: #f9f9f9;">
                    <h2 style="color:#333;">Verify your email</h2>
                    <p>Hey there 👋,</p>
                    <p>Your password reset code is:</p>
                    <div style="font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #2563eb;">
                    ${code.toString()}
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                    <p>– The Echomind Team</p>
                </div>
                `,
            });

            console.log(`✅ Verification email sent to ${email}`);
        } catch (err) {
            console.error(`❌ Failed to send verification email to ${email}:`, err);
            throw new InternalServerErrorException('Failed to send verification email');
            
        }

        return {message: 'Password reset link sent successfully', email: email, code: code.toString()}; //remove code
    }

    async verifyResetCode(data: VetifyCodeDto): Promise<any> {
        const { email, otp } = data

        const record = await this.passwordResetRepository.findOne({
            where: {
                email: email,
                code: otp,
            }
        })

        if(!record){
            throw new NotFoundException('Invalid reset code or email');
        }

        const [{ now }] = await this.emailVerificationRepository.query('SELECT NOW() as now'); // REALTIME
        const dbNow = new Date(now).getTime();

        if (record.updated_at.getTime() + 10 * 60 * 1000 < dbNow) {
            throw new UnauthorizedException('Verification code expired');
        }

        const token = crypto.randomBytes(30).toString("hex");
        const hashedToken = await bcrypt.hash(token, 10);


        const val =await this.passwordResetRepository.update(
            {email: email},
            {token: hashedToken}
        )

        if(!val){
            throw new UnauthorizedException('Could not generate reset token');
        }
        
        return {message: 'Reset code verified successfully', token: token};
    }

    async resetPassword(data: ResetPasswordDto): Promise<any> {
        const { email, token, password } = data;

        const check = await this.passwordResetRepository.findOne({
            where: {email: email}
        });

        if(!check){
            throw new NotFoundException('Invalid reset code or email');
        }

        const isMatch = await bcrypt.compare(token, check.token);

        if(!isMatch){
            throw new UnauthorizedException('Invalid reset token');
        }

        const user = await this.usersRepository.update(
            {email: email},
            {password: await bcrypt.hash(password, 10)}
        )

        await this.passwordResetRepository.delete({email: email});

        return {message: 'Password reset successfully'};
    }
}
