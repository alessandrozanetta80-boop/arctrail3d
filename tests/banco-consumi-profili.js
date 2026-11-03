'use strict';
var assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
var html = fs.readFileSync('app.html', 'utf8');
var codice = html.slice(html.indexOf('var publicProfilesLoad ='), html.indexOf('\nfunction onAuthReady(user){'));
function prepara(){
  var richieste = [], orologio = 1000000;
  var c = { Promise:Promise, Date:{now:function(){return orologio;}}, console:{error:function(){}},
    currentUser:{uid:'A'}, publicProfilesCache:null, renderCount:0 };
  c.db = {collection:function(nome){assert.equal(nome,'public_profiles');return {get:function(){return new Promise(function(resolve,reject){richieste.push({resolve:resolve,reject:reject});});}};}};
  c.render = function(){c.renderCount++;c.assicuraNomi();};
  vm.createContext(c); vm.runInContext(codice,c);
  return {c:c, richieste:richieste, avanti:function(ms){orologio+=ms;}};
}
var attesa = function(){return new Promise(function(r){setImmediate(r);});};
var elenco = function(nome){return {forEach:function(fn){fn({id:nome,data:function(){return {username:nome};}});}};};
(async function(){
  var b=prepara(), risultati=[];
  for(var i=0;i<100;i++) b.c.loadPublicProfiles(function(x){risultati.push(x);});
  await attesa();assert.equal(b.richieste.length,1);
  b.richieste[0].resolve(elenco('uno'));await attesa();
  assert.equal(risultati.length,100);assert.ok(risultati.every(function(x){return x[0].username==='uno';}));
  b.c.loadPublicProfiles(function(){});await attesa();assert.equal(b.richieste.length,1);
  console.log('OK 100 chiamate concorrenti: 1 query invece di 100, cache pronta senza nuove letture');
  b=prepara();for(i=0;i<50;i++)b.c.assicuraNomi();await attesa();assert.equal(b.richieste.length,1);
  b.richieste[0].reject({code:'resource-exhausted'});await attesa();assert.equal(b.c.renderCount,1);
  for(i=0;i<50;i++)b.c.assicuraNomi();await attesa();assert.equal(b.richieste.length,1);
  b.avanti(900001);b.c.assicuraNomi();await attesa();assert.equal(b.richieste.length,2);
  console.log('OK ridisegni senza duplicazioni e quota: pausa 15 minuti, nessun ciclo richiesta/render');
  b=prepara();var a,beta;
  b.c.loadPublicProfiles(function(x){a=x;});await attesa();
  b.c.currentUser={uid:'B'};b.c.loadPublicProfiles(function(x){beta=x;});await attesa();
  b.richieste[0].resolve(elenco('vecchio'));await attesa();assert.equal(a.length,0);assert.equal(b.c.publicProfilesCache,null);
  b.richieste[1].resolve(elenco('nuovo'));await attesa();assert.equal(beta[0].username,'nuovo');assert.equal(b.c.publicProfilesCache[0].username,'nuovo');
  console.log('OK cambio account durante la richiesta: risposta vecchia non contamina la cache');
  b=prepara();b.c.assicuraNomi();await attesa();b.richieste[0].reject({code:'unavailable'});await attesa();
  b.avanti(60001);b.c.assicuraNomi();await attesa();assert.equal(b.richieste.length,2);
  console.log('OK errore transitorio: ripresa dopo un minuto');
})().catch(function(e){console.error(e);process.exitCode=1;});
