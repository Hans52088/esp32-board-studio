'use strict';
(() => {
  const release = window.BOARD_RELEASE;
  const sections = [
    ['connection','連線與硬體','設定裝置連線','使用 ESP32-WROOM-32 與標準 64×32、1/16 掃描 HUB75 面板。下方有完整接線與組裝教學，匯出程式已明確指定相同 GPIO。'],
    ['boot','開機畫面','一開機，就有你的風格','開機後立即播放；Wi-Fi 在背景連線。顯示結束後回到日期或預設一般訊息。'],
    ['message','一般訊息','讓日常訊息更醒目','文字超過面板寬度會自動捲動。顯示時間結束後，回到萬年曆。'],
    ['announce','公告','重要的事，定時提醒','預設公告會依排程播放。從 Blynk V1 發送新公告，會立刻播放指定時間，並替換後續排程內容。'],
    ['bell','門鈴','有人來訪，不再錯過','門鈴具有最高顯示優先權，夜間也會喚醒。再次收到相同門鈴訊號時，重新計時並重啟閃爍。'],
    ['date','萬年曆與休眠','安靜待命，準時醒來','待命顯示日期與星期。休眠只關閉萬年曆畫面，門鈴、一般訊息與立即公告仍可顯示。']
  ];
  // Schema drives the form, validation, configuration imports and firmware generation.
  const schema = [];
  const add = (group,key,label,type,value,extra={}) => schema.push({group,key,label,type,value,...extra});
  add('connection','templateId','Blynk Template ID','text','TMPL6vTtw0dIH');
  add('connection','templateName','Blynk Template 名稱','text','Wifi LED Board');
  add('connection','token','Blynk Auth Token','password','',{hint:'只寫入下載的程式；不會傳送到伺服器。'});
  add('connection','ssid','Wi-Fi 名稱','text','');
  add('connection','password','Wi-Fi 密碼','password','',{hint:'可留空以使用無密碼網路。'});
  add('connection','brightness','面板亮度（0–255）','number',90,{min:0,max:255});
  add('connection','timezone','時區（UTC 小時差）','number',8,{min:-12,max:14,hint:'台灣使用 8；不自動切換夏令時間。'});
  add('connection','scrollMs','捲動每步間隔（毫秒）','number',30,{min:10,max:1000,hint:'每次移動 1 像素，數值越小越快。所有畫面共用。'});
  const content = (g,a,b,c1,c2,blink=false,on=1000,off=500) => {
    add(g,g+'Text1','上排文字','text',a,{maxLength:256});
    add(g,g+'Text2','下排文字','text',b,{maxLength:256});
    add(g,g+'Color1','上排顏色','color',c1);
    add(g,g+'Color2','下排顏色','color',c2);
    add(g,g+'Blink','啟用整排同步閃爍','checkbox',blink);
    add(g,g+'On','亮起時間（毫秒）','number',on,{min:10,max:60000});
    add(g,g+'Off','熄滅時間（毫秒）','number',off,{min:10,max:60000});
  };
  content('boot','陽陽看板','開機完成','#ffff00','#00ffff');
  add('boot','bootSeconds','開機畫面顯示（秒）','number',5,{min:0,max:300,hint:'設為 0 可略過開機畫面。'});
  content('message','歡迎光臨','今日好心情','#ffff00','#00ffff');
  add('message','startMessage','開機畫面結束後顯示一般訊息','checkbox',false,{hint:'關閉時直接進入萬年曆；文字仍會保留在匯出的程式中。'});
  add('message','messageMinutes','一般訊息顯示（分鐘）','number',30,{min:1,max:1440});
  content('announce','重要公告','請留意通知','#ffffff','#0000ff');
  add('announce','announceMinutes','每次公告顯示（分鐘）','number',5,{min:1,max:1440});
  add('announce','scheduleEnabled','啟用每日公告排程','checkbox',true);
  add('announce','scheduleStart','每日排程起點','time','07:30',{hint:'從此時間起每隔指定分鐘播放；夜間休眠期間略過，隔日重新計算。'});
  add('announce','scheduleInterval','公告間隔（分鐘）','number',90,{min:1,max:1440,hint:'須大於或等於每次公告顯示時間。'});
  content('bell','門鈴響起','外面有人','#ff0000','#ffff00',true);
  add('bell','bellEnabled','啟用 433MHz 門鈴接收','checkbox',true);
  add('bell','rfPin','433MHz DATA GPIO','select',34,{options:[['34','GPIO 34'],['35','GPIO 35'],['36','GPIO 36'],['39','GPIO 39'],['32','GPIO 32'],['33','GPIO 33']],hint:'適用經典 ESP32；實際請核對開發板及 HUB75 接線。'});
  add('bell','rfMode','RF 觸發模式','choice','sniff',{options:[['sniff','嗅探模式：接收所有可解碼的非零碼'],['match','指定模式：只接受下列 RF 碼']],hint:'第一次使用先嗅探；讀取碼值後改為指定模式，再重新下載並上傳程式。'});
  add('bell','rfCodes','門鈴 RF 碼清單（最多 32 組）','textarea','',{maxLength:2048,hint:'每行一組，或以逗號、空白分隔。填十進位整數 1–4294967295，重複碼會自動合併。符合時顯示該碼的專屬文字或共用提醒；指定模式至少需要一組，請勿填 0。'});
  add('bell','bellSeconds','門鈴畫面顯示（秒）','number',60,{min:1,max:3600});
  add('date','dateColor1','日期顏色','color','#ff0000');
  add('date','dateColor2','星期顏色','color','#00ff00');
  add('date','dateBlink','啟用日期與星期同步閃爍','checkbox',false);
  add('date','dateOn','亮起時間（毫秒）','number',1000,{min:10,max:60000});
  add('date','dateOff','熄滅時間（毫秒）','number',500,{min:10,max:60000});
  add('date','nightEnabled','啟用夜間休眠','checkbox',true);
  add('date','nightStart','開始休眠時間','time','22:00');
  add('date','nightEnd','結束休眠時間','time','06:00',{hint:'支援跨午夜。開始與結束相同時，不進入休眠。'});

  add('connection','adminPassword','本機管理密碼（至少 12 個字元）','password','',{hint:'帳號 admin；留空即關閉區網管理與 OTA。此密碼只寫入韌體。'});
  add('connection','otaEnabled','允許 Arduino IDE 無線更新','checkbox',false);
  add('connection','dimEnabled','啟用分時亮度','checkbox',false);
  add('connection','dimLevel','時段內亮度（0–255）','number',25,{min:0,max:255});
  add('connection','dimFrom','亮度時段起點','time','18:00');
  add('connection','dimUntil','亮度時段終點','time','06:00');
  add('announce','weekdays','播放星期（0 日至 6 六）','text','0123456',{hint:'例：12345 代表週一至週五。跨午夜時段依起始日。'});
  add('announce','scheduleEnd','公告時段終點（不含）','time','22:00');
  add('announce','expiry','公告到期日（含當日）','date','');
  add('bell','rfLabels','各門鈴提醒（每行：碼值|上排|下排）','textarea','',{hint:'例：12345678|大門來訪|請應門。填入已登錄的碼值；可再加 |#ff0000|#ffff00|30 指定上下排顏色與秒數。'});
  function deviceRules(c){
    const codes=parseRfCodes(c.rfCodes), labels=new Map();
    for(const line of c.rfLabels.split(/\r?\n/).filter(x=>x.trim())){
      const fields=line.trim().split('|'),n=Number(fields[0]);
      if(![3,6].includes(fields.length)||!/^\d+$/.test(fields[0])||!codes.includes(n)||labels.has(n)||!(fields[1]||fields[2])) throw Error('每行需填已登錄的唯一碼值|上排|下排，至少填一排文字');
      if(fields.length===6&&(!/^#[0-9a-f]{6}$/i.test(fields[3])||!/^#[0-9a-f]{6}$/i.test(fields[4])||!/^\d+$/.test(fields[5])||+fields[5]<1||+fields[5]>3600))throw Error('顏色使用 #RRGGBB，秒數範圍 1–3600');
      labels.set(n,fields.slice(1).join('|'));
    }
    const value=codes.map(n=>labels.has(n)?n+'|'+labels.get(n):String(n)).join('\n');
    if(new TextEncoder().encode(value).length>3584)throw Error('門鈴清單超過 3584 位元組');
    return value;
  }
  const defaults = Object.fromEntries(schema.map(f=>[f.key,f.value]));
  let config = {...defaults}, active = 'connection', paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let elapsed=0, previous=0, toastTimer;
  const $=id=>document.getElementById(id);
  const escapeHtml = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function notify(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',4500);}
  function field(f){
    const id='field-'+f.key, v=config[f.key];
    const attrs=`id="${id}" name="${f.key}" ${f.hint?`aria-describedby="hint-${f.key}"`:''}`;
    let control;
    if(f.type==='textarea') control=`<textarea ${attrs} rows="5" maxlength="${f.maxLength||2048}" placeholder="例如：12345678&#10;87654321" spellcheck="false">${escapeHtml(v)}</textarea>`;
    else if(f.type==='select'||f.type==='choice') control=`<select ${attrs}>${f.options.map(([v1,t])=>`<option value="${v1}" ${String(v)===v1?'selected':''}>${t}</option>`).join('')}</select>`;
    else control=`<input ${attrs} type="${f.type}" ${f.type==='checkbox'?(v?'checked':''):`value="${escapeHtml(v)}"`} ${f.min!==undefined?`min="${f.min}" max="${f.max}" step="1"`:''} ${f.maxLength?`maxlength="${f.maxLength}"`:''} autocomplete="off">`;
    return `<div class="field">${f.type==='checkbox'?control:''}<label for="${id}">${f.label}</label>${f.type!=='checkbox'?control:''}${f.hint?`<small id="hint-${f.key}">${f.hint}</small>`:''}</div>`;
  }
  function renderForm(){
    $('tabs').innerHTML=sections.map(([id,label])=>`<button type="button" data-section="${id}" aria-selected="${id===active}">${label}</button>`).join('');
    const section=sections.find(s=>s[0]===active);
    $('settings').innerHTML=`<h2>${section[2]}</h2><p class="section-sub">${section[3]}</p>`+schema.filter(f=>f.group===active).map(field).join('')+'<p id="validation" role="status"></p>';
  }
  function parseRfCodes(value){
    if(typeof value!=='string')throw Error('RF 碼清單必須為文字');
    const tokens=value.trim().split(/[\s,，;；]+/u).filter(Boolean);
    if(tokens.some(t=>!/^\d+$/.test(t)||!Number.isSafeInteger(Number(t))||Number(t)<1||Number(t)>4294967295))throw Error('每組 RF 碼須為 1–4294967295 的十進位整數，不可填 0、負數或小數');
    const codes=[...new Set(tokens.map(Number))];
    if(codes.length>32)throw Error('RF 碼最多可設定 32 組');
    return codes;
  }
  function migrateConfig(obj){
    if(!obj||![1,2].includes(obj.version)||!obj.settings||typeof obj.settings!=='object'||Array.isArray(obj.settings))throw Error('不支援的設定檔格式');
    const next={...defaults};
    for(const f of schema)if(Object.hasOwn(obj.settings,f.key))next[f.key]=obj.settings[f.key];
    if(obj.version===1&&Object.hasOwn(obj.settings,'rfCode')){
      const code=obj.settings.rfCode;
      if(!Number.isInteger(code)||code<0||code>4294967295)throw Error('舊版 RF 碼無效');
      next.rfMode=code===0?'sniff':'match';next.rfCodes=code===0?'':String(code);
    }
    const errors=validate(next);if(errors.length)throw Error(errors[0][1]);
    return next;
  }
  function validate(c,credentials=false){
    const errors=[];
    for(const f of schema){const v=c[f.key];
      if(f.type==='checkbox'){if(typeof v!=='boolean')errors.push([f.key,`${f.label}必須為開關值`]);}
      else if(f.type==='choice'){if(!f.options.some(o=>o[0]===v))errors.push([f.key,`${f.label}選項無效`]);}
      else if(f.type==='number'||f.type==='select'){
        if(!Number.isInteger(v)||(f.min!==undefined&&(v<f.min||v>f.max))||(f.options&&!f.options.some(o=>+o[0]===v)))errors.push([f.key,`${f.label}數值無效${f.min!==undefined?`，範圍 ${f.min}–${f.max}`:''}`]);
      }else if(typeof v!=='string'||(f.type==='color'&&!/^#[a-f\d]{6}$/i.test(v))||(f.type==='time'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))||(f.maxLength&&v.length>f.maxLength))errors.push([f.key,`${f.label}格式或長度無效`]);
      else if((['rfCodes','rfLabels'].includes(f.key)?/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/:/[\x00-\x1f\x7f]/).test(v)) errors.push([f.key,`${f.label}不可包含換行或控制字元`]);
    }
    try{const codes=parseRfCodes(c.rfCodes);if(c.rfMode==='match'&&!codes.length)errors.push(['rfCodes','指定模式至少需填入一組 RF 碼']);}catch(error){errors.push(['rfCodes',error.message]);}
    if(!/^[0-6]{1,7}$/.test(c.weekdays))errors.push(['weekdays','請填 0 至 6 的星期數字']);
    if(c.expiry && (!/^\d{4}-\d{2}-\d{2}$/.test(c.expiry)||c.expiry<'2000-01-01'||isNaN(Date.parse(c.expiry))||new Date(c.expiry).toISOString().slice(0,10)!==c.expiry))errors.push(['expiry','到期日無效']);
    if(((credentials&&c.otaEnabled)||c.adminPassword)&&c.adminPassword.length<12)errors.push(['adminPassword','請設定至少 12 個字元的管理密碼']);
    try{deviceRules(c);}catch(e){errors.push(['rfLabels',e.message]);}
    if(c.scheduleEnabled&&c.announceMinutes>c.scheduleInterval)errors.push(['scheduleInterval','公告間隔須大於或等於公告顯示分鐘數']);
    if(credentials)for(const k of ['templateId','templateName','token','ssid'])if(!String(c[k]).trim()) errors.push([k,`請填入${schema.find(f=>f.key===k).label}`]);
    return errors;
  }
  function checkExport(){
    const errors=validate(config,true);
    if(!errors.length)return true;
    active=schema.find(f=>f.key===errors[0][0]).group;renderForm();
    $('validation').textContent=errors.map(e=>e[1]).join('；');
    $('field-'+errors[0][0]).setAttribute('aria-invalid','true');$('field-'+errors[0][0]).focus();
    notify(errors[0][1]);return false;
  }
  const cppString=s=>'"'+s.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/[\x00-\x1f\x7f]/g,c=>'\\'+c.charCodeAt(0).toString(8).padStart(3,'0'))+'"';
  function generate(c){
    const values={deviceRules:cppString(deviceRules(c)).replace(/\n/g,'\\n'),appVersion:cppString(release.version),appAuthor:cppString(release.author),releaseDate:cppString(release.date),rfSniff:c.rfMode==='sniff'?'true':'false'};
    for(const f of schema){const v=c[f.key];
      if(f.type==='color'){const n=parseInt(v.slice(1),16);values[f.key]='0x'+((((n>>19)&31)<<11)|(((n>>10)&63)<<5)|((n>>3)&31)).toString(16).padStart(4,'0');}
      else if(f.type==='time'){const [h,m]=v.split(':').map(Number);values[f.key]=h*60+m;}
      else if(f.type==='checkbox')values[f.key]=v?'true':'false';
      else if(f.type==='number'||f.type==='select')values[f.key]=String(v);
      else values[f.key]=cppString(v);
    }
    return window.FIRMWARE_TEMPLATE.replace(/@([a-zA-Z0-9]+)@/g,(_,key)=>{
      if(!(key in values))throw new Error('缺少設定：'+key);return values[key];
    });
  }
  function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function restart(){elapsed=0;previous=0;}
  $('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-section]');if(!b)return;active=b.dataset.section;renderForm();if(active!=='connection'){$('previewMode').value=active;restart();}});
  $('settings').addEventListener('submit',e=>e.preventDefault());
  $('settings').addEventListener('input',e=>{const f=schema.find(f=>f.key===e.target.name);if(!f)return;config[f.key]=f.type==='checkbox'?e.target.checked:(f.type==='number'||f.type==='select')?(e.target.value===''?NaN:Number(e.target.value)):e.target.value;const errors=validate(config).filter(x=>schema.find(f=>f.key===x[0]).group===active);$('validation').textContent=errors.map(x=>x[1]).join('；');restart();});
  $('previewMode').addEventListener('change',restart);$('replay').onclick=restart;
  function pauseLabel(){$('pause').textContent=paused?'繼續預覽':'暫停預覽';}
  $('pause').onclick=()=>{paused=!paused;previous=0;pauseLabel();};pauseLabel();
  $('download').onclick=()=>{if(checkExport()){download('LedBoard.ino',generate(config),'text/plain;charset=utf-8');notify('已下載完整程式碼');}};
  $('showCode').onclick=()=>{if(checkExport()){$('codeOutput').value=generate(config);$('codeDialog').showModal();}};
  $('closeCode').onclick=()=>$('codeDialog').close();
  $('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText($('codeOutput').value);notify('已複製完整程式碼');}catch{$('codeOutput').select();notify('請按 Ctrl+C（Mac：⌘C）複製選取的程式碼');}};
  $('saveConfig').onclick=()=>{const errors=validate(config);if(errors.length){notify(errors[0][1]);return;}const clean={...config,token:'',password:'',adminPassword:''};download('led-board-settings.json',JSON.stringify({version:2,generator:{version:release.version,author:release.author,releaseDate:release.date},settings:clean},null,2),'application/json');notify('已匯出設定（不含 Token、Wi-Fi 與管理密碼）');};
  $('importConfig').onclick=()=>$('configFile').click();
  $('configFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('設定檔過大');const obj=JSON.parse(await file.text());config=migrateConfig(obj);renderForm();restart();notify('已匯入設定，請補填連線資料');}catch(err){notify('無法匯入：'+err.message);}e.target.value='';};
  $('reset').onclick=()=>{if(confirm('恢復所有預設設定？目前填入的連線資料也會清除。')){config={...defaults};renderForm();restart();notify('已恢復預設');}};

  // Render text to a 64×32 buffer and sample its pixels into physical LED dots.
  const buffer=document.createElement('canvas');buffer.width=64;buffer.height=32;
  const ctx=buffer.getContext('2d',{willReadFrequently:true}),display=$('panel').getContext('2d');
  function previewLine(text,y,color,date=false){
    ctx.font=date?'13px monospace':'16px "PingFang TC","Microsoft JhengHei",sans-serif';ctx.textBaseline='top';ctx.fillStyle=color;
    const width=ctx.measureText(text).width;let x=(64-width)/2;
    if(!date&&width>64)x=64-(Math.floor(elapsed/Math.max(10,config.scrollMs||30))%(Math.ceil(width)+65));
    ctx.save();ctx.beginPath();ctx.rect(0,y,64,16);ctx.clip();ctx.fillText(text,x,y-1);ctx.restore();
  }
  function frame(time){
    if(previous&&!paused)elapsed+=Math.min(time-previous,100);previous=time;
    const mode=$('previewMode').value;
    ctx.clearRect(0,0,64,32);
    const cycle=(config[mode+'On']||1000)+(config[mode+'Off']||500);
    const lit=!config[mode+'Blink']||elapsed%cycle<(config[mode+'On']||1000);
    if(mode!=='night'&&lit){let a=config[mode+'Text1']||'',b=config[mode+'Text2']||'';
      if(mode==='date'){
        const d=new Date(Date.now()+config.timezone*3600000);
        a=String(d.getUTCFullYear()).slice(-2)+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'/'+String(d.getUTCDate()).padStart(2,'0');
        b=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][d.getUTCDay()];
      }
      previewLine(a,0,config[mode+'Color1']||'#ffffff',mode==='date');previewLine(b,16,config[mode+'Color2']||'#ffffff');
    }
    const pixels=ctx.getImageData(0,0,64,32).data;
    display.fillStyle='#05080b';display.fillRect(0,0,768,384);
    const localNow=new Date(Date.now()+(config.timezone||0)*3600000);
    const minute=localNow.getUTCHours()*60+localNow.getUTCMinutes();
    const toMin=time=>{const [h,m]=String(time).split(':').map(Number);return h*60+m;};
    const start=toMin(config.dimFrom),end=toMin(config.dimUntil);
    const dim=config.dimEnabled&&(start===end||(start<end?minute>=start&&minute<end:minute>=start||minute<end));
    const brightness=Math.max(0,Math.min(255,(dim?config.dimLevel:config.brightness)||0))/255;
    for(let y=0;y<32;y++)for(let x=0;x<64;x++){
      const i=(y*64+x)*4,alpha=pixels[i+3]/255*brightness;
      display.fillStyle=alpha>.03?`rgb(${Math.round(pixels[i]*alpha)},${Math.round(pixels[i+1]*alpha)},${Math.round(pixels[i+2]*alpha)})`:'#141c23';
      display.beginPath();display.arc(x*12+6,y*12+6,4.2,0,Math.PI*2);display.fill();
    }
    $('previewState').textContent=mode==='night'?'休眠 · 全黑':paused?'已暫停':lit?'播放中':'閃爍 · 熄滅';
    $('elapsed').textContent=String(Math.floor(elapsed/60000)).padStart(2,'0')+':'+String(Math.floor(elapsed/1000)%60).padStart(2,'0');
    requestAnimationFrame(frame);
  }
  document.querySelectorAll('[data-release-version]').forEach(el=>el.textContent='v'+release.version);
  document.querySelectorAll('[data-release-author]').forEach(el=>el.textContent=release.author);
  document.querySelectorAll('[data-release-date]').forEach(el=>{el.textContent=release.date;el.setAttribute('datetime',release.date);});
  $('releaseHistory').innerHTML=release.history.map(item=>`<article><h3>v${escapeHtml(item.version)} <time>${escapeHtml(item.date)}</time></h3><ul>${item.changes.map(change=>`<li>${escapeHtml(change)}</li>`).join('')}</ul></article>`).join('');
  renderForm();requestAnimationFrame(frame);
  // Pure helpers are exposed for independent verification and custom extensions.
  window.BoardStudio={release,generate,validate,defaults,schema,parseRfCodes,migrateConfig};
})();
