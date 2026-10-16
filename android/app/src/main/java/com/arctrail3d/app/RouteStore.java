package com.arctrail3d.app;

import android.content.Context;
import android.location.Location;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

/** Private durable journal. No network, Firebase credentials or shared external storage. */
final class RouteStore {
    private static File state(Context c) { return new File(c.getFilesDir(), "gps-route.json"); }
    private static File journal(Context c) { return new File(c.getFilesDir(), "gps-route.jsonl"); }
    static synchronized JSONObject stateOf(Context c) throws Exception {
        if (!state(c).exists() && !new File(state(c).getPath()+".bak").exists()) return new JSONObject();
        try (FileInputStream in = new android.util.AtomicFile(state(c)).openRead()) {
            ByteArrayOutputStream b = new ByteArrayOutputStream(); byte[] buf = new byte[4096]; int n;
            while ((n = in.read(buf)) != -1) b.write(buf, 0, n);
            return new JSONObject(b.toString("UTF-8"));
        }
    }
    static synchronized void save(Context c, JSONObject s) throws Exception {
        android.util.AtomicFile f = new android.util.AtomicFile(state(c));
        FileOutputStream out = f.startWrite();
        try { out.write(s.toString().getBytes(StandardCharsets.UTF_8)); f.finishWrite(out); }
        catch (Exception e) { f.failWrite(out); throw e; }
    }
    static boolean owner(JSONObject s, String uid, String id) {
        return uid != null && !uid.isEmpty() && uid.equals(s.optString("uid")) && id != null && id.equals(s.optString("id"));
    }
    static synchronized void begin(Context c, JSONObject req) throws Exception {
        JSONObject old = stateOf(c);
        if (old.has("id") && !owner(old, req.getString("uid"), req.getString("id")))
            throw new IllegalStateException("Prima salva il percorso precedente con il suo account.");
        if (old.has("id")) {
            // An interrupted write can leave a partial final JSON line; trim only that tail.
            if (journal(c).exists()) try (RandomAccessFile file = new RandomAccessFile(journal(c),"rw")) {
                long end=file.length();
                while(end>0) { file.seek(end-1); if(file.readByte()==10) break; end--; }
                if(end<file.length()) file.setLength(end);
            }
            phase(c, "registra", ""); return;
        }
        if (!req.getString("uid").matches("[A-Za-z0-9_-]{1,128}") || !req.getString("id").matches("[A-Za-z0-9_-]{1,128}") ||
            req.getString("name").trim().isEmpty() || req.getString("name").length() > 120 || !req.getString("companyCode").matches("[A-Z0-9]{1,12}"))
            throw new IllegalArgumentException("Percorso non valido");
        try (FileOutputStream out = new FileOutputStream(journal(c), false)) { out.getFD().sync(); }
        JSONObject s = new JSONObject(req.toString());
        s.put("fase", "registra").put("errore", "").put("avviatoIl", System.currentTimeMillis()); save(c, s);
    }
    static synchronized void phase(Context c, String phase, String error) throws Exception {
        JSONObject s = stateOf(c); if (!s.has("id")) return;
        s.put("fase", phase).put("errore", error); save(c, s);
    }
    static synchronized void append(Context c, Location l) throws Exception {
        if (!"registra".equals(stateOf(c).optString("fase"))) return;
        if (journal(c).length() > 16 * 1024 * 1024) throw new IOException("Limite traccia raggiunto: salva il percorso.");
        if (!l.hasAccuracy() || l.getAccuracy() < 0 || l.getAccuracy() > 35 || !Double.isFinite(l.getLatitude()) ||
            !Double.isFinite(l.getLongitude()) || Math.abs(l.getLatitude()) > 90 || Math.abs(l.getLongitude()) > 180) return;
        JSONObject p = new JSONObject().put("lat", l.getLatitude()).put("lon", l.getLongitude()).put("acc", l.getAccuracy()).put("t", l.getTime());
        try (FileOutputStream out = new FileOutputStream(journal(c), true)) {
            out.write((p.toString() + "\n").getBytes(StandardCharsets.UTF_8)); out.getFD().sync();
        }
    }
    static synchronized JSONObject read(Context c, String uid, String id, int after) throws Exception {
        JSONObject s = stateOf(c); if (!owner(s, uid, id)) return new JSONObject().put("fase", "assente");
        if ("registra".equals(s.optString("fase")) && !RouteGpsService.running) {
            phase(c, "pausa", "Registrazione interrotta: i punti salvati sono al sicuro. Premi Riprendi."); s = stateOf(c);
        }
        JSONArray points = new JSONArray(); int seq = 0, last = after;
        if (journal(c).exists()) try (BufferedReader r = new BufferedReader(new InputStreamReader(new FileInputStream(journal(c)), StandardCharsets.UTF_8))) {
            String line; while ((line = r.readLine()) != null) {
                JSONObject p; try { p = new JSONObject(line); } catch (JSONException truncated) { break; }
                seq++; if (seq > after && points.length() < 150) { p.put("seq", seq); points.put(p); last = seq; }
            }
        }
        s.remove("uid"); s.put("punti", points).put("ultimo", last).put("altro", last < seq); return s;
    }
    static synchronized void clear(Context c, String uid, String id) throws Exception {
        if (!stateOf(c).has("id")) return;
        if (!owner(stateOf(c), uid, id)) throw new SecurityException("Account o percorso diverso");
        if (RouteGpsService.running) throw new IllegalStateException("Ferma prima il GPS");
        if (state(c).exists() && !state(c).delete()) throw new IOException("Bozza conservata");
        journal(c).delete();
    }
}
