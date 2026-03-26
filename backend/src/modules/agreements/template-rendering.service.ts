import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplateRenderingService {
  /**
   * Substitutes variables in a template string with actual data.
   * Format: {{variable_name}}
   */
  render(content: string, variables: Record<string, any>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * Compiles base content and clauses into a full agreement text.
   */
  compileAgreement(
    baseContent: string,
    clauses: { title: string; content: string }[],
  ): string {
    const clausesText = clauses
      .map((c, i) => `${i + 1}. ${c.title}\n${c.content}`)
      .join('\n\n');
    return `${baseContent}\n\n--- ADDITIONAL CLAUSES ---\n\n${clausesText}`;
  }
}
