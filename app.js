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

  function loadState(){ try { const saved = JSON.parse(localStorage.getItem(STORE) || '{}'); return {...defaultState, ...saved, days: saved.days && typeof saved.days === 'object' ? saved.days : {}}; } catch { return {...defaultState}; } }
  function saveState(){
    localStorage.setItem(STORE, JSON.stringify(state));
    if (cloudReady && cloudStorage) scheduleCloudSave();
  }
  function cloudCall(method, ...args){
    return new Promise((resolve, reject) => {
      try {
        cloudStorage[method](...args, (error, result) => error ? reject(error) : resolve(result));
      } catch (error) { reject(error); }
    });
  }
  function normalizeState(value){
    if (!value || typeof value !== 'object' || !value.days || typeof value.days !== 'object') throw new Error('Invalid saved state');
    return { goal: Number(value.goal) > 0 ? Number(value.goal) : 3500, days: value.days };
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
  }
  function scheduleCloudSave(){
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(async () => {
      try { await writeCloudState(); }
      catch (error) { cloudStatus = 'Ошибка синхронизации Telegram'; console.warn('Telegram CloudStorage save failed', error); }
    }, 500);
  }
  async function initializeStorage(){
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.initData && tg.CloudStorage) {
      cloudStorage = tg.CloudStorage;
      try { if (typeof tg.ready === 'function') tg.ready(); if (typeof tg.expand === 'function') tg.expand(); } catch {}
      try {
        const remoteState = await readCloudState();
        if (remoteState) {
          state = remoteState;
          localStorage.setItem(STORE, JSON.stringify(state));
          cloudStatus = 'Загружено из Telegram';
        } else {
          cloudStatus = 'Первая синхронизация с Telegram';
        }
        cloudReady = true;
        if (!remoteState) await writeCloudState();
      } catch (error) {
        cloudReady = false;
        cloudStatus = 'Ошибка чтения Telegram CloudStorage';
        console.warn('Telegram CloudStorage load failed', error);
      }
    }
    render();
  }
  function dateKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function dayData(key=currentDate){ if(!state.days[key]) state.days[key] = {calories:0, weight:'', sleep:'', checks:{water:false,activity:false,sleepRoutine:false}, note:''}; const d=state.days[key]; d.checks ||= {water:false,activity:false,sleepRoutine:false}; return d; }
  function dateFromKey(key){ const [y,m,d]=key.split('-').map(Number); return new Date(y,m-1,d); }
  function formatDate(key){return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(dateFromKey(key));}
  function formatDay(key){return new Intl.DateTimeFormat('ru-RU',{weekday:'long'}).format(dateFromKey(key)).toUpperCase();}
  function fmtNum(n){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n);}
  function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1900);}
  function render(){
    const d=dayData(); const calories=Number(d.calories)||0; const goal=Number(state.goal)||3500; const remaining=goal-calories; const pct=Math.min(100,Math.round(calories/goal*100));
    $('#dayName').textContent=formatDay(currentDate); $('#dateTitle').textContent=formatDate(currentDate);
    $('#goalLabel').textContent=fmtNum(goal); $('#caloriesValue').textContent=fmtNum(calories); $('#remainingValue').textContent=fmtNum(remaining); $('#calorieProgress').style.width=pct+'%'; $('#progressPercent').textContent=pct+'% от цели';
    $('#progressStatus').textContent=calories===0?'Начни свой день':remaining<0?'Цель превышена':remaining===0?'Цель выполнена':'Хороший темп';
    $('#weightValue').textContent=d.weight===''?'—':fmtNum(d.weight); $('#sleepValue').textContent=d.sleep===''?'—':fmtNum(d.sleep);
    $('#weightNote').textContent=d.weight===''?'Отслеживай динамику':'Записано за этот день'; $('#sleepNote').textContent=d.sleep===''?'Цель — 8 часов':Number(d.sleep)>=8?'Цель по сну достигнута':'До цели: '+fmtNum(8-Number(d.sleep))+' ч';
    $$('[data-check]').forEach(el=>el.checked=!!d.checks[el.dataset.check]); $('#routineCount').textContent=$$('[data-check]').filter(el=>el.checked).length+'/3'; $('#dayNote').value=d.note||''; $('#noteCount').textContent=(d.note||'').length+'/1000';
  }
  function shiftDay(delta){const d=dateFromKey(currentDate);d.setDate(d.getDate()+delta);currentDate=dateKey(d);render();}
  function openEditor(type){editType=type;const config={goal:['Дневная цель','Калории в день','3500','Укажи цель в ккал.'],weight:['Записать вес','Вес в килограммах',dayData().weight||'','Например, 78.5 кг.'],sleep:['Записать сон','Часов сна',dayData().sleep||'','Можно указать дробное значение, например 7.5.'],custom:['Добавить калории','Количество ккал','','Укажи число больше нуля.']}[type];$('#dialogTitle').textContent=config[0];$('#fieldLabel').textContent=config[1];$('#fieldInput').value=config[2];$('#fieldInput').placeholder=type==='weight'?'78.5':type==='sleep'?'7.5':'0';$('#fieldInput').step=type==='weight'||type==='sleep'?'0.1':'1';$('#fieldInput').min='0';$('#fieldHint').textContent=config[3];$('#editDialog').showModal();setTimeout(()=>$('#fieldInput').focus(),100);}
  $('#editForm').addEventListener('submit',e=>{e.preventDefault();const val=Number($('#fieldInput').value);if(!Number.isFinite(val)||val<0||$('#fieldInput').value.trim()===''){toast('Введи корректное число');return;}if(editType==='goal'){if(val<=0){toast('Цель должна быть больше нуля');return;}state.goal=Math.round(val);}else if(editType==='weight'){dayData().weight=Math.round(val*10)/10;}else if(editType==='sleep'){if(val>24){toast('Сон не может быть больше 24 часов');return;}dayData().sleep=Math.round(val*10)/10;}else if(editType==='custom'){dayData().calories+=Math.round(val);}saveState();$('#editDialog').close();render();toast('Данные сохранены');});
  $('#prevDay').addEventListener('click',()=>shiftDay(-1));$('#nextDay').addEventListener('click',()=>shiftDay(1));$('#todayBtn').addEventListener('click',()=>{currentDate=dateKey(new Date());render();toast('Сегодняшний день');});
  $('#editGoal').addEventListener('click',()=>openEditor('goal'));$('#editWeight').addEventListener('click',()=>openEditor('weight'));$('#editSleep').addEventListener('click',()=>openEditor('sleep'));$('#customAdd').addEventListener('click',()=>openEditor('custom'));
  $$('.add-chip[data-add]').forEach(btn=>btn.addEventListener('click',()=>{dayData().calories+=Number(btn.dataset.add);saveState();render();toast('Добавлено '+btn.dataset.add+' ккал');}));
  $('#resetCalories').addEventListener('click',()=>{if(dayData().calories===0){toast('Счётчик уже пустой');return;}if(confirm('Сбросить все калории за этот день?')){dayData().calories=0;saveState();render();toast('Калории сброшены');}});
  $$('[data-check]').forEach(el=>el.addEventListener('change',()=>{dayData().checks[el.dataset.check]=el.checked;saveState();render();}));
  $('#dayNote').addEventListener('input',()=>{dayData().note=$('#dayNote').value;$('#noteCount').textContent=$('#dayNote').value.length+'/1000';saveState();});

  const app=$('.app-shell');const sub=$('#subview');
  function showView(view){if(view==='day'){sub.hidden=true;app.hidden=false;$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view==='day'));return;}app.hidden=true;sub.hidden=false;$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const titles={history:'История',stats:'Прогресс',settings:'Настройки'};$('#subviewTitle').textContent=titles[view];const content=$('#subviewContent');content.innerHTML='';
    if(view==='history') renderHistory(content);
    if(view==='stats') renderStats(content);
    if(view==='settings') renderSettings(content);
  }
  function renderHistory(content){const keys=Object.keys(state.days).filter(k=>{const d=state.days[k];return d.calories||d.weight!==''||d.sleep!==''||d.note||(d.checks&&Object.values(d.checks).some(Boolean));}).sort().reverse();if(!keys.length){content.innerHTML='<div class="card empty-state">Здесь появятся дни, в которые ты вносил данные.<br>Начни с сегодняшнего дня.</div>';return;}keys.forEach(key=>{const d=state.days[key];const row=document.createElement('button');row.className='history-row';row.style.cssText='width:100%;background:transparent;border:0;color:inherit;text-align:left';row.innerHTML=`<span><strong>${formatDate(key)}</strong><small>${formatDay(key)}</small></span><span class="history-value">${fmtNum(d.calories||0)} <small>ккал</small></span>`;row.addEventListener('click',()=>{currentDate=key;showView('day');render();});content.append(row);});}
  function renderStats(content){const entries=Object.entries(state.days).sort(([a],[b])=>a.localeCompare(b));const weights=entries.filter(([,d])=>d.weight!==''&&Number.isFinite(Number(d.weight)));const sleeps=entries.filter(([,d])=>d.sleep!==''&&Number.isFinite(Number(d.sleep)));const cal=entries.filter(([,d])=>Number(d.calories)>0);const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;const avgCal=avg(cal.map(([,d])=>Number(d.calories)));const avgSleep=avg(sleeps.map(([,d])=>Number(d.sleep)));const latestWeight=weights.at(-1);content.innerHTML=`<div class="stats-grid"><article class="card stat-card"><span class="eyebrow">СРЕДНИЕ КАЛОРИИ</span><div class="stat-value">${cal.length?fmtNum(avgCal):'—'}<small>ккал</small></div><div class="stat-note">По ${cal.length} ${plural(cal.length,'дню','дням','дням')} с записями</div></article><article class="card stat-card"><span class="eyebrow">СРЕДНИЙ СОН</span><div class="stat-value">${sleeps.length?fmtNum(avgSleep):'—'}<small>ч</small></div><div class="stat-note">По ${sleeps.length} ${plural(sleeps.length,'ночи','ночам','ночам')} с записями</div></article><article class="card stat-card"><span class="eyebrow">ПОСЛЕДНИЙ ВЕС</span><div class="stat-value">${latestWeight?fmtNum(latestWeight[1].weight):'—'}<small>кг</small></div><div class="stat-note">${latestWeight?formatDate(latestWeight[0]):'Добавь первую запись'}</div></article><article class="card stat-card"><span class="eyebrow">ДНЕЙ С ДАННЫМИ</span><div class="stat-value">${entries.length}</div><div class="stat-note">Записи сохраняются на этом устройстве</div></article></div><div class="card"><div class="section-heading"><div><span class="eyebrow">ПОДСКАЗКА</span><h2>Стабильность важнее идеала</h2></div></div><p class="settings-copy">Вноси данные каждый день — со временем здесь появится полезная динамика. Средние значения считаются только по дням, где есть записи.</p></div>`;}
  function plural(n,one,few,many){const x=n%100;return x>=11&&x<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;}
  function renderSettings(content){content.innerHTML=`<div class="card"><div class="section-heading"><div><span class="eyebrow">ЦЕЛИ</span><h2>Твои настройки</h2></div></div><div class="settings-row"><span>Калории в день</span><button id="settingsGoal">${fmtNum(state.goal)} ккал · Изменить</button></div><div class="settings-row"><span>Данные</span><button id="exportData">Экспорт JSON</button></div><div class="settings-row"><span>Резервная копия</span><button id="importData">Импорт JSON</button></div><div class="settings-row"><span>Удаление данных</span><button id="clearData">Сбросить всё</button></div><p class="settings-copy" id="syncStatus">Хранение: ${cloudStatus}. В Telegram Mini App данные синхронизируются через Telegram CloudStorage для твоего аккаунта. Вне Telegram используется локальное хранилище браузера.</p><p class="settings-copy">Экспорт JSON можно использовать как резервную копию. Yagami Track · версия 1.1</p></div><input type="file" id="importFile" accept="application/json,.json" hidden>`;
    $('#settingsGoal').addEventListener('click',()=>{showView('day');openEditor('goal');});$('#exportData').addEventListener('click',exportData);$('#importData').addEventListener('click',()=>$('#importFile').click());$('#importFile').addEventListener('change',importData);$('#clearData').addEventListener('click',()=>{if(confirm('Удалить все сохранённые данные приложения? Это действие нельзя отменить.')){state={...defaultState,days:{}};saveState();currentDate=dateKey(new Date());render();showView('day');toast('Данные удалены');}});}
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='yagami-track-backup.json';a.click();URL.revokeObjectURL(url);toast('Резервная копия подготовлена');}
  function importData(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);if(!parsed||typeof parsed!=='object'||!parsed.days||typeof parsed.days!=='object')throw new Error('bad');state={goal:Number(parsed.goal)>0?Number(parsed.goal):3500,days:parsed.days};saveState();render();showView('day');toast('Данные импортированы');}catch{toast('Не удалось прочитать файл');}e.target.value='';};reader.readAsText(file);}
  $$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));$('#backToDay').addEventListener('click',()=>showView('day'));
  initializeStorage();
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
})();
