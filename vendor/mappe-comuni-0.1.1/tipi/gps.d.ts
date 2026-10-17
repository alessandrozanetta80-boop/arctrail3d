export const STATO_GPS: Readonly<Record<string, string>>;
export const ERRORE_GPS: Readonly<Record<string, string>>;
export class LocationProvider { start(suPosizione: (s: any) => void, suErrore?: (e: any) => void, opzioni?: object): unknown; stop(): void; stato(): string }
export class BrowserGeolocationProvider extends LocationProvider { constructor(geolocation?: Geolocation) }
export class SimulatedLocationProvider extends LocationProvider { constructor(opz?: { partenza?: { lat: number; lon: number }; passoMetri?: number; intervalloMs?: number; accuracy?: number }) }
