declare module 'qz-tray' {
  const qz: {
    websocket: { isActive(): boolean; connect(options?: { retries?: number; delay?: number }): Promise<void>; disconnect(): Promise<void> }
    printers: { find(query?: string): Promise<string | string[]> }
    configs: { create(printer: string, options?: Record<string, unknown>): unknown }
    security: {
      setCertificatePromise(factory: (resolve: (certificate: string) => void, reject: (error: unknown) => void) => void): void
      setSignatureAlgorithm(algorithm: string): void
      setSignaturePromise(factory: (toSign: string) => (resolve: (signature: string) => void, reject: (error: unknown) => void) => void): void
    }
    print(config: unknown, data: Array<Record<string, unknown>>): Promise<void>
  }
  export default qz
}
