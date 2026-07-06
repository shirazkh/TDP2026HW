import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { AuthService } from '../auth.service';
import { JWT_SECRET, JWT_STRATEGY_NAME } from '../auth.constants';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY_NAME) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(request: Request, payload: JwtPayload): Promise<RequestUser> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    if (!token || (await this.authService.isTokenRevoked(token))) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return this.authService.getAuthenticatedUser(payload.sub);
  }
}
