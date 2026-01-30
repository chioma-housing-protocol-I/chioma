declare module 'qrcode' {
  export function toDataURL(text: string, options?: any): Promise<string>;
}
