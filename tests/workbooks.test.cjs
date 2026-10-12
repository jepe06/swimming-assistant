const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const XLSX = require('../vendor/sheetjs/xlsx.full.min.js');
const { createApp } = require('./helpers.cjs');
function workbook(rows, bookType='xlsx', modify) {
 const wb=XLSX.utils.book_new(); const ws=XLSX.utils.aoa_to_sheet(rows); if(modify) modify(ws);
 XLSX.utils.book_append_sheet(wb,ws,'Semana');return XLSX.write(wb,{type:'buffer',bookType});
}
function read(bytes) {const h=createApp();h.app.XLSX=h.app.window.XLSX=XLSX;h.app.bytes=bytes;return h.json('readPlanWorkbook(bytes)');}
function sampleRows() {
 const morning=Array(31).fill('');morning[0]='SEGUNDA-FEIRA';morning[1]='P25';morning[2]='A2';morning[3]='4 x 25 livre';morning[11]="cd 1'00";morning[14]=100;
 const afternoon=Array(31).fill('');afternoon[0]='SEGUNDA-FEIRA';afternoon[1]='P25';afternoon[18]='A3';afternoon[19]='2 x 100 costas';afternoon[27]="cd 2'00";afternoon[30]=200;
 return [morning,afternoon,['DOMINGO','','FOLGA']];
}
test('vendored SheetJS version and bytes match the reviewed release', () => {
 assert.equal(XLSX.version,'0.20.3');
 assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../vendor/sheetjs/xlsx.full.min.js'))).digest('hex'),'cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41');
});
for(const type of ['xlsx','biff8']) test(`${type} workbook imports morning/afternoon, repeated days, accents and rest days`, () => {
 const plan=read(workbook(sampleRows(),type));
 assert.equal(plan.plan[0].manha[0].desc,'4 x 25 livre');assert.equal(plan.plan[0].tarde[0].desc,'2 x 100 costas');
 assert.equal(plan.zonePl['0_manha'].A2,100);assert.equal(plan.zonePl['0_tarde'].A3,200);assert.equal(plan.plan[6].manha[0].tipo,'folga');assert.equal(plan.warnings.length,1);
});
test('empty, oversized and non-plan workbooks fail before applying data', () => {
 assert.throws(()=>read(workbook([])),/vazia/);
 assert.throws(()=>read(workbook([['Invoice',123]])),/Não foram encontrados/);
 assert.throws(()=>read(workbook(sampleRows(),'xlsx',ws=>{ws.A10001={t:'s',v:'oversize'};ws['!ref']='A1:AE10001'})),/10000/);
 assert.throws(()=>read(workbook(sampleRows(),'xlsx',ws=>{ws.IW1={t:'s',v:'wide'};ws['!ref']='A1:IW3'})),/256/);
 assert.throws(()=>read(Buffer.alloc(10*1024*1024+1)),/10 MB/);
});
module.exports = { workbook, sampleRows };
