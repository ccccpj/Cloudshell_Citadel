const Utils = require('./Utils');
const audio = require('./GameConfig').AUDIO_CONFIG;

const defaults = { sound: audio.SOUND_ENABLED, music: audio.MUSIC_ENABLED, vibration: true };
const storageKey = 'flightFeedback';
let options;
let music;
let active = false;

function preferences() {
  if (!options) {
    options = { ...defaults };
    const saved = Utils.getStorage(storageKey);
    for (const key of Object.keys(defaults)) {
      if (typeof saved?.[key] === 'boolean') options[key] = saved[key];
    }
  }
  return options;
}

function syncMusic() {
  if (!active || !preferences().music) {
    if (music) music.pause();
    return;
  }
  if (!music) {
    music = wx.createInnerAudioContext({ useWebAudioImplement: true });
    music.src = audio.AUDIO_PATHS.BACKGROUND_MUSIC;
    music.loop = true;
    music.volume = audio.MUSIC_VOLUME * audio.MASTER_VOLUME;
  }
  music.play();
}

function toggle(key) {
  const current = preferences();
  current[key] = !current[key];
  Utils.setStorage(storageKey, current);
  if (key === 'music') syncMusic();
}

function vibrate(type) {
  if (!preferences().vibration) return;
  if (type === 'heavy') wx.vibrateLong({});
  else wx.vibrateShort({ type });
}

function playSound(src, volume) {
  if (!preferences().sound) return;
  const sound = wx.createInnerAudioContext();
  sound.onEnded(() => sound.destroy());
  sound.onError(() => sound.destroy());
  sound.src = src;
  sound.volume = volume;
  sound.play();
}

function setActive(value) {
  active = value;
  syncMusic();
}

module.exports = { preferences, toggle, vibrate, playSound, setActive };
