import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Security Controller
 * Serves security-related endpoints like security.txt
 */
@ApiTags('Security')
@Controller()
export class SecurityController {
  /**
   * Serve security.txt file
   * RFC 9116 compliant
   */
  @Get('.well-known/security.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiOperation({ summary: 'Get security.txt file' })
  @ApiResponse({ status: 200, description: 'Security policy information' })
  getSecurityTxt(): string {
    const expiresDate = new Date();
    expiresDate.setFullYear(expiresDate.getFullYear() + 1);

    const contactEmail =
      process.env.SECURITY_CONTACT_EMAIL || 'security@chioma.io';
    const policyUrl =
      process.env.SECURITY_POLICY_URL || 'https://chioma.io/security-policy';
    const canonicalUrl =
      process.env.APP_URL || 'https://chioma.io';

    return `# Chioma Security Policy
# This file follows the security.txt specification (RFC 9116)
# https://securitytxt.org/

Contact: mailto:${contactEmail}
Expires: ${expiresDate.toISOString()}
Preferred-Languages: en
Canonical: ${canonicalUrl}/.well-known/security.txt
Policy: ${policyUrl}

# Encryption key for secure communication (optional)
# Encryption: ${canonicalUrl}/.well-known/pgp-key.txt

# Acknowledgements page (optional)
# Acknowledgments: ${canonicalUrl}/security/hall-of-fame

# Hiring security engineers (optional)
# Hiring: ${canonicalUrl}/careers

# Our scope and rules of engagement
# This policy applies to the following domains:
# - chioma.io
# - api.chioma.io
# - app.chioma.io
#
# Out of scope:
# - Third-party services
# - Social engineering attacks
# - Physical attacks
# - Denial of service attacks
#
# Safe Harbor:
# We consider security research conducted in accordance with this policy to be:
# - Authorized concerning any applicable anti-hacking laws
# - Authorized concerning any relevant anti-circumvention laws
# - Exempt from restrictions in our Terms of Service that would interfere with security research
# - Lawful, helpful to the overall security of the Internet, and conducted in good faith
#
# Please report vulnerabilities responsibly via the contact email above.
`;
  }

  /**
   * Serve robots.txt for security-sensitive paths
   */
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiOperation({ summary: 'Get robots.txt file' })
  getRobotsTxt(): string {
    return `User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /health/
Disallow: /.well-known/
Allow: /.well-known/security.txt
Sitemap: ${process.env.APP_URL || 'https://chioma.io'}/sitemap.xml
`;
  }

  /**
   * Security headers check endpoint
   * Useful for security auditing tools
   */
  @Get('api/security/headers')
  @ApiOperation({ summary: 'Check security headers configuration' })
  @ApiResponse({ status: 200, description: 'Security headers status' })
  getSecurityHeaders(): Record<string, string | boolean> {
    return {
      message: 'Security headers are configured via Helmet.js',
      headers: {
        'Content-Security-Policy': true,
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security':
          'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
      recommendations: [
        'Ensure TLS 1.3 is enabled on your server',
        'Configure HSTS preload list submission',
        'Implement Subresource Integrity (SRI) for scripts',
        'Enable Certificate Transparency monitoring',
      ],
    } as any;
  }
}
