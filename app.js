(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const STORE = 'yagami-track-v1';
  const CLOUD_META_KEY = 'yagami_track_meta';
  const CLOUD_CHUNK_PREFIX = 'yagami_track_chunk_';
  const CLOUD_CHUNK_SIZE = 3000;
  const defaultState = { goal: 3500, days: {}, game: { money: 500, xp: 0, inventory: [], lastSpinAt: 0, nextItemId: 1, updatedAt: 0, lastDrop: null } };
  const SPIN_COST = 100;
  const GAME_ITEMS = [
    {key:'tren-titan',name:'Тренболон',company:'TitanCore Labs · вымышленный бренд',tier:'S',price:6000,weight:1,detail:'Ультраредкий игровой вариант'},
    {key:'gh-northstar',name:'Гормон роста',company:'Northstar Biotech · вымышленный бренд',tier:'S',price:6000,weight:1,detail:'Ультраредкий игровой вариант'},
    {key:'tren-apex',name:'Тренболон',company:'Apex Research · вымышленный бренд',tier:'A',price:2000,weight:8,detail:'Редкий игровой вариант'},
    {key:'gh-medaxis',name:'Гормон роста',company:'MedAxis Labs · вымышленный бренд',tier:'A',price:2000,weight:8,detail:'Редкий игровой вариант'},
    {key:'pre-ironpeak',name:'Предтрен',company:'IronPeak Nutrition · вымышленный бренд',tier:'A',price:2000,weight:8,detail:'Премиальный игровой вариант'},
    {key:'pre-forgefuel',name:'Предтрен',company:'ForgeFuel · вымышленный бренд',tier:'B',price:800,weight:25,detail:'Стандартный игровой вариант'},
    {key:'protein-primewhey',name:'Протеин',company:'PrimeWhey · вымышленный бренд',tier:'B',price:800,weight:25,detail:'Стандартный игровой вариант'},
    {key:'creatine-pureform',name:'Креатин',company:'PureForm Certified · вымышленный бренд',tier:'B',price:800,weight:25,detail:'Стандартный игровой вариант'},
    {key:'protein-core',name:'Протеин',company:'Core Nutrition · вымышленный бренд',tier:'C',price:300,weight:48,detail:'Бюджетный игровой вариант'},
    {key:'creatine-budget',name:'Креатин',company:'BudgetSport · вымышленный бренд',tier:'C',price:300,weight:48,detail:'Бюджетный игровой вариант'},
    {key:'electrolytes-hydrate',name:'Электролиты',company:'HydratePro · вымышленный бренд',tier:'C',price:300,weight:48,detail:'Базовый игровой вариант'},
    {key:'omega-ocean',name:'Омега-3',company:'OceanPure · вымышленный бренд',tier:'C',price:300,weight:48,detail:'Базовый игровой вариант'},
    {key:'bcaa-core',name:'BCAA',company:'Core Aminos · вымышленный бренд',tier:'C',price:300,weight:48,detail:'Бюджетный игровой вариант'},
    {key:'glutamine-labline',name:'Глютамин',company:'Labline Nutrition · вымышленный бренд',tier:'C',price:300,weight:48,detail:'Бюджетный игровой вариант'},
    {key:'tren-blackline',name:'Тренболон',company:'Blackline Underground · сомнительный игровой бренд',tier:'D',price:200,weight:72,detail:'Низкое качество в игровой системе'},
    {key:'gh-greylabel',name:'Гормон роста',company:'GreyLabel Labs · сомнительный игровой бренд',tier:'D',price:200,weight:72,detail:'Низкое качество в игровой системе'},
    {key:'pre-unmarked',name:'Предтрен',company:'Unmarked Mix · сомнительный игровой бренд',tier:'D',price:200,weight:72,detail:'Низкое качество в игровой системе'},
    {key:'protein-unknown',name:'Протеин',company:'Unknown Batch · сомнительный игровой бренд',tier:'D',price:200,weight:72,detail:'Низкое качество в игровой системе'},
    {key:'creatine-loose',name:'Креатин',company:'Loose Powder Co. · сомнительный игровой бренд',tier:'D',price:200,weight:72,detail:'Низкое качество в игровой системе'},
    {key:'electrolytes-generic',name:'Электролиты',company:'Generic Mix · сомнительный игровой бренд',tier:'D',price:200,weight:72,detail:'Низкое качество в игровой системе'},
    {key:'omega-unverified',name:'Омега-3',company:'Unverified Oil · сомнительный игровой бренд',tier:'D',price:200,weight:72,detail:'Низкое качество в игровой системе'},
    {key:'bcaa-basic',name:'BCAA',company:'Basic Aminos · сомнительный игровой бренд',tier:'D',price:200,weight:72,detail:'Низкое качество в игровой системе'},
    {key:'glutamine-generic',name:'Глютамин',company:'Generic Lab · сомнительный игровой бренд',tier:'D',price:200,weight:72,detail:'Низкое качество в игровой системе'}
  ];
  let rouletteAnimationTimer = null;
  let rouletteCooldownTimer = null;
  let rouletteIsSpinning = false;
  let state = loadState();
  let currentDate = dateKey(new Date());
  let historyExpanded = false;
  let editType = '';
  let toastTimer;
  let cloudStorage = null;
  let cloudReady = false;
  let cloudSaveTimer = null;
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

  function createDefaultState(){ return {goal:3500,days:{},game:{money:500,xp:0,inventory:[],lastSpinAt:0,nextItemId:1,updatedAt:0,lastDrop:null}}; }
  function normalizeGame(value){
    const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    const inventory=Array.isArray(source.inventory)?source.inventory.filter(item=>item&&typeof item==='object'&&typeof item.name==='string'&&typeof item.tier==='string'&&Number.isFinite(Number(item.price))).map(item=>({
      instanceId:Number.isFinite(Number(item.instanceId))?Number(item.instanceId):0,key:String(item.key||'legacy-item'),name:String(item.name),company:String(item.company||'Неизвестная компания'),tier:['S','A','B','C','D'].includes(item.tier)?item.tier:'D',
      price:Math.max(1,Math.round(Number(item.price))),weight:Math.max(1,Number(item.weight)||1),detail:String(item.detail||''),acquiredAt:Number(item.acquiredAt)||0
    })).slice(0,100):[];
    const lastDrop=source.lastDrop&&typeof source.lastDrop==='object'&&typeof source.lastDrop.name==='string'?source.lastDrop:null;
    return {money:Number.isFinite(Number(source.money))?Math.max(0,Math.floor(Number(source.money))):500,xp:Number.isFinite(Number(source.xp))?Math.max(0,Math.floor(Number(source.xp))):0,inventory,lastSpinAt:Math.max(0,Number(source.lastSpinAt)||0),nextItemId:Math.max(1,Math.floor(Number(source.nextItemId)||1),...inventory.map(item=>item.instanceId+1)),updatedAt:Math.max(0,Number(source.updatedAt)||0),lastDrop};
  }
  function normalizeState(value){
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid saved state');
    const days=value.days&&typeof value.days==='object'&&!Array.isArray(value.days)?value.days:{};
    return {goal:Number(value.goal)>0?Number(value.goal):3500,days,game:normalizeGame(value.game)};
  }
  function loadState(){try{return normalizeState(JSON.parse(localStorage.getItem(STORE)||'{}'));}catch{return createDefaultState();}}
  function mergeGameStates(localGame,remoteGame){const local=normalizeGame(localGame),remote=normalizeGame(remoteGame);return remote.updatedAt>local.updatedAt?remote:local;}
  function playerLevelInfo(xp=state.game.xp){let level=1,remaining=Math.max(0,Math.floor(Number(xp)||0)),needed=Math.round(100*Math.pow(level,1.6));while(remaining>=needed&&level<100){remaining-=needed;level++;needed=Math.round(100*Math.pow(level,1.6));}return {level,xpIntoLevel:remaining,xpNeeded:needed};}
  function inventoryCapacity(){return 2+playerLevelInfo().level-1;}
  function sellValue(item){return Math.max(1,Math.floor(Number(item.price)*0.5));}
  function markGameChanged(){state.game.updatedAt=Date.now();saveState();updateProfile();}
  function pickGameItem(){const total=GAME_ITEMS.reduce((sum,item)=>sum+item.weight,0);let roll=Math.random()*total;for(const item of GAME_ITEMS){roll-=item.weight;if(roll<0)return item;}return GAME_ITEMS[GAME_ITEMS.length-1];}
  function saveState(){
    localStorage.setItem(STORE, JSON.stringify(state));
    if (cloudReady && cloudStorage) {
      cloudStatus = 'Сохранено на устройстве · отправка в Telegram…';
      scheduleCloudSave();
    }
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
  function normalizeState(value){
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid saved state');
    const days = value.days && typeof value.days === 'object' && !Array.isArray(value.days) ? value.days : {};
    return { goal: Number(value.goal) > 0 ? Number(value.goal) : 3500, days };
  }
  async function readCloudState(){
    const metaRaw = await cloudCall('getItem', CLOUD_META_KEY);
    if (!metaRaw) return null;
    const meta = JSON.parse(metaRaw);
    if (!meta || !Number.isInteger(meta.chunks) || meta.chunks < 1 || meta.chunks > 1000) throw new Error('Invalid cloud metadata');
    let json = '';
    for (let i = 0; i < meta.chunks; i++) {
      const chunk = await cloudCall('getItem', CLOUD_CHUNK_PREFIX + i);
      if (typeof chunk !== 'string') throw new Error('Missing cloud data');
      json += chunk;
    }
    return normalizeState(JSON.parse(json));
  }
  async function writeCloudState(){
    if (!cloudStorage || !cloudReady) return;
    const json = JSON.stringify(state);
    const chunks = [];
    for (let i = 0; i < json.length; i += CLOUD_CHUNK_SIZE) chunks.push(json.slice(i, i + CLOUD_CHUNK_SIZE));
    for (let i = 0; i < chunks.length; i++) await cloudCall('setItem', CLOUD_CHUNK_PREFIX + i, chunks[i]);
    await cloudCall('setItem', CLOUD_META_KEY, JSON.stringify({ version: 1, chunks: chunks.length, updatedAt: Date.now() }));
    cloudStatus = 'Синхронизировано с Telegram';
    refreshSyncStatus();
  }
  function refreshSyncStatus(){
    const status = $('#syncStatus');
    if (status) status.textContent = 'Статус: ' + cloudStatus + (cloudStorage ? '.' : '. Открой Yagami Track из Telegram, чтобы синхронизировать данные между устройствами.');
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
    if(rouletteCooldownTimer){clearInterval(rouletteCooldownTimer);rouletteCooldownTimer=null;}
    const game=state.game,level=playerLevelInfo(),capacity=inventoryCapacity(),currentDrop=game.lastDrop;
    const resultMarkup=currentDrop?'<span class="roulette-tier tier-'+currentDrop.tier.toLowerCase()+'">'+currentDrop.tier+'</span><strong>'+escapeHtml(currentDrop.name)+'</strong><small>'+escapeHtml(currentDrop.company)+' · цена '+fmtNum(currentDrop.price)+' монет</small>':'<span class="roulette-tier tier-placeholder">?</span><strong>Что выпадет?</strong><small>Крутка стоит '+fmtNum(SPIN_COST)+' монет · шанс зависит от ранга</small>';
    content.innerHTML='<section class="game-wallet"><div class="wallet-balance"><span class="eyebrow">ТВОЙ БАЛАНС</span><strong><span id="gameMoney">'+fmtNum(game.money)+'</span><small> монет</small></strong></div><div class="wallet-meta"><span>Уровень '+level.level+'</span><span id="inventoryCount">'+game.inventory.length+' / '+capacity+' ячейки</span></div><div class="wallet-xp-track"><i style="width:'+Math.min(100,Math.round(level.xpIntoLevel/level.xpNeeded*100))+'%"></i></div><div class="wallet-xp-copy"><span>'+fmtNum(level.xpIntoLevel)+' / '+fmtNum(level.xpNeeded)+' XP</span><span>+1 ячейка за уровень</span></div></section>'+
    '<section class="roulette-hero card"><span class="eyebrow">ИГРОВАЯ ЭКОНОМИКА</span><h2>Рулетка спортпита</h2><p>Получи предмет, храни его или продай за игровые монеты.</p><div class="roulette-result" id="rouletteResult">'+resultMarkup+'</div><button class="primary-button full-width" id="spinRoulette">Крутить · '+fmtNum(SPIN_COST)+' монет</button><p class="roulette-disclaimer">Все компании и цены вымышленные и существуют только в игре. Ранги обозначают игровую редкость, а не реальную безопасность. Тренболон и гормон роста — не обычные спортивные добавки.</p></section>'+
    '<section class="card inventory-panel"><div class="inventory-heading"><div><span class="eyebrow">ТВОИ ПРЕДМЕТЫ</span><h2>Инвентарь</h2></div><span class="inventory-capacity">'+game.inventory.length+' / '+capacity+'</span></div>'+(game.inventory.length?'<div class="inventory-list">'+game.inventory.map(item=>'<article class="inventory-item tier-border-'+item.tier.toLowerCase()+'"><div class="inventory-item-main"><span class="inventory-rank tier-'+item.tier.toLowerCase()+'">'+item.tier+'</span><div class="inventory-item-copy"><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml(item.company)+'</small><span class="inventory-prices">Цена: '+fmtNum(item.price)+' · Продажа: '+fmtNum(sellValue(item))+'</span></div></div><button class="sell-item" data-sell-id="'+item.instanceId+'">Продать</button></article>').join('')+'</div>':'<div class="inventory-empty">Пока пусто. Крути рулетку, чтобы получить первый предмет.</div>')+'</section>'+
    '<details class="tier-details"><summary>Каталог и ранги <span>Редкость · компания · цена</span></summary><section class="tier-list">'+['S','A','B','C','D'].map(tier=>'<div class="tier-row tier-'+tier.toLowerCase()+'"><span class="tier-label tier-'+tier.toLowerCase()+'">'+tier+'</span><div class="tier-items">'+GAME_ITEMS.filter(item=>item.tier===tier).map(item=>'<div class="tier-item"><div class="catalogue-item-title"><strong>'+escapeHtml(item.name)+'</strong><b>'+fmtNum(item.price)+' <small>монет</small></b></div><small>'+escapeHtml(item.company)+'</small><small>'+escapeHtml(item.detail)+'</small></div>').join('')+'</div></div>').join('')+'</section></details>';
    const button=$('#spinRoulette',content),result=$('#rouletteResult',content);
    const updateButton=()=>{if(!button.isConnected)return;const remaining=Math.max(0,2000-(Date.now()-state.game.lastSpinAt));if(rouletteIsSpinning){button.disabled=true;button.textContent='Крутится…';return;}if(state.game.inventory.length>=inventoryCapacity()){button.disabled=true;button.textContent='Инвентарь заполнен';return;}if(state.game.money<SPIN_COST){button.disabled=true;button.textContent='Не хватает монет';return;}if(remaining>0){button.disabled=true;button.textContent='Перезарядка '+(remaining/1000).toFixed(1)+' с';return;}button.disabled=false;button.textContent='Крутить · '+fmtNum(SPIN_COST)+' монет';};
    updateButton();
    if(Date.now()-game.lastSpinAt<2000)rouletteCooldownTimer=setInterval(()=>{updateButton();if(Date.now()-state.game.lastSpinAt>=2000){clearInterval(rouletteCooldownTimer);rouletteCooldownTimer=null;updateButton();}},100);
    $$('[data-sell-id]',content).forEach(sellButton=>sellButton.addEventListener('click',()=>{
      const index=state.game.inventory.findIndex(item=>String(item.instanceId)===sellButton.dataset.sellId);if(index<0)return;
      const item=state.game.inventory[index],oldLevel=playerLevelInfo().level;
      state.game.money+=sellValue(item);state.game.xp+=5;state.game.inventory.splice(index,1);markGameChanged();renderRoulette(content);
      const newLevel=playerLevelInfo().level;toast(newLevel>oldLevel?'Уровень '+newLevel+'! Открыта новая ячейка.':'Продано за '+fmtNum(sellValue(item))+' монет · +5 XP');
    }));
    button.addEventListener('click',()=>{
      const now=Date.now();if(rouletteIsSpinning)return;if(now-state.game.lastSpinAt<2000){updateButton();return;}
      if(state.game.inventory.length>=inventoryCapacity()){toast('Инвентарь заполнен — продай предмет');updateButton();return;}
      if(state.game.money<SPIN_COST){toast('Не хватает монет');updateButton();return;}
      const oldLevel=playerLevelInfo().level;state.game.money-=SPIN_COST;state.game.lastSpinAt=now;state.game.xp+=15;
      const item=pickGameItem(),owned={...item,instanceId:state.game.nextItemId++,acquiredAt:now};
      state.game.inventory.push(owned);state.game.lastDrop={...item};markGameChanged();rouletteIsSpinning=true;updateButton();
      if(rouletteAnimationTimer)clearInterval(rouletteAnimationTimer);let ticks=0;
      rouletteAnimationTimer=setInterval(()=>{
        const preview=pickGameItem();result.innerHTML='<span class="roulette-tier tier-'+preview.tier.toLowerCase()+'">'+preview.tier+'</span><strong>'+escapeHtml(preview.name)+'</strong><small>'+escapeHtml(preview.company)+'</small>';ticks++;
        if(ticks>=14){clearInterval(rouletteAnimationTimer);rouletteAnimationTimer=null;rouletteIsSpinning=false;result.innerHTML='<span class="roulette-tier tier-'+item.tier.toLowerCase()+'">'+item.tier+'</span><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml(item.company)+' · цена '+fmtNum(item.price)+' монет</small>';result.classList.add('roulette-pop');renderRoulette(content);const newLevel=playerLevelInfo().level;toast(newLevel>oldLevel?'Уровень '+newLevel+'! Открыта новая ячейка.':'Выпало: '+item.name+' · '+item.tier+' ранг');}
      },90);
      if(rouletteCooldownTimer)clearInterval(rouletteCooldownTimer);rouletteCooldownTimer=setInterval(()=>{updateButton();if(Date.now()-state.game.lastSpinAt>=2000){clearInterval(rouletteCooldownTimer);rouletteCooldownTimer=null;updateButton();}},100);
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
  function renderSettings(content){content.innerHTML=`<div class="card"><div class="section-heading"><div><span class="eyebrow">ЦЕЛИ</span><h2>Твои настройки</h2></div></div><div class="settings-row"><span>Калории в день</span><button id="settingsGoal">${fmtNum(state.goal)} ккал · Изменить</button></div><div class="settings-row"><span>Синхронизация Telegram</span><button id="syncNow">Синхронизировать</button></div><div class="settings-row"><span>Данные</span><button id="exportData">Экспорт JSON</button></div><div class="settings-row"><span>Резервная копия</span><button id="importData">Импорт JSON</button></div><div class="settings-row"><span>Удаление данных</span><button id="clearData">Сбросить всё</button></div><p class="settings-copy" id="syncStatus">Хранение: ${cloudStatus}. В Telegram Mini App данные синхронизируются через Telegram CloudStorage для твоего аккаунта. Вне Telegram используется локальное хранилище браузера.</p><p class="settings-copy">Экспорт JSON можно использовать как резервную копию. Yagami Track · версия 1.1</p></div><input type="file" id="importFile" accept="application/json,.json" hidden>`;
    $('#settingsGoal').addEventListener('click',()=>{$('#settingsPanel').hidden=true;openEditor('goal');});$('#syncNow').addEventListener('click',syncNow);$('#exportData').addEventListener('click',exportData);$('#importData').addEventListener('click',()=>$('#importFile').click());$('#importFile').addEventListener('change',importData);$('#clearData').addEventListener('click',()=>{if(confirm('Удалить все сохранённые данные приложения? Это действие нельзя отменить.')){state=createDefaultState();saveState();currentDate=dateKey(new Date());render();refreshPageSections();$('#settingsPanel').hidden=true;toast('Данные удалены');}});}
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='yagami-track-backup.json';a.click();URL.revokeObjectURL(url);toast('Резервная копия подготовлена');}
  function importData(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);if(!parsed||typeof parsed!=='object'||!parsed.days||typeof parsed.days!=='object')throw new Error('bad');state=normalizeState(parsed);saveState();render();refreshPageSections();$('#settingsPanel').hidden=true;toast('Данные импортированы');}catch{toast('Не удалось прочитать файл');}e.target.value='';};reader.readAsText(file);}
  $('#openSettings').addEventListener('click',()=>{
    const panel=$('#settingsPanel');
    panel.hidden=!panel.hidden;
    if(!panel.hidden) panel.scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('#closeSettings').addEventListener('click',()=>$('#settingsPanel').hidden=true);
  initializeStorage();
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
})();
