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
      workouts: { plans: [], sessions: {}, updatedAt: 0 },
      language: 'ru',
      game: {
        money: 1500, currency: 'RUB', xp: 0, inventory: [], pendingDrops: [],
        lastSpinAt: 0, lastIncomeAt: Date.now(), nextItemId: 1, updatedAt: 0,
        lastDrop: null, starterBoxClaimed: false, lastDailyClaimDate: '', dailyStreak: 0,
        armEquipment: { wrist: null, grip: null, strap: null },
        stamina: 100, lastStaminaAt: Date.now(), armWins: 0, armLosses: 0, lastArmMatch: null
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
      kind: ['supplement', 'equipment', 'consumable'].includes(item.kind) ? item.kind : (['wrist', 'grip', 'strap'].includes(item.slot) ? 'equipment' : 'supplement'),
      slot: ['wrist', 'grip', 'strap'].includes(item.slot) ? item.slot : '',
      effect: String(item.effect || ''),
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
      armEquipment: (() => {
        const equipped = {};
        const used = new Set();
        for (const slot of ['wrist', 'grip', 'strap']) {
          const id = Number(source.armEquipment && source.armEquipment[slot]);
          const item = inventory.find(entry => entry.instanceId === id && entry.kind === 'equipment' && entry.slot === slot);
          equipped[slot] = item && !used.has(id) ? (used.add(id), id) : null;
        }
        return equipped;
      })(),
      stamina: Math.max(0, Math.min(100, finiteNonNegative(source.stamina, 100))),
      lastStaminaAt: finiteNonNegative(source.lastStaminaAt, Date.now()),
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
    const workoutSource = isRecord(value.workouts) ? value.workouts : {};
    const plans = Array.isArray(workoutSource.plans) ? workoutSource.plans.filter(p => isRecord(p) && typeof p.id === 'string').slice(0, 300).map(p => ({
      id: p.id.slice(0, 100), name: String(p.name || 'Day').slice(0, 40),
      color: /^#[0-9a-f]{6}$/i.test(String(p.color || '')) ? p.color : '',
      groups: Array.isArray(p.groups) ? p.groups.slice(0, 50).filter(g => isRecord(g)).map(g => ({
        id: String(g.id || '').slice(0, 100), muscle: String(g.muscle || '').slice(0, 60),
        exercises: Array.isArray(g.exercises) ? g.exercises.slice(0, 100).map(x => String(x).slice(0, 80)) : []
      })) : []
    })) : [];
    const sessions = {};
    if (isRecord(workoutSource.sessions)) for (const [key, id] of Object.entries(workoutSource.sessions)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && plans.some(p => p.id === id)) sessions[key] = id;
    }
    return {
      goal: Number.isFinite(goal) && goal > 0 ? Math.min(1000000, goal) : DEFAULT_GOAL,
      days,
      workouts: { plans, sessions, updatedAt: Number.isFinite(Number(workoutSource.updatedAt)) ? Math.max(0, Number(workoutSource.updatedAt)) : 0 },
      language: value.language === 'en' ? 'en' : 'ru',
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
      workouts: (Number(remote.workouts?.updatedAt)||0) > (Number(local.workouts?.updatedAt)||0) ? remote.workouts : local.workouts,
      language: remote.language || local.language,
      game: mergeGameStates(local.game, remote.game)
    };
  }

  root.KairoState = { createDefaultState, normalizeGame, normalizeState, mergeGameStates, mergeDayStates, mergeStates };
})(typeof globalThis !== 'undefined' ? globalThis : this);
