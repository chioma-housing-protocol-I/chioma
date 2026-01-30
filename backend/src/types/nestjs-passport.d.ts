declare module '@nestjs/passport' {
  export function AuthGuard(type?: string): new () => {
    canActivate(
      ...args: unknown[]
    ): boolean | Promise<boolean> | import('rxjs').Observable<boolean>;
  };

  export class PassportModule {
    static register(options?: { defaultStrategy?: string }): any;
  }

  export function PassportStrategy<T extends new (...args: any[]) => any>(
    Strategy: T,
    name?: string,
  ): new (...args: any[]) => InstanceType<T>;
}
