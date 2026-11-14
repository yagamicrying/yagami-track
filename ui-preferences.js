(() => {
  'use strict';
  const palettes = {
    blue: ['#0a84ff','10,132,255','#69b5ff'],
    orange: ['#f28c28','242,140,40','#ffb15e'],
    green: ['#20a66a','32,166,106','#55d69a'],
    purple: ['#9563df','149,99,223','#bd98f5'],
    pink: ['#e65b9a','230,91,154','#ff91c0'],
    cyan: ['#18a6b8','24,166,184','#62d4e0'],
    yellow: ['#c69a16','198,154,22','#f0c64f']
  };
  const translations = {
    'Сегодня ещё не начинал':'Haven’t started today',
    'Активность сегодня':'Active today','ПИТАНИЕ':'NUTRITION','Калории':'Calories','Цель: ':'Goal: ',
    'СЪЕДЕНО':'EATEN','ОСТАЛОСЬ':'REMAINING','ккал':'kcal','от цели':'of goal',
    'Начни свой день':'Start your day','Цель превышена':'Goal exceeded','Цель выполнена':'Goal reached','Хороший темп':'Good pace',
    'БЫСТРО ДОБАВИТЬ':'QUICK ADD','+ Другое':'+ Other','Сбросить калории за день':'Reset today’s calories',
    'ТЕЛО':'BODY','Вес':'Weight','+ Записать вес':'+ Log weight','Отслеживай динамику':'Track your progress',
    'Записано за этот день':'Logged for this day','ВОССТАНОВЛЕНИЕ':'RECOVERY','Сон':'Sleep',
    '+ Записать сон':'+ Log sleep','Цель — 8 часов':'Goal: 8 hours','Цель по сну достигнута':'Sleep goal reached',
    'До цели: ':'Remaining: ','СТАТИСТИКА':'STATISTICS','Общая статистика':'Overall statistics',
    'ЖУРНАЛ':'JOURNAL','История записей':'History','Тренировки':'Workouts','Настройки':'Settings',
    'ПАРАМЕТРЫ':'PREFERENCES','Закрыть настройки':'Close settings','Сегодня':'Today',
    'СРЕДА':'WEDNESDAY','ПОНЕДЕЛЬНИК':'MONDAY','ВТОРНИК':'TUESDAY','ЧЕТВЕРГ':'THURSDAY','ПЯТНИЦА':'FRIDAY','СУББОТА':'SATURDAY','ВОСКРЕСЕНЬЕ':'SUNDAY',
    'Трекер':'Tracker','История':'History','Правовая информация':'Legal information',
    'Изменить':'Edit','Дневная цель':'Daily goal','Калории в день':'Calories per day',
    'Укажи цель в ккал.':'Enter your goal in kcal.','Записать вес':'Log weight',
    'Вес в килограммах':'Weight in kilograms','Например, 78.5 кг.':'For example, 78.5 kg.',
    'Записать сон':'Log sleep','Часов сна':'Hours of sleep','Добавить калории':'Add calories',
    'Количество ккал':'Calories','Укажи число больше нуля.':'Enter a number greater than zero.',
    'Введи корректное число':'Enter a valid number','Цель должна быть больше нуля':'Goal must be greater than zero',
    'Сон не может быть больше 24 часов':'Sleep cannot exceed 24 hours','Данные сохранены':'Data saved',
    'Добавлено ':'Added ',' ккал':' kcal','Счётчик уже пустой':'The counter is already empty',
    'Сбросить все калории за этот день?':'Reset all calories for this day?',
    'Калории сброшены':'Calories reset','Сегодняшний день':'Today',
    'ЦЕЛИ':'GOALS','Твои настройки':'Your settings','Валюта игры':'Game currency',
    'Рубли (₽)':'Rubles (₽)','Доллары ($)':'Dollars ($)','Синхронизация Telegram':'Telegram sync',
    'Синхронизировать':'Sync now','Данные':'Data','Экспорт JSON':'Export JSON',
    'Резервная копия':'Backup','Импорт JSON':'Import JSON','Удаление данных':'Delete data',
    'Сбросить всё':'Reset all','Конфиденциальность':'Privacy','Политика конфиденциальности':'Privacy policy',
    'Данные удалены':'Data deleted','Данные импортированы':'Data imported','Не удалось прочитать файл':'Could not read the file',
    'Отмена':'Cancel','Сохранить':'Save','Закрыть':'Close','Значение':'Value',
    'Внешний вид':'Appearance','Язык приложения':'App language','Цвет интерфейса':'Accent color',
    'Фон приложения':'App background','Чёрный':'Black','Белый':'White',
    'Синий':'Blue','Оранжевый':'Orange','Зелёный':'Green','Фиолетовый':'Purple','Розовый':'Pink','Бирюзовый':'Cyan','Жёлтый':'Yellow',
    "СРЕДНИЕ КАЛОРИИ ЗА ВСЁ ВРЕМЯ":"AVERAGE CALORIES ALL TIME",
    "СРЕДНИЙ СОН ЗА ВСЁ ВРЕМЯ":"AVERAGE SLEEP ALL TIME",
    "ПОСЛЕДНИЙ ВЕС":"LATEST WEIGHT",
    "ДНЕЙ С ДАННЫМИ":"DAYS WITH DATA",
    "Добавь первую запись":"Add your first entry",
    "За всё время":"All time",
    "Показать всю историю":"Show full history",
    "Скрыть историю":"Hide history",
    "Нет данных за выбранный период":"No data for the selected period",
    "Заметка за день":"Daily note",
    "Локальное сохранение":"Local storage",
    "Не удалось сохранить данные":"Could not save data",
    "ВЕС":"WEIGHT",
    "СОН":"SLEEP",
    "КАЛОРИИ":"CALORIES",
  };
  const reverse = Object.fromEntries(Object.entries(translations).map(([ru,en])=>[en,ru]));
  function translateNode(node, language) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const raw=node.nodeValue, trimmed=raw.trim();
    if(!trimmed)return;
    const table=language==='en'?translations:reverse;
    const translated=table[trimmed];
    if(translated!==undefined)node.nodeValue=raw.replace(trimmed,translated);
  }
  function translateTree(root,language) {
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(node.parentElement && !node.parentElement.closest('script,style,textarea,input,select,option,[contenteditable="true"]'))translateNode(node,language);
    }
    root.querySelectorAll?.('[aria-label],[title],[placeholder]').forEach(el=>{
      for(const attr of ['aria-label','title','placeholder']){
        const value=el.getAttribute(attr);if(!value)continue;
        const table=language==='en'?translations:reverse;
        if(table[value])el.setAttribute(attr,table[value]);
      }
    });
  }
  function apply(state) {
    const accent=palettes[state&&state.themeColor]||palettes.blue;
    const mode=state&&state.themeMode==='light'?'light':'dark';
    const language=state&&state.language==='en'?'en':'ru';
    const root=document.documentElement;
    root.dataset.accent=palettes[state&&state.themeColor]?state.themeColor:'blue';
    root.dataset.theme=mode;
    root.lang=language;
    root.style.setProperty('--accent',accent[0]);
    root.style.setProperty('--accent-rgb',accent[1]);
    root.style.setProperty('--accent-strong',accent[2]);
    root.style.setProperty('--accent-tint',`rgba(${accent[1]},.15)`);
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=mode==='light'?'#f3f4f6':'#111111';
    translateTree(document.body,language);
  }
  window.KairoPreferences={apply,translateTree};
  const observer=new MutationObserver(records=>{
    const language=document.documentElement.lang||'ru';
    for(const record of records){
      if(record.type==='childList')record.addedNodes.forEach(node=>{
        if(node.nodeType===Node.TEXT_NODE)translateNode(node,language);
        else if(node.nodeType===Node.ELEMENT_NODE)translateTree(node,language);
      });
      else if(record.type==='characterData')translateNode(record.target,language);
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('kairo:language-change',event=>translateTree(document.body,event.detail&&event.detail.language==='en'?'en':'ru'));
})();