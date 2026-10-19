'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'state-utils.js'), 'utf8');
const context = {};
vm.runInNewContext(source, context, { filename: 'state-utils.js' });
const state = context.KairoState;
const appSource = fs.readFileSync(require('node:path').join(__dirname, '..', 'app.js'), 'utf8');

test('normalizing a legacy state restores the complete game shape', () => {
  const result = state.normalizeState({ goal: 2400, days: {} });
  assert.equal(result.goal, 2400);
  assert.equal(result.game.money, 1500);
  assert.deepEqual(Array.from(result.game.inventory), []);
  assert.equal(result.game.currency, 'RUB');
  assert.deepEqual({ ...result.game.armEquipment }, { wrist: null, grip: null, strap: null });
});

test('invalid top-level values are rejected instead of silently wiping data', () => {
  assert.throws(() => state.normalizeState(null), /Invalid saved state/);
  assert.throws(() => state.normalizeState([]), /Invalid saved state/);
});

test('day records are sanitized and malformed date keys are ignored', () => {
  const result = state.normalizeState({
    days: {
      '2026-10-18': { calories: -20, weight: '82.5', sleep: 30, checks: { water: true }, note: 12 },
      broken: { calories: 999 }
    }
  });
  assert.deepEqual(Object.keys(result.days), ['2026-10-18']);
  assert.equal(result.days['2026-10-18'].calories, 0);
  assert.equal(result.days['2026-10-18'].weight, 82.5);
  assert.equal(result.days['2026-10-18'].sleep, '');
  assert.equal(result.days['2026-10-18'].checks.water, true);
  assert.equal(result.days['2026-10-18'].note, '');
});

test('malformed inventory entries are dropped and instance ids remain unique-capable', () => {
  const result = state.normalizeState({ game: {
    inventory: [
      { name: 'Item', tier: 'S', price: 10, instanceId: 4 },
      { name: 'Broken', tier: 'X', price: 'nope' }
    ],
    nextItemId: 2
  }});
  assert.equal(result.game.inventory.length, 1);
  assert.equal(result.game.inventory[0].tier, 'S');
  assert.equal(result.game.nextItemId, 5);
});

test('merge keeps local non-empty values when remote values are empty and unions checks', () => {
  const result = state.mergeStates(
    { goal: 2600, days: { '2026-10-18': { calories: 1800, weight: 80, checks: { water: true } } } },
    { goal: 3500, days: { '2026-10-18': { calories: 0, weight: '', checks: { activity: true } } } }
  );
  const day = result.days['2026-10-18'];
  assert.equal(result.goal, 2600);
  assert.equal(day.calories, 1800);
  assert.equal(day.weight, 80);
  assert.equal(day.checks.water, true);
  assert.equal(day.checks.activity, true);
});

test('game merge chooses the newer revision timestamp', () => {
  const result = state.mergeGameStates({ money: 100, updatedAt: 1 }, { money: 900, updatedAt: 2 });
  assert.equal(result.money, 900);
});

test('normalization preserves arm-wrestling progress and valid equipment references', () => {
  const result = state.normalizeState({ game: {
    inventory: [{ instanceId: 7, name: 'Grip', tier: 'B', price: 100, kind: 'equipment', slot: 'wrist' }],
    armEquipment: { wrist: 7, grip: 999, strap: null },
    armWins: 4,
    armLosses: 2,
    lastArmMatch: { result: 'win', power: 100, opponentPower: 90, reward: 25, at: 123 }
  }});
  assert.equal(result.game.armEquipment.wrist, 7);
  assert.equal(result.game.armEquipment.grip, null);
  assert.equal(result.game.armWins, 4);
  assert.equal(result.game.armLosses, 2);
  assert.equal(result.game.lastArmMatch.result, 'win');
});

test('gear cannot occupy a mismatched slot and the same item cannot be equipped twice', () => {
  const result = state.normalizeState({ game: {
    inventory: [
      { instanceId: 11, name: 'Wrist Wrap', tier: 'C', price: 500, kind: 'equipment', slot: 'wrist' },
      { instanceId: 12, name: 'Grip', tier: 'C', price: 500, kind: 'equipment', slot: 'grip' }
    ],
    armEquipment: { wrist: 11, grip: 11, strap: 12 },
    stamina: 140
  }});
  assert.deepEqual({ ...result.game.armEquipment }, { wrist: 11, grip: null, strap: null });
  assert.equal(result.game.stamina, 100);
});

test('consumables preserve their use effect and equipment does not become passive income gear', () => {
  const result = state.normalizeState({ game: {
    inventory: [
      { instanceId: 2, name: 'Bandage', tier: 'D', price: 180, kind: 'consumable', effect: 'stamina', amount: 35 },
      { instanceId: 3, name: 'Wrist Wrap', tier: 'D', price: 280, kind: 'equipment', slot: 'wrist', power: 2 }
    ]
  }});
  assert.equal(result.game.inventory[0].kind, 'consumable');
  assert.equal(result.game.inventory[0].amount, 35);
  assert.equal(result.game.inventory[1].kind, 'equipment');
  assert.equal(result.game.inventory[1].slot, 'wrist');
  assert.equal(result.game.inventory[1].power, 2);
});

test('all supplement, equipment and recovery cases have valid 100% odds tables', () => {
  const tables = [...appSource.matchAll(/tierOdds:\{([^}]+)\}/g)];
  assert.equal(tables.length, 30);
  for (const table of tables) {
    const values = [...table[1].matchAll(/(?:S|A|B|C|D):([\d.]+)/g)].map(match => Number(match[1]));
    assert.equal(values.length, 5);
    assert.ok(Math.abs(values.reduce((sum, value) => sum + value, 0) - 100) < 0.001);
  }
});

test('arm-wrestling spends the validated stamina value without a ReferenceError', () => {
  assert.match(appSource, /const staminaNow=Number\(state\.game\.stamina\)\|\|0;/);
  assert.match(appSource, /state\.game\.stamina=Math\.max\(0,staminaNow-25\)/);
  assert.doesNotMatch(appSource, /state\.game\.stamina=Math\.max\(0,stamina-25\)/);
});

test('roulette result labels passive income per hour consistently', () => {
  assert.match(appSource, /if\(incomeNode\)incomeNode\.textContent='\+'\+formatIncomeRate\(itemIncomeRate\(item\)\)\+' \/ час';/);
});

test('roulette binds all gear-case buttons without aborting the rest of its controls', () => {
  assert.match(appSource, /\$\$\('\[data-gear-case\]',content\)\.forEach/);
  assert.doesNotMatch(appSource, /(?<!\$)\$\('\[data-gear-case\]',content\)\.forEach/);
  assert.match(appSource, /bindGearWorkshop\(\);bindCaseButtons\(\);bindOddsSheet\(\);bindOpenCountButtons\(\);/);
});

test('roulette collection handlers use querySelectorAll instead of querySelector', () => {
  assert.doesNotMatch(appSource, /(?<!\$)\$\((['"][^'"]+['"],content)\)\.forEach/);
  for (const selector of ['[data-case-id]', '[data-open-count]', '[data-batch-action]', '[data-arm-slot]', '[data-sell-id]', '[data-craft-key]', '[data-gear-case]', '[data-use-item]']) {
    assert.ok(appSource.includes("$$('"+selector+"',content).forEach"), 'missing collection query for '+selector);
  }
});
