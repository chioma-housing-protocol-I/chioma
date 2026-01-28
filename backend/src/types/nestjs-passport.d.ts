declare module '@nestjs/passport' {
  export function AuthGuard(
    type?: string,
  ): new () => {
    canActivate(
      ...args: unknown[]
    ): boolean | Promise<boolean> | import('rxjs').Observable<boolean>;
  };
}
