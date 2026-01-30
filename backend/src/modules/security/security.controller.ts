import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('Security')
@Controller()
export class SecurityController {
  constructor(private readonly configService: ConfigService) {}

  @Get('security.txt')
  @Get('.well-known/security.txt')
  @ApiOperation({
    summary: 'Security policy information',
    description: 'Returns security contact and policy information per RFC 9116',
  })
  @ApiResponse({
    status: 200,
    description: 'Security.txt content',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
        },
      },
    },
  })
  getSecurityTxt(@Res() res: Response): void {
    const securityContact =
      this.configService.get<string>('SECURITY_CONTACT') ||
      'security@chioma.app';
    const securityPolicy =
      this.configService.get<string>('SECURITY_POLICY_URL') ||
      'https://chioma.app/security';
    const acknowledgments =
      this.configService.get<string>('SECURITY_ACKNOWLEDGMENTS_URL') ||
      'https://chioma.app/security/acknowledgments';
    const preferredLanguages =
      this.configService.get<string>('SECURITY_PREFERRED_LANGUAGES') || 'en';
    const canonical =
      this.configService.get<string>('SECURITY_CANONICAL_URL') ||
      'https://chioma.app/.well-known/security.txt';
    const expires =
      this.configService.get<string>('SECURITY_EXPIRES') ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year from now

    const securityTxt = [
      `Contact: ${securityContact}`,
      `Expires: ${expires}`,
      `Preferred-Languages: ${preferredLanguages}`,
      `Canonical: ${canonical}`,
      `Policy: ${securityPolicy}`,
      `Acknowledgments: ${acknowledgments}`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(securityTxt);
  }
}
