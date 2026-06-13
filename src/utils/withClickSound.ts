/** Envuelve un handler sin sonido (navegación y UI general). */
export function withClickSound(handler?: () => void): () => void {
  return () => {
    handler?.();
  };
}

export function withClickSoundAsync<T extends unknown[]>(
  handler: (...args: T) => void | Promise<void>
): (...args: T) => void {
  return (...args: T) => {
    void handler(...args);
  };
}
