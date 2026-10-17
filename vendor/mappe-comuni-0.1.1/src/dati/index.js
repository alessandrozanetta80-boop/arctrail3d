// Dati della mappa: contratto comune + due adattatori. Il backend si sceglie in CONFIGURAZIONE ({tipo: 'firebase'|'supabase'}),
// senza cambiare motore, CSS o menu. I servizi cartografici pubblici e l'offline NON passano di qui.
import { FonteDatiFirebase } from './firebase.js';
import { FonteDatiSupabase } from './supabase.js';
import { ErroreDatiMappa } from './contratto.js';

export { ErroreDatiMappa, FonteDatiBase, OPERAZIONI, validaScope, rigaAPunto, puntoARiga } from './contratto.js';
export { FonteDatiFirebase, creaAdattatoreFirebase, firestoreAmministrativo } from './firebase.js';
export { FonteDatiSupabase, creaAdattatoreSupabase, chiaveDiServizio } from './supabase.js';

/**
 * @param {{tipo: 'firebase', db: object, sdk?: object, collezioni: object} | {tipo: 'supabase', client: object, collezioni: object}} config
 */
export function creaFonteDati(config) {
  if (!config || typeof config !== 'object') throw new ErroreDatiMappa('CONFIG', 'configurazione dei dati mancante');
  if (config.tipo === 'firebase') return new FonteDatiFirebase(config);
  if (config.tipo === 'supabase') return new FonteDatiSupabase(config);
  throw new ErroreDatiMappa('NON_SUPPORTATO', 'backend non supportato: ' + config.tipo + ' (previsti: firebase, supabase)');
}
