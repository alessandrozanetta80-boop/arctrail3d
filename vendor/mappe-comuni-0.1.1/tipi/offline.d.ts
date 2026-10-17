export interface CacheIsolata { spazio: string; leggi(chiave: string): Promise<any>; salva(rec: { chiave: string; sha256?: string; dati?: ArrayBuffer; testo?: string }): Promise<void>; chiavi(): Promise<string[]>; svuota(prefisso?: string): Promise<number> }
export function creaCacheIsolata(opz: { progetto: string; ente: string; versione: string; memoria?: unknown; cripto?: unknown }): CacheIsolata;
export function memoriaInRam(): unknown;
export function memoriaIndexedDB(opz?: { indexedDB?: IDBFactory; nomeDb?: string }): unknown;
export function sha256Esadecimale(dati: ArrayBuffer | ArrayBufferView | string, cripto?: unknown): Promise<string>;
export class PacchettoDtm { constructor(opz: { base: string; id: string; archivio: CacheIsolata; fetchImpl?: (u: string) => Promise<any> }); [k: string]: any }
