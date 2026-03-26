import { TemplateRenderingService } from './template-rendering.service';

describe('TemplateRenderingService', () => {
  let service: TemplateRenderingService;

  beforeEach(() => {
    service = new TemplateRenderingService();
  });

  it('should substitute variables correctly', () => {
    const template = 'Hello {{name}}, welcome to {{city}}!';
    const variables = { name: 'Jadon', city: 'Akure' };
    const result = service.render(template, variables);
    expect(result).toBe('Hello Jadon, welcome to Akure!');
  });

  it('should leave unknown variables as is', () => {
    const template = 'Hello {{name}}, your ID is {{id}}.';
    const variables = { name: 'Jadon' };
    const result = service.render(template, variables);
    expect(result).toBe('Hello Jadon, your ID is {{id}}.');
  });

  it('should compile base content and clauses', () => {
    const base = 'Base Agreement Content';
    const clauses = [{ title: 'Pet Policy', content: 'No cats allowed' }];
    const result = service.compileAgreement(base, clauses);
    expect(result).toContain('Base Agreement Content');
    expect(result).toContain('1. Pet Policy');
    expect(result).toContain('No cats allowed');
  });
});
