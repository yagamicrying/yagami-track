/* Pure state normalization and merge helpers shared by the app and Node tests. */
(function (root) {
  'use strict';

  const DEFAULT_GOAL = 3500;
  const TIERS = ['S', 'A', 'B', 'C', 'D'];
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const finiteNonNegative = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : fallback;
  };

  function createDefaultState() {
    return {
      goal: DEFAULT_GOAL,
      days: {},
      game: {
        money: 1500, currency: 'RUB', xp: 0, inventory: [], pendingDrops: [],
        lastSpinAt: 0, lastIncomeAt: Date.now(), nextItemId: 1, updatedAt: 0,
        lastDrop: null, starterBoxClaimed: false, lastDailyClaimDate: '', dailyStreak: 0,
        armEquipment: { wrist: null, grip: null, strap: null },
        armWins: 0, armLosses: 0, lastArmMatch: null
      }
    };
  }

  function normalizeItem(item) {
    if (!isRecord(item) || typeof item.name !== 'string' || typeof item.tier !== 'string' ||
        !Number.isFinite(Number(item.price))) return null;
    return {
      ...item,
      instanceId: Number.isFinite(Number(item.instanceId)) ? Math.max(0, Math.floor(Number(item.instanceId))) : 0,
      key: String(item.key || 'legacy-item'),
      name: item.name,
      company: String(item.company || 'Неизвестная компания').replace(/ · (?:вымышленный бренд|сомнительный игровой бренд)/g, ''),
      tier: TIERS.includes(item.tier) ? item.tier : 'D',
      price: Math.max(1, Math.round(Number(item.price))),
      weight: Math.max(1, Number(item.weight) || 1),
      detail: String(item.detail || ''),
      acquiredAt: finiteNonNegative(item.acquiredAt)
    };
  }

  function normalizeGame(value) {
    const source = isRecord(value) ? value : {};
    const inventory = (Array.isArray(source.inventory) ? source.inventory : [])
      .map(normalizeItem).filter(Boolean).slice(0, 100);
    const pendingDrops = (Array.isArray(source.pendingDrops) ? source.pendingDrops : [])
      .map(normalizeItem).filter(Boolean).slice(0, 10);
    const lastDrop = normalizeItem(source.lastDrop);
    return {
      money: finiteNonNegative(source.money, 1500),
      currency: source.currency === 'USD' ? 'USD' : 'RUB',
      xp: Math.floor(finiteNonNegative(source.xp)),
      inventory,
      pendingDrops,
      lastSpinAt: finiteNonNegative(source.lastSpinAt),
      lastIncomeAt: finiteNonNegative(source.lastIncomeAt, Date.now()) || Date.now(),
      nextItemId: Math.max(1, Math.floor(finiteNonNegative(source.nextItemId, 1)),
        ...inventory.map(item => item.instanceId + 1),
        ...pendingDrops.map(item => item.instanceId + 1)),
      updatedAt: finiteNonNegative(source.updatedAt),
      lastDrop: lastDrop ? { ...lastDrop, detail: '' } : null,
      starterBoxClaimed: source.starterBoxClaimed === true,
      lastDailyClaimDate: typeof source.lastDailyClaimDate === 'string' ? source.lastDailyClaimDate : '',
      dailyStreak: Math.max(0, Math.min(7, Math.floor(finiteNonNegative(source.dailyStreak)))),
      armEquipment: Object.fromEntries(['wrist', 'grip', 'strap'].map(slot => [
        slot,
        inventory.some(item => item.instanceId === Number(source.armEquipment && source.armEquipment[slot]))
          ? Number(source.armEquipment[slot]) : null
      ])),
      armWins: Math.floor(finiteNonNegative(source.armWins)),
      armLosses: Math.floor(finiteNonNegative(source.armLosses)),
      lastArmMatch: source.lastArmMatch && isRecord(source.lastArmMatch) ? {
        result: source.lastArmMatch.result === 'win' ? 'win' : 'loss',
        power: finiteNonNegative(source.lastArmMatch.power),
        opponentPower: finiteNonNegative(source.lastArmMatch.opponentPower),
        reward: finiteNonNegative(source.lastArmMatch.reward),
        at: finiteNonNegative(source.lastArmMatch.at)
      } : null
    };
  }

  function normalizeDay(value) {
    const source = isRecord(value) ? value : {};
    const numericOrEmpty = (value, maximum = Number.MAX_SAFE_INTEGER) => {
      if (value === '' || value === null || value === undefined) return '';
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 && number <= maximum ? number : '';
    };
    const checks = isRecord(source.checks) ? source.checks : {};
    return {
      calories: finiteNonNegative(source.calories),
      weight: numericOrEmpty(source.weight, 1000),
      sleep: numericOrEmpty(source.sleep, 24),
      checks: {
        water: checks.water === true,
        activity: checks.activity === true,
        sleepRoutine: checks.sleepRoutine === true
      },
      note: typeof source.note === 'string' ? source.note.slice(0, 10000) : ''
    };
  }

  function normalizeState(value) {
    if (!isRecord(value)) throw new Error('Invalid saved state');
    const days = {};
    if (isRecord(value.days)) {
      for (const [key, day] of Object.entries(value.days)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key) && isRecord(day)) days[key] = normalizeDay(day);
      }
    }
    const goal = Number(value.goal);
    return {
      goal: Number.isFinite(goal) && goal > 0 ? Math.min(1000000, goal) : DEFAULT_GOAL,
      days,
      game: normalizeGame(value.game)
    };
  }

  function mergeGameStates(localValue, remoteValue) {
    const local = normalizeGame(localValue);
    const remote = normalizeGame(remoteValue);
    return remote.updatedAt > local.updatedAt ? remote : local;
  }

  function mergeDayStates(localDays, remoteDays) {
    const merged = { ...(isRecord(localDays) ? localDays : {}) };
    for (const [key, remoteValue] of Object.entries(isRecord(remoteDays) ? remoteDays : {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !isRecord(remoteValue)) continue;
      const remote = normalizeDay(remoteValue);
      const localValue = merged[key];
      if (!isRecord(localValue)) {
        merged[key] = remote;
        continue;
      }
      const local = normalizeDay(localValue);
      const result = { ...local };
      for (const field of ['calories', 'weight', 'sleep', 'note']) {
        const rv = remote[field], lv = local[field];
        const remoteEmpty = rv === '' || rv === 0 || rv === null || rv === undefined;
        const localEmpty = lv === '' || lv === 0 || lv === null || lv === undefined;
        if (!remoteEmpty || localEmpty) result[field] = rv;
      }
      result.checks = {
        water: local.checks.water || remote.checks.water,
        activity: local.checks.activity || remote.checks.activity,
        sleepRoutine: local.checks.sleepRoutine || remote.checks.sleepRoutine
      };
      merged[key] = result;
    }
    return merged;
  }

  function mergeStates(localValue, remoteValue) {
    const local = normalizeState(localValue);
    if (!remoteValue) return local;
    const remote = normalizeState(remoteValue);
    return {
      goal: remote.goal !== DEFAULT_GOAL || local.goal === DEFAULT_GOAL ? remote.goal : local.goal,
      days: mergeDayStates(local.days, remote.days),
      game: mergeGameStates(local.game, remote.game)
    };
  }

  root.KairoState = { createDefaultState, normalizeGame, normalizeState, mergeGameStates, mergeDayStates, mergeStates };
})(typeof globalThis !== 'undefined' ? globalThis : this);
