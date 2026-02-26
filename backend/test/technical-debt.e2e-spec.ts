import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TechnicalDebtModule } from '../src/modules/technical-debt/technical-debt.module';

describe('TechnicalDebtController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TechnicalDebtModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/technical-debt/quality/project (GET)', () => {
    it('should return project quality report', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/quality/project')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.projectName).toBe('Backend');
          expect(res.body.overallScore).toBeDefined();
          expect(res.body.modules).toBeInstanceOf(Array);
          expect(res.body.summary).toBeDefined();
        });
    });

    it('should filter by module when specified', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/quality/project?modules=auth')
        .expect(200)
        .expect((res) => {
          expect(res.body.modules.length).toBeGreaterThanOrEqual(0);
        });
    });

    it('should respect depth option', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/quality/project?depth=shallow')
        .expect(200)
        .expect((res) => {
          expect(res.body.overallScore).toBeDefined();
        });
    });
  });

  describe('/technical-debt/quality/module/:moduleName (GET)', () => {
    it('should return module quality report', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/quality/module/auth')
        .expect(200)
        .expect((res) => {
          expect(res.body.moduleName).toBe('auth');
          expect(res.body.score).toBeDefined();
          expect(res.body.issues).toBeInstanceOf(Array);
          expect(res.body.complexity).toBeDefined();
        });
    });
  });

  describe('/technical-debt/quality/metrics (GET)', () => {
    it('should return quality metrics', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/quality/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.body.complexity).toBeDefined();
          expect(res.body.maintainability).toBeDefined();
          expect(res.body.documentation).toBeDefined();
          expect(res.body.errorHandling).toBeDefined();
          expect(res.body.typeSafety).toBeDefined();
        });
    });
  });

  describe('/technical-debt/refactoring/opportunities (GET)', () => {
    it('should return refactoring opportunities', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/refactoring/opportunities')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          if (res.body.length > 0) {
            const opp = res.body[0];
            expect(opp.id).toBeDefined();
            expect(opp.type).toBeDefined();
            expect(opp.priority).toBeDefined();
            expect(opp.estimatedEffort).toBeDefined();
          }
        });
    });

    it('should filter by module when specified', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/refactoring/opportunities?moduleName=auth')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
        });
    });
  });

  describe('/technical-debt/refactoring/plan (POST)', () => {
    it('should create refactoring plan', async () => {
      // First get opportunities
      const oppRes = await request(app.getHttpServer())
        .get('/technical-debt/refactoring/opportunities')
        .expect(200);

      if (oppRes.body.length > 0) {
        const opportunityIds = oppRes.body.slice(0, 3).map((o: any) => o.id);

        return request(app.getHttpServer())
          .post('/technical-debt/refactoring/plan')
          .send({ opportunityIds })
          .expect(201)
          .expect((res) => {
            expect(res.body.id).toBeDefined();
            expect(res.body.opportunities).toBeInstanceOf(Array);
            expect(res.body.estimatedTotalEffort).toBeDefined();
            expect(res.body.expectedImpact).toBeDefined();
            expect(res.body.risks).toBeInstanceOf(Array);
          });
      }
    });
  });

  describe('/technical-debt/refactoring/history (GET)', () => {
    it('should return refactoring history', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/refactoring/history')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
        });
    });
  });

  describe('/technical-debt/refactoring/stats (GET)', () => {
    it('should return refactoring statistics', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/refactoring/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBeDefined();
          expect(res.body.completed).toBeDefined();
          expect(res.body.failed).toBeDefined();
          expect(res.body.totalFilesModified).toBeDefined();
          expect(res.body.totalLinesChanged).toBeDefined();
        });
    });
  });

  describe('/technical-debt/dependencies/report (GET)', () => {
    it('should return dependency report', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/dependencies/report')
        .expect(200)
        .expect((res) => {
          expect(res.body.totalDependencies).toBeGreaterThan(0);
          expect(res.body.dependencies).toBeInstanceOf(Array);
          expect(res.body.vulnerabilities).toBeInstanceOf(Array);
          expect(res.body.summary).toBeDefined();
          expect(res.body.updateRecommendations).toBeInstanceOf(Array);
        });
    });
  });

  describe('/technical-debt/dependencies/vulnerabilities (GET)', () => {
    it('should check for vulnerabilities', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/dependencies/vulnerabilities')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          res.body.forEach((vuln: any) => {
            expect(vuln.id).toBeDefined();
            expect(vuln.severity).toBeDefined();
            expect(vuln.affectedPackage).toBeDefined();
          });
        });
    });
  });

  describe('/technical-debt/dependencies/outdated (GET)', () => {
    it('should check for outdated packages', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/dependencies/outdated')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          res.body.forEach((dep: any) => {
            expect(dep.name).toBeDefined();
            expect(dep.currentVersion).toBeDefined();
            expect(dep.latestVersion).toBeDefined();
          });
        });
    });
  });

  describe('/technical-debt/dependencies/analysis (GET)', () => {
    it('should perform full dependency analysis', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/dependencies/analysis')
        .expect(200)
        .expect((res) => {
          expect(res.body.sizeAnalysis).toBeDefined();
          expect(res.body.unusedDependencies).toBeInstanceOf(Array);
          expect(res.body.duplicateDependencies).toBeInstanceOf(Array);
          expect(res.body.licenseIssues).toBeInstanceOf(Array);
        });
    });
  });

  describe('/technical-debt/dashboard (GET)', () => {
    it('should return comprehensive dashboard data', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/dashboard')
        .expect(200)
        .expect((res) => {
          expect(res.body.timestamp).toBeDefined();
          expect(res.body.quality).toBeDefined();
          expect(res.body.refactoring).toBeDefined();
          expect(res.body.dependencies).toBeDefined();

          // Quality metrics
          expect(res.body.quality.overallScore).toBeDefined();
          expect(res.body.quality.level).toBeDefined();
          expect(res.body.quality.technicalDebtHours).toBeDefined();

          // Refactoring metrics
          expect(res.body.refactoring.totalOpportunities).toBeDefined();
          expect(res.body.refactoring.autoApplicable).toBeDefined();

          // Dependency metrics
          expect(res.body.dependencies.total).toBeDefined();
          expect(res.body.dependencies.vulnerabilities).toBeDefined();
        });
    });
  });

  describe('Concurrent requests handling', () => {
    it('should handle multiple simultaneous requests', async () => {
      const requests = [
        request(app.getHttpServer()).get('/technical-debt/quality/metrics'),
        request(app.getHttpServer()).get('/technical-debt/refactoring/opportunities'),
        request(app.getHttpServer()).get('/technical-debt/dependencies/report'),
        request(app.getHttpServer()).get('/technical-debt/dashboard'),
      ];

      const responses = await Promise.all(requests);

      responses.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
      });
    });
  });

  describe('Error handling', () => {
    it('should handle invalid module name gracefully', () => {
      return request(app.getHttpServer())
        .get('/technical-debt/quality/module/nonexistent-module-xyz')
        .expect(200)
        .expect((res) => {
          expect(res.body.fileCount).toBe(0);
          expect(res.body.issues).toEqual([]);
        });
    });
  });
});
