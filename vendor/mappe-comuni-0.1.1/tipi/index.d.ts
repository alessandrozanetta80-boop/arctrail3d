import type { FonteDati, Scope, PuntoMappa, ErroreDatiMappa } from './dati';

export interface PosizioneMappa { lat: number; lon: number; acc?: number; heading?: number; t?: number }
export interface TerritorioCaricato {
  id: string; nome: string; base: string; manifesto: any;
  leggiTesto(voce: any): Promise<string>; leggiJson(voce: any): Promise<any>; layer(id: string): any; baseDtm(): string | null;
}
export interface ConfigMappaComune {
  /** Leaflet: import L from 'leaflet' oppure window.L */
  L: unknown;
  /** spazio di preferenze e cache offline (es. 'adrenalina', 'gestionale') */
  progetto: string;
  territorio?: { base: string } | TerritorioCaricato;
  archivio?: Storage | null;
  fetchImpl?: (url: any) => Promise<any>;
  vista?: { lat: number; lon: number; zoom: number };
  sorgentePmtiles?: unknown;
  /** nomi dei territori della mappa offline (default: nome del pacchetto territoriale) */
  territoriOffline?: string[];
  gps?: { start(suPosizione: (s: any) => void, suErrore: (e: any) => void, opzioni?: object): unknown; stop(): void };
  opzioniGps?: object;
  dati?: { fonte: FonteDati; scope?: Scope; titoloSezione?: string; overlay?: { collezione: string; titolo?: string; nota?: string }[]; chiudiAllaDistruzione?: boolean };
  funzioni?: Partial<Record<'segnaPosizione' | 'strumenti' | 'rilievo' | 'nomi' | 'piste' | 'dtmOffline', boolean>>;
  testi?: { segna?: string };
  classificaArea?: (meta: any, feature: any) => any;
  cacheOffline?: unknown;
  memoriaOffline?: unknown;
  callback?: {
    suSegnaPosizione?: (pos: PosizioneMappa | null, api: ApiMappaComune) => void;
    suToccoPunto?: (punto: PuntoMappa, collezione: string) => void;
    suPressioneLunga?: (pos: { lat: number; lon: number }, api: ApiMappaComune) => void;
    suMappeOffline?: () => void;
    suCambioBase?: (id: string) => void;
    suStatoBase?: (stato: string, id: string) => void;
    suErroreDati?: (e: ErroreDatiMappa) => void;
    avviso?: (testo: string, tipo: string) => boolean | void;
  };
}
export interface ApiMappaComune {
  motore: any; radice: HTMLElement; territorio: TerritorioCaricato | null;
  apriLayer(): void; chiudiFogli(): void; avviso(testo: string, tipo?: string): void;
  aggiornaPosizione(fix: (PosizioneMappa & { stato?: string }) | null): void;
  posizione(): PosizioneMappa | null;
  impostaScope(scope: Scope): void;
  logout(): void;
  statoDati(): { ascoltiAttivi: number; errore: string | null; overlay: { collezione: string; punti: number; errore: string | null }[] };
  indietro(): boolean;
  distruggi(): void;
}
export function creaMappaComune(contenitore: HTMLElement, config: ConfigMappaComune): Promise<ApiMappaComune>;
export function caricaTerritorio(opz: { base: string; fetchImpl?: (u: string) => Promise<any> }): Promise<TerritorioCaricato>;
export function problemiTerritorio(manifesto: unknown): string[];
export const FORMATO_TERRITORIO: 'mappe-comuni-territorio';
export function classificaNeutra(meta: any, feature: any): any;
export const STATO_AREA: Readonly<Record<'DIVIETO' | 'LIMITAZIONE' | 'DA_VERIFICARE' | 'INFORMATIVO', string>>;
export const COLORE_AREA: Readonly<Record<string, string>>;
export class MotoreMappa { constructor(el: HTMLElement, opz: { L: unknown; [k: string]: unknown }); map: any; [k: string]: any }
export function popupArea(meta: any, feature: any, sovrapposte?: any[], classifica?: (m: any, f: any) => any): HTMLElement;
export function nodoSchedaPista(s: any): HTMLElement;
export function archivioConPrefisso(archivio: Storage | null, prefisso: string): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const MAPPE_BASE: readonly any[];
export const MAPPA_OFFLINE: any;
export const IBRIDA_SENZA_OFFLINE: any;
export function vociMappaBase(config?: unknown): { id: string; nome: string; descrizione: string; varianti: string[] }[];
export function mappaBase(id: string, config?: unknown): any;
export const VERSIONE: string;
