import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CurrentActor, Public, type Actor } from '../../core/actor.js';
import { parse } from '../../core/errors.js';
import { ROLE_PERMISSIONS } from '../../core/permissions.js';
import { AuthService, SESSION_COOKIE } from './auth.service.js';
import { tokenFrom } from './auth.guard.js';

const Login = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200), totp: z.string().regex(/^\d{6}$/).optional() });
const ChangePassword = z.object({ current: z.string().min(1), next: z.string().min(1).max(200) });
const TotpCode = z.object({ code: z.string().regex(/^\d{6}$/) });

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const b = parse(Login, body);
    const { token, expiresAt } = await this.auth.login(b.email, b.password, b.totp);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      path: '/',
    });
    return { ok: true, expiresAt };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = tokenFrom(req);
    if (token) await this.auth.logout(token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentActor() actor: Actor) {
    const permissions = [...new Set(actor.assignments.flatMap((a) => ROLE_PERMISSIONS[a.roleKey]))].sort();
    return { ...actor, permissions };
  }

  @Post('password')
  @HttpCode(200)
  async changePassword(@CurrentActor() actor: Actor, @Body() body: unknown) {
    const b = parse(ChangePassword, body);
    await this.auth.changePassword(actor, b.current, b.next);
    return { ok: true };
  }

  @Post('totp/setup')
  @HttpCode(200)
  totpSetup(@CurrentActor() actor: Actor) {
    return this.auth.startTotp(actor);
  }

  @Post('totp/confirm')
  @HttpCode(200)
  async totpConfirm(@CurrentActor() actor: Actor, @Body() body: unknown) {
    await this.auth.confirmTotp(actor, parse(TotpCode, body).code);
    return { ok: true };
  }
}
