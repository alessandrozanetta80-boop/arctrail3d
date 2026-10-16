package com.arctrail3d.app;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.location.*;
import android.os.*;
import org.json.JSONObject;

/** User-started location foreground service; continues independently of Chrome/page lifetime. */
public final class RouteGpsService extends Service implements LocationListener {
    static volatile boolean running;
    private LocationManager gps;
    private static final String CHANNEL = "percorsi-gps";
    private static final int NOTIFICATION = 472;
    @Override public IBinder onBind(Intent i) { return null; }
    @Override public int onStartCommand(Intent i, int flags, int startId) {
        if (i == null || "stop".equals(i.getAction())) { halt(""); return START_NOT_STICKY; }
        try {
            JSONObject s = RouteStore.stateOf(this);
            if (!s.has("id")) { stopSelf(); return START_NOT_STICKY; }
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Registrazione percorsi GPS", NotificationManager.IMPORTANCE_LOW));
            Intent stop = new Intent(this, RouteGpsService.class).setAction("stop");
            PendingIntent piStop = PendingIntent.getService(this, 1, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            PendingIntent open = PendingIntent.getActivity(this, 2, new Intent(this, LauncherActivity.class).setAction(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
            Notification n = b.setSmallIcon(R.drawable.ic_notification_icon).setContentTitle("ArcTrail 3D · " + s.optString("name"))
                .setContentText("Traccia GPS in registrazione anche a schermo spento").setOngoing(true).setContentIntent(open)
                .addAction(new Notification.Action.Builder(null, "Ferma GPS", piStop).build()).build();
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION); else startForeground(NOTIFICATION, n);
            gps = (LocationManager)getSystemService(LOCATION_SERVICE);
            if (!gps.isProviderEnabled(LocationManager.GPS_PROVIDER)) throw new IllegalStateException("Accendi la posizione del telefono e premi Riprendi.");
            RouteStore.phase(this, "registra", "");
            running = true;
            gps.requestLocationUpdates(LocationManager.GPS_PROVIDER, 3000L, 0f, this, Looper.getMainLooper());
        } catch (Exception e) { halt(e instanceof SecurityException ? "Permesso GPS non concesso: abilita la posizione precisa e premi Riprendi." : e.getMessage()); }
        return START_NOT_STICKY;
    }
    @Override public void onLocationChanged(Location l) {
        try { RouteStore.append(this, l); } catch (Exception e) { halt("Memoria non disponibile: registrazione fermata, traccia precedente conservata."); }
    }
    @Override public void onProviderDisabled(String p) { halt("GPS spento: traccia conservata. Accendi la posizione e premi Riprendi."); }
    @Override public void onProviderEnabled(String p) {}
    @Override public void onStatusChanged(String p, int s, Bundle e) {}
    private void halt(String error) {
        running = false;
        if (gps != null) { gps.removeUpdates(this); gps = null; }
        try { RouteStore.phase(this, "pausa", error == null ? "GPS non disponibile" : error); } catch (Exception ignored) {}
        stopForeground(true); stopSelf();
    }
    @Override public void onDestroy() { running = false; if (gps != null) gps.removeUpdates(this); gps = null; stopForeground(true); super.onDestroy(); }
}
