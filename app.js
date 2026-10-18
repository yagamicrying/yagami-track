(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const STORE = 'yagami-track-v1';
  const CLOUD_META_KEY = 'yagami_track_meta';
  const CLOUD_CHUNK_PREFIX = 'yagami_track_chunk_';
  const CLOUD_CHUNK_SIZE = 3000;
  const defaultState = { goal: 3500, days: {}, game: { money: 500, currency: 'RUB', xp: 0, inventory: [], pendingDrops: [], lastSpinAt: 0, lastIncomeAt: Date.now(), nextItemId: 1, updatedAt: 0, lastDrop: null, starterBoxClaimed: false, lastDailyClaimDate: '', dailyStreak: 0 } };
  const SPIN_COST = 100;
  const GAME_ITEMS = [
    {key:'tren-titan',name:'Тренболон',company:'TitanCore Labs',tier:'S',price:5000,weight:1,detail:''},
    {key:'gh-northstar',name:'Гормон роста',company:'Northstar Biotech',tier:'S',price:5000,weight:1,detail:''},
    {key:'tren-apex',name:'Тренболон',company:'Apex Research',tier:'A',price:3000,weight:8,detail:''},
    {key:'gh-medaxis',name:'Гормон роста',company:'MedAxis Labs',tier:'A',price:3000,weight:8,detail:''},
    {key:'pre-ironpeak',name:'Предтрен',company:'IronPeak Nutrition',tier:'A',price:3000,weight:8,detail:''},
    {key:'pre-forgefuel',name:'Предтрен',company:'ForgeFuel',tier:'B',price:1400,weight:25,detail:''},
    {key:'protein-primewhey',name:'Протеин',company:'PrimeWhey',tier:'B',price:1800,weight:25,detail:''},
    {key:'creatine-pureform',name:'Креатин',company:'PureForm Certified',tier:'B',price:1400,weight:25,detail:''},
    {key:'protein-core',name:'Протеин',company:'Core Nutrition',tier:'C',price:1500,weight:48,detail:''},
    {key:'creatine-budget',name:'Креатин',company:'BudgetSport',tier:'C',price:1100,weight:48,detail:''},
    {key:'electrolytes-hydrate',name:'Электролиты',company:'HydratePro',tier:'C',price:950,weight:48,detail:''},
    {key:'omega-ocean',name:'Омега-3',company:'OceanPure',tier:'C',price:1100,weight:48,detail:''},
    {key:'bcaa-core',name:'BCAA',company:'Core Aminos',tier:'C',price:1000,weight:48,detail:''},
    {key:'glutamine-labline',name:'Глютамин',company:'Labline Nutrition',tier:'C',price:950,weight:48,detail:''},
    {key:'tren-blackline',name:'Тренболон',company:'Blackline Underground',tier:'D',price:650,weight:72,detail:''},
    {key:'gh-greylabel',name:'Гормон роста',company:'GreyLabel Labs',tier:'D',price:600,weight:72,detail:''},
    {key:'pre-unmarked',name:'Предтрен',company:'Unmarked Mix',tier:'D',price:550,weight:72,detail:''},
    {key:'protein-unknown',name:'Протеин',company:'Unknown Batch',tier:'D',price:800,weight:72,detail:''},
    {key:'creatine-loose',name:'Креатин',company:'Loose Powder Co.',tier:'D',price:500,weight:72,detail:''},
    {key:'electrolytes-generic',name:'Электролиты',company:'Generic Mix',tier:'D',price:450,weight:72,detail:''},
    {key:'omega-unverified',name:'Омега-3',company:'Unverified Oil',tier:'D',price:500,weight:72,detail:''},
    {key:'bcaa-basic',name:'BCAA',company:'Basic Aminos',tier:'D',price:450,weight:72,detail:''},
    {key:'glutamine-generic',name:'Глютамин',company:'Generic Lab',tier:'D',price:400,weight:72,detail:''}
  ];

  const SUPPLEMENT_CASES = [
    {id:'starter',name:'Первый шаг',price:0,subtitle:'Стартовый набор · обычные предметы встречаются чаще',tierOdds:{S:0.05,A:0.95,B:9,C:30,D:60}},
    {id:'forbidden',name:'Чёрный протокол',price:2500,subtitle:'Высокий риск · редкость не гарантирована',tierOdds:{S:0.2,A:2.8,B:12,C:35,D:50}},
    {id:'medium',name:'Золотой стандарт',price:1500,subtitle:'Базовая коллекция · сбалансированные шансы',tierOdds:{S:0.1,A:1.4,B:8.5,C:30,D:60}},
    {id:'useless',name:'Складской остаток',price:1000,subtitle:'Бюджетный кейс · легендарный дроп почти невозможен',tierOdds:{S:0.02,A:0.18,B:2.8,C:22,D:75}},
    {id:'iron-grip',name:'Железный хват',price:350,subtitle:'Базовые коллекции · D–C',tierOdds:{S:0,A:0.5,B:6.5,C:28,D:65}},
    {id:'wrist-lock',name:'Замок кисти',price:650,subtitle:'Редкие находки требуют удачи',tierOdds:{S:0.05,A:0.95,B:8,C:31,D:60}},
    {id:'chalk-dust',name:'Меловая пыль',price:800,subtitle:'Чистая техника и сухой хват',tierOdds:{S:0.08,A:1.42,B:8.5,C:32,D:58}},
    {id:'training-day',name:'Тренировочный день',price:1200,subtitle:'Сбалансированный тренировочный кейс',tierOdds:{S:0.1,A:1.4,B:8.5,C:30,D:60}},
    {id:'steel-table',name:'Стальной стол',price:1800,subtitle:'Редкие находки для сильных рук',tierOdds:{S:0.15,A:2.35,B:10.5,C:32,D:55}},
    {id:'heavy-duty',name:'Тяжёлая работа',price:2200,subtitle:'Больше веса — выше ставки',tierOdds:{S:0.2,A:2.8,B:12,C:35,D:50}},
    {id:'king-of-hill',name:'Король горы',price:3200,subtitle:'Кейс для претендентов на титул',tierOdds:{S:0.3,A:3.7,B:14,C:37,D:45}},
    {id:'black-ice',name:'Чёрный лёд',price:4000,subtitle:'Холодный стиль, горячие дропы',tierOdds:{S:0.4,A:4.6,B:15,C:35,D:45}},
    {id:'redline',name:'Красная линия',price:5200,subtitle:'Риск ради легендарного предмета',tierOdds:{S:0.5,A:5.5,B:17,C:37,D:40}},
    {id:'titan',name:'Титан',price:7000,subtitle:'Тяжёлый премиум-кейс',tierOdds:{S:0.7,A:7.3,B:18,C:34,D:40}},
    {id:'underground',name:'Подполье',price:8500,subtitle:'Коллекция высокого уровня',tierOdds:{S:0.8,A:8.2,B:20,C:31,D:40}},
    {id:'champion',name:'Чемпион',price:11000,subtitle:'Для тех, кто уже поднялся',tierOdds:{S:1,A:9,B:22,C:30,D:38}},
    {id:'apex',name:'Апекс',price:15000,subtitle:'Высокая цена, высокий потолок',tierOdds:{S:1.5,A:10.5,B:24,C:28,D:36}},
    {id:'monolith',name:'Монолит',price:20000,subtitle:'Тяжёлый кейс с редким верхом',tierOdds:{S:2,A:12,B:25,C:27,D:34}},
    {id:'night-shift',name:'Ночная смена',price:27500,subtitle:'Коллекция после полуночи',tierOdds:{S:2.5,A:13.5,B:27,C:25,D:32}},
    {id:'overdrive',name:'Овердрайв',price:35000,subtitle:'Максимум темпа и риска',tierOdds:{S:3,A:15,B:28,C:24,D:30}},
    {id:'black-label',name:'Black Label',price:50000,subtitle:'Премиальная коллекция',tierOdds:{S:4,A:16,B:30,C:22,D:28}},
    {id:'mythic',name:'Мифический',price:75000,subtitle:'Почти недостижимые дропы',tierOdds:{S:5,A:18,B:31,C:21,D:25}},
    {id:'last-stand',name:'Последний рубеж',price:100000,subtitle:'Кейс для решающей ставки',tierOdds:{S:6,A:19,B:32,C:20,D:23}},
    {id:'godhand',name:'Рука бога',price:150000,subtitle:'Самый дорогой кейс коллекции',tierOdds:{S:8,A:20,B:32,C:18,D:22}}
  ];

  const GEAR_ITEMS = [
    {key:'gear-wrist-wrap',name:'Бинты для кисти',company:'Iron Table',tier:'D',price:280,weight:1,kind:'equipment',slot:'wrist',power:2},
    {key:'gear-basic-grip',name:'Резиновый эспандер',company:'Grip Lab',tier:'D',price:350,weight:1,kind:'equipment',slot:'grip',power:2},
    {key:'gear-training-strap',name:'Тренировочный ремень',company:'Pull Forge',tier:'D',price:420,weight:1,kind:'equipment',slot:'strap',power:2},
    {key:'gear-leather-wrist',name:'Кожаная фиксация',company:'Iron Table',tier:'C',price:850,weight:1,kind:'equipment',slot:'wrist',power:5},
    {key:'gear-pro-grip',name:'Стальной хват',company:'Grip Lab',tier:'C',price:1100,weight:1,kind:'equipment',slot:'grip',power:6},
    {key:'gear-pro-strap',name:'Усиленный ремень',company:'Pull Forge',tier:'C',price:1250,weight:1,kind:'equipment',slot:'strap',power:6},
    {key:'gear-carbon-wrist',name:'Карбоновый фиксатор',company:'Titan Table',tier:'B',price:2800,weight:1,kind:'equipment',slot:'wrist',power:12},
    {key:'gear-titan-grip',name:'Титановый хват',company:'Titan Table',tier:'B',price:3600,weight:1,kind:'equipment',slot:'grip',power:14},
    {key:'gear-titan-strap',name:'Титановый ремень',company:'Titan Table',tier:'B',price:3900,weight:1,kind:'equipment',slot:'strap',power:14},
    {key:'gear-legend-wrist',name:'Кистевой замок «Феникс»',company:'Apex Arena',tier:'A',price:9500,weight:1,kind:'equipment',slot:'wrist',power:25},
    {key:'gear-legend-grip',name:'Хват «Разрушитель»',company:'Apex Arena',tier:'A',price:12000,weight:1,kind:'equipment',slot:'grip',power:28},
    {key:'gear-legend-strap',name:'Ремень чемпиона',company:'Apex Arena',tier:'A',price:13500,weight:1,kind:'equipment',slot:'strap',power:28},
    {key:'gear-myth-wrist',name:'Наруч «Монолит»',company:'Mythic Forge',tier:'S',price:40000,weight:1,kind:'equipment',slot:'wrist',power:55},
    {key:'gear-myth-grip',name:'Гравитационный хват',company:'Mythic Forge',tier:'S',price:50000,weight:1,kind:'equipment',slot:'grip',power:60},
    {key:'gear-myth-strap',name:'Ремень абсолютного чемпиона',company:'Mythic Forge',tier:'S',price:55000,weight:1,kind:'equipment',slot:'strap',power:60}
  ];
  const CONSUMABLE_ITEMS = [
    {key:'cons-bandage',name:'Бинты восстановления ×1',company:'Arena Supply',tier:'D',price:180,weight:1,kind:'consumable',effect:'stamina',amount:35},
    {key:'cons-recovery-kit',name:'Комплект восстановления ×1',company:'Arena Supply',tier:'C',price:600,weight:1,kind:'consumable',effect:'stamina',amount:70},
    {key:'cons-champion-kit',name:'Комплект чемпиона ×1',company:'Apex Arena',tier:'B',price:1600,weight:1,kind:'consumable',effect:'stamina',amount:100}
  ];
  const GEAR_CASES = [
    {id:'gear-starter',name:'Первая экипировка',price:300,subtitle:'Базовый набор · D–C',tierOdds:{D:72,C:28,B:0,A:0,S:0},pool:'gear'},
    {id:'gear-pro',name:'Кейс «Стальной хват»',price:1600,subtitle:'Экипировка для серьёзных боёв',tierOdds:{D:30,C:55,B:15,A:0,S:0},pool:'gear'},
    {id:'gear-elite',name:'Кейс «Зал чемпионов»',price:6500,subtitle:'Редкое снаряжение B–A',tierOdds:{D:10,C:35,B:45,A:10,S:0},pool:'gear'},
    {id:'gear-legend',name:'Кейс «Миф арены»',price:18000,subtitle:'Высокий риск · легендарный верх',tierOdds:{D:3,C:17,B:45,A:30,S:5},pool:'gear'},
    {id:'med-basic',name:'Аптечка новичка',price:450,subtitle:'Бинты и восстановление',tierOdds:{D:75,C:25,B:0,A:0,S:0},pool:'consumable'},
    {id:'med-pro',name:'Медкейс бойца',price:1800,subtitle:'Больше восстановления',tierOdds:{D:35,C:50,B:15,A:0,S:0},pool:'consumable'}
  ];
  let selectedGearCaseId = 'gear-starter';

  let selectedCaseId = 'medium';
  let selectedOpenCount = 1;
  let rouletteAnimationTimer = null;
  let rouletteReelAnimation = null;
  let rouletteCooldownTimer = null;
  let rouletteIsSpinning = false;
  let gameUiRefresh = null;
  let state = loadState();
  let currentDate = dateKey(new Date());
  let historyExpanded = false;
  let editType = '';
  let toastTimer;
  let cloudStorage = null;
  let cloudReady = false;
  let cloudSaveTimer = null;
  let cloudWriteQueue = Promise.resolve();
  let cloudStatus = 'Локальное сохранение';
  function getTelegramProfile(){
    const tg = window.Telegram && window.Telegram.WebApp;
    const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (!user) return { name: 'Твой профиль', photo: '', username: '' };
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return { name: fullName || (user.username ? '@' + user.username : 'Пользователь'), photo: user.photo_url || '', username: user.username || '' };
  }
  function updateProfile(){
    const profile = getTelegramProfile();
    const avatar = $('#profileAvatar');
    const name = $('#profileName');
    const status = $('#profileStatus');
    if (!avatar || !name || !status) return;
    name.textContent = profile.name;
    if (profile.username) name.title = '@' + profile.username;
    if (profile.photo) {
      avatar.textContent = '';
      avatar.style.backgroundImage = 'url("' + profile.photo.replace(/["\\\\]/g, '') + '")';
      avatar.classList.add('has-photo');
    } else {
      avatar.style.backgroundImage = '';
      avatar.classList.remove('has-photo');
      avatar.textContent = profile.name.split(/\s+/).map(part => part[0] || '').slice(0,2).join('').toUpperCase() || '?';
    }
    const d = state.days[currentDate] || {};
    const checks = d.checks || {};
    const activeToday = Number(d.calories) > 0 || (d.weight !== undefined && d.weight !== '') || (d.sleep !== undefined && d.sleep !== '') || !!d.note || Object.values(checks).some(Boolean);
    const label = status.querySelector('span');
    label.textContent = activeToday ? 'Активность сегодня' : 'Сегодня ещё не начинал';
    status.classList.toggle('is-active', activeToday);
    const levelInfo=playerLevelInfo();
    const levelBadge=$('#avatarLevel'),levelText=$('#playerLevel'),xpFill=$('#playerXpFill'),xpText=$('#playerXpText');
    if(levelBadge)levelBadge.textContent='LVL '+levelInfo.level;
    if(levelText)levelText.textContent='Уровень '+levelInfo.level;
    if(xpFill)xpFill.style.width=Math.min(100,Math.round(levelInfo.xpIntoLevel/levelInfo.xpNeeded*100))+'%';
    if(xpText)xpText.textContent=fmtNum(levelInfo.xpIntoLevel)+' / '+fmtNum(levelInfo.xpNeeded)+' XP';
  }

  function createDefaultState(){ return KairoState.createDefaultState(); }
  function normalizeGame(value){ return KairoState.normalizeGame(value); }
  function normalizeState(value){ return KairoState.normalizeState(value); }
  function loadState(){
    try {
      const raw = localStorage.getItem(STORE);
      return normalizeState(raw ? JSON.parse(raw) : {});
    } catch (error) {
      try {
        const raw = localStorage.getItem(STORE);
        if (raw) localStorage.setItem(STORE + '-recovery-' + Date.now(), raw);
      } catch (backupError) {
        console.warn('Unable to preserve damaged local state', backupError);
      }
      console.warn('Saved state was invalid; starting with defaults', error);
      return createDefaultState();
    }
  }
  function mergeGameStates(localGame,remoteGame){ return KairoState.mergeGameStates(localGame,remoteGame); }
  function playerLevelInfo(xp=state.game.xp){let level=1,remaining=Math.max(0,Math.floor(Number(xp)||0)),needed=Math.round(300*Math.pow(level,1.85));while(remaining>=needed&&level<100){remaining-=needed;level++;needed=Math.round(300*Math.pow(level,1.85));}return {level,xpIntoLevel:remaining,xpNeeded:needed};}
  function inventoryCapacity(){return 10+playerLevelInfo().level-1;}
  function sellValue(item){const rate=({D:0.40,C:0.45,B:0.55,A:0.60,S:0.65})[item&&item.tier]||0.40;return Math.max(1,Math.floor(Number(item&&item.price||0)*rate));}

  const GAME_DOLLAR_RATE = 90;
  function formatMoney(value){
    const currency=state.game.currency==='USD'?'USD':'RUB';
    const amount=Number(value||0)/(currency==='USD'?GAME_DOLLAR_RATE:1);
    return new Intl.NumberFormat('ru-RU',{style:'currency',currency,minimumFractionDigits:currency==='USD'?2:0,maximumFractionDigits:currency==='USD'?2:0}).format(amount);
  }
  function fixedPrice(item){return Math.max(1,Math.round(Number(item&&item.price)||1));}
  function formatIncomeRate(value){return formatMoney(Math.max(0,Math.round(Number(value)||0)));}
  function itemIncomeRate(item){if(!item||item.kind==='equipment'||item.kind==='consumable')return 0;return ({D:3,C:8,B:20,A:55,S:140})[item.tier]||3;}
  function regenerateStamina(){
    const now=Date.now(),game=state.game,previous=Number(game.lastStaminaAt)||now;
    const ticks=Math.floor(Math.max(0,now-previous)/360000);
    if(ticks>0){game.stamina=Math.min(100,Math.max(0,Number(game.stamina)||0)+ticks);game.lastStaminaAt=previous+ticks*360000;const staminaNode=$('#armStamina');if(staminaNode)staminaNode.textContent=game.stamina+'/100';const staminaFill=$('.arm-stamina-track i');if(staminaFill)staminaFill.style.width=game.stamina+'%';}
  }
  function passiveIncomePerHour(){
    const inventory=state.game.inventory||[];
    return 8+inventory.reduce((sum,item)=>sum+itemIncomeRate(item),0);
  }
  let lastPassiveCloudSave=Date.now();
  function accruePassiveIncome(){
    const now=Date.now(),previous=Number(state.game.lastIncomeAt)||now;
    regenerateStamina();
    const elapsedMs=Math.max(0,Math.min(8*3600000,now-previous));
    if(elapsedMs<=0)return;
    // Accrue continuously, while the UI deliberately displays whole currency units.
    const minuteRate=passiveIncomePerHour();
    state.game.money=Math.max(0,Number(state.game.money)||0)+minuteRate*(elapsedMs/3600000);
    state.game.lastIncomeAt=now;
    const moneyNode=$('#gameMoney');if(moneyNode)moneyNode.textContent=formatMoney(state.game.money);
    const floatingMoney=$('#floatingGameMoney');if(floatingMoney)floatingMoney.textContent=formatMoney(state.game.money);
    if(gameUiRefresh)gameUiRefresh();
    const incomeText='+'+formatIncomeRate(minuteRate)+' / час';
    const incomeNode=$('#gameIncomeRate');if(incomeNode)incomeNode.textContent=incomeText;
    const floatingIncome=$('#floatingGameIncome');if(floatingIncome)floatingIncome.textContent=incomeText;
    try{localStorage.setItem(STORE,JSON.stringify(state));}catch(error){console.warn('Local passive-income save failed',error);}
    if(now-lastPassiveCloudSave>=15000){lastPassiveCloudSave=now;markGameChanged();}
  }

  function triggerHaptic(kind='impact',style='light'){
    try{
      const tg=window.Telegram&&window.Telegram.WebApp;
      const h=tg&&tg.HapticFeedback;
      if(h){
        if(kind==='selection'&&typeof h.selectionChanged==='function'){h.selectionChanged();return;}
        if(kind==='notification'&&typeof h.notificationOccurred==='function'){h.notificationOccurred(style);return;}
        if(typeof h.impactOccurred==='function'){h.impactOccurred(style);return;}
      }
      if(navigator.vibrate)navigator.vibrate(kind==='notification'?[22,35,32]:kind==='selection'?10:style==='heavy'?28:12);
    }catch(_){}
  }
  function markGameChanged(){
    state.game.updatedAt=Math.max(Date.now(),(Number(state.game.updatedAt)||0)+1);
    saveState();updateProfile();
    if(cloudReady&&cloudStorage){
      clearTimeout(cloudSaveTimer);
      writeCloudState().catch(error=>{
        cloudStatus='Ошибка синхронизации — данные сохранены на устройстве';
        console.warn('Game progress sync failed',error);refreshSyncStatus();
      });
    }
  }
  function chanceLabel(value){return value<0.1?value.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':value.toLocaleString('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:2})+'%';}
  function tierOddsMarkup(caseEntry){
    const labels={S:'S · Легендарный',A:'A · Эпический',B:'B · Редкий',C:'C · Необычный',D:'D · Обычный'};
    return '<div class="case-odds-heading"><span>Шансы выпадения</span><span>'+escapeHtml(caseEntry.name)+'</span></div><div class="case-odds-grid">'+['S','A','B','C','D'].map(tier=>'<div class="case-odds-row tier-odds-'+tier.toLowerCase()+'"><span class="odds-rank">'+tier+'</span><span class="odds-label">'+labels[tier].slice(4)+'</span><strong>'+chanceLabel(caseEntry.tierOdds[tier]||0)+'</strong></div>').join('')+'</div>'+(caseEntry.id==='useless'?'<p class="jackpot-note">Шанс предмета S-ранга в этом кейсе: <strong>'+chanceLabel(caseEntry.tierOdds.S||0)+'</strong>.</p>':'');
  }
  function pickGameItem(caseId=selectedCaseId){
    const selected=SUPPLEMENT_CASES.find(entry=>entry.id===caseId)||SUPPLEMENT_CASES.find(entry=>entry.id==='medium');
    const odds=selected.tierOdds||{D:100},tiers=['S','A','B','C','D'];
    let roll=Math.random()*100,tier=tiers[tiers.length-1];
    for(const candidate of tiers){roll-=Number(odds[candidate])||0;if(roll<0){tier=candidate;break;}}
    const pool=GAME_ITEMS.filter(item=>item.tier===tier);
    return pool[Math.floor(Math.random()*pool.length)]||GAME_ITEMS[0];
  }
  function pickGearItem(caseId){
    const selected=GEAR_CASES.find(entry=>entry.id===caseId)||GEAR_CASES[0];
    const tiers=['S','A','B','C','D'];let roll=Math.random()*100,tier='D';
    for(const candidate of tiers){roll-=Number(selected.tierOdds[candidate])||0;if(roll<0){tier=candidate;break;}}
    const pool=(selected.pool==='consumable'?CONSUMABLE_ITEMS:GEAR_ITEMS).filter(item=>item.tier===tier);
    return pool[Math.floor(Math.random()*pool.length)]||(selected.pool==='consumable'?CONSUMABLE_ITEMS[0]:GEAR_ITEMS[0]);
  }
  function saveState(){
    let localSaved = true;
    try { localStorage.setItem(STORE, JSON.stringify(state)); }
    catch (error) {
      localSaved = false;
      cloudStatus = 'Браузер не смог сохранить данные локально';
      console.warn('Local state save failed', error);
    }
    if (cloudReady && cloudStorage) {
      cloudStatus = localSaved
        ? 'Сохранено на устройстве · отправка в Telegram…'
        : 'Локальное сохранение недоступно · отправка в Telegram…';
      scheduleCloudSave();
    }
    if (!localSaved) {
      refreshSyncStatus();
      setTimeout(() => toast(cloudReady && cloudStorage
        ? 'Не удалось сохранить локально — пробую синхронизировать с Telegram'
        : 'Не удалось сохранить данные на устройстве'), 0);
    }
    return localSaved;
  }
  function cloudCall(method, ...args){
    return new Promise((resolve, reject) => {
      try {
        cloudStorage[method](...args, (error, result) => {
          if (error) return reject(error);
          if (method === 'setItem' && result === false) return reject(new Error('Telegram CloudStorage не подтвердил запись'));
          resolve(result);
        });
      } catch (error) { reject(error); }
    });
  }
  function checksum(text){
    let hash=2166136261;
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return (hash>>>0).toString(16).padStart(8,'0');
  }
  async function readCloudState(){
    const metaRaw = await cloudCall('getItem', CLOUD_META_KEY);
    if (!metaRaw) return null;
    const meta = JSON.parse(metaRaw);
    if (!meta || !Number.isInteger(meta.chunks) || meta.chunks < 1 || meta.chunks > 1000 ||
        (meta.version >= 2 && (typeof meta.checksum !== 'string' ||
          (!['a', 'b'].includes(meta.slot) && typeof meta.generation !== 'string')))) {
      throw new Error('Invalid cloud metadata');
    }
    let json = '';
    for (let i = 0; i < meta.chunks; i++) {
      const key = meta.version >= 2
        ? (meta.slot ? CLOUD_CHUNK_PREFIX + 'snapshot_' + meta.slot + '_' + i : CLOUD_CHUNK_PREFIX + meta.generation + '_' + i)
        : CLOUD_CHUNK_PREFIX + i;
      const chunk = await cloudCall('getItem', key);
      if (typeof chunk !== 'string') throw new Error('Missing cloud data');
      json += chunk;
    }
    if (meta.version >= 2 && (json.length !== meta.length || checksum(json) !== meta.checksum)) {
      throw new Error('Cloud snapshot integrity check failed');
    }
    return normalizeState(JSON.parse(json));
  }
  async function writeCloudSnapshot(){
    if (!cloudStorage || !cloudReady) return;
    const snapshot = normalizeState(JSON.parse(JSON.stringify(state)));
    const json = JSON.stringify(snapshot);
    const chunks = [];
    for (let i = 0; i < json.length; i += CLOUD_CHUNK_SIZE) chunks.push(json.slice(i, i + CLOUD_CHUNK_SIZE));
    // A failed metadata read must abort the write: otherwise we might overwrite the
    // currently active slot while believing no previous snapshot exists.
    const previousRaw = await cloudCall('getItem', CLOUD_META_KEY);
    let previousMeta = null;
    try { previousMeta = previousRaw ? JSON.parse(previousRaw) : null; }
    catch (_) { previousMeta = null; }
    // Alternate bounded slots; interrupted writes leave the previous metadata valid.
    const slot = previousMeta && previousMeta.version >= 2 && previousMeta.slot === 'a' ? 'b' : 'a';
    for (let i = 0; i < chunks.length; i++) {
      await cloudCall('setItem', CLOUD_CHUNK_PREFIX + 'snapshot_' + slot + '_' + i, chunks[i]);
    }
    await cloudCall('setItem', CLOUD_META_KEY, JSON.stringify({
      version: 2, slot, chunks: chunks.length, length: json.length,
      checksum: checksum(json), updatedAt: Date.now()
    }));
    cloudStatus = 'Синхронизировано с Telegram';
    refreshSyncStatus();
  }
  function writeCloudState(){
    const operation = cloudWriteQueue.catch(() => {}).then(() => writeCloudSnapshot());
    cloudWriteQueue = operation.catch(() => {});
    return operation;
  }
  function refreshSyncStatus(){
    const status = $('#syncStatus');
    if (status) status.textContent = 'Статус: ' + cloudStatus + (cloudStorage ? '.' : '. Открой Kairo из Telegram, чтобы синхронизировать данные между устройствами.');
  }
  function scheduleCloudSave(){
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(async () => {
      try { await writeCloudState(); }
      catch (error) {
        cloudStatus = 'Ошибка синхронизации — данные пока только на устройстве';
        console.warn('Telegram CloudStorage save failed', error);
      }
      refreshSyncStatus();
    }, 500);
  }
  async function syncNow(){
    if (!cloudStorage) {
      cloudStatus = 'Telegram CloudStorage недоступен в этом окне';
      refreshSyncStatus();
      toast('Открой приложение внутри Telegram');
      return;
    }
    cloudStatus = 'Синхронизация…';
    refreshSyncStatus();
    try {
      const localState = normalizeState(JSON.parse(localStorage.getItem(STORE) || '{}'));
      const remoteState = await readCloudState();
      if (remoteState) {
        const mergedDays = {...localState.days};
        for (const [key, remoteDay] of Object.entries(remoteState.days)) {
          const localDay = mergedDays[key];
          if (!localDay) {
            mergedDays[key] = remoteDay;
            continue;
          }
          const merged = {...localDay, ...remoteDay, checks: {...(localDay.checks || {}), ...(remoteDay.checks || {})}};
          for (const field of ['calories','weight','sleep','note']) {
            const localValue = localDay[field];
            const remoteValue = remoteDay[field];
            if ((remoteValue === undefined || remoteValue === '' || remoteValue === 0 || remoteValue === null) && localValue !== undefined && localValue !== '' && localValue !== 0 && localValue !== null) merged[field] = localValue;
          }
          mergedDays[key] = merged;
        }
        state = {goal: remoteState.goal || localState.goal || 3500, days: mergedDays, game: mergeGameStates(localState.game, remoteState.game)};
      }
      localStorage.setItem(STORE, JSON.stringify(state));
      cloudReady = true;
      await writeCloudState();
      render();
      refreshPageSections();
      toast('Данные синхронизированы');
    } catch (error) {
      cloudStatus = 'Не удалось синхронизировать — данные сохранены локально';
      console.warn('Telegram CloudStorage manual sync failed', error);
      toast('Ошибка синхронизации');
    }
    refreshSyncStatus();
  }
  async function initializeStorage(){
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg) {
      try { if (typeof tg.ready === 'function') tg.ready(); if (typeof tg.expand === 'function') tg.expand(); } catch {}
    }
    if (tg && tg.CloudStorage) {
      cloudStorage = tg.CloudStorage;
      try {
        const localState = normalizeState(JSON.parse(localStorage.getItem(STORE) || '{}'));
        const remoteState = await readCloudState();
        if (remoteState) {
          const mergedDays = {...localState.days};
          for (const [key, remoteDay] of Object.entries(remoteState.days)) {
            const localDay = mergedDays[key];
            if (!localDay) mergedDays[key] = remoteDay;
            else {
              const merged = {...localDay, ...remoteDay, checks: {...(localDay.checks || {}), ...(remoteDay.checks || {})}};
              for (const field of ['calories','weight','sleep','note']) {
                const lv = localDay[field], rv = remoteDay[field];
                if ((rv === undefined || rv === '' || rv === 0 || rv === null) && lv !== undefined && lv !== '' && lv !== 0 && lv !== null) merged[field] = lv;
              }
              mergedDays[key] = merged;
            }
          }
          state = {goal: remoteState.goal || localState.goal || 3500, days: mergedDays, game: mergeGameStates(localState.game, remoteState.game)};
          cloudStatus = 'Данные загружены из Telegram';
        } else {
          state = localState;
          cloudStatus = 'Первая синхронизация — переносим локальные данные';
        }
        localStorage.setItem(STORE, JSON.stringify(state));
        cloudReady = true;
        await writeCloudState();
      } catch (error) {
        cloudReady = false;
        cloudStatus = 'Ошибка Telegram CloudStorage — данные на этом устройстве сохранены';
        console.warn('Telegram CloudStorage initialization failed', error);
      }
    } else {
      cloudReady = false;
      cloudStatus = 'Локальное сохранение · открой приложение внутри Telegram для синхронизации';
    }
    render();
    renderStats($('#progressContent'));
    renderHistory($('#historyContent'));
    renderRoulette($('#rouletteContent'));
    renderSettings($('#settingsContent'));
    refreshSyncStatus();
  }
  function dateKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function dayData(key=currentDate){ if(!state.days[key]) state.days[key] = {calories:0, weight:'', sleep:'', checks:{water:false,activity:false,sleepRoutine:false}, note:''}; const d=state.days[key]; d.checks ||= {water:false,activity:false,sleepRoutine:false}; return d; }
  function dateFromKey(key){ const [y,m,d]=key.split('-').map(Number); return new Date(y,m-1,d); }
  function formatDate(key){return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(dateFromKey(key));}
  function formatDay(key){return new Intl.DateTimeFormat('ru-RU',{weekday:'long'}).format(dateFromKey(key)).toUpperCase();}
  function fmtNum(n){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n);}
  function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1900);}
  function render(){
    updateProfile();
    const d=dayData(); const calories=Number(d.calories)||0; const goal=Number(state.goal)||3500; const remaining=goal-calories; const pct=Math.min(100,Math.round(calories/goal*100));
    $('#dayName').textContent=formatDay(currentDate); $('#dateTitle').textContent=formatDate(currentDate);
    $('#goalLabel').textContent=fmtNum(goal); $('#caloriesValue').textContent=fmtNum(calories); $('#remainingValue').textContent=fmtNum(remaining); $('#calorieProgress').style.width=pct+'%'; $('#progressPercent').textContent=pct+'% от цели';
    $('#progressStatus').textContent=calories===0?'Начни свой день':remaining<0?'Цель превышена':remaining===0?'Цель выполнена':'Хороший темп';
    $('#weightValue').textContent=d.weight===''?'—':fmtNum(d.weight); $('#sleepValue').textContent=d.sleep===''?'—':fmtNum(d.sleep);
    $('#weightNote').textContent=d.weight===''?'Отслеживай динамику':'Записано за этот день'; $('#sleepNote').textContent=d.sleep===''?'Цель — 8 часов':Number(d.sleep)>=8?'Цель по сну достигнута':'До цели: '+fmtNum(8-Number(d.sleep))+' ч';
    
  }
  function refreshPageSections(){
    const progress=$('#progressContent'),history=$('#historyContent');
    if(progress)renderStats(progress);
    if(history)renderHistory(history);
  }
  function shiftDay(delta){const d=dateFromKey(currentDate);d.setDate(d.getDate()+delta);currentDate=dateKey(d);render();refreshPageSections();}
  function openEditor(type){editType=type;const config={goal:['Дневная цель','Калории в день','3500','Укажи цель в ккал.'],weight:['Записать вес','Вес в килограммах',dayData().weight||'','Например, 78.5 кг.'],sleep:['Записать сон','Часов сна',dayData().sleep||'','Можно указать дробное значение, например 7.5.'],custom:['Добавить калории','Количество ккал','','Укажи число больше нуля.']}[type];$('#dialogTitle').textContent=config[0];$('#fieldLabel').textContent=config[1];$('#fieldInput').value=config[2];$('#fieldInput').placeholder=type==='weight'?'78.5':type==='sleep'?'7.5':'0';$('#fieldInput').step=type==='weight'||type==='sleep'?'0.1':'1';$('#fieldInput').min='0';$('#fieldHint').textContent=config[3];$('#editDialog').showModal();setTimeout(()=>$('#fieldInput').focus(),100);}
  $('#editForm').addEventListener('submit',e=>{e.preventDefault();const val=Number($('#fieldInput').value);if(!Number.isFinite(val)||val<0||$('#fieldInput').value.trim()===''){toast('Введи корректное число');return;}if(editType==='goal'){if(val<=0){toast('Цель должна быть больше нуля');return;}state.goal=Math.round(val);}else if(editType==='weight'){dayData().weight=Math.round(val*10)/10;}else if(editType==='sleep'){if(val>24){toast('Сон не может быть больше 24 часов');return;}dayData().sleep=Math.round(val*10)/10;}else if(editType==='custom'){dayData().calories+=Math.round(val);}saveState();$('#editDialog').close();render();refreshPageSections();renderSettings($('#settingsContent'));toast('Данные сохранены');});
  $('#prevDay').addEventListener('click',()=>shiftDay(-1));$('#nextDay').addEventListener('click',()=>shiftDay(1));$('#todayBtn').addEventListener('click',()=>{currentDate=dateKey(new Date());render();refreshPageSections();toast('Сегодняшний день');});
  $('#editGoal').addEventListener('click',()=>openEditor('goal'));$('#editWeight').addEventListener('click',()=>openEditor('weight'));$('#editSleep').addEventListener('click',()=>openEditor('sleep'));$('#customAdd').addEventListener('click',()=>openEditor('custom'));
  $$('.add-chip[data-add]').forEach(btn=>btn.addEventListener('click',()=>{dayData().calories+=Number(btn.dataset.add);saveState();render();refreshPageSections();toast('Добавлено '+btn.dataset.add+' ккал');}));
  $('#resetCalories').addEventListener('click',()=>{if(dayData().calories===0){toast('Счётчик уже пустой');return;}if(confirm('Сбросить все калории за этот день?')){dayData().calories=0;saveState();render();refreshPageSections();toast('Калории сброшены');}});
  function renderRoulette(content){
    const armPower=game=>Math.round(playerLevelInfo().level*3+['wrist','grip','strap'].reduce((sum,slot)=>{const item=(game.inventory||[]).find(entry=>entry.instanceId===game.armEquipment?.[slot]&&entry.kind==='equipment'&&entry.slot===slot);return sum+(item?(Number(item.power)||({D:2,C:5,B:12,A:25,S:55}[item.tier]||2)):0);},0));
    if(rouletteCooldownTimer){clearInterval(rouletteCooldownTimer);rouletteCooldownTimer=null;}
    regenerateStamina();
    const game=state.game,level=playerLevelInfo(),capacity=inventoryCapacity(),currentDrop=game.lastDrop;
    const tierGlow={S:'#8e8e93',A:'#a1a1aa',B:'#0a84ff',C:'#8e8e93',D:'#636366'};
    const resultMarkup=currentDrop?'<span class="roulette-tier tier-'+String(currentDrop.tier||'D').toLowerCase()+'">'+escapeHtml(currentDrop.tier||'D')+'</span><strong>'+escapeHtml(currentDrop.name)+'</strong><div class="roulette-income">'+(currentDrop.kind==='equipment'?'🥊 +'+(Number(currentDrop.power)||0)+' к силе':currentDrop.kind==='consumable'?'🩹 +'+(Number(currentDrop.amount)||0)+' к выносливости':'💰 +'+formatIncomeRate(itemIncomeRate(currentDrop))+' / час')+'</div><small>'+escapeHtml(currentDrop.company||'Арена')+' · цена '+formatMoney(currentDrop.price)+'</small>':'<span class="roulette-tier tier-placeholder">?</span><strong>Что выпадет?</strong><div class="roulette-income">🎁 Коллекция · экипировка · расходники</div><small>Выбери кейс и попробуй удачу</small>';
    const inventoryMarkup=()=>state.game.inventory.length?'<div class="inventory-list">'+state.game.inventory.map(item=>{
      const isGear=item.kind==='equipment',isConsumable=item.kind==='consumable';
      const equipped=Object.values(state.game.armEquipment||{}).includes(item.instanceId);
      const icon=isConsumable?'🩹':isGear?({wrist:'🧤',grip:'✊',strap:'🪢'}[item.slot]||'🥊'):'💊';
      const art=isConsumable?'icons/gear-medkit.svg':isGear?({wrist:'icons/gear-wrist.svg',grip:'icons/gear-grip.svg',strap:'icons/gear-strap.svg'}[item.slot]||'icons/gear-glove.svg'):'';
      const typeLabel=isConsumable?'РАСХОДНИК':isGear?({wrist:'КИСТЬ',grip:'ХВАТ',strap:'РЕМЕНЬ'}[item.slot]||'СНАРЯЖЕНИЕ'):'КОЛЛЕКЦИЯ';
      const income=isGear||isConsumable?'':('<div class="item-income-main">+'+formatIncomeRate(itemIncomeRate(item))+' / час</div>');
      const action=isConsumable?'<button class="sell-item use-consumable" data-use-item="'+item.instanceId+'">Использовать</button>':'<button class="sell-item" data-sell-id="'+item.instanceId+'">'+(equipped?'Продать':'Продать')+'</button>';
      return '<article class="inventory-item tier-border-'+item.tier.toLowerCase()+'"><div class="inventory-item-main"><span class="inventory-rank tier-'+item.tier.toLowerCase()+'">'+icon+'</span>'+(art?'<img class="inventory-item-art" src="'+art+'" alt="" loading="lazy">':'')+'<div class="inventory-item-copy"><strong>'+escapeHtml(item.name)+'</strong><span class="item-type-label">'+typeLabel+(equipped?' · НАДЕТО':'')+'</span>'+income+'<small>'+escapeHtml(item.company||'Арена')+'</small><span class="inventory-prices">Цена '+formatMoney(item.price)+' · продажа '+formatMoney(sellValue(item))+'</span></div></div>'+action+'</article>';
    }).join('')+'</div>':'<div class="inventory-empty">🎒 Пока пусто. Открой стартовый кейс снаряжения или накопи на первый кейс.</div>';
    const selectedCase=()=>SUPPLEMENT_CASES.find(entry=>entry.id===selectedCaseId)||SUPPLEMENT_CASES.find(entry=>entry.id==='medium');
    const batchControls=()=>'<div class="batch-open-controls"><div class="batch-open-heading"><strong>Массовое открытие</strong><span>Выбери количество</span></div><div class="batch-open-options" role="group" aria-label="Количество кейсов">'+[1,3,5,10].map(count=>'<button type="button" class="batch-count'+(count===selectedOpenCount?' is-selected':'')+'" data-open-count="'+count+'" aria-pressed="'+(selectedOpenCount===1&&count===1)+'" '+(selectedCase().id==='starter'&&count!==1?'disabled':'')+'>'+count+'×</button>').join('')+'</div><div class="batch-total"><span>Стоимость открытия</span><strong id="batchTotalCost">'+formatMoney(selectedCase().price*selectedOpenCount)+'</strong></div><p class="batch-debt-note">Открытие доступно только при достаточном балансе. Первый стартовый бокс бесплатный.</p></div>';
    const dailyRewardSchedule=[{type:'money',amount:75,label:'+75'},{type:'item',tier:'D',amount:0,label:'Предмет D-ранга'},{type:'money',amount:120,label:'+120'},{type:'item',tier:'C',amount:0,label:'Предмет C-ранга'},{type:'money',amount:180,label:'+180'},{type:'mixed',amount:250,tier:'D',label:'+250 и предмет D'},{type:'mixed',amount:400,tier:'C',label:'+400 и предмет C'}];
    const dayOrdinal=key=>{const parts=String(key||'').split('-').map(Number);return parts.length===3&&parts.every(Number.isFinite)?Math.floor(Date.UTC(parts[0],parts[1]-1,parts[2])/86400000):0;};
    const dailyRewardForToday=()=>{const today=dateKey(new Date()),last=game.lastDailyClaimDate||'',streak=Number(game.dailyStreak)||0,day=last===today?Math.max(1,streak):last&&dayOrdinal(today)-dayOrdinal(last)===1?(streak%7)+1:1;return {today,last,day,reward:dailyRewardSchedule[day-1],claimed:last===today};};
    const dailyRewardMarkup=()=>{const info=dailyRewardForToday();return '<button type="button" class="daily-reward-launcher" id="dailyRewardsOpen"><span class="daily-launcher-icon">✦</span><span class="daily-launcher-copy"><strong>Ежедневные награды</strong><small>'+(info.claimed?'Получено сегодня · серия '+(game.dailyStreak||1)+'/7':'День '+info.day+' из 7 · забери бонус')+'</small></span><span class="daily-launcher-action">'+(info.claimed?'✓':'Открыть')+'</span></button>';};
    const dailyRewardDialogMarkup=()=>{const info=dailyRewardForToday();return '<dialog class="daily-rewards-dialog" id="dailyRewardsDialog" aria-labelledby="dailyRewardsTitle"><div class="daily-dialog-head"><div><span class="eyebrow">СЕРИЯ ВХОДОВ · 7 ДНЕЙ</span><h2 id="dailyRewardsTitle">Ежедневные награды</h2></div><button type="button" class="daily-dialog-close" id="dailyRewardsClose" aria-label="Закрыть">×</button></div><p class="daily-dialog-subtitle">Каждый день открывает следующий бонус. Пропуск дня сбрасывает серию.</p><div class="daily-reward-days">'+dailyRewardSchedule.map((reward,index)=>{const day=index+1,claimed=info.claimed?day<=(game.dailyStreak||1):day<info.day;return '<article class="daily-day-row '+(day===info.day?'is-current':'')+' '+(claimed?'is-claimed':'')+'"><span class="daily-day-number">'+(claimed?'✓':day)+'</span><div class="daily-day-copy"><strong>День '+day+'</strong><small>'+escapeHtml(reward.type==='item'?'Случайный предмет '+reward.tier+'-ранга':reward.type==='mixed'?'Деньги и предмет '+reward.tier+'-ранга':'Денежный бонус')+'</small></div><b>'+escapeHtml(reward.label)+'</b></article>';}).join('')+'</div><button type="button" class="primary-button full-width" id="claimDailyReward" '+(info.claimed?'disabled':'')+'>'+(info.claimed?'Уже получено сегодня':'Забрать награду дня '+info.day)+'</button><small class="daily-dialog-footnote">Награда выдаётся один раз в календарный день.</small></dialog>';};
    const caseGroup=(title,entries)=>'<section class="case-group"><div class="case-group-title">'+title+'</div><div class="case-selector" role="group" aria-label="'+title+'">'+entries.map(entry=>'<button type="button" class="case-choice'+(entry.id===selectedCaseId?' is-selected':'')+'" data-case-id="'+entry.id+'" aria-pressed="'+(entry.id===selectedCaseId)+'"><span class="case-choice-icon" aria-hidden="true">'+({starter:'📦',forbidden:'🏁',medium:'🏙️',useless:'🗃️'}[entry.id]||'🚘')+'</span><span class="case-choice-copy"><span class="case-choice-name">'+escapeHtml(entry.name)+'</span><span class="case-choice-subtitle">'+escapeHtml(entry.subtitle)+'</span></span><span class="case-choice-price">'+(entry.price===0?'Бесплатно':formatMoney(entry.price))+'</span><span class="case-choice-check" aria-hidden="true">✓</span></button>').join('')+'</div></section>';
    const caseButtons=()=>'<details class="game-collapsible supplement-cases-collapsible"><summary><span><small>КОЛЛЕКЦИЯ КЕЙСОВ</small><strong>📦 Выбрать кейс</strong></span><span class="game-collapsible-meta" id="selectedCaseSummary">'+escapeHtml(selectedCase().name)+'</span></summary><div class="game-collapsible-body"><div class="case-picker-heading"><span>ВЫБОР КЕЙСА</span><button type="button" class="case-info-button" id="openCaseOdds" aria-label="Показать шансы" title="Что внутри">i</button></div><div class="case-odds-sheet" id="caseOddsSheet" hidden><div class="case-odds-sheet-head"><strong>Что внутри</strong><button type="button" class="case-info-close" id="closeCaseOdds" aria-label="Закрыть">×</button></div><div class="case-odds-active-name" id="caseOddsActiveName"></div><div id="caseOdds" aria-live="polite">'+tierOddsMarkup(SUPPLEMENT_CASES.find(entry=>entry.id===selectedCaseId)||SUPPLEMENT_CASES[1])+'</div></div>'+caseGroup('СТАРТ И БАЗОВЫЕ',SUPPLEMENT_CASES.slice(0,4))+caseGroup('КОЛЛЕКЦИИ',SUPPLEMENT_CASES.slice(4))+batchControls()+'</div></details>';
    const craftMarkup=()=>{
      const currentLevel=playerLevelInfo().level;
      if(currentLevel<2)return '<section class="card crafting-panel crafting-locked" id="craftingPanel"><div class="inventory-heading"><div><span class="eyebrow">МАСТЕРСКАЯ</span><h2>Крафт предметов</h2></div><span class="craft-lock">LVL 2</span></div><p>Объединяй три одинаковых предмета в один более редкий. Мастерская откроется со второго уровня.</p><div class="craft-progress"><span style="width:50%"></span></div></section>';
      const groups=new Map();state.game.inventory.forEach(item=>{const id=String(item.key)+'|'+String(item.tier);if(!groups.has(id))groups.set(id,{key:item.key,tier:item.tier,name:item.name,company:item.company,count:0});groups.get(id).count++;});
      const rows=[...groups.values()].filter(group=>group.tier!=='S');
      if(!rows.length)return '<section class="card crafting-panel" id="craftingPanel"><div class="inventory-heading"><div><span class="eyebrow">МАСТЕРСКАЯ · LVL 2+</span><h2>Крафт предметов</h2></div><span class="craft-lock">3 → 1</span></div><p>Три одинаковых предмета превращаются в один более редкий. Иногда можно перепрыгнуть через ранг.</p><div class="inventory-empty">Пока нечего улучшать. Собери три одинаковых предмета.</div></section>';
      return '<section class="card crafting-panel" id="craftingPanel"><div class="inventory-heading"><div><span class="eyebrow">МАСТЕРСКАЯ · LVL 2+</span><h2>Крафт предметов</h2></div><span class="craft-lock">3 → 1</span></div><p>Три одинаковых предмета превращаются в один более редкий. Для рангов D и C есть 15% шанс на дополнительное повышение.</p><div class="crafting-list">'+rows.map(group=>'<article class="crafting-item tier-border-'+group.tier.toLowerCase()+'"><div class="crafting-item-info"><span class="inventory-rank tier-'+group.tier.toLowerCase()+'">'+group.tier+'</span><div><strong>'+escapeHtml(group.name)+'</strong><small>'+escapeHtml(group.company)+'</small><span class="craft-count">'+group.count+' / 3 предмета</span></div></div><button class="craft-button" data-craft-key="'+escapeHtml(group.key)+'" '+(group.count<3?'disabled':'')+'>'+(group.count<3?'Ещё '+(3-group.count):'Скрафтить')+'</button></article>').join('')+'</div></section>';
    };
    const gearOddsMarkup=entry=>['S','A','B','C','D'].filter(tier=>(entry.tierOdds[tier]||0)>0).map(tier=>'<span class="tier-chip tier-'+tier.toLowerCase()+'"><b>'+tier+'</b> '+chanceLabel(entry.tierOdds[tier])+'</span>').join('');
    const gearWorkshopMarkup=()=>'<details class="game-collapsible gear-collapsible"><summary><span><small>АРСЕНАЛ · СНАРЯЖЕНИЕ</small><strong>🧤 Экипировка и бинты</strong></span><span class="game-collapsible-meta">'+state.game.inventory.filter(item=>item.kind==='equipment'||item.kind==='consumable').length+' предметов</span></summary><div class="game-collapsible-body"><p class="gear-intro">Собирай комплект под свой стиль. Каждый предмет подходит только к своему слоту. Бинты восстанавливают выносливость после боёв.</p><div class="gear-case-grid">'+GEAR_CASES.map(entry=>'<button type="button" class="gear-case-card '+(entry.id===selectedGearCaseId?'is-selected':'')+'" data-gear-case="'+entry.id+'" aria-pressed="'+(entry.id===selectedGearCaseId)+'"><span class="gear-case-art"><img src="'+(entry.pool==='consumable'?'icons/gear-medkit.svg':entry.id==='gear-starter'?'icons/gear-wrist.svg':entry.id==='gear-pro'?'icons/gear-grip.svg':entry.id==='gear-elite'?'icons/gear-strap.svg':'icons/gear-glove.svg')+'" alt="" loading="lazy"></span><span class="gear-case-name">'+escapeHtml(entry.name)+'</span><small>'+escapeHtml(entry.subtitle)+'</small><strong>'+formatMoney(entry.price)+'</strong></button>').join('')+'</div><div class="gear-odds" id="gearOdds">'+gearOddsMarkup(GEAR_CASES.find(entry=>entry.id===selectedGearCaseId)||GEAR_CASES[0])+'</div><div class="gear-open-row"><span>Выбран кейс: <strong id="gearSelectedName">'+escapeHtml((GEAR_CASES.find(entry=>entry.id===selectedGearCaseId)||GEAR_CASES[0]).name)+'</strong></span><button type="button" class="primary-button" id="openGearCase">📦 Открыть кейс</button></div><p class="gear-note">🎲 Предметы случайны. Экипировка не увеличивает пассивный доход — она усиливает бой.</p></div></details>';
    const batchResultsMarkup=()=>{const drops=state.game.pendingDrops||[];if(!drops.length)return '';return '<section class="batch-results"><div class="batch-results-heading"><div><span class="eyebrow">РЕЗУЛЬТАТ ОТКРЫТИЯ</span><h3>Выпало '+drops.length+' '+plural(drops.length,'предмет','предмета','предметов')+'</h3></div><span class="batch-results-total">'+formatMoney(drops.reduce((sum,item)=>sum+item.price,0))+'</span></div><div class="batch-drop-grid">'+drops.map(item=>'<article class="batch-drop tier-border-'+item.tier.toLowerCase()+'"><span class="inventory-rank tier-'+item.tier.toLowerCase()+'">'+item.tier+'</span><div class="batch-drop-copy"><strong>'+escapeHtml(item.name)+'</strong><b>+'+formatIncomeRate(itemIncomeRate(item))+' / час</b><small>'+escapeHtml(item.company)+'</small><span>Цена '+formatMoney(item.price)+' · продажа '+formatMoney(sellValue(item))+'</span></div></article>').join('')+'</div><div class="batch-result-actions"><button type="button" class="secondary-button" data-batch-action="sell">Продать все · '+formatMoney(drops.reduce((sum,item)=>sum+sellValue(item),0))+'</button><button type="button" class="primary-button" data-batch-action="keep">Оставить лучшие</button></div><p class="batch-result-note">Если места не хватит, останутся предметы с более высоким рангом. Остальные автоматически продадутся за половину цены.</p></section>';};
    content.innerHTML='<section class="arena-hero"><img class="arena-hero-art" src="icons/arena-banner.svg" alt="Иллюстрация арены армрестлинга"><div class="arena-hero-copy"><span class="arena-season">🥊 KAIRO ARENA · SEASON 01</span><h1>Арена начинается здесь</h1><p>Собирай экипировку. Восстанавливай силы. Забирай победы.</p><div class="arena-hero-tags"><span>🧤 Экипировка</span><span>🏆 Победы</span><span>🩹 Восстановление</span></div><button type="button" class="arena-hero-cta" id="jumpToArmArena">⚔️ К поединку</button></div></section><section class="game-wallet"><div class="wallet-balance"><span class="eyebrow">ТВОЙ БАЛАНС</span><strong><span id="gameMoney">'+formatMoney(game.money)+'</span></strong><div class="wallet-income"><span>Пассивный доход</span><strong id="gameIncomeRate">+'+formatIncomeRate(passiveIncomePerHour())+' / час</strong></div></div><div class="wallet-meta"><span id="walletLevel">Уровень '+level.level+'</span><span id="inventoryCount">'+game.inventory.length+' / '+capacity+' ячеек</span></div><div class="wallet-xp-track"><i id="walletXpFill" style="width:'+Math.min(100,Math.round(level.xpIntoLevel/level.xpNeeded*100))+'%"></i></div><div class="wallet-xp-copy"><span id="walletXpText">'+fmtNum(level.xpIntoLevel)+' / '+fmtNum(level.xpNeeded)+' XP</span><span>+1 ячейка за уровень</span></div></section><div class="game-floating-balance" id="gameFloatingBalance"><span>Баланс</span><strong id="floatingGameMoney">'+formatMoney(game.money)+'</strong><small id="floatingGameIncome">+'+formatIncomeRate(passiveIncomePerHour())+' / час</small></div>'+
      dailyRewardMarkup()+dailyRewardDialogMarkup()+'<section class="roulette-hero card"><span class="eyebrow">ИГРОВАЯ ЭКОНОМИКА</span><h2>Рулетка спортпита</h2><p>Выбери кейс и количество открытий. После прокрутки можно продать весь дроп или оставить самые редкие предметы.</p>'+caseButtons()+'<div class="roulette-stage" id="rouletteStage"><div class="roulette-sheen"></div><div class="roulette-reel-window" id="rouletteReelWindow" aria-label="Лента выпадающих предметов"><div class="roulette-reel-track" id="rouletteReelTrack"></div><span class="roulette-center-marker" aria-hidden="true"><i></i></span></div><div class="roulette-result" id="rouletteResult" aria-live="polite">'+resultMarkup+'</div><span class="roulette-status" id="rouletteStatus">ГОТОВ К ПРОКРУТКЕ</span></div><button class="primary-button full-width" id="spinRoulette">Открыть ×'+selectedOpenCount+' · '+formatMoney(selectedCase().price*selectedOpenCount)+'</button><div id="batchResults">'+batchResultsMarkup()+'</div></section>'+
      gearWorkshopMarkup()+ '<details class="game-collapsible inventory-collapsible"><summary><span><small>ТВОИ ПРЕДМЕТЫ</small><strong>Инвентарь</strong></span><span class="game-collapsible-meta" id="inventoryCapacity">'+game.inventory.length+' / '+capacity+'</span></summary><div class="game-collapsible-body"><div id="inventoryContents">'+inventoryMarkup()+'</div></div></details>'+ '<section class="arm-arena card" id="armArena"><div class="arm-arena-heading"><div><span class="eyebrow">СИЛА · ТЕХНИКА · ЭКИПИРОВКА</span><h3>Армрестлинг</h3></div><span class="arm-record">'+game.armWins+'–'+game.armLosses+'</span></div><p class="arm-arena-intro">Экипируй выбитые предметы, собери силу хвата и выходи на поединок. Экипировка остаётся в инвентаре и её можно снять в любой момент.</p><div class="arm-slots">'+[['wrist','Кисть'],['grip','Хват'],['strap','Ремень']].map(([slot,label])=>{const equipped=game.inventory.find(item=>item.instanceId===game.armEquipment[slot]);return '<label class="arm-slot"><span class="arm-slot-icon">'+({wrist:'✊',grip:'握',strap:'↔'}[slot])+'</span><span class="arm-slot-copy"><strong>'+label+'</strong><small>'+(equipped?escapeHtml(equipped.name)+' · ранг '+equipped.tier:'Ячейка свободна')+'</small></span><select data-arm-slot="'+slot+'" aria-label="Экипировка: '+label+'"><option value="">Пусто</option>'+game.inventory.filter(item=>item.kind==='equipment'&&item.slot===slot).map(item=>'<option value="'+item.instanceId+'" '+(equipped&&equipped.instanceId===item.instanceId?'selected':'')+'>'+escapeHtml(item.name)+' · '+item.tier+'</option>').join('')+'</select></label>';}).join('')+'</div><div class="arm-stamina-line"><span>⚡ Выносливость</span><strong id="armStamina">'+game.stamina+'/100</strong><div class="arm-stamina-track"><i style="width:'+game.stamina+'%"></i></div><small>Восстановление: 1 пункт за 6 минут · бой стоит 25</small></div><div class="arm-power-line"><span>Твоя сила</span><strong id="armPower">'+armPower(game)+'</strong></div><div class="arm-arena-versus"><div><span class="arm-fighter">YOU</span><strong>Ты</strong><small>Экипировка + уровень</small></div><span class="arm-vs">VS</span><div><span class="arm-fighter opponent">AI</span><strong>Соперник</strong><small>Сила меняется каждый бой</small></div></div><button type="button" class="primary-button full-width" id="armFightButton">Выйти на поединок</button>'+(game.lastArmMatch?'<div class="arm-last-match '+(game.lastArmMatch.result==='win'?'won':'lost')+'"><strong>'+(game.lastArmMatch.result==='win'?'Победа':'Поражение')+'</strong><span>Сила '+game.lastArmMatch.power+' против '+game.lastArmMatch.opponentPower+' · '+(game.lastArmMatch.result==='win'?'Награда '+formatMoney(game.lastArmMatch.reward):'Попробуй сменить экипировку')+'</span></div>':'')+'</section>'+'<details class="game-collapsible crafting-collapsible"><summary><span><small>УЛУЧШЕНИЕ ПРЕДМЕТОВ</small><strong>Мастерская</strong></span><span class="game-collapsible-meta">3 → 1</span></summary><div class="game-collapsible-body" id="craftingDetails">'+craftMarkup()+'</div></details>'+
      '<details class="tier-details"><summary>Каталог предметов <span>Название · цена</span></summary><section class="tier-list">'+['S','A','B','C','D'].map(tier=>'<div class="tier-row tier-'+tier.toLowerCase()+'"><span class="tier-label tier-'+tier.toLowerCase()+'">'+tier+'</span><div class="tier-items">'+GAME_ITEMS.filter(item=>item.tier===tier).map(item=>'<div class="tier-item"><div class="catalogue-item-title"><strong>'+escapeHtml(item.name)+'</strong><b>'+formatMoney(item.price)+'</b></div><small>'+escapeHtml(item.company)+'</small></div>').join('')+'</div></div>').join('')+'</section></details>';
    const button=$('#spinRoulette',content),result=$('#rouletteResult',content),stage=$('#rouletteStage',content),status=$('#rouletteStatus',content);
    const setDropGlow=tier=>stage.style.setProperty('--drop-glow',tierGlow[tier]||'#8e8e93');setDropGlow(currentDrop&&currentDrop.tier||'D');if(currentDrop)stage.classList.add('has-result');
    const updateButton=()=>{if(!button.isConnected)return;const remaining=Math.max(0,2000-(Date.now()-state.game.lastSpinAt)),cost=selectedCase().price*selectedOpenCount,isStarter=selectedCase().id==='starter';if(rouletteIsSpinning){button.disabled=true;button.textContent='Крутится…';return;}if((state.game.pendingDrops||[]).length){button.disabled=true;button.textContent='Сначала разбери дроп';return;}if(isStarter&&state.game.starterBoxClaimed){button.disabled=true;button.textContent='Стартовый бокс уже получен';return;}if(state.game.money<cost){button.disabled=true;button.textContent='Не хватает денег · '+formatMoney(cost);return;}if(remaining>0){button.disabled=true;button.textContent='Перезарядка '+Math.ceil(remaining/1000)+' с';return;}button.disabled=false;button.textContent=isStarter?'Забрать бесплатный бокс':'Открыть ×'+selectedOpenCount+' · '+formatMoney(cost);};
    const refreshWallet=()=>{const info=playerLevelInfo(),cap=inventoryCapacity(),money=$('#gameMoney',content),walletLevel=$('#walletLevel',content),count=$('#inventoryCount',content),capNode=$('#inventoryCapacity',content),xpFill=$('#walletXpFill',content),xpText=$('#walletXpText',content),income=$('#gameIncomeRate',content),floatingMoney=$('#floatingGameMoney',content),floatingIncome=$('#floatingGameIncome',content);if(money)money.textContent=formatMoney(state.game.money);if(floatingMoney)floatingMoney.textContent=formatMoney(state.game.money);if(floatingIncome)floatingIncome.textContent='+'+formatIncomeRate(passiveIncomePerHour())+' / час';if(income)income.textContent='+'+formatIncomeRate(passiveIncomePerHour())+' / час';if(walletLevel)walletLevel.textContent='Уровень '+info.level;if(count)count.textContent=state.game.inventory.length+' / '+cap+' ячеек';if(capNode)capNode.textContent=state.game.inventory.length+' / '+cap;if(xpFill)xpFill.style.width=Math.min(100,Math.round(info.xpIntoLevel/info.xpNeeded*100))+'%';if(xpText)xpText.textContent=fmtNum(info.xpIntoLevel)+' / '+fmtNum(info.xpNeeded)+' XP';};
    const bindOddsSheet=()=>{const sheet=$('#caseOddsSheet',content);const open=$('#openCaseOdds',content);const close=$('#closeCaseOdds',content);const refresh=()=>{const entry=selectedCase();const name=$('#caseOddsActiveName',content);const odds=$('#caseOdds',content);if(name)name.textContent=entry.name;if(odds)odds.innerHTML=tierOddsMarkup(entry);};open?.addEventListener('click',()=>{refresh();if(sheet)sheet.hidden=false;triggerHaptic('light');});close?.addEventListener('click',()=>{if(sheet)sheet.hidden=true;});};
    const bindCaseButtons=()=>$$('[data-case-id]',content).forEach(node=>node.addEventListener('click',()=>{if(rouletteIsSpinning||(state.game.pendingDrops||[]).length)return;selectedCaseId=node.dataset.caseId;if(selectedCaseId==='starter')selectedOpenCount=1;const selectedLabel=$('#selectedCaseSummary',content);if(selectedLabel)selectedLabel.textContent=selectedCase().name;triggerHaptic('selection');$$('[data-case-id]',content).forEach(btn=>{const active=btn.dataset.caseId===selectedCaseId;btn.classList.toggle('is-selected',active);btn.setAttribute('aria-pressed',String(active));});const activeCase=selectedCase();const oddsNode=$('#caseOdds',content);if(oddsNode)oddsNode.innerHTML=tierOddsMarkup(activeCase);const oddsName=$('#caseOddsActiveName',content);if(oddsName)oddsName.textContent=activeCase.name;const total=$('#batchTotalCost',content);if(total)total.textContent=formatMoney(activeCase.price*selectedOpenCount);$$('[data-open-count]',content).forEach(btn=>{const count=Number(btn.dataset.openCount);btn.classList.toggle('is-selected',count===selectedOpenCount);btn.disabled=activeCase.id==='starter'&&count!==1;btn.setAttribute('aria-pressed',String(count===selectedOpenCount));});updateButton();}));
    const bindOpenCountButtons=()=>$$('[data-open-count]',content).forEach(node=>node.addEventListener('click',()=>{if(rouletteIsSpinning||(state.game.pendingDrops||[]).length||selectedCase().id==='starter')return;selectedOpenCount=Number(node.dataset.openCount)||1;$$('[data-open-count]',content).forEach(btn=>{const active=Number(btn.dataset.openCount)===selectedOpenCount;btn.classList.toggle('is-selected',active);btn.setAttribute('aria-pressed',String(active));});const total=$('#batchTotalCost',content);if(total)total.textContent=formatMoney(selectedCase().price*selectedOpenCount);triggerHaptic('selection');updateButton();}));
    const bindBatchButtons=()=>$$('[data-batch-action]',content).forEach(node=>node.addEventListener('click',()=>{if(rouletteIsSpinning)return;const drops=state.game.pendingDrops||[];if(!drops.length)return;if(node.dataset.batchAction==='sell'){const total=drops.reduce((sum,item)=>sum+sellValue(item),0);state.game.money+=total;state.game.pendingDrops=[];markGameChanged();refreshBatchResults();refreshWallet();updateButton();triggerHaptic('impact','light');toast('Продано '+drops.length+' предметов за '+formatMoney(total));return;}const capacity=inventoryCapacity(),rarity={S:5,A:4,B:3,C:2,D:1};const combined=[...state.game.inventory,...drops].sort((a,b)=>(rarity[b.tier]||0)-(rarity[a.tier]||0)||Number(b.price||0)-Number(a.price||0)||Number(a.acquiredAt||0)-Number(b.acquiredAt||0));const kept=combined.slice(0,capacity),overflow=combined.slice(capacity),autoSold=overflow.reduce((sum,item)=>sum+sellValue(item),0);state.game.inventory=kept;state.game.money+=autoSold;state.game.pendingDrops=[];markGameChanged();refreshInventoryAndCraft();refreshBatchResults();triggerHaptic('notification','success');toast('Оставлено '+kept.length+' предметов'+(overflow.length?' · автоматически продано '+overflow.length+' за '+formatMoney(autoSold):''));}));
    const bindArmWrestling=()=>{
      $('[data-arm-slot]',content).forEach(node=>node.addEventListener('change',()=>{
        if(rouletteIsSpinning)return;
        const slot=node.dataset.armSlot,id=Number(node.value);
        if(id&&['wrist','grip','strap'].some(other=>other!==slot&&state.game.armEquipment[other]===id)){toast('Этот предмет уже надет в другом слоте');renderRoulette(content);return;}
        const item=state.game.inventory.find(entry=>entry.instanceId===id&&entry.kind==='equipment'&&entry.slot===slot);
        state.game.armEquipment[slot]=item?id:null;
        markGameChanged();renderRoulette(content);toast('🧤 Экипировка обновлена');
      }));
      const fight=$('#armFightButton',content);
      fight?.addEventListener('click',()=>{
        if(rouletteIsSpinning)return;
        const stamina=Number(state.game.stamina)||0;
        if(stamina<25){toast('🥵 Мало выносливости. Отдохни или используй бинты.');return;}
        regenerateStamina();
        const staminaNow=Number(state.game.stamina)||0;
        if(staminaNow<25){toast('🥵 Мало выносливости. Отдохни или используй бинты.');return;}
        const power=armPower(state.game),level=playerLevelInfo().level;
        const opponentPower=Math.max(3,Math.round(level*3+Math.random()*(6+Math.min(6,level))+1));
        const win=power>=opponentPower,reward=win?Math.round(35+level*12+opponentPower*4):0;
        state.game.stamina=Math.max(0,stamina-25);state.game.lastStaminaAt=Date.now();
        state.game.lastArmMatch={result:win?'win':'loss',power,opponentPower,reward,at:Date.now()};
        if(win){state.game.money+=reward;state.game.xp+=8+Math.min(12,level);state.game.armWins++;}
        else{state.game.armLosses++;state.game.xp+=3;}
        markGameChanged();renderRoulette(content);triggerHaptic('notification',win?'success':'warning');
        toast(win?'🏆 Победа! +'+formatMoney(reward)+' · '+(8+Math.min(12,level))+' XP':'🥊 Поражение. +3 XP · выносливость −25');
      });
    };
    const bindSellButtons=()=>$$('[data-sell-id]',content).forEach(node=>node.addEventListener('click',()=>{if(rouletteIsSpinning)return;const index=state.game.inventory.findIndex(item=>String(item.instanceId)===node.dataset.sellId);if(index<0)return;const item=state.game.inventory[index],oldLevel=playerLevelInfo().level,soldFor=sellValue(item);triggerHaptic('impact','light');state.game.money+=soldFor;state.game.xp+=3;state.game.inventory.splice(index,1);for(const slot of ['wrist','grip','strap'])if(state.game.armEquipment[slot]===item.instanceId)state.game.armEquipment[slot]=null;markGameChanged();renderRoulette(content);const newLevel=playerLevelInfo().level;toast(newLevel>oldLevel?'Уровень '+newLevel+'! Открыта новая ячейка.':'Продано за '+formatMoney(soldFor)+' · +3 XP');}));
    const bindCraftButtons=()=>$$('[data-craft-key]',content).forEach(node=>node.addEventListener('click',()=>{if(rouletteIsSpinning)return;if(playerLevelInfo().level<2){toast('Мастерская откроется со второго уровня');return;}const key=node.dataset.craftKey,matching=state.game.inventory.filter(item=>item.key===key);if(matching.length<3){toast('Нужно три одинаковых предмета');return;}const source=matching[0],tier=source.tier,outcomes={D:{normal:'C',rare:'B',chance:.15},C:{normal:'B',rare:'A',chance:.15},B:{normal:'A',rare:'S',chance:.08},A:{normal:'S',rare:'S',chance:0}},outcome=outcomes[tier];if(!outcome){toast('У этого предмета максимальный ранг');return;}const targetTier=Math.random()<outcome.chance?outcome.rare:outcome.normal,family=String(source.key).split('-')[0],sameFamily=GAME_ITEMS.filter(item=>item.tier===targetTier&&String(item.key).split('-')[0]===family),candidates=sameFamily.length?sameFamily:GAME_ITEMS.filter(item=>item.tier===targetTier),template=candidates[Math.floor(Math.random()*candidates.length)],crafted={...template,price:fixedPrice(template),instanceId:state.game.nextItemId++,acquiredAt:Date.now(),crafted:true};let removed=0;const removedIds=new Set();state.game.inventory=state.game.inventory.filter(item=>{if(item.key===key&&item.tier===tier&&removed<3){removed++;removedIds.add(item.instanceId);return false;}return true;});for(const slot of ['wrist','grip','strap'])if(removedIds.has(state.game.armEquipment[slot]))state.game.armEquipment[slot]=null;state.game.inventory.push(crafted);state.game.lastDrop={...crafted};state.game.xp+=10;triggerHaptic('notification','success');markGameChanged();renderRoulette(content);toast('Крафт завершён: ранг '+tier+' → '+targetTier+' · +25 XP');}));
    const refreshInventoryAndCraft=()=>{const inventoryNode=$('#inventoryContents',content);if(inventoryNode)inventoryNode.innerHTML=inventoryMarkup();const panel=$('#craftingDetails',content);if(panel)panel.innerHTML=craftMarkup();bindSellButtons();bindCraftButtons();refreshWallet();updateButton();};
    const refreshBatchResults=()=>{const node=$('#batchResults',content);if(node)node.innerHTML=batchResultsMarkup();bindBatchButtons();};
    const bindGearWorkshop=()=>{
      $('[data-gear-case]',content).forEach(node=>node.addEventListener('click',()=>{
        if(rouletteIsSpinning||(state.game.pendingDrops||[]).length)return;
        selectedGearCaseId=node.dataset.gearCase;
        $('[data-gear-case]',content).forEach(button=>{const active=button.dataset.gearCase===selectedGearCaseId;button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active));});
        const entry=GEAR_CASES.find(item=>item.id===selectedGearCaseId)||GEAR_CASES[0],label=$('#gearSelectedName',content),open=$('#openGearCase',content),oddsNode=$('#gearOdds',content);if(oddsNode)oddsNode.innerHTML=gearOddsMarkup(entry);
        if(label)label.textContent=entry.name;
        if(open){open.disabled=state.game.money<entry.price;open.textContent=state.game.money<entry.price?'Не хватает монет':'📦 Открыть за '+formatMoney(entry.price);}
        triggerHaptic('selection');
      }));
      const open=$('#openGearCase',content);
      if(open)open.addEventListener('click',()=>{
        if(rouletteIsSpinning||(state.game.pendingDrops||[]).length)return;
        const entry=GEAR_CASES.find(item=>item.id===selectedGearCaseId)||GEAR_CASES[0];
        if(state.game.money<entry.price){toast('Не хватает монет на этот кейс');return;}
        if(state.game.inventory.length>=inventoryCapacity()){toast('Инвентарь заполнен. Продай предметы или получи следующий уровень.');return;}
        state.game.money-=entry.price;
        const template=pickGearItem(entry.id);
        const item={...template,price:fixedPrice(template),instanceId:state.game.nextItemId++,acquiredAt:Date.now()};
        state.game.inventory.push(item);state.game.lastDrop={...item};state.game.xp+=2;
        markGameChanged();triggerHaptic('notification','success');renderRoulette(content);
        toast('🎉 Выпало: '+item.name+' · '+item.tier+'-ранг');
      });
      $('[data-use-item]',content).forEach(node=>node.addEventListener('click',()=>{
        if(rouletteIsSpinning)return;
        const id=Number(node.dataset.useItem),index=state.game.inventory.findIndex(item=>item.instanceId===id&&item.kind==='consumable');
        if(index<0)return;
        const item=state.game.inventory[index],before=Number(state.game.stamina)||0;
        if(before>=100){toast('Выносливость уже полная');return;}
        state.game.stamina=Math.min(100,before+Math.max(1,Number(item.amount)||35));
        state.game.inventory.splice(index,1);markGameChanged();renderRoulette(content);
        toast('🩹 Выносливость восстановлена: '+before+' → '+state.game.stamina);
      }));
    };
    $('#jumpToArmArena',content)?.addEventListener('click',()=>$('#armArena',content)?.scrollIntoView({behavior:'smooth',block:'start'}));
    bindGearWorkshop();bindCaseButtons();bindOddsSheet();bindOpenCountButtons();bindArmWrestling();bindSellButtons();bindCraftButtons();bindBatchButtons();
    gameUiRefresh=()=>{refreshWallet();updateButton();};
    const rewardsDialog=$('#dailyRewardsDialog',content),openRewards=$('#dailyRewardsOpen',content),closeRewards=$('#dailyRewardsClose',content);if(openRewards&&rewardsDialog)openRewards.addEventListener('click',()=>{if(typeof rewardsDialog.showModal==='function')rewardsDialog.showModal();else rewardsDialog.setAttribute('open','');triggerHaptic('selection');});if(closeRewards&&rewardsDialog)closeRewards.addEventListener('click',()=>rewardsDialog.close());if(rewardsDialog)rewardsDialog.addEventListener('click',event=>{if(event.target===rewardsDialog)rewardsDialog.close();});
    const claimDailyButton=$('#claimDailyReward',content);if(claimDailyButton)claimDailyButton.addEventListener('click',()=>{const info=dailyRewardForToday();if(info.claimed){toast('Ежедневная награда уже получена');return;}const reward=info.reward;let message='';if(reward.type==='money'||reward.type==='mixed'){state.game.money+=reward.amount;message='+'+formatMoney(reward.amount);}if(reward.tier){const pool=GAME_ITEMS.filter(item=>item.tier===reward.tier),template=pool[Math.floor(Math.random()*pool.length)]||GAME_ITEMS[0],gift={...template,instanceId:state.game.nextItemId++,price:fixedPrice(template),acquiredAt:Date.now(),dailyReward:true};if(state.game.inventory.length<inventoryCapacity()){state.game.inventory.push(gift);message+=(message?' · ':'')+'предмет '+gift.tier+'-ранга';}else{const sold=sellValue(gift);state.game.money+=sold;message+=(message?' · ':'')+'предмет продан из-за заполненного инвентаря: '+formatMoney(sold);}}state.game.lastDailyClaimDate=info.today;state.game.dailyStreak=info.day;state.game.xp+=Math.max(2,info.day);markGameChanged();renderRoulette(content);triggerHaptic('notification','success');toast('🎁 Награда получена: '+message+' · +'+Math.max(2,info.day)+' XP');});
    updateButton();
    if(Date.now()-game.lastSpinAt<2000)rouletteCooldownTimer=setInterval(()=>{updateButton();if(Date.now()-state.game.lastSpinAt>=2000){clearInterval(rouletteCooldownTimer);rouletteCooldownTimer=null;updateButton();}},200);
    button.addEventListener('click',()=>{
      const now=Date.now();
      if(rouletteIsSpinning||(state.game.pendingDrops||[]).length)return;
      if(now-state.game.lastSpinAt<2000){updateButton();return;}
      const activeCase=selectedCase(),count=activeCase.id==='starter'?1:selectedOpenCount,totalCost=activeCase.price*count;
      if(activeCase.id==='starter'&&state.game.starterBoxClaimed){toast('Бесплатный стартовый бокс уже получен');updateButton();return;}
      if(state.game.money<totalCost){toast('Недостаточно средств. Нужно '+formatMoney(totalCost));updateButton();return;}
      const oldLevel=playerLevelInfo().level;
      triggerHaptic('impact','medium');
      state.game.money-=totalCost;
      if(activeCase.id==='starter')state.game.starterBoxClaimed=true;
      state.game.lastSpinAt=now;
      state.game.xp+=2*count;
      const drops=Array.from({length:count},()=>{const baseItem=pickGameItem(activeCase.id),item={...baseItem,price:fixedPrice(baseItem)};return {...item,instanceId:state.game.nextItemId++,acquiredAt:now};});
      state.game.pendingDrops=drops;
      const item=drops[drops.length-1];
      state.game.lastDrop={...item};
      markGameChanged();
      rouletteIsSpinning=true;
      stage.classList.add('is-spinning');
      stage.classList.remove('has-result');
      result.classList.remove('is-revealed','roulette-pop');
      status.textContent='ЛЕНТА ЗАПУЩЕНА';
      updateButton();
      refreshWallet();
      const reelWindow=$('#rouletteReelWindow',content),track=$('#rouletteReelTrack',content);
      if(!reelWindow||!track){rouletteIsSpinning=false;stage.classList.remove('is-spinning');updateButton();return;}
      if(rouletteAnimationTimer)clearTimeout(rouletteAnimationTimer);
      if(rouletteReelAnimation){rouletteReelAnimation.cancel();rouletteReelAnimation=null;}
      const targetIndex=38,startIndex=72,totalTiles=90;
      const reelItems=Array.from({length:totalTiles},()=>pickGameItem(activeCase.id));
      reelItems[targetIndex]=item;
      track.innerHTML=reelItems.map((entry,index)=>'<div class="roulette-reel-tile tier-border-'+String(entry.tier||'D').toLowerCase()+(index===targetIndex?' is-winning-tile':'')+'" data-reel-index="'+index+'"><span class="reel-tile-rank tier-'+String(entry.tier||'D').toLowerCase()+'">'+escapeHtml(entry.tier||'D')+'</span><strong>'+escapeHtml(entry.name)+'</strong><small>'+formatMoney(fixedPrice(entry))+'</small></div>').join('');
      const targetTile=track.querySelector('[data-reel-index="'+targetIndex+'"]'),startTile=track.querySelector('[data-reel-index="'+startIndex+'"]');
      if(!targetTile||!startTile){rouletteIsSpinning=false;stage.classList.remove('is-spinning');updateButton();return;}
      const centerOffset=tile=>reelWindow.clientWidth/2-(tile.offsetLeft+tile.offsetWidth/2);
      const finalOffset=centerOffset(targetTile),startOffset=centerOffset(startTile);
      track.style.transform='translate3d('+startOffset+'px,0,0)';
      void track.offsetWidth;
      status.textContent='ОПРЕДЕЛЯЕМ РЕЗУЛЬТАТ…';
      rouletteReelAnimation=track.animate([
        {transform:'translate3d('+startOffset+'px,0,0)'},
        {transform:'translate3d('+finalOffset+'px,0,0)'}
      ],{duration:6800,easing:'cubic-bezier(0.06, 0.68, 0.12, 1)',fill:'forwards'});
      // A light selection haptic fires as each reel tile crosses the center marker.
      let lastHapticTile=-1,slotHapticFrame=0;
      const tileStep=(targetTile.offsetWidth||96)+8;
      const pulseSlots=()=>{
        if(!rouletteIsSpinning||!track.isConnected)return;
        const transform=getComputedStyle(track).transform;
        let currentX=startOffset;
        if(transform&&transform!=='none'){
          try{currentX=new DOMMatrixReadOnly(transform).m41;}catch(_){}
        }
        const passed=Math.max(0,Math.floor(Math.abs(currentX-startOffset)/tileStep));
        if(passed!==lastHapticTile){lastHapticTile=passed;triggerHaptic('selection');}
        slotHapticFrame=requestAnimationFrame(pulseSlots);
      };
      slotHapticFrame=requestAnimationFrame(pulseSlots);
      rouletteAnimationTimer=setTimeout(()=>{if(rouletteIsSpinning)triggerHaptic('impact','medium');status.textContent='ПОЧТИ…';},4900);
      const finishSpin=()=>{
        if(!result.isConnected){rouletteIsSpinning=false;return;}
        clearTimeout(rouletteAnimationTimer);rouletteAnimationTimer=null;
        if(slotHapticFrame)cancelAnimationFrame(slotHapticFrame);
        track.style.transform='translate3d('+finalOffset+'px,0,0)';
        if(rouletteReelAnimation){rouletteReelAnimation.cancel();rouletteReelAnimation=null;}
        const tierNode=result.querySelector('.roulette-tier'),incomeNode=result.querySelector('.roulette-income');
        setDropGlow(item.tier);
        triggerHaptic('notification','success');
        if(tierNode){tierNode.className='roulette-tier tier-'+item.tier.toLowerCase();tierNode.textContent=item.tier;}
        const nameNode=result.querySelector('strong');
        if(nameNode)nameNode.textContent=count>1?count+' '+plural(count,'предмет выпал','предмета выпало','предметов выпало'):item.name;
        if(incomeNode)incomeNode.textContent='+'+formatIncomeRate(itemIncomeRate(item))+' / мин';
        const smallNode=result.querySelector('small');
        if(smallNode)smallNode.textContent=count>1?'Последний предмет · '+item.company:item.company+' · цена '+formatMoney(item.price);
        result.classList.add('is-revealed','roulette-pop');
        stage.classList.remove('is-spinning');
        stage.classList.add('has-result');
        status.textContent=count>1?'ВЫПАЛО '+count+' ПРЕДМЕТОВ':'ВЫПАЛ РАНГ '+item.tier+' · +'+formatIncomeRate(itemIncomeRate(item))+' / ЧАС';
        rouletteIsSpinning=false;
        refreshWallet();
        refreshInventoryAndCraft();
        refreshBatchResults();
        const newLevel=playerLevelInfo().level;
        toast(newLevel>oldLevel?'Уровень '+newLevel+'! Новая ячейка инвентаря.':'Готово: '+count+' '+plural(count,'предмет','предмета','предметов'));
      };
      if(rouletteReelAnimation)rouletteReelAnimation.onfinish=finishSpin;
      else setTimeout(finishSpin,6800);
      if(rouletteCooldownTimer)clearInterval(rouletteCooldownTimer);
      rouletteCooldownTimer=setInterval(()=>{updateButton();if(Date.now()-state.game.lastSpinAt>=2000){clearInterval(rouletteCooldownTimer);rouletteCooldownTimer=null;updateButton();}},200);
    });
  }
  function escapeHtml(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function renderHistory(content){
    content.innerHTML='';
    const keys=Object.keys(state.days).filter(k=>{
      const d=state.days[k];
      return Number(d.calories)>0||d.weight!==''&&d.weight!==undefined||d.sleep!==''&&d.sleep!==undefined||!!d.note||(d.checks&&Object.values(d.checks).some(Boolean));
    }).sort().reverse();
    if(!keys.length){content.innerHTML='<div class="card empty-state">Здесь появятся дни, в которые ты вносил данные.<br>Начни с сегодняшнего дня.</div>';return;}
    const visible=historyExpanded?keys:keys.slice(0,3);
    visible.forEach(key=>{
      const d=state.days[key];
      const row=document.createElement('button');
      row.className='history-row';
      row.style.cssText='width:100%;background:transparent;border:0;color:inherit;text-align:left';
      row.innerHTML=`<span><strong>${formatDate(key)}</strong><small>${formatDay(key)}</small></span><span class="history-value">${fmtNum(d.calories||0)} <small>ккал</small></span>`;
      row.addEventListener('click',()=>{currentDate=key;$('#settingsPanel').hidden=true;render();refreshPageSections();});
      content.append(row);
    });
    if(keys.length>3){
      const toggle=document.createElement('button');
      toggle.className='history-toggle';
      toggle.type='button';
      toggle.textContent=historyExpanded?'Свернуть историю':'Показать все записи ('+keys.length+')';
      toggle.setAttribute('aria-expanded',String(historyExpanded));
      toggle.addEventListener('click',()=>{historyExpanded=!historyExpanded;renderHistory(content);});
      content.append(toggle);
    }
  }
    function renderStats(content){
    const entries=Object.entries(state.days).sort(([a],[b])=>a.localeCompare(b));
    const calorieDays=entries.filter(([,d])=>Number(d.calories)>0);
    const sleepDays=entries.filter(([,d])=>d.sleep!==''&&d.sleep!==undefined&&Number.isFinite(Number(d.sleep)));
    const weightDays=entries.filter(([,d])=>d.weight!==''&&d.weight!==undefined&&Number.isFinite(Number(d.weight)));
    const avg=arr=>arr.length?arr.reduce((sum,value)=>sum+value,0)/arr.length:0;
    const avgCalories=avg(calorieDays.map(([,d])=>Number(d.calories)));
    const avgSleep=avg(sleepDays.map(([,d])=>Number(d.sleep)));
    const latestWeight=weightDays.at(-1);
    const hasData=d=>Number(d.calories)>0||(d.weight!==''&&d.weight!==undefined)||(d.sleep!==''&&d.sleep!==undefined)||!!d.note||!!(d.checks&&Object.values(d.checks).some(Boolean));
    const daysWithData=entries.filter(([,d])=>hasData(d)).length;
    content.innerHTML='<div class="stats-grid lifetime-stats">'+
      '<article class="card stat-card"><span class="eyebrow">СРЕДНИЕ КАЛОРИИ ЗА ВСЁ ВРЕМЯ</span><div class="stat-value">'+(calorieDays.length?fmtNum(avgCalories):'—')+'<small>ккал</small></div><div class="stat-note">По '+calorieDays.length+' '+plural(calorieDays.length,'дню','дням','дням')+' с записями</div></article>'+
      '<article class="card stat-card"><span class="eyebrow">СРЕДНИЙ СОН ЗА ВСЁ ВРЕМЯ</span><div class="stat-value">'+(sleepDays.length?fmtNum(avgSleep):'—')+'<small>ч</small></div><div class="stat-note">По '+sleepDays.length+' '+plural(sleepDays.length,'ночи','ночам','ночам')+' с записями</div></article>'+
      '<article class="card stat-card"><span class="eyebrow">ПОСЛЕДНИЙ ВЕС</span><div class="stat-value">'+(latestWeight?fmtNum(latestWeight[1].weight):'—')+'<small>кг</small></div><div class="stat-note">'+(latestWeight?formatDate(latestWeight[0]):'Добавь первую запись')+'</div></article>'+
      '<article class="card stat-card"><span class="eyebrow">ДНЕЙ С ДАННЫМИ</span><div class="stat-value">'+daysWithData+'</div><div class="stat-note">За всё время</div></article></div>';
  }
    function plural(n,one,few,many){const x=n%100;return x>=11&&x<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;}
  function renderSettings(content){content.innerHTML=`<div class="card"><div class="section-heading"><div><span class="eyebrow">ЦЕЛИ</span><h2>Твои настройки</h2></div></div><div class="settings-row"><span>Калории в день</span><button id="settingsGoal">${fmtNum(state.goal)} ккал · Изменить</button></div><label class="settings-row"><span>Валюта игры</span><select id="gameCurrency"><option value="RUB" ${state.game.currency==='RUB'?'selected':''}>Рубли (₽)</option><option value="USD" ${state.game.currency==='USD'?'selected':''}>Доллары ($)</option></select></label><p class="settings-copy">Внутренний баланс считается в рублях. Для отображения в долларах используется условный курс $1 = 90 ₽.</p><div class="settings-row"><span>Синхронизация Telegram</span><button id="syncNow">Синхронизировать</button></div><div class="settings-row"><span>Данные</span><button id="exportData">Экспорт JSON</button></div><div class="settings-row"><span>Резервная копия</span><button id="importData">Импорт JSON</button></div><div class="settings-row"><span>Удаление данных</span><button id="clearData">Сбросить всё</button></div><div class="settings-row"><span>Конфиденциальность</span><button id="openPrivacy">Политика конфиденциальности <span aria-hidden="true">↗</span></button></div><p class="settings-copy" id="syncStatus">Хранение: ${cloudStatus}. В Telegram Mini App данные синхронизируются через Telegram CloudStorage для твоего аккаунта. Вне Telegram используется локальное хранилище браузера.</p><p class="settings-copy">Экспорт JSON можно использовать как резервную копию. Kairo · версия 1.2</p></div><input type="file" id="importFile" accept="application/json,.json" hidden>`;
    $('#gameCurrency').addEventListener('change',e=>{state.game.currency=e.target.value==='USD'?'USD':'RUB';markGameChanged();renderRoulette($('#rouletteContent'));renderSettings($('#settingsContent'));toast('Валюта изменена');});$('#settingsGoal').addEventListener('click',()=>{$('#settingsPanel').hidden=true;openEditor('goal');});$('#openPrivacy').addEventListener('click',()=>{const panel=$('#privacyPanel');panel.hidden=false;$('#settingsPanel').hidden=true;panel.scrollIntoView({behavior:'smooth',block:'start'});});$('#syncNow').addEventListener('click',syncNow);$('#exportData').addEventListener('click',exportData);$('#importData').addEventListener('click',()=>$('#importFile').click());$('#importFile').addEventListener('change',importData);$('#clearData').addEventListener('click',()=>{if(confirm('Удалить все сохранённые данные приложения? Это действие нельзя отменить.')){state=createDefaultState();saveState();currentDate=dateKey(new Date());render();refreshPageSections();$('#settingsPanel').hidden=true;toast('Данные удалены');}});}
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='kairo-backup.json';a.click();URL.revokeObjectURL(url);toast('Резервная копия подготовлена');}
  function importData(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);if(!parsed||typeof parsed!=='object'||!parsed.days||typeof parsed.days!=='object')throw new Error('bad');state=normalizeState(parsed);saveState();render();refreshPageSections();$('#settingsPanel').hidden=true;toast('Данные импортированы');}catch{toast('Не удалось прочитать файл');}e.target.value='';};reader.readAsText(file);}
  const rouletteModal=$('#rouletteModal');
  const openRoulette=()=>{
    if(!rouletteModal)return;
    rouletteModal.hidden=false;
    document.body.classList.add('roulette-modal-open');
    renderRoulette($('#rouletteContent'));
    if(window.Telegram&&window.Telegram.WebApp&&typeof window.Telegram.WebApp.HapticFeedback?.impactOccurred==='function')window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
  };
  const closeRoulette=()=>{
    if(!rouletteModal)return;
    rouletteModal.hidden=true;
    document.body.classList.remove('roulette-modal-open');
  };
  $('#openRoulette')?.addEventListener('click',openRoulette);
  $('#closeRoulette')?.addEventListener('click',closeRoulette);
  $('#closeRouletteBackdrop')?.addEventListener('click',closeRoulette);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&rouletteModal&&!rouletteModal.hidden)closeRoulette();});
  $('#openSettings').addEventListener('click',()=>{
    const panel=$('#settingsPanel');
    panel.hidden=!panel.hidden;
    if(!panel.hidden) panel.scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('#closeSettings').addEventListener('click',()=>$('#settingsPanel').hidden=true);
  $('#closePrivacy').addEventListener('click',()=>{const panel=$('#privacyPanel');panel.hidden=true;$('#settingsPanel').hidden=false;$('#settingsPanel').scrollIntoView({behavior:'smooth',block:'start'});});
  function persistRouletteProgress(){
    try{
      localStorage.setItem(STORE,JSON.stringify(state));
    }catch(error){
      console.warn('Local progress save failed',error);
    }
    if(cloudReady&&cloudStorage){
      clearTimeout(cloudSaveTimer);
      cloudWriteQueue=cloudWriteQueue.catch(()=>{}).then(()=>writeCloudState()).catch(error=>{
        cloudStatus='Не удалось синхронизировать прогресс — сохранён на устройстве';
        console.warn('Progress cloud save failed',error);
        refreshSyncStatus();
      });
    }
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')persistRouletteProgress();
  });
  window.addEventListener('pagehide',persistRouletteProgress);
  initializeStorage().finally(()=>setInterval(accruePassiveIncome,1000));
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
})();
