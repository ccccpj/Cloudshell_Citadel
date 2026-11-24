module.exports = {
  calculateDistance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  },
  isCircleCollision(x1, y1, r1, x2, y2, r2) {
    return this.calculateDistance(x1, y1, x2, y2) <= r1 + r2;
  },
  getStorage(key) {
    try {
      return wx.getStorageSync(key);
    } catch (error) {
      console.warn('无法读取本机记录', error);
      return null;
    }
  },
  setStorage(key, value) {
    try {
      wx.setStorageSync(key, value);
      return true;
    } catch (error) {
      console.warn('无法保存本机记录', error);
      return false;
    }
  }
};
