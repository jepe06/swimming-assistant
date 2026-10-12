const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, startSession } = require('./helpers.cjs');

test('Live corrections retain their original time and timestamp through finish and reload', () => {
  const h = createApp(); startSession(h);
  const original = h.run(`S.activeSession.splitsByAthlete['1'][0].cum`);
  h.run(`$('editSplitTime').value = '9'; saveEditedLiveSplitTime('1', S.activeSession.splitsByAthlete['1'][0].id)`);
  const timestamp = h.run(`S.activeSession.splitsByAthlete['1'][0].correctedAt`);
  h.run(`$('editSplitTime').value = '8'; saveEditedLiveSplitTime('1', S.activeSession.splitsByAthlete['1'][0].id); finishLiveSession(); loadState()`);
  const split = h.json('S.results[0].splits[0]');
  assert.equal(split.cum, 8000);
  assert.equal(split.originalCum, original);
  assert.equal(split.corrected, true);
  assert.ok(split.correctedAt >= timestamp);
});

test('finished Live sessions reject stale mutation handlers and cannot overwrite Results', () => {
  const h = createApp(); startSession(h); h.run('finishLiveSession()');
  h.run(`globalThis.splitId = S.activeSession.splitsByAthlete['1'][0].id; globalThis.resultId = S.results[0].id;
    $('editResultSplitTime').value = '7'; saveEditedResultSplitTime(resultId, splitId)`);
  const before = h.json('({session:S.activeSession,results:S.results})');
  h.run(`$('editSplitTime').value = '3'; $('moveSplitAthlete').value = '2';
    saveEditedLiveSplitTime('1',splitId); saveMoveLiveSplit('1',splitId);
    deleteLiveSplit('1',splitId); undoLastLiveSplit(); finishLiveSession();
    toggleLiveSW(); takeLiveSplit(); setSplitDistance(50); saveExerciseStructureFromModal()`);
  assert.deepEqual(h.json('({session:S.activeSession,results:S.results})'), before);
  assert.doesNotMatch(h.run('renderLiveSplits()'), /showEditLiveSplitModal|deleteLiveSplit|showMoveLiveSplitModal/);
  assert.match(h.run('renderLiveSplits()'), /resultados/);
});
