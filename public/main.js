// Scroll reveal + gallery lightbox, no dependencies
(function () {
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  document.addEventListener('click', function (ev) {
    var fig = ev.target.closest ? ev.target.closest('.shot[data-full]') : null;
    if (!fig) return;
    var box = document.createElement('div');
    box.className = 'lightbox';
    var img = document.createElement('img');
    img.src = fig.getAttribute('data-full');
    var inner = fig.querySelector('img');
    img.alt = inner ? inner.alt : '';
    box.appendChild(img);
    box.addEventListener('click', function () { box.remove(); });
    document.body.appendChild(box);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      var box = document.querySelector('.lightbox');
      if (box) box.remove();
    }
  });
})();
