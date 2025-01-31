import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { compare } from '../common/bcryptHelper';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userService.user({ account: username });
    // console.log(`user: ${JSON.stringify(user)}`);

    if (user === null) {
      return null;
    }

    const isPasswordMatching = await compare(password, user.password);

    if (isPasswordMatching) {
      return user;
    }

    return null;
  }

  async login(user: any) {
    // console.log(`user: ${JSON.stringify(user)}`);
    const payload = { id: user.id, account: user.account };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
