// Only local device APIs are adapted. WeChat ads, friends and cloud services require the native host.
(() => {
  const canvas = document.querySelector('canvas');
  const hooks = {};
  const store = 'cloudshell:';
  function info() {
    const r = canvas.getBoundingClientRect();
    return {windowWidth:r.width, windowHeight:r.height, pixelRatio:window.devicePixelRatio,
      safeArea:{top:0, bottom:r.height}};
  }
  // Touch browsers grant media playback on the completed tap (click).
  let pendingMusic = null;
  canvas.addEventListener('click', () => {
    if (pendingMusic && !document.hidden) pendingMusic();
  });
  function audio() {
    const sound = new Audio();
    function clearPending() {
      if (pendingMusic === play) pendingMusic = null;
    }
    function play() {
      if (sound.loop) pendingMusic = play;
      sound.play().then(clearPending, error => {
        if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
          clearPending();
          console.warn('音频播放失败', sound.src, error);
        }
      });
    }
    function pause() {
      clearPending();
      sound.pause();
    }
    return {
      set src(value){sound.src=value}, set loop(value){sound.loop=value}, set volume(value){sound.volume=value},
      onEnded(fn){sound.addEventListener('ended',fn)}, onError(fn){sound.addEventListener('error',fn)},
      play, pause, destroy(){pause();sound.removeAttribute('src')}
    };
  }
  function musicPlayer() {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return audio();
    const context = new AudioEngine();
    const gain = context.createGain();
    gain.connect(context.destination);
    let path, decoded, source, startedAt, offset = 0, wanted = false, fallback;
    function play() {
      wanted = true;
      if (fallback) return fallback.play();
      pendingMusic = play;
      if (!decoded) {
        decoded = fetch(path).then(response => {
          if (!response.ok) throw new Error('音乐读取失败');
          return response.arrayBuffer();
        }).then(bytes => context.decodeAudioData(bytes));
      }
      Promise.all([context.resume(), decoded]).then(([, buffer]) => {
        if (!wanted || source || fallback || context.state !== 'running') return;
        source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(gain);
        startedAt = context.currentTime - offset;
        source.start(0, offset);
        if (pendingMusic === play) pendingMusic = null;
      }).catch(() => {
        if (!fallback) {
          fallback = audio();
          fallback.src = path;
          fallback.loop = true;
          fallback.volume = gain.gain.value;
        }
        if (wanted) fallback.play();
      });
    }
    function pause() {
      wanted = false;
      if (pendingMusic === play) pendingMusic = null;
      if (fallback) fallback.pause();
      if (source) {
        offset = (context.currentTime - startedAt) % source.buffer.duration;
        source.stop();
        source.disconnect();
        source = null;
      }
    }
    return {
      set src(value) { path = value; },
      set volume(value) { gain.gain.value = value; },
      play, pause
    };
  }
  for (const [eventName,key] of Object.entries({pointerdown:'Start',pointermove:'Move',pointerup:'End',pointercancel:'Cancel'})) {
    canvas.addEventListener(eventName, e => {
      if (eventName === 'pointerdown') canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      hooks[key]?.({changedTouches:[{identifier:e.pointerId,clientX:e.clientX-rect.left,clientY:e.clientY-rect.top}]});
    });
  }
  window.wx = {
    createCanvas:()=>canvas,createImage:()=>new Image(),getWindowInfo:info,getSystemInfoSync:info,
    loadSubpackage:options=>options.success(),createInnerAudioContext:options => options?.useWebAudioImplement ? musicPlayer() : audio(),
    getStorageSync:key=>JSON.parse(localStorage.getItem(store+key)),
    setStorageSync:(key,value)=>localStorage.setItem(store+key,JSON.stringify(value)),
    onWindowResize:fn=>new ResizeObserver(fn).observe(canvas),
    onHide:fn=>document.addEventListener('visibilitychange',()=>{if(document.hidden)fn()}),
    onShow:fn=>document.addEventListener('visibilitychange',()=>{if(!document.hidden)fn()}),
    getOpenDataContext:()=>({postMessage(){}}),
    authorize:options=>options.fail(),openSetting:()=>alert('好友排行榜需在微信小游戏中使用。'),
    vibrateLong:()=>navigator.vibrate?.(80),vibrateShort:()=>navigator.vibrate?.(15)
  };
  for (const key of ['Start','Move','End','Cancel']) wx['onTouch'+key] = fn => {hooks[key]=fn};
})();
