export type Operazione = 'leggi' | 'ascolta' | 'crea' | 'aggiorna' | 'elimina';
export interface Scope { ente: string; utente: string; permessi?: Operazione[] }
export interface PuntoMappa { id: string; lat: number; lon: number; nome?: string; tipo?: string; note?: string }
export interface DefCollezione {
  campoScope: string;
  campoAutore?: string;
  campi?: Partial<Record<'id' | 'lat' | 'lon' | 'nome' | 'tipo' | 'note', string>>;
  operazioni?: Operazione[];
}
export interface DefTabellaSupabase extends DefCollezione { tabella: string; schema?: string }
export interface DefCollezioneFirebase extends DefCollezione { collezione: string }
export type CodiceErrore = 'NON_SUPPORTATO' | 'SCOPE_MANCANTE' | 'PERMESSO' | 'FUORI_SCOPE' | 'CONFIG' | 'CHIAVE_VIETATA' | 'BACKEND' | 'NON_TROVATO' | 'SCOPE_CAMBIATO';
export class ErroreDatiMappa extends Error { codice: CodiceErrore; causa?: unknown }
export interface FonteDati {
  readonly tipo: 'firebase' | 'supabase';
  readonly scope: Readonly<Required<Scope>> | null;
  scartatiFuoriScope: number;
  capacita(collezione: string): Operazione[];
  impostaScope(scope: Scope): Readonly<Required<Scope>>;
  chiudi(): void;
  fermaAscolti(): void;
  ascoltiAttivi(): number;
  elenca(collezione: string): Promise<PuntoMappa[]>;
  ascolta(collezione: string, suDati: (punti: PuntoMappa[]) => void, suErrore?: (e: ErroreDatiMappa) => void): () => void;
  crea(collezione: string, punto: Omit<PuntoMappa, 'id'>): Promise<string>;
  aggiorna(collezione: string, id: string, modifiche: Partial<Omit<PuntoMappa, 'id'>>): Promise<true>;
  elimina(collezione: string, id: string): Promise<true>;
}
export type ConfigSupabase = { tipo: 'supabase'; client: unknown; collezioni: Record<string, DefTabellaSupabase> };
export type ConfigFirebase = { tipo: 'firebase'; db: unknown; sdk?: Record<string, unknown>; collezioni: Record<string, DefCollezioneFirebase> };
export function creaAdattatoreSupabase(opz: Omit<ConfigSupabase, 'tipo'>): FonteDati;
export function creaAdattatoreFirebase(opz: Omit<ConfigFirebase, 'tipo'>): FonteDati;
export function creaFonteDati(config: ConfigSupabase | ConfigFirebase): FonteDati;
export function chiaveDiServizio(client: unknown): boolean;
export function firestoreAmministrativo(db: unknown): boolean;
export function validaScope(scope: Scope): Readonly<Required<Scope>>;
