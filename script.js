/* Свадебное приглашение */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- каскадное появление слов ---------- */
  document.querySelectorAll('[data-reveal-words]').forEach(function (el) {
    var frag = document.createDocumentFragment();
    var i = 0;
    Array.from(el.childNodes).forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
          } else {
            var w = document.createElement('span');
            w.className = 'w';
            w.style.setProperty('--d', (i++ * 0.07) + 's');
            w.textContent = part;
            frag.appendChild(w);
          }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        node.classList.add('w');
        node.style.setProperty('--d', (i++ * 0.07) + 's');
        frag.appendChild(node);
      }
    });
    el.textContent = '';
    el.appendChild(frag);
  });

  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.body.classList.add('armed');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal], [data-reveal-words]').forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- обратный отсчёт (до начала церемонии, 15:00) ---------- */
  var target = new Date('2027-07-16T15:00:00+03:00').getTime();
  var cd = {
    d: document.getElementById('cd-d'),
    h: document.getElementById('cd-h'),
    m: document.getElementById('cd-m'),
    s: document.getElementById('cd-s')
  };
  function tick() {
    var diff = Math.max(0, target - Date.now());
    var sec = Math.floor(diff / 1000);
    cd.d.textContent = Math.floor(sec / 86400);
    cd.h.textContent = String(Math.floor(sec % 86400 / 3600)).padStart(2, '0');
    cd.m.textContent = String(Math.floor(sec % 3600 / 60)).padStart(2, '0');
    cd.s.textContent = String(sec % 60).padStart(2, '0');
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- анкета гостя ---------- */
  var KEY = 'wedding-rsvp';
  var rsvpSection = document.getElementById('rsvp');
  var form = document.getElementById('rsvp-form');
  var error = document.getElementById('form-error');
  var thanks = document.getElementById('rsvp-thanks');
  var editBtn = document.getElementById('rsvp-edit');

  function showThanks() {
    rsvpSection.classList.add('rsvp-done');
    thanks.focus({ preventScroll: true });
  }
  function showForm() {
    rsvpSection.classList.remove('rsvp-done');
  }

  // восстановить сохранённый ответ
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) {
      form.elements.name.value = saved.name || '';
      if (saved.attend) {
        var r = form.querySelector('input[name=attend][value="' + saved.attend + '"]');
        if (r) r.checked = true;
      }
      (saved.drinks || []).forEach(function (v) {
        var c = form.querySelector('input[name=drink][value="' + v + '"]');
        if (c) c.checked = true;
      });
      form.elements.note.value = saved.note || '';
      showThanks();
    }
  } catch (e) { /* повреждённые данные — просто показываем форму */ }

  /* ---------- отправка анкеты в Telegram ---------- */
  var TG_TOKEN = '9253439893:AAHYQ0jcf9mq6NCYwWge9tztuOTnWr5Ge4w';
  var TG_CHAT  = '-1006020647399';

  var drinkNames = {
    white: 'Белое вино', red: 'Красное вино', champagne: 'Шампанское',
    strong: 'Покрепче', soft: 'Безалкогольное'
  };

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = form.elements.name.value.trim();
    var attendEl = form.querySelector('input[name=attend]:checked');
    if (!name || !attendEl) {
      error.classList.add('show');
      return;
    }
    error.classList.remove('show');

    var drinkVals = Array.from(form.querySelectorAll('input[name=drink]:checked'))
      .map(function (c) { return c.value; });
    var drinkText = drinkVals.map(function (v) { return drinkNames[v] || v; });
    var note = form.elements.note.value.trim();

    // запоминаем ответ в браузере гостя (как раньше)
    var data = { name: name, attend: attendEl.value, drinks: drinkVals, note: note, ts: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}

    var text = '💌 Новый ответ на приглашение!\n\n' +
      '👤 ' + name + '\n' +
      (attendEl.value === 'come' ? '✅ Придёт' : '❌ Не сможет прийти') + '\n' +
      (drinkText.length ? '🍷 ' + drinkText.join(', ') + '\n' : '') +
      (note ? '📝 ' + note : '');

    var btn = form.querySelector('.btn');
    btn.disabled = true;
    btn.textContent = 'Отправляю…';

    fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: text })
    })
    .then(function (res) {
      if (!res.ok) throw new Error('telegram ' + res.status);
      showThanks();
    })
    .catch(function () {
      error.textContent = 'Не получилось отправить. Проверьте интернет и попробуйте ещё раз — или напишите Кристине в Telegram.';
      error.classList.add('show');
    })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = 'Отправить ответ';
    });
  });

  editBtn.addEventListener('click', function () {
    showForm();
    form.elements.name.focus();
  });
})();