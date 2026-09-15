/* copia-dev.js — prepara la COPIA di prova dell'app.
 *
 * PERCHE' ESISTE. (20/08/2026.) Ogni banco e ogni fotografo faceva da se'
 * la stessa riga: `replace("var DEV_MODE = false;", "...true;")`. Finche' la
 * riga era una sola andava bene. Poi ne e' servita una seconda — l'utente
 * finto — e una modifica fatta in tre posti su quattro e' esattamente il
 * difetto che il diario racconta alla voce del nome nella chat: *una copia
 * non si aggiorna da sola*.
 *
 * L'UTENTE FINTO, e perche' serve. Con il solo DEV_MODE `currentUser` resta
 * `null`: la barra in fondo non si disegna (la guardia e' `currentUser &&
 * authState === "ready"`) e meta' dell'app non e' raggiungibile. I banchi e
 * le foto guardavano l'app **da fuori la porta**, e la barra nuova — cinque
 * voci, icone rifatte il 20/08 — non e' mai comparsa in una foto.
 *
 * NON E' L'ADMIN, di proposito: e' un iscritto qualunque. Le schermate che
 * si guardano devono essere quelle che vede la gente, non quelle in piu' che
 * vede chi tiene l'app.
 *
 * NIENTE DI QUESTO TOCCA IL FILE DEL SITO: la sostituzione avviene sulla
 * copia in una cartella temporanea. `index.html` resta com'e', e non c'e'
 * niente da ricaricare su GitHub.
 */
var VERO = "var DEV_MODE = false;";
var UTENTE = "var currentUser = null;";

function accendiDev(html, opzioni) {
  var conUtente = !opzioni || opzioni.utente !== false;
  if (html.indexOf(VERO) < 0) throw new Error("copia-dev: DEV_MODE non trovato in questo file");
  html = html.replace(VERO, "var DEV_MODE = true;");
  if (conUtente) {
    if (html.indexOf(UTENTE) < 0) throw new Error("copia-dev: la riga di currentUser non e' piu' quella attesa");
    html = html.replace(UTENTE,
      'var currentUser = DEV_MODE ? { uid:"dev-locale", email:"arciere@example.com", ' +
      'displayName:"Alessandro", emailVerified:true, ' +
      'reload:function(){ return Promise.resolve(); }, ' +
      'delete:function(){ return Promise.reject(new Error("DEV_MODE")); }, ' +
      'sendEmailVerification:function(){ return Promise.resolve(); }, ' +
      'reauthenticateWithCredential:function(){ return Promise.reject(new Error("DEV_MODE")); } } : null;');
  }
  return html;
}

module.exports = { accendiDev: accendiDev };
