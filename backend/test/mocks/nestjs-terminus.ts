export class TerminusModule {
  static forRoot(_options?: any): any {
    return {
      module: TerminusModule,
      providers: [],
      exports: [],
    };
  }
}

export class HealthCheckService {
  check(): Promise<any> {
    return Promise.resolve({ status: 'ok' });
  }
}

export default {
  TerminusModule,
  HealthCheckService,
};
