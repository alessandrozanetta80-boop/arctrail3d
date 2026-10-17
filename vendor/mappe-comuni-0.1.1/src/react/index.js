// WRAPPER REACT SOTTILE: monta la STESSA mappa comune (creaMappaComune) in un div. Nessun menu, CSS o motore propri.
// Senza JSX (nessuna build nel pacchetto): React.createElement. React e' una peerDependency dell'app.
import { createElement, useEffect, useRef } from 'react';
import { creaMappaComune } from '../ui/mappaComune.js';

/**
 * @param {{config: object, suPronta?: (api: object) => void, suErrore?: (e: Error) => void, className?: string, style?: object, scope?: object|null}} props
 *  `config` si legge al montaggio (cambiarlo richiede una nuova `key`); `scope` si puo' cambiare: cambio ente/utente o logout (null).
 */
export function MappaComune({ config, suPronta, suErrore, className, style, scope }) {
  const contenitore = useRef(null);
  const api = useRef(null);
  useEffect(() => {
    let annullato = false;
    creaMappaComune(contenitore.current, config).then((a) => {
      if (annullato) { a.distruggi(); return; }
      api.current = a;
      if (suPronta) suPronta(a);
    }, (e) => { if (suErrore) suErrore(e); else console.error(e); });
    return () => { annullato = true; if (api.current) { api.current.distruggi(); api.current = null; } };
    // montata una volta per configurazione: per cambiarla si cambia `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const a = api.current;
    if (!a || scope === undefined) return;
    if (scope === null) a.logout(); else a.impostaScope(scope);
  }, [scope && scope.ente, scope && scope.utente, scope && (scope.permessi || []).join(','), scope === null]);
  return createElement('div', { ref: contenitore, className: 'mc-contenitore' + (className ? ' ' + className : ''), style: { position: 'relative', width: '100%', height: '100%', ...(style || {}) } });
}
