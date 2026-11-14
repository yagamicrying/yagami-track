(() => {
  'use strict';
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  const root = $('#workoutsContent');
  if (!root) return;

  const MUSCLES = [
    {id:'chest',ru:'Грудь',en:'Chest',ex:['Жим штанги лёжа','Жим гантелей лёжа','Жим на наклонной скамье','Сведение рук в кроссовере','Разводка гантелей','Отжимания','Жим в тренажёре']},
    {id:'back',ru:'Спина',en:'Back',ex:['Подтягивания','Тяга верхнего блока','Тяга штанги в наклоне','Тяга гантели одной рукой','Горизонтальная тяга блока','Тяга Т-грифа','Пуловер в блоке','Становая тяга']},
    {id:'lats',ru:'Широчайшие',en:'Lats',ex:['Подтягивания широким хватом','Тяга верхнего блока широким хватом','Тяга прямыми руками','Тяга гантели к поясу']},
    {id:'traps',ru:'Трапеции',en:'Traps',ex:['Шраги со штангой','Шраги с гантелями','Тяга к подбородку','Фермерская прогулка']},
    {id:'shoulders',ru:'Плечи',en:'Shoulders',ex:['Жим штанги стоя','Жим гантелей сидя','Махи гантелями в стороны','Махи перед собой','Обратная разводка','Тяга каната к лицу']},
    {id:'front-delts',ru:'Передняя дельта',en:'Front delts',ex:['Жим Арнольда','Подъём гантелей перед собой','Жим в тренажёре']},
    {id:'side-delts',ru:'Средняя дельта',en:'Side delts',ex:['Махи гантелями в стороны','Махи в кроссовере','Махи в тренажёре']},
    {id:'rear-delts',ru:'Задняя дельта',en:'Rear delts',ex:['Обратная разводка','Face pull','Разведение в тренажёре']},
    {id:'biceps',ru:'Бицепс',en:'Biceps',ex:['Подъём штанги на бицепс','Подъём гантелей на бицепс','Молотки','Подъём на скамье Скотта','Сгибания на нижнем блоке','Концентрированные сгибания']},
    {id:'triceps',ru:'Трицепс',en:'Triceps',ex:['Разгибание рук на блоке','Французский жим','Разгибание из-за головы','Узкий жим лёжа','Отжимания на брусьях','Разгибание одной руки']},
    {id:'forearms',ru:'Предплечья',en:'Forearms',ex:['Сгибание кистей со штангой','Разгибание кистей','Обратные сгибания','Удержание блинов','Вис на перекладине']},
    {id:'quads',ru:'Квадрицепсы',en:'Quadriceps',ex:['Приседания со штангой','Фронтальные приседания','Жим ногами','Разгибание ног','Болгарские выпады','Гакк-приседания']},
    {id:'hamstrings',ru:'Бицепс бедра',en:'Hamstrings',ex:['Румынская тяга','Сгибание ног лёжа','Сгибание ног сидя','Нордические сгибания','Доброе утро']},
    {id:'glutes',ru:'Ягодицы',en:'Glutes',ex:['Ягодичный мост','Hip thrust','Выпады','Отведение ноги в кроссовере','Приседания сумо','Шаги на платформу']},
    {id:'calves',ru:'Икры',en:'Calves',ex:['Подъём на носки стоя','Подъём на носки сидя','Подъём на носки в жиме ногами']},
    {id:'adductors',ru:'Приводящие мышцы',en:'Adductors',ex:['Сведение ног в тренажёре','Приседания сумо','Боковые выпады']},
    {id:'abductors',ru:'Отводящие мышцы',en:'Abductors',ex:['Разведение ног в тренажёре','Отведение ноги в кроссовере','Боковые шаги с резинкой']},
    {id:'abs',ru:'Пресс',en:'Abs',ex:['Скручивания','Подъём ног в висе','Планка','Обратные скручивания','Скручивания на блоке','Колесо для пресса']},
    {id:'obliques',ru:'Косые мышцы живота',en:'Obliques',ex:['Боковая планка','Русские скручивания','Дровосек в кроссовере','Наклоны с гантелью']},
    {id:'lower-back',ru:'Поясница',en:'Lower back',ex:['Гиперэкстензия','Обратная гиперэкстензия','Становая тяга','Доброе утро']},
    {id:'neck',ru:'Шея',en:'Neck',ex:['Сгибание шеи с сопротивлением','Разгибание шеи с сопротивлением','Боковые сгибания шеи']}
  ];

  const T = {
    ru:{title:'Тренировки',eyebrow:'ТВОЙ ТРЕНИРОВОЧНЫЙ ПЛАН',subtitle:'Создавай дни, собирай упражнения и отмечай тренировки в календаре.',plans:'Мои программы',addDay:'Новый день',empty:'Пока нет тренировочных дней',emptyHint:'Нажми плюс и создай первую программу.',calendar:'Календарь',today:'Сегодня',prev:'Предыдущий месяц',next:'Следующий месяц',selectDate:'Выбери дату',noWorkout:'Тренировка не назначена',assign:'Назначить тренировку',remove:'Убрать отметку',choosePlan:'Выбери программу',cancel:'Отмена',save:'Сохранить',day:'День',dayName:'Название дня',color:'Цвет дня',muscle:'Группа мышц',addMuscle:'Добавить группу мышц',exercise:'Упражнения',addExercise:'Добавить упражнение',chooseMuscle:'Выбери группу мышц',chooseExercise:'Выбери упражнение',customExercise:'Своё упражнение',customPlaceholder:'Название упражнения',add:'Добавить',delete:'Удалить',edit:'Изменить',confirmDelete:'Удалить этот тренировочный день?',language:'Язык',ru:'Русский',en:'English',noExercises:'Упражнения пока не добавлены',pickDate:'Нажми на день календаря, чтобы назначить программу.',assigned:'Назначено',muscles:'групп мышц',exercises:'упражнений',done:'Тренировка',close:'Закрыть',dayExists:'Этот день уже назначен на выбранную дату.',monthNames:['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],week:['Пн','Вт','Ср','Чт','Пт','Сб','Вс']},
    en:{title:'Workouts',eyebrow:'YOUR TRAINING PLAN',subtitle:'Create workout days, build exercise lists and mark sessions on the calendar.',plans:'My plans',addDay:'New day',empty:'No workout days yet',emptyHint:'Tap plus to create your first plan.',calendar:'Calendar',today:'Today',prev:'Previous month',next:'Next month',selectDate:'Select a date',noWorkout:'No workout assigned',assign:'Assign workout',remove:'Remove mark',choosePlan:'Choose a plan',cancel:'Cancel',save:'Save',day:'Day',dayName:'Day name',color:'Day color',muscle:'Muscle group',addMuscle:'Add muscle group',exercise:'Exercises',addExercise:'Add exercise',chooseMuscle:'Choose a muscle group',chooseExercise:'Choose an exercise',customExercise:'Custom exercise',customPlaceholder:'Exercise name',add:'Add',delete:'Delete',edit:'Edit',confirmDelete:'Delete this workout day?',language:'Language',ru:'Русский',en:'English',noExercises:'No exercises added yet',pickDate:'Tap a calendar date to assign a plan.',assigned:'Assigned',muscles:'muscle groups',exercises:'exercises',done:'Workout',close:'Close',dayExists:'A workout is already assigned to this date.',monthNames:['January','February','March','April','May','June','July','August','September','October','November','December'],week:['Mon','Tue','Wed','Thu','Fri','Sat','Sun']}
  };

  const api = window.YagamiTrackWorkouts;
  let data = api ? api.getData() : {plans:[],sessions:{}};
  data = data && typeof data==='object' ? data : {plans:[],sessions:{}};
  data.plans = Array.isArray(data.plans) ? data.plans : [];
  data.sessions = data.sessions && typeof data.sessions==='object' ? data.sessions : {};
  let lang = api ? api.getLanguage() : 'ru';
  if (!['ru','en'].includes(lang)) lang='ru';
  let month = new Date(new Date().getFullYear(),new Date().getMonth(),1);
  let selectedDate = iso(new Date());
  let editingPlan = null;
  let draft = null;
  let draftMuscle = null;
  const t = key => T[lang][key] ?? T.ru[key] ?? key;
  const muscleName = id => { const m=MUSCLES.find(x=>x.id===id); return m ? (lang==='ru'?m.ru:m.en) : String(id||'').startsWith('custom:') ? String(id).slice(7) : id; };
  const exerciseName = name => name;
  const uid = () => 'w'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function persist(){ if(api){api.saveData(data);} else {try{localStorage.setItem('yagami-track-workouts-v1',JSON.stringify(data));}catch(_){}} }
  function planById(id){return data.plans.find(p=>p.id===id);}
  function monthTitle(d){return t('monthNames')[d.getMonth()]+' '+d.getFullYear();}
  window.addEventListener('kairo:language-change',event=>{lang=event.detail&&event.detail.language==='en'?'en':'ru';render();});
  function render(){
    root.innerHTML = '<div class="workout-toolbar"><div><span class="eyebrow">'+t('eyebrow')+'</span><h2>'+t('title')+'</h2><p>'+t('subtitle')+'</p></div></div>'+
      '<section class="card workout-plans-card"><div class="workout-section-head"><div><span class="eyebrow">'+t('plans')+'</span><h3>'+t('plans')+'</h3></div><button type="button" class="workout-add-day" id="addWorkoutDay" aria-label="'+t('addDay')+'" title="'+t('addDay')+'">＋</button></div><div class="workout-plan-list" id="workoutPlanList"></div></section>'+
      '<section class="card workout-calendar-card"><div class="workout-section-head"><div><span class="eyebrow">'+t('calendar')+'</span><h3>'+t('calendar')+'</h3></div><button type="button" class="workout-today" id="workoutToday">'+t('today')+'</button></div><div class="workout-month-head"><button type="button" id="workoutPrev" aria-label="'+t('prev')+'">‹</button><strong>'+monthTitle(month)+'</strong><button type="button" id="workoutNext" aria-label="'+t('next')+'">›</button></div><div class="workout-weekdays">'+t('week').map(x=>'<span>'+x+'</span>').join('')+'</div><div class="workout-calendar-grid" id="workoutCalendarGrid"></div><div class="workout-date-detail" id="workoutDateDetail"></div></section>';    $('#addWorkoutDay',root).addEventListener('click',()=>openEditor());
    $('#workoutPrev',root).addEventListener('click',()=>{month.setMonth(month.getMonth()-1);renderCalendar();});
    $('#workoutNext',root).addEventListener('click',()=>{month.setMonth(month.getMonth()+1);renderCalendar();});
    $('#workoutToday',root).addEventListener('click',()=>{const now=new Date();month=new Date(now.getFullYear(),now.getMonth(),1);selectedDate=iso(now);renderCalendar();});
    renderPlans(); renderCalendar();
  }
  function renderPlans(){
    const list=$('#workoutPlanList',root);
    if(!data.plans.length){list.innerHTML='<div class="workout-empty"><strong>'+t('empty')+'</strong><small>'+t('emptyHint')+'</small></div>';return;}
    list.innerHTML=data.plans.map((p,i)=>'<article class="workout-plan-row"><span class="workout-plan-dot" style="--plan-color:'+(p.color||'#0a84ff')+'"></span><button type="button" class="workout-plan-main" data-edit-plan="'+esc(p.id)+'"><strong>'+esc(p.name||t('day')+' '+(i+1))+'</strong><small>'+p.groups.length+' '+t('muscles')+' · '+p.groups.reduce((n,g)=>n+g.exercises.length,0)+' '+t('exercises')+'</small></button><button type="button" class="workout-plan-edit" data-edit-plan="'+esc(p.id)+'" aria-label="'+t('edit')+'">✎</button></article>').join('');
    $$('[data-edit-plan]',list).forEach(btn=>btn.addEventListener('click',()=>openEditor(btn.dataset.editPlan)));
  }
  function renderCalendar(){
    const grid=$('#workoutCalendarGrid',root),detail=$('#workoutDateDetail',root);
    if(!grid||!detail)return;
    const first=new Date(month.getFullYear(),month.getMonth(),1),offset=(first.getDay()+6)%7,start=new Date(first);start.setDate(first.getDate()-offset);
    const today=iso(new Date());
    grid.innerHTML=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const key=iso(d),session=data.sessions[key],plan=session&&planById(session),inMonth=d.getMonth()===month.getMonth();return '<button type="button" class="workout-calendar-day '+(inMonth?'':'is-outside')+(key===selectedDate?' is-selected':'')+(key===today?' is-today':'')+(plan?' has-workout':'')+'" data-date="'+key+'"><span>'+d.getDate()+'</span>'+(plan?'<i style="--plan-color:'+(plan.color||'#0a84ff')+'"></i>':'')+'</button>';}).join('');
    $$('[data-date]',grid).forEach(btn=>btn.addEventListener('click',()=>{selectedDate=btn.dataset.date;const d=new Date(selectedDate+'T12:00:00');month=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar();}));
    const active=data.sessions[selectedDate],plan=active&&planById(active);
    detail.innerHTML='<div class="workout-date-copy"><strong>'+t('selectDate')+' · '+new Intl.DateTimeFormat(lang==='ru'?'ru-RU':'en-US',{day:'numeric',month:'long',year:'numeric'}).format(new Date(selectedDate+'T12:00:00'))+'</strong><small>'+(plan?esc(plan.name)+' · '+t('assigned'):t('noWorkout'))+'</small></div><div class="workout-date-actions"><select id="workoutAssignSelect" aria-label="'+t('choosePlan')+'"><option value="">'+t('choosePlan')+'</option>'+data.plans.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===active?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select><button type="button" class="primary-button" id="workoutAssign" '+(!data.plans.length?'disabled':'')+'>'+t('assign')+'</button>'+(active?'<button type="button" class="workout-remove" id="workoutRemove">'+t('remove')+'</button>':'')+'</div><p class="workout-calendar-hint">'+(plan?(lang==='ru'?'Нажми на программу выше, чтобы изменить её в списке «Мои программы».':'Tap the plan in “My plans” to edit it.'):(lang==='ru'?'Выбери программу и нажми «Назначить тренировку».':'Choose a plan and tap “Assign workout”.'))+'</p>';
    $('#workoutAssign',detail).addEventListener('click',()=>{const id=$('#workoutAssignSelect',detail).value;if(!id)return;data.sessions[selectedDate]=id;persist();renderCalendar();});
    $('#workoutRemove',detail)?.addEventListener('click',()=>{delete data.sessions[selectedDate];persist();renderCalendar();});
  }
  function openEditor(id){
    editingPlan=id||null;
    const original=id?planById(id):null;
    draft=original?JSON.parse(JSON.stringify(original)):{id:uid(),name:t('day')+' '+(data.plans.length+1),color:'#0a84ff',groups:[]};
    if(!draft.color)draft.color='#0a84ff';
    renderEditor();
  }
  function renderEditor(){
    const existing=$('#workoutEditor',document);
    if(existing)existing.remove();
    const dialog=document.createElement('dialog');dialog.id='workoutEditor';dialog.className='workout-editor-dialog';
    dialog.innerHTML='<form method="dialog" class="workout-editor-form"><div class="workout-editor-head"><div><span class="eyebrow">'+t('day')+'</span><h2>'+t('edit')+' / '+t('day')+'</h2></div><button type="button" class="workout-dialog-close" id="workoutEditorClose">×</button></div><label>'+t('dayName')+'<input id="workoutPlanName" maxlength="40" value="'+esc(draft.name)+'"></label><div class="workout-color-field"><span class="workout-field-label">'+t('color')+'</span><div class="workout-color-palette" id="workoutColorPalette" role="group" aria-label="'+t('color')+'">'+[['#0a84ff','Синий','Blue'],['#ff8a00','Оранжевый','Orange'],['#22c55e','Зелёный','Green'],['#a855f7','Фиолетовый','Purple'],['#ec4899','Розовый','Pink'],['#06b6d4','Бирюзовый','Cyan'],['#eab308','Жёлтый','Yellow'],['#ef4444','Красный','Red']].map(([color,ru,en])=>'<button type="button" class="workout-color-swatch '+(draft.color===color?'is-selected':'')+'" data-color="'+color+'" style="--swatch:'+color+'" aria-label="'+(lang==='ru'?ru:en)+'" aria-pressed="'+(draft.color===color)+'"></button>').join('')+'</div></div><label>'+ (lang==='ru'?'Дата тренировки':'Workout date') +'<input type="date" id="workoutPlanDate" value="'+esc(selectedDate)+'"></label><div class="workout-editor-groups"><div class="workout-section-head"><h3>'+t('muscle')+'</h3><button type="button" class="workout-add-day" id="addWorkoutMuscle">＋</button></div><div id="workoutDraftGroups"></div></div><div class="workout-editor-actions"><button type="button" class="secondary-button" id="workoutDelete" '+(!editingPlan?'hidden':'')+'>'+t('delete')+'</button><button type="button" class="primary-button" id="workoutSave">'+t('save')+'</button></div></form>';
    document.body.append(dialog);
    $('#workoutEditorClose',dialog).addEventListener('click',()=>dialog.close());
    $('#workoutPlanName',dialog).addEventListener('input',e=>{draft.name=e.target.value;});
    $$('.workout-color-swatch',dialog).forEach(btn=>btn.addEventListener('click',()=>{draft.color=btn.dataset.color;$$('.workout-color-swatch',dialog).forEach(item=>{const active=item===btn;item.classList.toggle('is-selected',active);item.setAttribute('aria-pressed',String(active));});}));
    $('#addWorkoutMuscle',dialog).addEventListener('click',openMusclePicker);
    $('#workoutSave',dialog).addEventListener('click',savePlan);
    $('#workoutDelete',dialog).addEventListener('click',deletePlan);
    renderDraftGroups();
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    dialog.showModal();
  }
  function renderDraftGroups(){
    const box=$('#workoutDraftGroups');if(!box)return;
    if(!draft.groups.length){box.innerHTML='<div class="workout-empty compact">'+t('noExercises')+'</div>';return;}
    box.innerHTML=draft.groups.map((g,gi)=>'<article class="workout-muscle-group"><div class="workout-muscle-head"><strong>'+esc(muscleName(g.muscle))+'</strong><button type="button" data-remove-group="'+gi+'" aria-label="'+t('delete')+'">×</button></div><div class="workout-exercise-list">'+g.exercises.map((ex,ei)=>'<div class="workout-exercise-row"><span>'+esc(ex)+'</span><button type="button" data-remove-exercise="'+gi+':'+ei+'" aria-label="'+t('delete')+'">×</button></div>').join('')+'</div><button type="button" class="workout-add-exercise" data-add-exercise="'+gi+'">＋ '+t('addExercise')+'</button></article>').join('');
    $$('[data-remove-group]',box).forEach(b=>b.addEventListener('click',()=>{draft.groups.splice(Number(b.dataset.removeGroup),1);renderDraftGroups();}));
    $$('[data-remove-exercise]',box).forEach(b=>b.addEventListener('click',()=>{const [g,e]=b.dataset.removeExercise.split(':').map(Number);draft.groups[g].exercises.splice(e,1);if(!draft.groups[g].exercises.length)draft.groups.splice(g,1);renderDraftGroups();}));
    $$('[data-add-exercise]',box).forEach(b=>b.addEventListener('click',()=>{draftMuscle=Number(b.dataset.addExercise);openExercisePicker();}));
  }
  function openMusclePicker(){
    const dialog=document.createElement('dialog');dialog.className='workout-picker-dialog';
    dialog.innerHTML='<div class="workout-picker-head"><strong>'+t('chooseMuscle')+'</strong><button type="button" class="workout-dialog-close">×</button></div><div class="workout-picker-list">'+MUSCLES.map(m=>'<button type="button" data-muscle="'+m.id+'">'+esc(lang==='ru'?m.ru:m.en)+' <span>＋</span></button>').join('')+'</div><form class="workout-custom-muscle"><label>'+(lang==='ru'?'Своя группа мышц':'Custom muscle group')+'<input id="workoutCustomMuscle" maxlength="60" placeholder="'+(lang==='ru'?'Например, корпус':'e.g. Core')+'"></label><button type="submit" class="primary-button">'+t('add')+'</button></form>';
    document.body.append(dialog);dialog.querySelector('.workout-dialog-close').addEventListener('click',()=>dialog.close());
    $$('[data-muscle]',dialog).forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.muscle;if(draft.groups.some(g=>g.muscle===id)){toast(lang==='ru'?'Эта группа уже добавлена':'This muscle group is already added');return;}draft.groups.push({id:uid(),muscle:id,exercises:[]});draftMuscle=draft.groups.length-1;dialog.close();renderDraftGroups();openExercisePicker();}));
    $('.workout-custom-muscle',dialog).addEventListener('submit',e=>{e.preventDefault();const name=$('#workoutCustomMuscle',dialog).value.trim();if(!name)return;const id='custom:'+name;if(draft.groups.some(g=>g.muscle===id)){toast(lang==='ru'?'Эта группа уже добавлена':'This group is already added');return;}draft.groups.push({id:uid(),muscle:id,exercises:[]});draftMuscle=draft.groups.length-1;dialog.close();renderDraftGroups();openExercisePicker();});
    dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
  }
  function openExercisePicker(){
    const group=draft.groups[draftMuscle];if(!group)return;
    const muscle=MUSCLES.find(m=>m.id===group.muscle),exercises=muscle?muscle.ex:[];
    const dialog=document.createElement('dialog');dialog.className='workout-picker-dialog';
    dialog.innerHTML='<div class="workout-picker-head"><strong>'+t('chooseExercise')+' · '+esc(muscleName(group.muscle))+'</strong><button type="button" class="workout-dialog-close">×</button></div><div class="workout-picker-list">'+exercises.map((ex,i)=>'<button type="button" data-exercise="'+i+'">'+esc(ex)+' <span>＋</span></button>').join('')+'</div><form class="workout-custom-exercise"><label>'+t('customExercise')+'<input id="workoutCustomExercise" maxlength="80" placeholder="'+t('customPlaceholder')+'"></label><button type="submit" class="primary-button">'+t('add')+'</button></form>';
    document.body.append(dialog);dialog.querySelector('.workout-dialog-close').addEventListener('click',()=>dialog.close());
    $$('[data-exercise]',dialog).forEach(btn=>btn.addEventListener('click',()=>{const name=exercises[Number(btn.dataset.exercise)];if(!group.exercises.includes(name))group.exercises.push(name);dialog.close();renderDraftGroups();}));
    $('.workout-custom-exercise',dialog).addEventListener('submit',e=>{e.preventDefault();const name=$('#workoutCustomExercise',dialog).value.trim();if(!name)return;if(!group.exercises.includes(name))group.exercises.push(name);dialog.close();renderDraftGroups();});
    dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
  }
  function savePlan(){
    const name=$('#workoutPlanName').value.trim();
    if(!name){toast(lang==='ru'?'Введи название дня':'Enter a day name');return;}
    draft.name=name;draft.color=draft.color||'#0a84ff';
    const workoutDate=$('#workoutPlanDate')?.value||selectedDate;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(workoutDate)){toast(lang==='ru'?'Выбери корректную дату':'Choose a valid date');return;}
    const index=data.plans.findIndex(p=>p.id===draft.id);
    if(index>=0)data.plans[index]=draft;else data.plans.push(draft);
    data.sessions[workoutDate]=draft.id;selectedDate=workoutDate;const selected=new Date(workoutDate+'T12:00:00');month=new Date(selected.getFullYear(),selected.getMonth(),1);
    persist();$('#workoutEditor').close();$('#workoutEditor').remove();renderPlans();renderCalendar();
  }
  function deletePlan(){
    if(!confirm(t('confirmDelete')))return;
    data.plans=data.plans.filter(p=>p.id!==draft.id);
    Object.keys(data.sessions).forEach(key=>{if(data.sessions[key]===draft.id)delete data.sessions[key];});
    persist();$('#workoutEditor').close();$('#workoutEditor').remove();renderPlans();renderCalendar();
  }
  function toast(message){const node=$('#toast');if(node){node.textContent=message;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),1900);}else alert(message);}
  render();
})();