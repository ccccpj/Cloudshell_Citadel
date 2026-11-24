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
  for (const [eventName,key] of Object.entries({pointerdown:'Start',pointermove:'Move',pointerup:'End',pointercancel:'Cancel'})) {
    canvas.addEventListener(eventName, e => {
      if (eventName === 'pointerdown') canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      hooks[key]?.({changedTouches:[{identifier:e.pointerId,clientX:e.clientX-rect.left,clientY:e.clientY-rect.top}]});
    });
  }
  window.wx = {
    createCanvas:()=>canvas,createImage:()=>new Image(),getWindowInfo:info,getSystemInfoSync:info,
    loadSubpackage:options=>options.success(),createInnerAudioContext:audio,
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
