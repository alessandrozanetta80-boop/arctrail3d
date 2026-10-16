/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.arctrail3d.app;

import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.ImageView;
import android.os.SystemClock;
import android.view.View;
import android.widget.Toast;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

/** Checks the Android wrapper before entering the TWA, never during a shooting round.
 * Website/service-worker updates remain independent. GPS uses a separate verified-origin MessagePort and private Android journal.
 */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    private NativeGpsBridge gpsBridge;
    private static final int UPDATE_REQUEST = 741;
    private static final long CHECK_TIMEOUT_MS = 1800;
    private static final long REMIND_AFTER_MS = 6 * 60 * 60 * 1000L;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private long introStarted;
    private boolean entering;
    private AppUpdateManager updates;
    private AlertDialog dialog;
    private boolean resumed, checked, resolved, entered;
    private Runnable pending;
    private final Runnable timeout = () -> resolve(null);

    @Override protected boolean shouldLaunchImmediately() { return false; }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (isFinishing()) return; // ABH handles duplicate launchers / restored browser sessions.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
        introStarted = SystemClock.uptimeMillis();
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        ImageView image = new ImageView(this);
        image.setImageResource(R.drawable.avvio_foto_logo);
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);
        image.setContentDescription(getString(R.string.appName));
        setContentView(image);
    }

    @Override protected void onResume() {
        super.onResume();
        resumed = true;
        if (isFinishing() || entered) return;
        if (pending != null) {
            Runnable action = pending; pending = null; action.run();
        } else if (!checked) {
            checked = true;
            // Deep links and notifications must open immediately, without interrupting navigation.
            if (!isLauncherEntry() || !isPlayInstall()) { resolve(null); return; }
            try {
                updates = createUpdateManager();
                handler.postDelayed(timeout, CHECK_TIMEOUT_MS);
                updates.getAppUpdateInfo().addOnSuccessListener(this::resolve)
                    .addOnFailureListener(error -> resolve(null));
            } catch (RuntimeException error) { resolve(null); }
        }
    }

    protected AppUpdateManager createUpdateManager() { return AppUpdateManagerFactory.create(this); }
    protected boolean isLauncherEntry() {
        return Intent.ACTION_MAIN.equals(getIntent().getAction()) &&
            getIntent().hasCategory(Intent.CATEGORY_LAUNCHER);
    }
    protected boolean isPlayInstall() {
        try {
            String installer = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                ? getPackageManager().getInstallSourceInfo(getPackageName()).getInstallingPackageName()
                : getPackageManager().getInstallerPackageName(getPackageName());
            return "com.android.vending".equals(installer);
        } catch (Exception error) { return false; }
    }

    private void resolve(AppUpdateInfo info) {
        if (resolved || entered || isFinishing() || isDestroyed()) return;
        resolved = true;
        handler.removeCallbacks(timeout);
        whenResumed(() -> {
            if (info == null || updates == null) { continueToApp(); return; }
            SharedPreferences prefs = getSharedPreferences("play-updates", MODE_PRIVATE);
            long now = System.currentTimeMillis();
            long later = prefs.getLong("later-time", 0);
            boolean postponed = prefs.getInt("later-version", -1) == info.availableVersionCode() &&
                now >= later && now - later < REMIND_AFTER_MS;
            boolean downloaded = info.installStatus() == InstallStatus.DOWNLOADED;
            boolean available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE &&
                info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE) &&
                info.installStatus() != InstallStatus.DOWNLOADING &&
                info.installStatus() != InstallStatus.PENDING;
            if (postponed || (!downloaded && !available)) { continueToApp(); return; }
            dialog = new AlertDialog.Builder(this, android.R.style.Theme_Material_Light_Dialog_Alert)
                .setTitle(downloaded ? R.string.update_ready_title : R.string.update_available_title)
                .setMessage(downloaded ? R.string.update_ready_body : R.string.update_available_body)
                .setPositiveButton(downloaded ? R.string.update_install : R.string.update_download,
                    (d, which) -> {
                        if (downloaded) {
                            updates.completeUpdate().addOnFailureListener(error -> {
                                Toast.makeText(this, R.string.update_failed, Toast.LENGTH_LONG).show();
                                continueToApp();
                            });
                        } else beginDownload(info);
                    })
                .setNegativeButton(R.string.update_later, (d, which) -> {
                    prefs.edit().putInt("later-version", info.availableVersionCode())
                        .putLong("later-time", System.currentTimeMillis()).apply();
                    continueToApp();
                })
                .setOnCancelListener(d -> continueToApp()).create();
            dialog.show();
        });
    }

    protected void beginDownload(AppUpdateInfo info) {
        try {
            // Google owns consent/download. No forced update or asset deletion.
            boolean started = updates.startUpdateFlowForResult(info, this,
                AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(), UPDATE_REQUEST);
            if (!started) continueToApp();
        } catch (Exception error) { continueToApp(); }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == UPDATE_REQUEST) {
            if (resultCode != RESULT_OK && resultCode != RESULT_CANCELED) {
                Toast.makeText(this, R.string.update_failed, Toast.LENGTH_LONG).show();
            }
            // Accepted: Play downloads in background. Ask to install on the next cold launch.
            // Declined or failed: enter the app normally, without a prompt loop.
            continueToApp();
        }
    }

    private void whenResumed(Runnable action) {
        if (isFinishing() || isDestroyed() || entered) return;
        if (resumed) action.run(); else pending = action;
    }
    protected final void continueToApp() {
        whenResumed(() -> {
            if (entered || entering) return;
            entering = true;
            if (dialog != null) dialog.dismiss();
            long remaining = isLauncherEntry() ? Math.max(0, 3000 - (SystemClock.uptimeMillis() - introStarted)) : 0;
            handler.postDelayed(() -> whenResumed(() -> {
                if (entered) return;
                entered = true;
                handler.removeCallbacks(timeout);
                // End the photo at the deadline, even while Chrome connects.
                View loading = new View(this);
                loading.setBackgroundColor(0xffefefe8);
                loading.setContentDescription(getString(R.string.appName));
                setContentView(loading);
                launchApp();
            }), remaining);
        });
    }
    @Override protected android.net.Uri getLaunchingUrl() {
        android.net.Uri base = super.getLaunchingUrl();
        android.net.Uri.Builder builder = base.buildUpon().clearQuery();
        for (String key : base.getQueryParameterNames()) if (!"nativeGps".equals(key))
            for (String value : base.getQueryParameters(key)) builder.appendQueryParameter(key,value);
        return builder.appendQueryParameter("nativeGps","1").build();
    }
    protected void launchApp() { gpsBridge = new NativeGpsBridge(this); gpsBridge.launch(getLaunchingUrl(), this::launchTwa); }
    @Override protected void onRestart() { super.onRestart(); if (entered) finish(); }
    @Override protected void onPause() { resumed = false; super.onPause(); }
    @Override protected void onDestroy() {
        if (gpsBridge != null) gpsBridge.close();
        handler.removeCallbacksAndMessages(null);
        pending = null;
        if (dialog != null) dialog.dismiss();
        super.onDestroy();
    }
}
