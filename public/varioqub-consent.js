(() => {
  let loaded = false;
  const load = () => {
    let consent;
    try { consent = localStorage.getItem('analytics-consent'); } catch { return; }
    if (loaded || consent !== 'yes') return;
    loaded = true;
    window.ymab = window.ymab || function () { (window.ymab.a = window.ymab.a || []).push(arguments); };
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://abt.s3.yandex.net/expjs/latest/exp.js';
    script.addEventListener('error', () => {
      const callback = (args) => {
        const fn = args[args.length - 1];
        if (typeof fn === 'function') fn({ flags: {} });
      };
      if (Array.isArray(window.ymab.a)) window.ymab.a.forEach(callback);
      window.ymab = function () { callback(arguments); };
    });
    document.head.appendChild(script);
    window.ymab('metrika.113398858', 'init');
  };
  document.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-cookie-accept]')) load();
  });
  load();
})();
