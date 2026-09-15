# Icone ArcTrail 3D — cosa caricare su GitHub

Tutti i file vanno nella **cartella principale** del repository, accanto a
`index.html`. Sono sostituzioni: stessi nomi, nessuna modifica al codice.

## I file, e chi li legge

| file | chi lo cerca |
|---|---|
| `icon-192.png` | `manifest.json` + `<link rel="icon">` + `apple-touch-icon` |
| `icon-512.png` | `manifest.json` |
| `icon-512-maskable.png` | `manifest.json`, purpose maskable |
| `logo.webp` | `index.html` (2 riferimenti) |
| `logo.jpg` | `index.html` (3 riferimenti) e anteprime social |
| `logo.png` | riserva |
| `appletouchicon.png` | vecchio nome, tenuto per sicurezza |
| `marchio-piccolo.svg` `favicon32.png` | **vettoriale**, sotto i 48px |
| `marchio-trasparente-512.png` | marchio senza fondo, per sovrapposizioni |
| `prova-icona.png` | foglio di controllo, NON caricare |

## Un difetto trovato oggi, e corretto

Il `manifest.json` cerca `icon-192.png`, `icon-512.png`,
`icon-512-maskable.png` — **con i trattini**. Nel repository i file si
chiamavano `icon192.png`, `icon512.png`, `icon512maskable.png`, **senza**.
I tre nomi del manifest non esistevano: l'icona dell'app installata non
poteva essere caricata da lì.

Adesso i nomi corrispondono. I vecchi file senza trattino si possono
cancellare dal repository.

## Come caricare

1. `github.com/alessandrozanetta80-boop/arctrail3d` → **Add file** →
   **Upload files**
2. Trascinare tutti i file tranne `prova-icona.png` e questo `LEGGIMI.md`
3. Messaggio del commit: `icone nuove + correzione nomi manifest`
4. **Commit changes**

## Dopo il caricamento

L'icona vecchia resta in cache. Per vederla cambiata:
disinstallare la PWA dal telefono, aprire il sito, reinstallarla.
Sul desktop basta un ricaricamento forzato.

## Limiti dichiarati

È un raster: non si ricolora, non si fa in tinta unita, non scala oltre 1024.
Il marchio vero in vettoriale resta da fare.
