// App shell: menu, routing between practice topics and the edit page.
(() => {
  let db = DB.load();
  let previousKey = null;

  const menu = document.getElementById('menu');
  const practiceView = document.getElementById('practice');
  const editorView = document.getElementById('editor');
  const sentenceEl = document.getElementById('sentence');
  const legendEl = document.getElementById('legend');
  const topicTitle = document.getElementById('topic-title');
  const checkLink = document.getElementById('check');
  const hintText = document.getElementById('hint-text');
  const hintInput = document.getElementById('hint-input');
  const hintEdit = document.getElementById('hint-edit');
  let editingHint = false;

  const LAST_ROUTE = 'gaelicPractice.lastRoute';

  function currentRoute() {
    const h = location.hash.replace(/^#/, '');
    if (h === 'edit') return { view: 'edit' };
    const m = h.match(/^topic\/(\d+)$/);
    if (m && db.topics[+m[1]]) return { view: 'topic', index: +m[1] };
    return null;
  }

  function renderMenu() {
    const route = currentRoute() || {};
    const items = db.topics.map((t, i) => ({ href: `#topic/${i}`, label: t.name, active: route.view === 'topic' && route.index === i }));
    items.push({ href: '#edit', label: 'Edit', active: route.view === 'edit', cls: 'menu-edit' });
    menu.replaceChildren(...items.map((it) => {
      const a = document.createElement('a');
      a.href = it.href;
      a.textContent = it.label;
      a.className = 'menu-item' + (it.cls ? ' ' + it.cls : '');
      if (it.active) a.setAttribute('aria-current', 'page');
      return a;
    }));
  }

  function showSentence(topic) {
    const result = Practice.generate(topic, db, previousKey);
    sentenceEl.replaceChildren();
    legendEl.replaceChildren();

    if (result.error) {
      sentenceEl.classList.add('is-error');
      sentenceEl.textContent = result.error;
      checkLink.removeAttribute('href');
      checkLink.setAttribute('aria-disabled', 'true');
      return;
    }
    sentenceEl.classList.remove('is-error');
    previousKey = result.key;

    result.parts.forEach((part, i) => {
      let text = part.text;
      if (i === 0) text = text.charAt(0).toUpperCase() + text.slice(1);
      const span = document.createElement('span');
      span.className = `part part-${i % 4}`;
      span.textContent = text;
      if (i > 0) sentenceEl.append(' ');
      sentenceEl.append(span);

      const li = document.createElement('li');
      li.className = `part-${i % 4}`;
      li.innerHTML = '<b></b> <span></span>';
      li.querySelector('b').textContent = part.id;
      li.querySelector('span').textContent = part.label || 'List ' + part.id;
      legendEl.append(li);
    });

    const sentence = sentenceEl.textContent;
    checkLink.href = 'https://translate.google.com/?sl=en&tl=gd&op=translate&text=' + encodeURIComponent(sentence);
    checkLink.removeAttribute('aria-disabled');

    // Restart the fade-in animation.
    sentenceEl.classList.remove('fade');
    void sentenceEl.offsetWidth;
    sentenceEl.classList.add('fade');
  }

  function currentTopic() {
    const r = currentRoute();
    return r && r.view === 'topic' ? db.topics[r.index] : null;
  }

  function renderHint() {
    const topic = currentTopic();
    if (!topic) return;
    hintInput.hidden = !editingHint;
    hintText.hidden = editingHint;
    hintEdit.textContent = editingHint ? 'Done' : topic.hint ? 'Edit' : 'Add';
    hintText.textContent = topic.hint || 'No hint for this topic yet.';
    hintText.classList.toggle('is-empty', !topic.hint);
  }

  hintEdit.addEventListener('click', () => {
    const topic = currentTopic();
    if (!topic) return;
    editingHint = !editingHint;
    if (editingHint) hintInput.value = topic.hint || '';
    renderHint();
    if (editingHint) {
      hintInput.style.height = 'auto';
      hintInput.style.height = Math.max(hintInput.scrollHeight + 2, 80) + 'px';
      hintInput.focus();
    }
  });

  hintInput.addEventListener('input', () => {
    const topic = currentTopic();
    if (!topic) return;
    topic.hint = hintInput.value.trim();
    hintInput.style.height = 'auto';
    hintInput.style.height = Math.max(hintInput.scrollHeight + 2, 80) + 'px';
    DB.save(db);
  });

  function route() {
    let r = currentRoute();
    if (!r) {
      let last = null;
      try { last = localStorage.getItem(LAST_ROUTE); } catch (e) { /* ignore */ }
      location.replace(last && (last === '#edit' || /^#topic\/\d+$/.test(last) && db.topics[+last.split('/')[1]])
        ? last : db.topics.length ? '#topic/0' : '#edit');
      return;
    }
    try { localStorage.setItem(LAST_ROUTE, location.hash); } catch (e) { /* ignore */ }

    renderMenu();
    practiceView.hidden = r.view !== 'topic';
    editorView.hidden = r.view !== 'edit';

    if (r.view === 'topic') {
      const topic = db.topics[r.index];
      topicTitle.textContent = topic.name;
      document.title = `${topic.name} · Gaelic Practice`;
      previousKey = null;
      editingHint = false;
      renderHint();
      showSentence(topic);
    } else {
      document.title = 'Edit database · Gaelic Practice';
      Editor.render();
    }
    const active = menu.querySelector('[aria-current]');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  document.getElementById('next').addEventListener('click', () => {
    const r = currentRoute();
    if (r && r.view === 'topic') showSentence(db.topics[r.index]);
  });

  Editor.init(editorView, db, {
    onChange: (updated) => {
      db = updated;
      DB.save(db);
      renderMenu();
    },
    onReplace: (replacement) => {
      db = replacement;
      DB.save(db);
      Editor.setDb(db);
      renderMenu();
    },
  });

  window.addEventListener('hashchange', route);
  route();
})();
