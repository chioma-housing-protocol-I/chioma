import * as fs from 'fs';
import * as path from 'path';

const backendRoot = path.join(__dirname, '..', '..', '..');

const requiredDocs: Array<{ file: string; sections: string[] }> = [
  {
    file: 'docs/api/api-documentation.md',
    sections: ['Authentication', 'Base URL', 'API Endpoints'],
  },
  {
    file: 'docs/api/USAGE_GUIDE.md',
    sections: ['Register a user', 'Create an API key', 'Pre-push checklist'],
  },
  {
    file: 'docs/README.md',
    sections: ['API Reference', 'Usage Guide', 'Swagger UI'],
  },
  {
    file: 'README.md',
    sections: ['API documentation', 'make ci'],
  },
  {
    file: 'src/modules/auth/AUTH_API_DOCUMENTATION.md',
    sections: ['/api/auth', 'Register', 'Token refresh'],
  },
];

describe('API documentation files', () => {
  it.each(requiredDocs)(
    '$file exists with required sections',
    ({ file, sections }) => {
      const fullPath = path.join(backendRoot, file);
      expect(fs.existsSync(fullPath)).toBe(true);

      const content = fs.readFileSync(fullPath, 'utf8');
      for (const section of sections) {
        expect(content).toContain(section);
      }
    },
  );

  it('developer portal HTML links to Swagger and OpenAPI spec', () => {
    const portalPath = path.join(
      backendRoot,
      'public',
      'developer-portal.html',
    );
    const html = fs.readFileSync(portalPath, 'utf8');
    expect(html).toContain('/api/docs');
    expect(html).toContain('/api/docs-json');
    expect(html).toContain('Chioma Developer Portal');
    expect(html).toContain('Documentation');
  });

  it('api-documentation.md uses correct local port', () => {
    const docPath = path.join(backendRoot, 'docs/api/api-documentation.md');
    const content = fs.readFileSync(docPath, 'utf8');
    expect(content).toContain('localhost:5000');
    expect(content).not.toContain('localhost:3000');
  });
});
