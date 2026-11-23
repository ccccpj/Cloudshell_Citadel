function loadGame(factories) {
  const loaded = {};
  function load(id) {
    if (loaded[id]) return loaded[id].exports;
    const module = { exports: {} };
    loaded[id] = module;
    const localRequire = request => {
      const base = new URL(id, location.origin + '/');
      const target = new URL(request, base).pathname.slice(1).replace(/\.js$/, '');
      return load(target);
    };
    factories[id](localRequire, module, module.exports);
    return module.exports;
  }
  load('game');
}
