import * as fs from 'fs';
import * as path from 'path';

const backendRoot = path.join(__dirname, '..', '..', '..');

const requiredDocs: Array<{ file: string; sections: string[] }> = [
  {
    file: 'docs/PERFORMANCE_TUNING_GUIDELINES.md',
    sections: [
      'Performance targets',
      'Database tuning',
      'Redis and caching',
      'Pre-release performance checklist',
    ],
  },
];

describe('Performance tuning documentation', () => {
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

  it('docs README links to performance tuning guidelines', () => {
    const readmePath = path.join(backendRoot, 'docs/README.md');
    const content = fs.readFileSync(readmePath, 'utf8');
    expect(content).toContain('PERFORMANCE_TUNING_GUIDELINES.md');
  });
});
