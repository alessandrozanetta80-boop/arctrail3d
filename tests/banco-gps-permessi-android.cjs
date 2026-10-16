const fs=require('fs'),assert=require('assert'),{execFileSync}=require('child_process');
const adb='C:/Users/Ale/AppData/Local/Android/Sdk/platform-tools/adb.exe',repo='C:/Users/Ale/Desktop/PROGETTI/ArcTrail 3D',pkg='com.arctrail3d.myapp.prova';
const run=(...a)=>execFileSync(adb,['-s','emulator-5554',...a],{encoding:'utf8',windowsHide:true,timeout:20000}),sleep=ms=>new Promise(r=>setTimeout(r,ms));let n=0;
const check=(label,c)=>{assert(c,label);n++;console.log('OK '+label);};
const act=cmd=>run('shell','am','start','-W','-f','0x14000000','-n',pkg+'/com.arctrail3d.app.ProvaGpsActivity','--es','cmd',cmd);
function xml(){run('shell','uiautomator','dump','/sdcard/gps-perm.xml');return run('shell','cat','/sdcard/gps-perm.xml');}
function click(pattern){let node=xml().match(/<node\b[^>]+>/g).find(s=>pattern.test(s));assert(node,'Controllo UI mancante '+pattern);let b=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/).slice(1).map(Number);run('shell','input','tap',String((b[0]+b[2])>>1),String((b[1]+b[3])>>1));}
(async()=>{
run('install','-r',repo+'/android/app/build/outputs/apk/debug/app-debug.apk');run('shell','am','force-stop',pkg);run('shell','input','keyevent','224');run('shell','wm','dismiss-keyguard');run('shell','cmd','statusbar','collapse');
run('shell','am','start','-W','-n',pkg+'/com.arctrail3d.app.RoutePermissionActivity','-d','arctrailgps://start?token=invalid');
check('Link senza capability non avvia GPS',!run('shell','dumpsys','activity','services',pkg).includes('isForeground=true'));
run('shell','pm','revoke',pkg,'android.permission.ACCESS_FINE_LOCATION');run('shell','pm','revoke',pkg,'android.permission.ACCESS_COARSE_LOCATION');
run('shell','pm','clear-permission-flags',pkg,'android.permission.ACCESS_FINE_LOCATION','user-set','user-fixed');run('shell','pm','clear-permission-flags',pkg,'android.permission.ACCESS_COARSE_LOCATION','user-set','user-fixed');
act('consent');await sleep(300);check('Informazione esplicita su schermo spento e notifica',xml().includes('schermo spento'));
fs.writeFileSync(__dirname+'/gps-consenso-android.png',execFileSync(adb,['-s','emulator-5554','exec-out','screencap','-p'],{windowsHide:true,maxBuffer:8000000}));
click(/text="Registra"/i);await sleep(400);click(/resource-id="[^"]*permission_deny_button"/);await sleep(300);
check('Permesso negato: nessun servizio GPS avviato',!run('shell','dumpsys','activity','services',pkg).includes('isForeground=true'));
click(/text="Chiudi"/i);run('shell','pm','grant',pkg,'android.permission.ACCESS_FINE_LOCATION');run('shell','pm','grant',pkg,'android.permission.ACCESS_COARSE_LOCATION');
act('consent');await sleep(200);click(/text="Registra"/i);await sleep(1200);
check('Consenso e posizione precisa avviano il servizio reale',run('shell','dumpsys','activity','services',pkg).includes('isForeground=true'));
run('shell','cmd','statusbar','expand-notifications');await sleep(500);if(!xml().includes('Ferma GPS')){click(/content-desc="Expand"/);await sleep(250);}check('Notifica visibile con comando Ferma GPS',xml().includes('Ferma GPS'));
click(/text="Ferma GPS"/i);await sleep(500);check('Ferma GPS dalla notifica interrompe il servizio',!run('shell','dumpsys','activity','services',pkg).includes('isForeground=true'));
run('shell','cmd','statusbar','collapse');act('clear');run('shell','am','force-stop',pkg);console.log(n+' verifiche permessi superate');
})().catch(e=>{console.error(e);process.exitCode=1;});
