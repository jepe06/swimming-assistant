// Versioned backup format. No DOM or storage access: validate before replacing data.
const SwimCoachBackup = (() => {
  const FORMAT = 'swimcoach-backup';
  const VERSION = 1;
  const MAX_BYTES = 10 * 1024 * 1024;
  const zones = ['TT', 'A1', 'A2', 'A3', 'M.AER', 'LAN', 'M.ANA', 'VEL', 'PML', 'TL'];
  const fields = ['athletes', 'results', 'zoneLog', 'planId', 'weekPlan', 'zonePlan', 'weekLabel',
    'selectedExerciseId', 'selectedExercise', 'activeAthleteId', 'liveSplitDistance', 'activeSession'];
  const fail = () => { throw new Error('Cópia de segurança inválida ou incompatível. Nenhum dado foi alterado.'); };
  const object = (v) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(); };
  const array = (v) => { if (!Array.isArray(v) || v.length > 10000) fail(); };
  const text = (v) => { if (typeof v !== 'string' || v.length > 100000) fail(); };
  const number = (v, min = 0) => { if (!Number.isFinite(v) || v < min || Math.abs(v) > Number.MAX_SAFE_INTEGER) fail(); };
  const id = (v, empty = false) => {
    if (empty && v === '') return;
    if (typeof v === 'number') { number(v); if (!Number.isSafeInteger(v)) fail(); return; }
    if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,150}$/.test(v)) fail();
  };
  function optional(o, names, check) {
    names.forEach((key) => { if (o[key] !== undefined) check(o[key]); });
  }
  function structure(v) {
    if (v == null) return;
    object(v);
    optional(v, ['repetitions', 'distancePerRep', 'totalDistance', 'expectedSplits', 'reps', 'repDistance'], number);
    optional(v, ['source'], text);
    optional(v, ['detectedAutomatically', 'manuallyEdited'], bool);
  }
  function bool(v) { if (typeof v !== 'boolean') fail(); }
  function sessionName(v) { if (!['manha', 'tarde'].includes(v)) fail(); }
  function day(v) { if (!Number.isInteger(v) || v < 0 || v > 6) fail(); }
  function zone(v) { if (v !== '' && !zones.includes(v)) fail(); }
  function distance(v) { if (![25, 50].includes(v)) fail(); }
  function uniqueIds(list) {
    const seen = new Set();
    list.forEach((v) => { id(v.id); if (seen.has(String(v.id))) fail(); seen.add(String(v.id)); });
  }
  function snapshot(v) {
    if (v == null) return;
    object(v); id(v.id); day(v.dayIdx); sessionName(v.sess);
    optional(v, ['planId'], (x) => id(x, true));
    optional(v, ['day', 'sessionLabel', 'blockName', 'blockTipo', 'desc', 'ciclo', 'target', 'pool'], text);
    optional(v, ['index', 'metros'], number); optional(v, ['zona'], zone); structure(v.structure);
  }
  function split(v) {
    object(v); id(v.id); number(v.cum); number(v.lap);
    optional(v, ['athleteId'], id);
    optional(v, ['athleteName', 'label', 'createdAt', 'correctedAt'], text);
    optional(v, ['splitNo', 'distanceMarker', 'totalDistance', 'originalCum'], number);
    optional(v, ['repetition', 'repDistance', 'expectedSplits'], (x) => { if (x !== '') number(x); });
    optional(v, ['targetExpectedMs', 'lapTargetMs'], (x) => { if (x !== null) number(x); });
    optional(v, ['targetDiffMs'], (x) => { if (x !== null) number(x, -Number.MAX_SAFE_INTEGER); });
    optional(v, ['corrected'], bool);
  }
  function zoneMap(v, signed = false) {
    object(v);
    Object.entries(v).forEach(([key, totals]) => {
      if (!/^[0-6]_(manha|tarde)$/.test(key)) fail(); object(totals);
      Object.entries(totals).forEach(([z, meters]) => {
        if (!zones.includes(z)) fail(); number(meters, signed ? -Number.MAX_SAFE_INTEGER : 0);
      });
    });
  }
  function validate(data) {
    object(data);
    if (Object.keys(data).length !== fields.length || fields.some((key) => !Object.hasOwn(data, key))) fail();
    text(data.weekLabel); id(data.planId, true); id(data.selectedExerciseId, true); id(data.activeAthleteId, true);
    distance(data.liveSplitDistance); snapshot(data.selectedExercise);
    if (data.selectedExercise && data.selectedExercise.id !== data.selectedExerciseId) fail();
    array(data.athletes); uniqueIds(data.athletes);
    data.athletes.forEach((a) => {
      // Athlete removal and selection use numeric IDs in existing UI handlers.
      if (!Number.isSafeInteger(a.id) || a.id < 0) fail();
      text(a.nome); optional(a, ['grupo'], text);
    });
    object(data.weekPlan); const exerciseIds = new Set();
    Object.entries(data.weekPlan).forEach(([key, sessions]) => {
      if (!/^[0-6]$/.test(key)) fail(); object(sessions); optional(sessions, ['piscina'], text);
      ['manha', 'tarde'].forEach((sess) => {
        array(sessions[sess]);
        sessions[sess].forEach((row) => {
          object(row); bool(row.isHeader);
          optional(row, ['tipo', 'nome', 'desc', 'ciclo', 'target'], text);
          optional(row, ['metros'], number); optional(row, ['zona'], zone);
          if (!row.isHeader) {
            id(row.id); if (exerciseIds.has(row.id)) fail(); exerciseIds.add(row.id);
          }
        });
      });
    });
    zoneMap(data.zonePlan); zoneMap(data.zoneLog, true);
    array(data.results); uniqueIds(data.results);
    data.results.forEach((result) => {
      object(result); array(result.splits); uniqueIds(result.splits); result.splits.forEach(split);
      optional(result, ['sessionId', 'exerciseId', 'athleteId'], (x) => id(x, true));
      optional(result, ['planId'], (x) => id(x, true));
      optional(result, ['date', 'dia', 'athlete', 'bloco', 'exerciseDesc', 'ciclo', 'pool', 'targetTime', 'lastEditedAt'], text);
      optional(result, ['diaIdx'], day); optional(result, ['sessao'], sessionName);
      optional(result, ['zone'], zone); optional(result, ['meters'], number);
      optional(result, ['splitDistance'], distance); structure(result.exerciseStructure);
    });
    const session = data.activeSession;
    if (session !== null) {
      object(session); id(session.id); id(session.exerciseId); snapshot(session.exerciseSnapshot);
      if (!session.exerciseSnapshot || session.exerciseSnapshot.id !== session.exerciseId) fail();
      if (!['active', 'finished'].includes(session.status)) fail();
      bool(session.running); if (session.running) fail(); // Exports freeze the timer at capture time.
      number(session.elapsed); number(session.start); distance(session.splitDistance);
      optional(session, ['activeAthleteId'], (x) => id(x, true));
      optional(session, ['date', 'createdAt', 'finishedAt', 'pool'], text);
      optional(session, ['zoneLogged'], bool); structure(session.exerciseStructure);
      if (Object.hasOwn(session, 'iv')) fail();
      object(session.splitsByAthlete); const splitIds = new Set();
      Object.entries(session.splitsByAthlete).forEach(([athleteId, splits]) => {
        id(athleteId); array(splits); splits.forEach((s) => {
          split(s); if (splitIds.has(s.id) || String(s.athleteId) !== athleteId) fail(); splitIds.add(s.id);
        });
      });
      array(session.history);
      session.history.forEach((entry) => {
        object(entry); id(entry.athleteId); id(entry.splitId);
        if (!session.splitsByAthlete[entry.athleteId]?.some((s) => s.id === entry.splitId)) fail();
      });
    }
    return data;
  }
  function parse(serialized) {
    if (typeof serialized !== 'string' || new TextEncoder().encode(serialized).length > MAX_BYTES) fail();
    let envelope;
    try {
      envelope = JSON.parse(serialized, (key, value) => {
        if (['__proto__', 'prototype', 'constructor'].includes(key)) fail();
        return value;
      });
    } catch (_) { fail(); }
    object(envelope);
    if (envelope.format !== FORMAT || envelope.version !== VERSION) fail();
    text(envelope.exportedAt);
    return validate(envelope.data);
  }
  function stringify(data) {
    const serialized = JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), data }, null, 2);
    parse(serialized); // Never label an unreadable export as a usable backup.
    return serialized;
  }
  return { parse, stringify, MAX_BYTES };
})();
