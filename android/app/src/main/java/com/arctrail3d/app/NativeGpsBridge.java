package com.arctrail3d.app;

import android.app.Activity;
import android.content.*;
import android.net.Uri;
import android.os.*;
import androidx.browser.customtabs.*;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import org.json.*;
import java.util.UUID;

/** Chrome's verified-origin MessagePort, restricted to the ArcTrail HTTPS origin. */
final class NativeGpsBridge {
    private static final Uri ORIGIN = Uri.parse("https://arctrail3d.com");
    private static String token;
    static String createToken() { token = UUID.randomUUID().toString(); return token; }
    static boolean accepts(String value) { return value != null && value.equals(token); }
    private final Activity activity;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private CustomTabsSession session;
    private CustomTabsServiceConnection connection;
    private boolean validated, loaded, closed, launched;
    NativeGpsBridge(Activity a) { activity = a; }
    void launch(Uri url, Runnable fallback) {
        com.google.androidbrowserhelper.trusted.TwaProviderPicker.Action choice = com.google.androidbrowserhelper.trusted.TwaProviderPicker.pickProvider(activity.getPackageManager());
        if (choice.launchMode != com.google.androidbrowserhelper.trusted.TwaProviderPicker.LaunchMode.TRUSTED_WEB_ACTIVITY) { fallback.run(); return; }
        String pkg = choice.provider;
        if (pkg == null) { fallback.run(); return; }
        connection = new CustomTabsServiceConnection() {
            @Override public void onCustomTabsServiceConnected(ComponentName name, CustomTabsClient client) {
                if (closed || launched) return;
                client.warmup(0);
                session = client.newSession(callback);
                if (session == null) { launched = true; fallback.run(); return; }
                session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, ORIGIN, null);
                launched = true;
                new TrustedWebActivityIntentBuilder(url)
                    .setToolbarColor(activity.getColor(R.color.colorPrimary))
                    .setNavigationBarColor(activity.getColor(R.color.navigationColor))
                    .setNavigationBarDividerColor(activity.getColor(R.color.navigationDividerColor))
                    .setScreenOrientation(androidx.browser.trusted.ScreenOrientation.PORTRAIT)
                    .build(session).launchTrustedWebActivity(activity);
            }
            @Override public void onServiceDisconnected(ComponentName name) { session = null; }
        };
        if (!CustomTabsClient.bindCustomTabsService(activity, pkg, connection)) { connection = null; launched = true; fallback.run(); }
        else handler.postDelayed(() -> { if (!closed && !launched) { launched=true; fallback.run(); } }, 3000);
    }
    private void channel() {
        if (validated && loaded && session != null) session.requestPostMessageChannel(ORIGIN, ORIGIN, new Bundle());
    }
    private final CustomTabsCallback callback = new CustomTabsCallback() {
        @Override public void onRelationshipValidationResult(int relation, Uri origin, boolean result, Bundle extra) {
            if (relation == CustomTabsService.RELATION_USE_AS_ORIGIN && ORIGIN.equals(origin)) { validated = result; channel(); }
        }
        @Override public void onNavigationEvent(int event, Bundle extra) {
            if (event == NAVIGATION_STARTED) loaded = false;
            if (event == NAVIGATION_FINISHED) { loaded = true; channel(); }
        }
        @Override public void onMessageChannelReady(Bundle extra) {
            createToken();
            try { send(new JSONObject().put("tipo", "arctrail-gps-ready").put("token", token).put("package", activity.getPackageName())); } catch (Exception ignored) {}
        }
        @Override public void onPostMessage(String message, Bundle extra) {
            handler.post(() -> handle(message));
        }
    };
    private void send(JSONObject obj) { if (!closed && session != null) session.postMessage(obj.toString(), null); }
    private void handle(String message) {
        if (!validated || !loaded || message.length() > 4096) return;
        JSONObject r = null;
        try {
            r = new JSONObject(message);
            if (!accepts(r.optString("token"))) return;
            String cmd = r.getString("cmd"), uid = r.getString("uid"), id = r.getString("id");
            JSONObject result;
            if ("account".equals(cmd)) {
                JSONObject old=RouteStore.stateOf(activity);
                if(old.has("uid") && !uid.equals(old.optString("uid"))) {
                    activity.stopService(new Intent(activity,RouteGpsService.class)); RouteStore.phase(activity,"pausa","");
                }
                result=new JSONObject().put("ok",true);
            }
            else if ("recover".equals(cmd)) {
                JSONObject old=RouteStore.stateOf(activity);
                result=uid.equals(old.optString("uid")) ? RouteStore.read(activity,uid,old.optString("id"),Integer.MAX_VALUE) : new JSONObject();
                result.remove("punti");
            }
            else if ("read".equals(cmd)) result = RouteStore.read(activity, uid, id, Math.max(0, r.optInt("after")));
            else {
                if (RouteStore.stateOf(activity).has("id") && !RouteStore.owner(RouteStore.stateOf(activity),uid,id)) throw new SecurityException("Account o percorso diverso");
                if ("pause".equals(cmd)) { activity.stopService(new Intent(activity, RouteGpsService.class)); RouteStore.phase(activity,"pausa",""); }
                else if ("clear".equals(cmd)) RouteStore.clear(activity,uid,id);
                else throw new IllegalArgumentException("Comando non valido");
                result = new JSONObject().put("ok",true);
            }
            send(new JSONObject().put("richiesta", r.optString("richiesta")).put("result",result));
        } catch (Exception e) {
            try { send(new JSONObject().put("richiesta",r == null ? "" : r.optString("richiesta")).put("error",e.getMessage())); } catch (Exception ignored) {}
        }
    }
    void close() {
        closed = true; handler.removeCallbacksAndMessages(null);
        if (connection != null) { try { activity.unbindService(connection); } catch (Exception ignored) {} connection = null; }
    }
}
