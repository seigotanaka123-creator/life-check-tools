// OBS WebSocket 5.x. No platform tokens, stream keys or saved passwords.
export const LIVE_WINDOW_TITLE='イマソラーズウォーク｜ゲーム配信用画面';
export function obsLocalUrl(port=4455){const n=Number(port);if(!Number.isInteger(n)||n<1||n>65535)throw Error('ポート番号を確認してください。');return 'ws://127.0.0.1:'+n;}
export const obsAuthentication=async(password,salt,challenge,crypto=globalThis.crypto)=>{const digest=async text=>{const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));return btoa(String.fromCharCode(...bytes));};return digest(await digest(password+salt)+challenge);};
export function createObsConnection({makeSocket=url=>new WebSocket(url,'obswebsocket.json'),onState=()=>{},onStream=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,timeout=8000}={}){
 let socket=null,identified=false,serial=0,generation=0,hello=false,connectWait=null;const waiting=new Map();
 const publish=state=>{try{onState(state);}catch{}};
 function fail(message){identified=false;hello=false;if(connectWait){clearTimer(connectWait.timer);connectWait.reject(Error(message));connectWait=null;}for(const p of waiting.values()){clearTimer(p.timer);p.reject(Error(message));}waiting.clear();publish('disconnected');}
 function disconnect(){generation++;const old=socket;socket=null;fail('OBSとの接続が切れました。');try{old?.close();}catch{}}
 function connect({port=4455,password=''}={}){disconnect();const url=obsLocalUrl(port),id=generation;publish('connecting');return new Promise((resolve,reject)=>{connectWait={resolve,reject,timer:setTimer(()=>{if(id!==generation)return;disconnect();},timeout)};try{socket=makeSocket(url);}catch{fail('OBSを起動し、接続設定を確認してください。');return;}const current=socket;
  current.onmessage=async event=>{if(id!==generation||current!==socket)return;try{if(typeof event.data!=='string'||event.data.length>262144)throw Error('OBS応答を確認できません。');const {op,d}=JSON.parse(event.data);if(op===0){if(hello||identified||!Number.isInteger(d?.rpcVersion)||d.rpcVersion<1)throw Error('OBSの対応バージョンを確認してください。');hello=true;const authentication=d.authentication?await obsAuthentication(password,d.authentication.salt,d.authentication.challenge):undefined;password='';if(id!==generation||socket!==current)return;current.send(JSON.stringify({op:1,d:{rpcVersion:1,eventSubscriptions:64,...(authentication?{authentication}:{})}}));}
   else if(op===2){if(!hello||identified||d?.negotiatedRpcVersion!==1)throw Error('OBS認証を確認できません。');identified=true;const p=connectWait;connectWait=null;clearTimer(p.timer);publish('connected');p.resolve();}
   else if(op===7&&identified){const p=waiting.get(d?.requestId);if(!p)return;waiting.delete(d.requestId);clearTimer(p.timer);if(d.requestType!==p.type||!d.requestStatus?.result)p.reject(Error('OBSが操作を受け付けませんでした。配信先の設定を確認してください。'));else p.resolve(d.responseData??{});}
   else if(op===5&&identified&&d?.eventType==='StreamStateChanged')onStream(d.eventData);
  }catch{password='';if(id!==generation||current!==socket)return;socket=null;fail('OBSとの認証・応答を確認できません。');try{current.close();}catch{}}};
  current.onclose=()=>{if(current===socket&&id===generation){password='';socket=null;fail('OBSとの接続が切れました。');}};current.onerror=()=>{if(current===socket&&id===generation){password='';socket=null;fail('OBSに接続できません。OBSの起動とWebSocket設定を確認してください。');try{current.close();}catch{}}};
 });}
 function request(type,data={}){if(!identified||!socket)return Promise.reject(Error('先にOBSへ接続してください。'));const id=String(++serial),current=socket;return new Promise((resolve,reject)=>{const timer=setTimer(()=>{waiting.delete(id);reject(Error('OBSの応答がありません。配信状態をOBSで確認してください。'));},timeout);waiting.set(id,{resolve,reject,timer,type});try{current.send(JSON.stringify({op:6,d:{requestType:type,requestId:id,requestData:data}}));}catch{clearTimer(timer);waiting.delete(id);reject(Error('OBSとの接続を確認してください。'));}});}
 return{connect,request,disconnect,get connected(){return identified;},get pending(){return waiting.size;}};
}

