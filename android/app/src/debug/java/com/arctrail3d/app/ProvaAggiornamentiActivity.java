package com.arctrail3d.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.widget.TextView;
import com.google.android.gms.tasks.TaskCompletionSource;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.appupdate.testing.FakeAppUpdateManager;

/** DEBUG ONLY: real native UI + Google's fake update manager, no remote writes. */
public class ProvaAggiornamentiActivity extends LauncherActivity {
    private FakeAppUpdateManager fake;
    @Override protected boolean isPlayInstall() { return !"apk".equals(mode()); }
    @Override protected boolean isLauncherEntry() { return !"link".equals(mode()); }
    private String mode() { return getIntent().getStringExtra("scenario"); }
    @Override protected AppUpdateManager createUpdateManager() {
        getSharedPreferences("play-updates", MODE_PRIVATE).edit().clear().commit();
        fake = new FakeAppUpdateManager(this) {
            @Override public com.google.android.gms.tasks.Task<AppUpdateInfo> getAppUpdateInfo() {
                if ("timeout".equals(mode())) return new TaskCompletionSource<AppUpdateInfo>().getTask();
                if ("late".equals(mode())) {
                    TaskCompletionSource<AppUpdateInfo> delayed = new TaskCompletionSource<>();
                    AppUpdateInfo info = super.getAppUpdateInfo().getResult();
                    new Handler(Looper.getMainLooper()).postDelayed(() -> delayed.setResult(info), 2600);
                    return delayed.getTask();
                }
                if ("error".equals(mode())) {
                    TaskCompletionSource<AppUpdateInfo> t = new TaskCompletionSource<>();
                    t.setException(new IllegalStateException("offline")); return t.getTask();
                }
                return super.getAppUpdateInfo();
            }
            @Override public com.google.android.gms.tasks.Task<Void> completeUpdate() {
                com.google.android.gms.tasks.Task<Void> result = super.completeUpdate();
                android.util.Log.i("ArcTrailUpdateTest", "INSTALL_REQUESTED=" + isInstallSplashScreenVisible());
                return result;
            }
        };
        if (!"none".equals(mode())) fake.setUpdateAvailable(99);
        if ("postponed".equals(mode()) || "new-version".equals(mode())) {
            getSharedPreferences("play-updates", MODE_PRIVATE).edit()
                .putInt("later-version", "postponed".equals(mode()) ? 99 : 98)
                .putLong("later-time", System.currentTimeMillis()).commit();
        }
        if ("downloaded".equals(mode())) {
            fake.startUpdateFlow(fake.getAppUpdateInfo().getResult(), this,
                AppUpdateOptions.newBuilder(com.google.android.play.core.install.model.AppUpdateType.FLEXIBLE).build());
            fake.userAcceptsUpdate();fake.downloadStarts();fake.downloadCompletes();
        }
        return fake;
    }
    @Override protected void beginDownload(AppUpdateInfo info) {
        super.beginDownload(info);
        boolean flexible = fake.isConfirmationDialogVisible() && !fake.isImmediateFlowVisible();
        if ("decline".equals(mode())) fake.userRejectsUpdate(); else fake.userAcceptsUpdate();
        android.util.Log.i("ArcTrailUpdateTest", "FLEXIBLE=" + flexible);
        onActivityResult(741, "decline".equals(mode()) ? Activity.RESULT_CANCELED : Activity.RESULT_OK, null);
    }
    @Override protected void launchApp() {
        TextView text = new TextView(this);text.setText("APP APERTA · " + mode());
        text.setTextSize(20);text.setGravity(Gravity.CENTER);text.setBackgroundColor(0xffecede6);setContentView(text);
        android.util.Log.i("ArcTrailUpdateTest", "APP_APERTA=" + mode());
    }
}
