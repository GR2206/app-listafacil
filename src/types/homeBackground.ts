export interface HomeAppManifest {
  version?: number;
  updatedAt?: string;
  homeBackgroundUrl?: string | null;
  /** Logo de la app en splash / UI (no cambia el ícono del launcher sin recompilar). */
  appLogoUrl?: string | null;
}
