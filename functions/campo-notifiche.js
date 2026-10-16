"use strict";
// Un salvataggio remoto, un avviso. Nessuna dipendenza dall'email compagnia o dal telefono.
module.exports=function creaNotificheCampo(admin, adminEmail){
 async function avvisa(code,id,title,body,dest){
  const db=admin.firestore(),club=await db.collection("compagnie_admin").doc(code).get();
  let uid=club.exists && (club.data()||{}).adminUid;
  if(!uid) uid=(await admin.auth().getUserByEmail(adminEmail)).uid;
  if(!uid)throw Error("Responsabile assente");
  try{await db.collection("notifications").doc(uid).collection("items").doc(id).create({
   title,body,read:false,dest:dest||{k:"campo-mappa",code},clubCode:code,
   createdAt:admin.firestore.FieldValue.serverTimestamp()
  });}catch(e){if(e.code!==6 && e.code!=="already-exists")throw e;}
 }
 return {
  problema:async event=>{
   if(!event.data)return;const d=event.data.data()||{},code=String(d.companyCode||"");if(!code)return;
   await avvisa(code,"campo-problema-"+event.params.issueId,"Problema sul percorso",
    code+" · "+String(d.category||"altro")+(d.piazzola?" · Piazzola "+d.piazzola:"")+" · "+String(d.note||"").slice(0,180));
  },
  precedente:async event=>{
   if(!event.data)return;const d=event.data.data()||{},code=String(d.clubCode||"");if(!code)return;
   await avvisa(code,"campo-precedente-"+event.params.reportId,"Problema sul percorso",
    code+" · "+String(d.type||"altro")+(d.piazzola?" · Piazzola "+d.piazzola:"")+" · "+String(d.description||"").slice(0,180),{k:"club-space",code});
  },
  percorso:async event=>{
   if(!event.data||!event.data.after.exists)return;
   const d=event.data.after.data()||{},old=event.data.before.exists?(event.data.before.data()||{}):{};
   if(d.status!=="pending"||old.status==="pending"||!d.companyCode)return;
   await avvisa(String(d.companyCode),"campo-percorso-"+event.params.routeId+"-"+(Number(d.submittedAt)||0),"Tracciato da approvare",
    String(d.companyCode)+" · "+String(d.name||"Percorso")+" · "+(Array.isArray(d.piazzole)?d.piazzole.length:0)+" piazzole");
  }
 };
};
