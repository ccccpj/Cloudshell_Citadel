const settings = require('../settings');
let busy = false;

function available() {
  return Boolean(settings.rewardedVideoAdUnitId && wx.createRewardedVideoAd);
}

async function play() {
  if (busy || !available()) throw new Error('广告不可用');
  busy = true;
  let ad, timer, closed, failed;
  try {
    ad = wx.createRewardedVideoAd({
      adUnitId: settings.rewardedVideoAdUnitId, multiton: true, disableFallbackSharePage: true
    });
    return await new Promise((resolve, reject) => {
      let active = true;
      function finish(callback, value) {
        if (!active) return;
        active = false;
        clearTimeout(timer);
        callback(value);
      }
      closed = result => finish(resolve, Boolean(result && result.isEnded === true));
      failed = error => finish(reject, error);
      ad.onClose(closed);
      ad.onError(failed);
      timer = setTimeout(() => failed(new Error('广告加载超时')), 15000);
      Promise.resolve().then(() => ad.load()).then(() => {
        if (active) return ad.show();
      }).then(() => clearTimeout(timer)).catch(failed);
    });
  } finally {
    busy = false;
    clearTimeout(timer);
    if (ad) {
      if (ad.offClose && closed) ad.offClose(closed);
      if (ad.offError && failed) ad.offError(failed);
      if (ad.destroy) ad.destroy();
    }
  }
}

module.exports = { available, play };
