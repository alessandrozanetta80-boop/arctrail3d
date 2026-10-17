import type { ConfigMappaComune, ApiMappaComune } from './index';
import type { Scope } from './dati';
export interface MappaComuneProps {
  config: ConfigMappaComune;
  suPronta?: (api: ApiMappaComune) => void;
  suErrore?: (e: Error) => void;
  className?: string;
  style?: Record<string, string | number>;
  /** cambio ente/utente deciso dall'app; null = logout */
  scope?: Scope | null;
}
export function MappaComune(props: MappaComuneProps): any;
