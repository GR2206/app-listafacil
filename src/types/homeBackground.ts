/** Sponsor del banner ovalado (por zona). El logo sale del catálogo local. */
export type TaquilleroSponsorEntry =
  | string
  | {
      supermarketId: string;
      /** Opcional: override de nombre. Si falta, usa el del catálogo. */
      name?: string;
    };

export interface HomeAppManifest {
  version?: number;
  updatedAt?: string;
  homeBackgroundUrl?: string | null;
  /** Logo de la app en splash / UI (no cambia el ícono del launcher sin recompilar). */
  appLogoUrl?: string | null;
  /**
   * Banner “súper caliente” vendible por zona (regionKey).
   * Ej: { "posadas": "california", "rosario": "la-reina", "default": "vea" }
   * La app pone el logo automático si el id existe en catálogo y aplica a esa zona.
   */
  taquilleroSponsorByZone?: Record<string, TaquilleroSponsorEntry>;
}
