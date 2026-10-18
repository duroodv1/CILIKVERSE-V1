// Penghala hash ringkas yang serasi dengan GitHub Pages (subdirektori)
// dan aplikasi desktop. Tiada kebergantungan luar.
export const Router = {
  handler: null,
  current: { name: 'home', param: '', query: {} },

  parse(hash) {
    const raw = String(hash || '').replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const name = parts[0] || 'home';
    const param = parts[1] ? decodeURIComponent(parts[1]) : '';
    const query = {};
    if (qs) {
      qs.split('&').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { name, param, query };
  },

  onRoute(fn) {
    this.handler = fn;
  },

  start() {
    window.addEventListener('hashchange', () => this.dispatch());
    this.dispatch();
  },

  go(path) {
    const target = path.startsWith('#') ? path : '#/' + path.replace(/^\/+/, '');
    if (location.hash === target) this.dispatch();
    else location.hash = target;
  },

  replace(path) {
    const target = path.startsWith('#') ? path : '#/' + path.replace(/^\/+/, '');
    history.replaceState(null, '', target);
    this.dispatch();
  },

  back() {
    if (history.length > 1) history.back();
    else this.go('home');
  },

  dispatch() {
    const route = this.parse(location.hash);
    this.current = route;
    if (this.handler) this.handler(route);
    window.scrollTo({ top: 0, behavior: 'auto' });
  },
};
