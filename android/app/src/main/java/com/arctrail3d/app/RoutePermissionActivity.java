package com.arctrail3d.app;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.*;
import org.json.JSONObject;

/** Explicit gesture from the verified TWA. No background activity or location startup. */
public final class RoutePermissionActivity extends Activity {
    private JSONObject req;
    private boolean asked;
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        try {
            Uri u = getIntent().getData();
            if (u == null || !"arctrailgps".equals(u.getScheme()) || !"start".equals(u.getHost()) || !NativeGpsBridge.accepts(u.getQueryParameter("token"))) { finish(); return; }
            req = new JSONObject().put("uid", u.getQueryParameter("uid")).put("id", u.getQueryParameter("id"))
                .put("name", u.getQueryParameter("name")).put("companyCode", u.getQueryParameter("companyCode"));
            new AlertDialog.Builder(this).setTitle("Registra percorso GPS")
                .setMessage("Il percorso «" + req.getString("name") + "» verrà salvato nel telefono anche con schermo spento o app in secondo piano, fino a Pausa o Termina. Durante la registrazione compare una notifica con Ferma GPS.")
                .setPositiveButton("Registra", (d,w) -> permissions()).setNegativeButton("Annulla", (d,w) -> finish())
                .setOnCancelListener(d -> finish()).show();
        } catch (Exception e) { finish(); }
    }
    private void permissions() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, 1); return;
        }
        if (Build.VERSION.SDK_INT >= 33 && !asked && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            asked = true; requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 2); return;
        }
        try {
            RouteStore.begin(this, req);
            Intent s = new Intent(this, RouteGpsService.class).setAction("start");
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(s); else startService(s);
            finish();
        } catch (Exception e) { new AlertDialog.Builder(this).setMessage(e.getMessage()).setPositiveButton("Chiudi", (d,w)->finish()).show(); }
    }
    @Override public void onRequestPermissionsResult(int code, String[] p, int[] results) {
        super.onRequestPermissionsResult(code,p,results);
        if (code == 1 && checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            new AlertDialog.Builder(this).setMessage("Serve la posizione precisa per registrare il percorso. Nessuna registrazione avviata.").setPositiveButton("Chiudi", (d,w)->finish()).show(); return;
        }
        permissions();
    }
}
