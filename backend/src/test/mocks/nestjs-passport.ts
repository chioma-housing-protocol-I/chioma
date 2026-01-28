export const AuthGuard = () => {
  return class {
    canActivate(): boolean {
      return true;
    }
  };
};
