// Anonymous identity belongs to this browser. Nicknames are display labels only.
(() => {
  const key = 'cloudshell:web-rank-player';
  let token;
  const dialog = document.querySelector('#nickname-dialog');
  const form = dialog.querySelector('form');
  const input = form.elements.nickname;
  const status = dialog.querySelector('[role=status]');
  const save = form.querySelector('[type=submit]');

  const cancel = form.querySelector('[type=button]');

  async function request(action, data = {}) {
    if (!token) {
      token = localStorage.getItem(key) || crypto.randomUUID();
      localStorage.setItem(key, token);
    }
    const options = { headers: {Authorization:'Bearer ' + token}, cache:'no-store' };
    if (action !== 'list') {
      options.method = 'POST';
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/rank/' + action, { ...options, signal:controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '连接失败，请重试');
      return result;
    } finally { clearTimeout(timer); }
  }

  function editNickname(name) {
    input.value = name;
    status.textContent = '';
    dialog.returnValue = '';
    dialog.showModal();
    input.focus();
    return new Promise(resolve => dialog.addEventListener('close',
      () => resolve(dialog.returnValue === 'saved'), { once:true }));
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (save.disabled) return;
    cancel.disabled = save.disabled = true;
    try {
      await request('nickname', {name:input.value});
      dialog.close('saved');
    } catch (error) {
      status.textContent = error.message;
    } finally { cancel.disabled = save.disabled = false; }
  });
  dialog.addEventListener('cancel', event => { if (save.disabled) event.preventDefault(); });
  cancel.onclick = () => dialog.close();
  wx.webLeaderboard = { request, editNickname };
})();
