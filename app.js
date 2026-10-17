(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const STORE = 'yagami-track-v1';
  const CLOUD_META_KEY = 'yagami_track_meta';
  const CLOUD_CHUNK_PREFIX = 'yagami_track_chunk_';
  const CLOUD_CHUNK_SIZE = 3000;
  const defaultState = { goal: 3500, days: {} };
  let state = loadState();
  let currentDate = dateKey(new Date());
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
  }

  function loadState(){ try { const saved = JSON.parse(localStorage.getItem(STORE) || '{}'); return {...defaultState, ...saved, days: saved.days && typeof saved.days === 'object' ? saved.days : {}}; } catch { return {...defaultState}; } }
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
        state = {goal: remoteState.goal || localState.goal || 3500, days: mergedDays};
      }
      localStorage.setItem(STORE, JSON.stringify(state));
      cloudReady = true;
      await writeCloudState();
      render();
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
          state = {goal: remoteState.goal || localState.goal || 3500, days: mergedDays};
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
  function shiftDay(delta){const d=dateFromKey(currentDate);d.setDate(d.getDate()+delta);currentDate=dateKey(d);render();}
  function openEditor(type){editType=type;const config={goal:['Дневная цель','Калории в день','3500','Укажи цель в ккал.'],weight:['Записать вес','Вес в килограммах',dayData().weight||'','Например, 78.5 кг.'],sleep:['Записать сон','Часов сна',dayData().sleep||'','Можно указать дробное значение, например 7.5.'],custom:['Добавить калории','Количество ккал','','Укажи число больше нуля.']}[type];$('#dialogTitle').textContent=config[0];$('#fieldLabel').textContent=config[1];$('#fieldInput').value=config[2];$('#fieldInput').placeholder=type==='weight'?'78.5':type==='sleep'?'7.5':'0';$('#fieldInput').step=type==='weight'||type==='sleep'?'0.1':'1';$('#fieldInput').min='0';$('#fieldHint').textContent=config[3];$('#editDialog').showModal();setTimeout(()=>$('#fieldInput').focus(),100);}
  $('#editForm').addEventListener('submit',e=>{e.preventDefault();const val=Number($('#fieldInput').value);if(!Number.isFinite(val)||val<0||$('#fieldInput').value.trim()===''){toast('Введи корректное число');return;}if(editType==='goal'){if(val<=0){toast('Цель должна быть больше нуля');return;}state.goal=Math.round(val);}else if(editType==='weight'){dayData().weight=Math.round(val*10)/10;}else if(editType==='sleep'){if(val>24){toast('Сон не может быть больше 24 часов');return;}dayData().sleep=Math.round(val*10)/10;}else if(editType==='custom'){dayData().calories+=Math.round(val);}saveState();$('#editDialog').close();render();toast('Данные сохранены');});
  $('#prevDay').addEventListener('click',()=>shiftDay(-1));$('#nextDay').addEventListener('click',()=>shiftDay(1));$('#todayBtn').addEventListener('click',()=>{currentDate=dateKey(new Date());render();toast('Сегодняшний день');});
  $('#editGoal').addEventListener('click',()=>openEditor('goal'));$('#editWeight').addEventListener('click',()=>openEditor('weight'));$('#editSleep').addEventListener('click',()=>openEditor('sleep'));$('#customAdd').addEventListener('click',()=>openEditor('custom'));
  $$('.add-chip[data-add]').forEach(btn=>btn.addEventListener('click',()=>{dayData().calories+=Number(btn.dataset.add);saveState();render();toast('Добавлено '+btn.dataset.add+' ккал');}));
  $('#resetCalories').addEventListener('click',()=>{if(dayData().calories===0){toast('Счётчик уже пустой');return;}if(confirm('Сбросить все калории за этот день?')){dayData().calories=0;saveState();render();toast('Калории сброшены');}});
  const app=$('.app-shell');const sub=$('#subview');
  const nav=$('.bottom-nav');
  let activeView='day', viewTransitionTimer=null;
  const navIndicator=document.createElement('span');
  navIndicator.className='nav-indicator';
  navIndicator.setAttribute('aria-hidden','true');
  nav.prepend(navIndicator);
  function moveNavIndicator(view){
    const target=$('.nav-item[data-view="'+view+'"]');
    if(!target)return;
    const navRect=nav.getBoundingClientRect();
    const targetRect=target.getBoundingClientRect();
    const insetX=3, insetY=5;
    navIndicator.style.width=Math.max(0,targetRect.width-insetX*2)+'px';
    navIndicator.style.height=Math.max(0,targetRect.height-insetY*2)+'px';
    navIndicator.style.transform='translate3d('+(targetRect.left-navRect.left+insetX)+'px,'+(targetRect.top-navRect.top+insetY)+'px,0)';
    navIndicator.style.opacity='1';
  }
  function animateView(element,direction){
    element.classList.remove('view-enter','view-exit','view-enter-back');
    void element.offsetWidth;
    element.classList.add(direction==='back'?'view-enter-back':direction==='exit'?'view-exit':'view-enter');
  }
  function animateSubviewContent(){
    const content=$('#subviewContent');
    content.classList.remove('view-content-enter');
    void content.offsetWidth;
    content.classList.add('view-content-enter');
  }
  function showView(view){
    if(view===activeView && !(view==='day' && sub.hidden)) return;
    const previous=activeView;
    clearTimeout(viewTransitionTimer);
    $('.nav-item').forEach(b=>{
      const active=b.dataset.view===view;
      b.classList.toggle('active',active);
      if(active)b.setAttribute('aria-current','page');
      else b.removeAttribute('aria-current');
    });
    moveNavIndicator(view);
    if(view==='day'){
      if(sub.hidden){activeView='day';app.hidden=false;animateView(app,'back');return;}
      sub.classList.remove('view-enter','view-enter-back');
      sub.classList.add('view-exit');
      viewTransitionTimer=setTimeout(()=>{
        sub.hidden=true;sub.classList.remove('view-exit');
        app.hidden=false;animateView(app,'back');activeView='day';
      },280);
      return;
    }
    const titles={stats:'Прогресс',roulette:'Рулетка',settings:'Настройки'};
    $('#subviewTitle').textContent=titles[view];
    const content=$('#subviewContent');content.innerHTML='';
    if(view==='stats'){
      renderStats(content);
      const historySection=document.createElement('section');
      historySection.className='history-section';
      historySection.innerHTML='<div class="section-heading" style="margin:22px 2px 10px"><div><span class="eyebrow">ЖУРНАЛ</span><h2>История записей</h2></div></div>';
      const historyList=document.createElement('div');
      historySection.append(historyList);
      renderHistory(historyList);
      content.append(historySection);
    }
    if(view==='roulette') renderRoulette(content);
    if(view==='settings') renderSettings(content);
    if(previous==='day'){
      app.classList.remove('view-enter','view-enter-back');
      app.classList.add('view-exit');
      sub.hidden=false;animateView(sub,'forward');animateSubviewContent();
      viewTransitionTimer=setTimeout(()=>{app.hidden=true;app.classList.remove('view-exit');},280);
    }else{
      animateView(sub,'forward');
      animateSubviewContent();
    }
    activeView=view;
  }
  window.addEventListener('resize',()=>moveNavIndicator(activeView));
  requestAnimationFrame(()=>moveNavIndicator(activeView));
  function renderRoulette(content){
    const items=[
      {name:'Протеин',tier:'S',detail:'Белок для добора суточной нормы'},
      {name:'Креатин',tier:'S',detail:'Одна из наиболее изученных спортивных добавок'},
      {name:'Предтрен',tier:'A',detail:'Эффект и состав зависят от продукта'},
      {name:'Тестостерон',tier:'B',detail:'Гормональная терапия — только по медицинским показаниям'},
      {name:'Гормон роста',tier:'C',detail:'Не для самостоятельного применения'},
      {name:'Тренболон',tier:'D',detail:'Высокие риски; не одобрен для применения у людей во многих странах'}
    ];
    content.innerHTML=`<section class="roulette-hero card"><span class="eyebrow">RANDOM TIER</span><h2>Рулетка добавок</h2><p>Крути и получи случайный предмет с его классом.</p><div class="roulette-result" id="rouletteResult"><span class="roulette-tier tier-placeholder">?</span><strong>Что выпадет?</strong><small>Нажми кнопку ниже</small></div><button class="primary-button full-width" id="spinRoulette">Крутить рулетку</button><p class="roulette-disclaimer">Развлекательная классификация, не медицинская рекомендация. Гормоны и анаболические стероиды могут причинить серьёзный вред; не используй их без врача.</p></section><section class="tier-list"><h2>Классы</h2>${['S','A','B','C','D'].map(tier=>`<div class="tier-row tier-${tier.toLowerCase()}"><span class="tier-label">${tier}</span><div class="tier-items">${items.filter(item=>item.tier===tier).map(item=>`<div class="tier-item"><strong>${item.name}</strong><small>${item.detail}</small></div>`).join('')}</div></div>`).join('')}</section>`;
    $('#spinRoulette',content).addEventListener('click',()=>{
      const button=$('#spinRoulette',content);
      const result=$('#rouletteResult',content);
      button.disabled=true;
      result.classList.remove('roulette-pop');
      let ticks=0;
      const timer=setInterval(()=>{
        const item=items[Math.floor(Math.random()*items.length)];
        result.innerHTML=`<span class="roulette-tier tier-${item.tier.toLowerCase()}">${item.tier}</span><strong>${item.name}</strong><small>${item.detail}</small>`;
        ticks++;
        if(ticks>=14){
          clearInterval(timer);
          result.classList.add('roulette-pop');
          button.disabled=false;
        }
      },90);
    });
  }
  function renderHistory(content){const keys=Object.keys(state.days).filter(k=>{const d=state.days[k];return d.calories||d.weight!==''||d.sleep!==''||d.note||(d.checks&&Object.values(d.checks).some(Boolean));}).sort().reverse();if(!keys.length){content.innerHTML='<div class="card empty-state">Здесь появятся дни, в которые ты вносил данные.<br>Начни с сегодняшнего дня.</div>';return;}keys.forEach(key=>{const d=state.days[key];const row=document.createElement('button');row.className='history-row';row.style.cssText='width:100%;background:transparent;border:0;color:inherit;text-align:left';row.innerHTML=`<span><strong>${formatDate(key)}</strong><small>${formatDay(key)}</small></span><span class="history-value">${fmtNum(d.calories||0)} <small>ккал</small></span>`;row.addEventListener('click',()=>{currentDate=key;showView('day');render();});content.append(row);});}
  function renderStats(content){const entries=Object.entries(state.days).sort(([a],[b])=>a.localeCompare(b));const weights=entries.filter(([,d])=>d.weight!==''&&Number.isFinite(Number(d.weight)));const sleeps=entries.filter(([,d])=>d.sleep!==''&&Number.isFinite(Number(d.sleep)));const cal=entries.filter(([,d])=>Number(d.calories)>0);const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;const avgCal=avg(cal.map(([,d])=>Number(d.calories)));const avgSleep=avg(sleeps.map(([,d])=>Number(d.sleep)));const latestWeight=weights.at(-1);content.innerHTML=`<div class="stats-grid"><article class="card stat-card"><span class="eyebrow">СРЕДНИЕ КАЛОРИИ</span><div class="stat-value">${cal.length?fmtNum(avgCal):'—'}<small>ккал</small></div><div class="stat-note">По ${cal.length} ${plural(cal.length,'дню','дням','дням')} с записями</div></article><article class="card stat-card"><span class="eyebrow">СРЕДНИЙ СОН</span><div class="stat-value">${sleeps.length?fmtNum(avgSleep):'—'}<small>ч</small></div><div class="stat-note">По ${sleeps.length} ${plural(sleeps.length,'ночи','ночам','ночам')} с записями</div></article><article class="card stat-card"><span class="eyebrow">ПОСЛЕДНИЙ ВЕС</span><div class="stat-value">${latestWeight?fmtNum(latestWeight[1].weight):'—'}<small>кг</small></div><div class="stat-note">${latestWeight?formatDate(latestWeight[0]):'Добавь первую запись'}</div></article><article class="card stat-card"><span class="eyebrow">ДНЕЙ С ДАННЫМИ</span><div class="stat-value">${entries.length}</div><div class="stat-note">Записи сохраняются на этом устройстве</div></article></div><div class="card"><div class="section-heading"><div><span class="eyebrow">ПОДСКАЗКА</span><h2>Стабильность важнее идеала</h2></div></div><p class="settings-copy">Вноси данные каждый день — со временем здесь появится полезная динамика. Средние значения считаются только по дням, где есть записи.</p></div>`;}
  function plural(n,one,few,many){const x=n%100;return x>=11&&x<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;}
  function renderSettings(content){content.innerHTML=`<div class="card"><div class="section-heading"><div><span class="eyebrow">ЦЕЛИ</span><h2>Твои настройки</h2></div></div><div class="settings-row"><span>Калории в день</span><button id="settingsGoal">${fmtNum(state.goal)} ккал · Изменить</button></div><div class="settings-row"><span>Синхронизация Telegram</span><button id="syncNow">Синхронизировать</button></div><div class="settings-row"><span>Данные</span><button id="exportData">Экспорт JSON</button></div><div class="settings-row"><span>Резервная копия</span><button id="importData">Импорт JSON</button></div><div class="settings-row"><span>Удаление данных</span><button id="clearData">Сбросить всё</button></div><p class="settings-copy" id="syncStatus">Хранение: ${cloudStatus}. В Telegram Mini App данные синхронизируются через Telegram CloudStorage для твоего аккаунта. Вне Telegram используется локальное хранилище браузера.</p><p class="settings-copy">Экспорт JSON можно использовать как резервную копию. Yagami Track · версия 1.1</p></div><input type="file" id="importFile" accept="application/json,.json" hidden>`;
    $('#settingsGoal').addEventListener('click',()=>{showView('day');openEditor('goal');});$('#syncNow').addEventListener('click',syncNow);$('#exportData').addEventListener('click',exportData);$('#importData').addEventListener('click',()=>$('#importFile').click());$('#importFile').addEventListener('change',importData);$('#clearData').addEventListener('click',()=>{if(confirm('Удалить все сохранённые данные приложения? Это действие нельзя отменить.')){state={...defaultState,days:{}};saveState();currentDate=dateKey(new Date());render();showView('day');toast('Данные удалены');}});}
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='yagami-track-backup.json';a.click();URL.revokeObjectURL(url);toast('Резервная копия подготовлена');}
  function importData(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);if(!parsed||typeof parsed!=='object'||!parsed.days||typeof parsed.days!=='object')throw new Error('bad');state={goal:Number(parsed.goal)>0?Number(parsed.goal):3500,days:parsed.days};saveState();render();showView('day');toast('Данные импортированы');}catch{toast('Не удалось прочитать файл');}e.target.value='';};reader.readAsText(file);}
  $$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));$('#backToDay').addEventListener('click',()=>showView('day'));
  initializeStorage();
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
})();
