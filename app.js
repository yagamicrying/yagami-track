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
    
    renderDailyTools();
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
  function renderHistory(content){content.innerHTML='';const keys=Object.keys(state.days).filter(k=>{const d=state.days[k];return d.calories||d.weight!==''||d.sleep!==''||d.note||(d.checks&&Object.values(d.checks).some(Boolean));}).sort().reverse();if(!keys.length){content.innerHTML='<div class="card empty-state">Здесь появятся дни, в которые ты вносил данные.<br>Начни с сегодняшнего дня.</div>';return;}keys.forEach(key=>{const d=state.days[key];const row=document.createElement('button');row.className='history-row';row.style.cssText='width:100%;background:transparent;border:0;color:inherit;text-align:left';row.innerHTML=`<span><strong>${formatDate(key)}</strong><small>${formatDay(key)}</small></span><span class="history-value">${fmtNum(d.calories||0)} <small>ккал</small></span>`;row.addEventListener('click',()=>{currentDate=key;$('#settingsPanel').hidden=true;render();});content.append(row);});}
  function renderStats(content){
    const entries=Object.entries(state.days).sort(([a],[b])=>a.localeCompare(b));
    const weights=entries.filter(([,d])=>d.weight!==''&&Number.isFinite(Number(d.weight)));
    const sleeps=entries.filter(([,d])=>d.sleep!==''&&Number.isFinite(Number(d.sleep)));
    const cal=entries.filter(([,d])=>Number(d.calories)>0);
    const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;
    const avgCal=avg(cal.map(([,d])=>Number(d.calories)));
    const avgSleep=avg(sleeps.map(([,d])=>Number(d.sleep)));
    const latestWeight=weights.at(-1);
    const today=dateFromKey(dateKey(new Date()));
    const last7=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-6+i);const key=dateKey(d);return {key,data:state.days[key]||{}};});
    const loggedCalories=last7.filter(x=>Number(x.data.calories)>0);
    const weekAvg=avg(loggedCalories.map(x=>Number(x.data.calories)));
    const targetDays=loggedCalories.filter(x=>Number(x.data.calories)>=state.goal*.9&&Number(x.data.calories)<=state.goal*1.1).length;
    const loggedSleep=last7.filter(x=>x.data.sleep!==''&&x.data.sleep!==undefined&&Number.isFinite(Number(x.data.sleep)));
    const weekSleep=avg(loggedSleep.map(x=>Number(x.data.sleep)));
    const hasData=d=>Number(d.calories)>0||(d.weight!==''&&d.weight!==undefined)||(d.sleep!==''&&d.sleep!==undefined)||!!d.note||!!(d.checks&&Object.values(d.checks).some(Boolean));
    let streak=0;
    const todayKey=dateKey(today);
    const streakStart=hasData(state.days[todayKey]||{})?0:1;
    for(let i=streakStart;i<365;i++){const d=new Date(today);d.setDate(today.getDate()-i);if(hasData(state.days[dateKey(d)]||{}))streak++;else break;}
    const recentWeights=weights.filter(([key])=>key>=dateKey(new Date(today.getFullYear(),today.getMonth(),today.getDate()-29))).slice(-14);
    let chart='';
    if(recentWeights.length>=2){
      const vals=recentWeights.map(([,d])=>Number(d.weight)),min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;
      const points=vals.map((v,i)=>({x:12+i*(296/(vals.length-1)),y:88-((v-min)/range)*64}));
      const poly=points.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
      chart='<svg class="weight-chart" viewBox="0 0 320 112" role="img" aria-label="График изменения веса"><line x1="12" y1="24" x2="308" y2="24" /><line x1="12" y1="56" x2="308" y2="56" /><line x1="12" y1="88" x2="308" y2="88" /><polyline points="'+poly+'" />'+points.map((p,i)=>'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3.2"><title>'+fmtNum(vals[i])+' кг · '+formatDate(recentWeights[i][0])+'</title></circle>').join('')+'</svg><div class="chart-meta"><span>'+formatDate(recentWeights[0][0])+'</span><strong>'+fmtNum(vals[0])+' → '+fmtNum(vals.at(-1))+' кг</strong><span>'+formatDate(recentWeights.at(-1)[0])+'</span></div>';
    }else chart='<div class="chart-empty">Запиши вес минимум дважды — здесь появится график динамики.</div>';
    let insight='Добавляй записи несколько дней подряд — анализ покажет закономерности.';
    if(loggedCalories.length){const ratio=Math.round(weekAvg/state.goal*100);insight='За 7 дней среднее потребление — '+fmtNum(weekAvg)+' ккал ('+ratio+'% от дневной цели). Цель в пределах ±10% отмечена в '+targetDays+' из 7 дней.';}
    const sleepInsight=loggedSleep.length?'Средний сон за неделю — '+fmtNum(weekSleep)+' ч. '+(weekSleep<7?'Попробуй постепенно приблизиться к 7–9 часам.':weekSleep<=9?'Продолжай держать стабильный режим.':'Если долгий сон не помогает восстановлению, обрати внимание на качество отдыха.'):'Запиши сон хотя бы пару дней, чтобы оценить восстановление.';
    const weightChange=recentWeights.length>=2?Number(recentWeights.at(-1)[1].weight)-Number(recentWeights[0][1].weight):null;
    const weightInsight=weightChange===null?'Для оценки изменения веса нужны минимум две записи.':'Изменение между первой и последней записью: '+(weightChange>0?'+':'')+fmtNum(weightChange)+' кг. Смотри на тенденцию за недели, а не на колебания одного дня.';
    content.innerHTML='<div class="analysis-grid">'+
      '<article class="card analysis-metric"><span class="eyebrow">СРЕДНЕЕ ЗА 7 ДНЕЙ</span><strong>'+(loggedCalories.length?fmtNum(weekAvg):'—')+'</strong><small>ккал в день</small><p>'+(loggedCalories.length?'Дней с записями: '+loggedCalories.length+'/7':'Пока нет записей калорий')+'</p></article>'+
      '<article class="card analysis-metric"><span class="eyebrow">ПОПАДАНИЕ В ЦЕЛЬ</span><strong>'+targetDays+'<small>/7</small></strong><p>Дни в диапазоне ±10% от цели</p></article>'+
      '<article class="card analysis-metric"><span class="eyebrow">СЕРИЯ</span><strong>'+streak+'<small> '+plural(streak,'день','дня','дней')+'</small></strong><p>Подряд с любыми записями</p></article>'+
      '<article class="card analysis-metric"><span class="eyebrow">СРЕДНИЙ СОН</span><strong>'+(loggedSleep.length?fmtNum(weekSleep):'—')+'<small> ч</small></strong><p>'+loggedSleep.length+' '+plural(loggedSleep.length,'ночь','ночи','ночей')+' с записями за 7 дней</p></article></div>'+
      '<div class="card analysis-card"><div class="section-heading"><div><span class="eyebrow">ВЕС · ПОСЛЕДНИЕ 30 ДНЕЙ</span><h2>Динамика веса</h2></div></div>'+chart+'<p class="analysis-copy">'+weightInsight+'</p></div>'+
      '<div class="card analysis-card"><div class="section-heading"><div><span class="eyebrow">ВЫВОДЫ</span><h2>Анализ недели</h2></div></div><p class="analysis-copy">'+insight+'</p><p class="analysis-copy">'+sleepInsight+'</p></div>'+
      '<div class="stats-grid legacy-stats"><article class="card stat-card"><span class="eyebrow">СРЕДНИЕ КАЛОРИИ ЗА ВСЁ ВРЕМЯ</span><div class="stat-value">'+(cal.length?fmtNum(avgCal):'—')+'<small>ккал</small></div><div class="stat-note">По '+cal.length+' '+plural(cal.length,'дню','дням','дням')+' с записями</div></article><article class="card stat-card"><span class="eyebrow">СРЕДНИЙ СОН ЗА ВСЁ ВРЕМЯ</span><div class="stat-value">'+(sleeps.length?fmtNum(avgSleep):'—')+'<small>ч</small></div><div class="stat-note">По '+sleeps.length+' '+plural(sleeps.length,'ночи','ночам','ночам')+' с записями</div></article><article class="card stat-card"><span class="eyebrow">ПОСЛЕДНИЙ ВЕС</span><div class="stat-value">'+(latestWeight?fmtNum(latestWeight[1].weight):'—')+'<small>кг</small></div><div class="stat-note">'+(latestWeight?formatDate(latestWeight[0]):'Добавь первую запись')+'</div></article><article class="card stat-card"><span class="eyebrow">ДНЕЙ С ДАННЫМИ</span><div class="stat-value">'+entries.filter(([,d])=>hasData(d)).length+'</div><div class="stat-note">За всё время</div></article></div>';
  }
  function renderDailyTools(){
    const content=$('#dailyToolsContent');if(!content)return;
    const d=dayData();const checks=d.checks||(d.checks={water:false,activity:false,sleepRoutine:false});
    const habits=[['water','Выпил достаточно воды','Ориентируйся на жажду и самочувствие'],['activity','Был физически активен','Тренировка, прогулка или обычное движение'],['sleepRoutine','Подготовился ко сну','Выделил время на спокойное завершение дня']];
    content.innerHTML='<div class="habit-list">'+habits.map(([key,title,desc])=>'<label class="habit-row"><input type="checkbox" data-habit="'+key+'" '+(checks[key]?'checked':'')+'><span class="habit-check"></span><span class="habit-copy"><strong>'+title+'</strong><small>'+desc+'</small></span></label>').join('')+'</div><div class="daily-note"><label for="dailyNoteInput">Заметка за '+formatDate(currentDate)+'</label><textarea id="dailyNoteInput" rows="3" maxlength="500" placeholder="Самочувствие, тренировка, питание…">'+String(d.note||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</textarea><button class="secondary-button full-width" id="saveDailyNote">Сохранить заметку</button></div>';
    $$('[data-habit]',content).forEach(input=>input.addEventListener('change',()=>{dayData().checks[input.dataset.habit]=input.checked;saveState();updateProfile();refreshPageSections();toast(input.checked?'Привычка отмечена':'Отметка снята');}));
    $('#saveDailyNote',content).addEventListener('click',()=>{dayData().note=$('#dailyNoteInput',content).value.trim();saveState();updateProfile();refreshPageSections();toast('Заметка сохранена');});
  }
  function plural(n,one,few,many){const x=n%100;return x>=11&&x<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;}
  function renderSettings(content){content.innerHTML=`<div class="card"><div class="section-heading"><div><span class="eyebrow">ЦЕЛИ</span><h2>Твои настройки</h2></div></div><div class="settings-row"><span>Калории в день</span><button id="settingsGoal">${fmtNum(state.goal)} ккал · Изменить</button></div><div class="settings-row"><span>Синхронизация Telegram</span><button id="syncNow">Синхронизировать</button></div><div class="settings-row"><span>Данные</span><button id="exportData">Экспорт JSON</button></div><div class="settings-row"><span>Резервная копия</span><button id="importData">Импорт JSON</button></div><div class="settings-row"><span>Удаление данных</span><button id="clearData">Сбросить всё</button></div><p class="settings-copy" id="syncStatus">Хранение: ${cloudStatus}. В Telegram Mini App данные синхронизируются через Telegram CloudStorage для твоего аккаунта. Вне Telegram используется локальное хранилище браузера.</p><p class="settings-copy">Экспорт JSON можно использовать как резервную копию. Yagami Track · версия 1.1</p></div><input type="file" id="importFile" accept="application/json,.json" hidden>`;
    $('#settingsGoal').addEventListener('click',()=>{$('#settingsPanel').hidden=true;openEditor('goal');});$('#syncNow').addEventListener('click',syncNow);$('#exportData').addEventListener('click',exportData);$('#importData').addEventListener('click',()=>$('#importFile').click());$('#importFile').addEventListener('change',importData);$('#clearData').addEventListener('click',()=>{if(confirm('Удалить все сохранённые данные приложения? Это действие нельзя отменить.')){state={...defaultState,days:{}};saveState();currentDate=dateKey(new Date());render();refreshPageSections();$('#settingsPanel').hidden=true;toast('Данные удалены');}});}
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='yagami-track-backup.json';a.click();URL.revokeObjectURL(url);toast('Резервная копия подготовлена');}
  function importData(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);if(!parsed||typeof parsed!=='object'||!parsed.days||typeof parsed.days!=='object')throw new Error('bad');state={goal:Number(parsed.goal)>0?Number(parsed.goal):3500,days:parsed.days};saveState();render();refreshPageSections();$('#settingsPanel').hidden=true;toast('Данные импортированы');}catch{toast('Не удалось прочитать файл');}e.target.value='';};reader.readAsText(file);}
  $('#openSettings').addEventListener('click',()=>{
    const panel=$('#settingsPanel');
    panel.hidden=!panel.hidden;
    if(!panel.hidden) panel.scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('#closeSettings').addEventListener('click',()=>$('#settingsPanel').hidden=true);
  initializeStorage();
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
})();
