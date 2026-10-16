const fs=require('fs'),assert=require('assert'),{execFileSync}=require('child_process');
const adb='C:/Users/Ale/AppData/Local/Android/Sdk/platform-tools/adb.exe',repo='C:/Users/Ale/Desktop/PROGETTI/ArcTrail 3D',pkg='com.arctrail3d.myapp.prova';
const run=(...args)=>execFileSync(adb,['-s','emulator-5554',...args],{encoding:'utf8',windowsHide:true,timeout:25000});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ok=0;
function check(n,c){assert(c,n);console.log('OK '+n);ok++;}
const activity=cmd=>run('shell','am','start','-W','-f','0x14000000','-n',pkg+'/com.arctrail3d.app.ProvaGpsActivity','--es','cmd',cmd);
const journal=()=>{try{return run('shell','run-as',pkg,'cat','files/gps-route.jsonl').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));}catch(_){return [];}};
const state=()=>JSON.parse(run('shell','run-as',pkg,'cat','files/gps-route.json'));
const fix=(lon,lat)=>run('shell','cmd','location','providers','set-test-provider-location','gps','--location',lat+','+lon,'--accuracy','5');
(async()=>{
 run('wait-for-device');for(let i=0;i<30;i++){if(run('shell','getprop','sys.boot_completed').trim()==='1')break;await sleep(1000);}
 run('install','-r',repo+'/android/app/build/outputs/apk/debug/app-debug.apk');
 run('shell','am','force-stop',pkg);run('logcat','-c');
 run('shell','pm','grant',pkg,'android.permission.ACCESS_FINE_LOCATION');run('shell','pm','grant',pkg,'android.permission.ACCESS_COARSE_LOCATION');run('shell','pm','grant',pkg,'android.permission.POST_NOTIFICATIONS');
 run('shell','input','keyevent','224');run('shell','wm','dismiss-keyguard');
 run('shell','appops','set','2000','android:mock_location','allow');
 run('shell','cmd','location','providers','add-test-provider','gps','--requiresSatellite');
 run('shell','cmd','location','providers','set-test-provider-enabled','gps','true');
 activity('clear');activity('start');await sleep(1500);
 check('Servizio Android attivo con notifica location',run('shell','dumpsys','activity','services',pkg).includes('isForeground=true'));
 fix('8.5510','45.9210');await sleep(3500);
 let a=journal();check('Punto GPS reale emulato scritto nel journal privato',a.length>0);
 run('shell','input','keyevent','3');run('shell','input','keyevent','223');
 fix('8.5514','45.9214');await sleep(3500);
 let b=journal();check('Nuovi punti con app nascosta e schermo spento',b.length>a.length&&b.some(p=>p.lat>45.9212));
 // Chrome/page is absent; GPS service must not depend on the website or its callbacks.
 run('shell','am','force-stop','com.android.chrome');fix('8.5518','45.9218');await sleep(3500);
 let c=journal();check('Traccia continua anche senza processo browser',c.length>b.length&&c.some(p=>p.lat>45.9216));
 run('shell','input','keyevent','224');run('shell','wm','dismiss-keyguard');activity('wrong');await sleep(300);
 run('shell','uiautomator','dump','/sdcard/gps-test.xml');check('Nessun punto restituito a un account diverso',run('shell','cat','/sdcard/gps-test.xml').includes('OK wrong'));
 activity('pause');await sleep(500);let n=journal().length;fix('8.5522','45.9222');await sleep(3500);
 check('Pausa ferma ricevitore e salva lo stato',state().fase==='pausa'&&journal().length===n&&!run('shell','dumpsys','activity','services',pkg).includes('isForeground=true'));
 activity('start');await sleep(1200);fix('8.5526','45.9226');await sleep(3500);
 check('Riprendi continua lo stesso journal senza perdere punti',journal().length>n&&state().id==='test_route');
 activity('pause');await sleep(500);const saved=journal().length;run('shell','am','force-stop',pkg);activity('read');
 check('Riapertura dopo arresto mantiene tutti i punti su disco',journal().length===saved&&state().fase==='pausa');
 activity('clear');check('Rimozione esplicita elimina solo la bozza nativa',!run('shell','run-as',pkg,'ls','files').includes('gps-route.json'));
 run('shell','am','force-stop',pkg);console.log(ok+' verifiche native superate');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{try{run('shell','cmd','location','providers','remove-test-provider','gps');run('shell','input','keyevent','224');run('shell','wm','dismiss-keyguard');}catch(_){}});
