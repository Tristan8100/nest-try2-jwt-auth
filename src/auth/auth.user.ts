import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private userService: UsersService
    ) {}
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.user; // already set by AuthGuard

        console.log('User from AuthGuard:', user);

        if (!user) {
        throw new UnauthorizedException('User not found');
        }

        const val = await this.userService.findOne(user.id); //change to sub, idk

        if (!val) {
        throw new UnauthorizedException('User not foundSS');
        }

        return true;
    }
}
