const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, startSession } = require('./helpers.cjs');
function backup(h) { return h.run('backupJSON()'); }
function restore(h, serialized) {h.app.serialized=serialized;h.run(`$('restoreConfirm').value='RESTAURAR'`);return h.run('restoreBackup(serialized)');}

test('full backup round trips athletes, plan identities, corrected results and zones', () => {
 const source=createApp();startSession(source);
 source.run(`$('editSplitTime').value='7';saveEditedLiveSplitTime('1',S.activeSession.splitsByAthlete['1'][0].id);finishLiveSession()`);
 const serialized=backup(source);const target=createApp();
 assert.equal(restore(target,serialized),true);
 const expected=JSON.parse(serialized).data;
 assert.deepEqual(target.json('persistedState()'),expected);
 target.run('loadState()');assert.deepEqual(target.json('persistedState()'),expected);
 assert.equal(target.run('S.results[0].splits[0].corrected'),true);
});
test('export captures a running timer without stopping it and restores it paused', () => {
 const h=createApp();startSession(h);h.run('toggleLiveSW();S.activeSession.start=Date.now()-5000');
 const serialized=backup(h);assert.equal(h.run('S.activeSession.running'),true);
 const saved=JSON.parse(serialized).data.activeSession;
 assert.ok(saved.elapsed>=15000);assert.equal(saved.running,false);assert.equal(saved.start,0);assert.equal(saved.iv,undefined);
 const target=createApp();assert.equal(restore(target,serialized),true);
 assert.equal(target.run('getLiveElapsed()'),saved.elapsed);
 target.run('toggleLiveSW()');assert.equal(target.run('S.activeSession.running'),true);
});
test('restore requires explicit confirmation and refuses an active session, even from a stale dialog', () => {
 const h=createApp();startSession(h);h.app.serialized=backup(h);const before=h.json('persistedState()');
 assert.equal(h.run('restoreBackup(serialized)'),false);
 h.run(`$('restoreConfirm').value='RESTAURAR'`);assert.equal(h.run('restoreBackup(serialized)'),false);
 assert.deepEqual(h.json('persistedState()'),before);
});
test('failed restore leaves both existing memory and storage unchanged', () => {
 const source=createApp();startSession(source);const h=createApp();h.run(`S.weekLabel='keep me';saveState()`);
 const before=h.json('persistedState()');const stored=h.storage.get('swim_coach_v6_phase4');
 h.app.localStorage.setItem=()=>{throw new Error('QuotaExceededError')};
 assert.equal(restore(h,backup(source)),false);
 assert.deepEqual(h.json('persistedState()'),before);assert.equal(h.storage.get('swim_coach_v6_phase4'),stored);
 assert.match(h.elements.get('restoreError').textContent,/QuotaExceededError/);
});
test('invalid versions, shapes, IDs, duplicate IDs and prototype keys cannot change local data', () => {
 const source=createApp();startSession(source);source.run('finishLiveSession()');const original=JSON.parse(backup(source));
 const mutations=[
  b=>b.version=2,b=>delete b.data.athletes,b=>b.data.weekPlan[0].manha='invalid',
  b=>b.data.results[0].id="x');alert(1);//",b=>b.data.athletes.push(b.data.athletes[0]),
  b=>b.data.results[0].splits[0].cum=-10,b=>b.data.activeSession.running=true,
  b=>b.data.weekPlan[0].manha[0].metros='1\" onclick=\"alert(1)',
  b=>b.data.activeSession.history[0].splitId='missing',
 ];
 for(const mutate of mutations){const b=structuredClone(original);mutate(b);const h=createApp();h.run('saveState()');const before=h.json('persistedState()');assert.equal(restore(h,JSON.stringify(b)),false);assert.deepEqual(h.json('persistedState()'),before);}
 const h=createApp();assert.equal(restore(h,'{"format":"swimcoach-backup","__proto__":{"polluted":true}}'),false);
 assert.equal(restore(h,'{broken'),false);assert.equal({}.polluted,undefined);
});
test('backup works from unsaved memory and includes unfinished splits absent from CSV', () => {
 const h=createApp();startSession(h);h.app.localStorage.setItem=()=>{throw new Error('full')};h.run(`S.weekLabel='unsaved';saveState()`);
 const b=JSON.parse(backup(h));assert.equal(b.data.weekLabel,'unsaved');assert.equal(b.data.results.length,0);assert.equal(b.data.activeSession.splitsByAthlete['1'].length,1);
});
test('oversized backups are rejected before parsing', () => {
 const h=createApp();h.app.serialized=' '.repeat(10*1024*1024+1);assert.throws(()=>h.run('SwimCoachBackup.parse(serialized)'),/inválida/);
});
