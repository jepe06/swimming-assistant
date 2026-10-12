const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, startSession } = require('./helpers.cjs');
function row(day, desc, meters, pool='P25') {
  const r=Array(31).fill(''); r[0]=day; r[1]=pool; r[2]='A2'; r[3]=desc; r[14]=meters; return r;
}
test('duplicate day headers append rows and totals describe exactly the accepted rows', () => {
 const h=createApp(); h.app.rows=[row('SEGUNDA-FEIRA','4 x 25',100),row('SEGUNDA-FEIRA','4 x 50',200)];
 const p=h.json('parseWeekRows(rows)'); assert.equal(p.plan[0].manha.length,2); assert.equal(p.zonePl['0_manha'].A2,300); assert.equal(p.warnings.length,1);
});
test('conflicting duplicate pools and invalid distances reject the whole parse', () => {
 const h=createApp(); h.app.rows=[row('SEGUNDA','25',25),row('SEGUNDA','50',50,'P50')];
 assert.throws(()=>h.run('parseWeekRows(rows)'),/Piscinas diferentes/);
 for(const meters of [-10,'100 garbage',Infinity]) {h.app.rows=[row('SEGUNDA','test',meters)]; assert.throws(()=>h.run('parseWeekRows(rows)'),/Distância inválida/);}
});
test('empty/unsupported/header-only sheets cannot replace an existing plan', () => {
 const h=createApp(); startSession(h); const before=h.json('S');
 for(const rows of [[],[['not a plan']], [['SEGUNDA','','AQUECIMENTO']]]) {h.app.rows=rows; assert.throws(()=>h.run('parseWeekRows(rows)'),/Não foram encontrados/);}
 assert.equal(h.run('applyPlan({plan:{}},false)'),false); assert.deepEqual(h.json('S'),before);
});
test('explicit rest-day plans are valid', () => {
 const h=createApp(); h.app.rows=[['DOMINGO','','FOLGA']]; assert.equal(h.run('parseWeekRows(rows).plan[6].manha[0].tipo'),'folga');
});
test('accumulation recomputes zone totals and refuses changes during active timing', () => {
 const h=createApp(); startSession(h); h.app.rows=[row('SEGUNDA','New',200)];
 assert.equal(h.run('applyPlan(parseWeekRows(rows),true)'),false);
 h.run('finishLiveSession();applyPlan(parseWeekRows(rows),true)'); assert.equal(h.run(`S.zonePlan['0_manha'].A2`),300);
});

test('accumulation rejects conflicting pools before changing any day', () => {
 const h=createApp();startSession(h);h.run('finishLiveSession()');const before=h.json('S');
 h.app.rows=[row('SEGUNDA','New',200,'P50'),row('TERÇA','New day',100)];
 assert.equal(h.run('applyPlan(parseWeekRows(rows),true)'),false);assert.deepEqual(h.json('S'),before);
});
test('meter parsing retains spaced values but rejects unsafe magnitudes', () => {
 const h=createApp();h.app.rows=[row('SEGUNDA','Long swim','1 000 m')];
 assert.equal(h.run('parseWeekRows(rows).plan[0].manha[0].metros'),1000);
 h.app.rows=[row('SEGUNDA','Invalid','9'.repeat(400))];assert.throws(()=>h.run('parseWeekRows(rows)'),/demasiado grande/);
});