// Dedicated game capture is required. Do not start a desktop-only scene.
export const verifyObsGameScene=async(request,title=LIVE_WINDOW_TITLE)=>{const {currentProgramSceneName:sceneName}=await request('GetCurrentProgramScene');if(!sceneName)throw Error('OBSでゲーム用のシーンを選んでください。');const {sceneItems=[]}=await request('GetSceneItemList',{sceneName});let found=false;
 for(const item of sceneItems.filter(x=>x.sceneItemEnabled)){if(item.isGroup||item.sourceType==='OBS_SOURCE_TYPE_SCENE'||['monitor_capture','display_capture','screen_capture','browser_source','game_capture'].includes(item.inputKind))throw Error('OBSは配信用画面だけを映す専用シーンにしてください。');if(item.inputKind==='window_capture'){const {inputSettings}=await request('GetInputSettings',{inputName:item.sourceName});if(inputSettings?.window?.split(':')[0]!==title)throw Error('OBSのウィンドウキャプチャでゲーム配信用画面を選んでください。');found=true;}}
 if(!found)throw Error('OBSに「ウィンドウキャプチャ」を追加し、ゲーム配信用画面を選んでください。');return sceneName;
};

export function createLiveBroadcast({
  makeSocket, onChange = () => {}, outputReady = () => false,
  setTimer = setTimeout, clearTimer = clearTimeout,
} = {}) {
  let state = 'disconnected';
  let notice = '';
  let owned = false;
  let busy = false;
  let outputLostDuringStart = false;
  let generation = 0;
  let statusRevision = 0;
  let poll = null;
  let awaitingLive = false;
  let startDeadline = null;

  const snapshot = () => ({state, notice, owned, busy, connected: obs.connected});
  function emit() {
    try { onChange(snapshot()); } catch {}
  }
  function status(data) {
    if (typeof data?.outputActive !== 'boolean') return;
    statusRevision++;
    if (data.outputReconnecting) {
      clearStartConfirmation();
      state = 'reconnecting';
      notice = '再接続中。OBSで配信状態を確認できます。';
    } else if (!data.outputActive && awaitingLive &&
               data.outputState !== 'OBS_WEBSOCKET_OUTPUT_STOPPED') {
      // Idle polls alone cannot distinguish a pending start from a stopped output.
      return;
    } else {
      clearStartConfirmation();
      state = data.outputActive ? (owned ? 'live' : 'external') : 'ready';
      if (!data.outputActive) owned = false;
      notice = state === 'external' ? 'OBSで配信中です。OBSで操作してください。' : '';
    }
    emit();
  }
  const obs = createObsConnection({
    makeSocket, setTimer, clearTimer, onStream: status,
    onState(value) {
      if (value === 'disconnected') {
        cancelWatch();
        clearStartConfirmation();
        statusRevision++;
        state = owned ? 'unknown' : 'disconnected';
        if (owned) notice = '接続が切れました。配信はOBSで停止を確認してください。';
      } else if (value === 'connecting') {
        state = value;
      }
      emit();
    },
  });

  function clearStartConfirmation() {
    awaitingLive = false;
    if (startDeadline !== null) clearTimer(startDeadline);
    startDeadline = null;
  }
  function watchStartConfirmation(id) {
    const timer = setTimer(() => {
      if (id !== generation || startDeadline !== timer) return;
      startDeadline = null;
      if (state !== 'starting') return;
      state = 'unknown';
      notice = '配信開始を確認できません。OBSで状態を確認してください。';
      emit();
    }, 12000);
    startDeadline = timer;
  }

  function cancelWatch() {
    const timer = poll;
    poll = null;
    if (timer !== null) clearTimer(timer);
  }
  function watch(id) {
    if (id !== generation || !obs.connected || poll !== null) return;
    const timer = setTimer(async () => {
      if (id !== generation || poll !== timer) return;
      poll = null;
      if (!obs.connected) return;
      if (!busy) {
        const revision = statusRevision;
        const isCurrent = () => id === generation && obs.connected &&
          !busy && revision === statusRevision;
        try {
          const data = await readStatus(obs.request);
          if (isCurrent()) status(data);
        } catch {
          if (isCurrent()) {
            state = 'unknown';
            notice = '配信状態を確認できません。OBSで確認してください。';
            emit();
          }
        }
      }
      watch(id);
    }, 3000);
    poll = timer;
  }
  function begin() {
    busy = true;
    statusRevision++;
    notice = '';
    emit();
  }
  function finish(id) {
    if (id !== generation) return;
    busy = false;
    emit();
  }
  function scopedRequest(id) {
    return async (type, data) => {
      if (id !== generation) throw Error('OBSとの接続が切れました。');
      const result = await obs.request(type, data);
      if (id !== generation) throw Error('OBSとの接続が切れました。');
      return result;
    };
  }
  async function readStatus(request) {
    const data = await request('GetStreamStatus');
    if (typeof data?.outputActive !== 'boolean' ||
        (data.outputReconnecting !== undefined && typeof data.outputReconnecting !== 'boolean')) {
      throw Error('OBSから配信状態を取得できません。');
    }
    return data;
  }
  async function refresh(request) {
    const revision = statusRevision;
    const data = await readStatus(request);
    if (revision === statusRevision) status(data);
    return data;
  }
  async function connect(options) {
    if (busy) return false;
    const id = ++generation;
    cancelWatch();
    owned = false;
    begin();
    try {
      if (id !== generation) return false;
      await obs.connect(options);
      await refresh(scopedRequest(id));
      watch(id);
      return id === generation && obs.connected;
    } catch (error) {
      if (id === generation) {
        obs.disconnect();
        notice = error.message;
        emit();
      }
      return false;
    } finally {
      finish(id);
    }
  }
  async function start() {
    if (busy || !obs.connected || state !== 'ready') return false;
    const id = generation;
    const request = scopedRequest(id);
    outputLostDuringStart = false;
    begin();
    let started = false;
    try {
      if (!outputReady()) throw Error('先にゲーム配信用画面を開いてください。');
      if ((await refresh(request)).outputActive !== false || state !== 'ready') return false;
      const scene = await verifyObsGameScene(request);
      const {currentProgramSceneName} = await request('GetCurrentProgramScene');
      if (currentProgramSceneName !== scene) throw Error('OBSのシーンが変わりました。専用シーンを選び直してください。');
      const before = await refresh(request);
      if (before.outputActive !== false || before.outputReconnecting || state !== 'ready') return false;
      if (outputLostDuringStart || !outputReady()) throw Error('配信用画面が閉じました。画面を開いてから、もう一度配信を始めてください。');
      state = 'starting';
      awaitingLive = true;
      emit();
      await request('StartStream');
      if (id !== generation) return false;
      if (state === 'ready') {
        notice = 'OBSで配信開始が停止されました。';
        return false;
      }
      owned = true;
      if (state === 'external') {
        state = 'live';
        notice = '';
      } else if (state === 'starting') {
        watchStartConfirmation(id);
        await refresh(request);
      }
      started = state === 'live' || state === 'starting' || state === 'reconnecting';
    } catch (error) {
      if (id !== generation) return false;
      // Without acceptance, an inactive status can end the start attempt.
      // A later active status belongs to OBS until ownership is confirmed.
      if (!owned) {
        clearStartConfirmation();
        if (state === 'starting') state = 'unknown';
      }
      if (obs.connected) {
        try {
          await refresh(request);
        } catch {
          if (id !== generation) return false;
          if (obs.connected) state = 'unknown';
        }
      }
      if (id !== generation) return false;
      if (state === 'ready' || state === 'disconnected') notice = error.message;
      if (state === 'unknown') notice = '配信状態を確認できません。OBSで確認してください。';
    } finally {
      finish(id);
    }
    if (id !== generation) return false;
    if (owned && (outputLostDuringStart || !outputReady())) {
      if (await stop() && id === generation) {
        notice = '配信用画面が閉じたため配信を停止しました。';
        emit();
      }
      return false;
    }
    return started;
  }
  async function stop() {
    if (busy || !owned || !obs.connected) return false;
    const id = generation;
    const request = scopedRequest(id);
    state = 'stopping';
    begin();
    try {
      await request('StopStream');
      clearStartConfirmation();
      await refresh(request);
      return state === 'ready';
    } catch {
      if (id === generation) {
        state = 'unknown';
        notice = '停止を確認できません。OBSで停止してください。';
      }
      return false;
    } finally {
      finish(id);
    }
  }
  function disconnect() {
    generation++;
    cancelWatch();
    busy = false;
    obs.disconnect();
  }
  function outputLost() {
    if (busy) outputLostDuringStart = true;
    return stop();
  }
  return {connect, start, stop, disconnect, snapshot, outputLost};
}
