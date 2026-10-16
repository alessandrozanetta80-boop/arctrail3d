package com.arctrail3d.app;

import android.app.Activity;
import android.content.Intent;
import android.os.*;
import android.widget.TextView;
import org.json.JSONObject;

/** Debug-only driver for real service lifecycle and emulator location tests. */
public final class ProvaGpsActivity extends Activity {
    @Override public void onCreate(Bundle b) {
        super.onCreate(b); execute();
    }
    @Override protected void onNewIntent(Intent i) { super.onNewIntent(i); setIntent(i); execute(); }
    private void execute() { TextView t=new TextView(this); setContentView(t);
        try {
            String cmd=getIntent().getStringExtra("cmd");
            if ("consent".equals(cmd)) {
                android.net.Uri u = android.net.Uri.parse("arctrailgps://start").buildUpon().appendQueryParameter("token",NativeGpsBridge.createToken()).appendQueryParameter("uid","test_uid").appendQueryParameter("id","test_route").appendQueryParameter("name","Verde prova").appendQueryParameter("companyCode","01VERB").build();
                startActivity(new Intent(this,RoutePermissionActivity.class).setData(u));
            } else if ("start".equals(cmd)) {
                RouteStore.begin(this,new JSONObject().put("uid","test_uid").put("id","test_route").put("name","Verde prova").put("companyCode","01VERB"));
                Intent s=new Intent(this,RouteGpsService.class).setAction("start");
                if(Build.VERSION.SDK_INT>=26) startForegroundService(s); else startService(s);
            } else if("pause".equals(cmd)) { stopService(new Intent(this,RouteGpsService.class)); RouteStore.phase(this,"pausa",""); }
            else if("clear".equals(cmd)) RouteStore.clear(this,"test_uid","test_route");
            else if("wrong".equals(cmd)) {
                JSONObject s=RouteStore.read(this,"other_uid","test_route",0);
                if(s.has("punti")||!"assente".equals(s.optString("fase"))) throw new IllegalStateException("Account leak");
            }
            t.setText("OK "+cmd);
        } catch(Exception e) { t.setText("ERRORE "+e); }
    }
}
