import { IsEmail, IsString, Length } from 'class-validator';

export class SendOtpDto{
    @IsEmail()
    email: string;
}

export class VerifyEmailDto{
    @IsEmail()
    email: string;

    @IsString()
    @Length(6, 6)
    otp: string;
}

export class VetifyCodeDto{
    @IsEmail()
    email: string;

    @IsString()
    @Length(6, 6)
    otp: string; //changed
}

export class ResetPasswordDto{
    @IsEmail()
    email: string;

    @IsString()
    token: string;

    @IsString()
    @Length(8, 32)
    password: string;
}