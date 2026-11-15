// Database edit page. Edits update the in-memory db and are saved to the
// browser straight away via onChange; Import/Export move it to/from Markdown.
window.Editor = (() => {
  let db;
  let onChange;
  let onReplace;
  let root;

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c !== null && c !== undefined) node.append(c.nodeType ? c : document.createTextNode(c));
    }
    return node;
  }

  const lines = (text) => text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 2 + 'px';
  }

  function changed() {
    updateWarnings();
    onChange(db);
  }

  function init(container, database, handlers) {
    root = container;
    db = database;
    onChange = handlers.onChange;
    onReplace = handlers.onReplace;
  }

  function setDb(database) {
    db = database;
    render();
  }

  // ---- Toolbar: import / export / reset -------------------------------
  function toolbar() {
    const fileInput = el('input', {
      type: 'file',
      accept: '.md,.markdown,.txt,text/markdown,text/plain',
      class: 'visually-hidden',
      onchange: async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const parsed = DB.parse(await file.text());
        if (!parsed.topics.length && !parsed.lists.length) {
          alert('No topics or lists were found in that file. Check that it uses "## Topics" and "## Lists" headings.');
          return;
        }
        if (!confirm(`Replace the current database with "${file.name}"?\n\n${parsed.topics.length} topics, ${parsed.lists.length} lists.`)) return;
        onReplace(parsed);
      },
    });

    return el('div', { class: 'toolbar' },
      el('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, 'Import .md'),
      el('button', { class: 'btn', type: 'button', onclick: exportMarkdown }, 'Export .md'),
      el('button', {
        class: 'btn btn-quiet', type: 'button',
        onclick: () => {
          if (confirm('Replace everything with the built-in starter database? Export first if you want to keep your changes.')) {
            onReplace(DB.reset());
          }
        },
      }, 'Reset to starter'),
      fileInput,
    );
  }

  function exportMarkdown() {
    const blob = new Blob([DB.serialize(db)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: 'gaelic-practice-database.md' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---- Topics ----------------------------------------------------------
  function topicCard(topic, index) {
    const patterns = el('textarea', {
      rows: 2, class: 'mono', spellcheck: 'false', autocapitalize: 'off',
      'aria-label': `Patterns for ${topic.name}`,
      oninput: (e) => {
        topic.patterns = lines(e.target.value).map(DB.parsePattern).filter((p) => p.length);
        autosize(e.target);
        changed();
      },
    });
    patterns.value = topic.patterns.map((p) => p.join(' + ')).join('\n');

    return el('div', { class: 'edit-card', 'data-topic': index },
      el('div', { class: 'row' },
        el('input', {
          type: 'text', value: topic.name, class: 'name', 'aria-label': 'Topic name',
          oninput: (e) => { topic.name = e.target.value.trim() || 'Untitled'; changed(); },
        }),
        el('button', {
          class: 'icon-btn', type: 'button', title: 'Delete topic', 'aria-label': `Delete topic ${topic.name}`,
          onclick: () => {
            if (!confirm(`Delete the topic "${topic.name}"?`)) return;
            db.topics.splice(index, 1);
            render();
            changed();
          },
        }, '✕'),
      ),
      el('label', { class: 'field-label' }, 'Patterns — one per line, list numbers joined with +'),
      patterns,
      el('p', { class: 'warning', hidden: true }),
    );
  }

  // ---- Lists -----------------------------------------------------------
  function listCard(list, index) {
    const count = el('span', { class: 'count' }, `${list.entries.length} entries`);
    const entries = el('textarea', {
      rows: 4, 'aria-label': `Entries for list ${list.id}`,
      oninput: (e) => {
        list.entries = lines(e.target.value);
        count.textContent = `${list.entries.length} entries`;
        autosize(e.target);
        changed();
      },
    });
    entries.value = list.entries.join('\n');

    return el('details', { class: 'edit-card list-card' },
      el('summary', {},
        el('span', { class: 'list-id' }, list.id),
        el('span', { class: 'list-label' }, list.label || 'Untitled list'),
        count,
      ),
      el('div', { class: 'row' },
        el('input', {
          type: 'text', value: list.id, class: 'id-input', 'aria-label': 'List number',
          oninput: (e) => {
            const old = list.id;
            const id = DB.cleanId(e.target.value);
            if (!id) return;
            list.id = id;
            // Keep topic patterns pointing at this list.
            for (const t of db.topics) t.patterns = t.patterns.map((p) => p.map((x) => (x === old ? id : x)));
            e.target.closest('details').querySelector('.list-id').textContent = id;
            refreshTopicPatterns();
            changed();
          },
        }),
        el('input', {
          type: 'text', value: list.label, class: 'name', placeholder: 'Label', 'aria-label': 'List label',
          oninput: (e) => {
            list.label = e.target.value.trim();
            e.target.closest('details').querySelector('.list-label').textContent = list.label || 'Untitled list';
            changed();
          },
        }),
        el('button', {
          class: 'icon-btn', type: 'button', title: 'Delete list', 'aria-label': `Delete list ${list.id}`,
          onclick: () => {
            if (!confirm(`Delete list ${list.id} and its ${list.entries.length} entries?`)) return;
            db.lists.splice(index, 1);
            render();
            changed();
          },
        }, '✕'),
      ),
      el('label', { class: 'field-label' }, 'Entries — one per line'),
      entries,
    );
  }

  function refreshTopicPatterns() {
    root.querySelectorAll('[data-topic]').forEach((card) => {
      const t = db.topics[card.dataset.topic];
      const ta = card.querySelector('textarea');
      if (t && document.activeElement !== ta) ta.value = t.patterns.map((p) => p.join(' + ')).join('\n');
    });
  }

  function updateWarnings() {
    const byId = new Map(db.lists.map((l) => [l.id, l]));
    root.querySelectorAll('[data-topic]').forEach((card) => {
      const t = db.topics[card.dataset.topic];
      const warn = card.querySelector('.warning');
      if (!t) return;
      const missing = new Set();
      const empty = new Set();
      for (const p of t.patterns) {
        for (const id of p) {
          if (!byId.has(id)) missing.add(id);
          else if (!byId.get(id).entries.length) empty.add(id);
        }
      }
      const msgs = [];
      if (!t.patterns.length) msgs.push('No patterns yet.');
      if (missing.size) msgs.push(`No list called ${[...missing].join(', ')}.`);
      if (empty.size) msgs.push(`List ${[...empty].join(', ')} is empty.`);
      warn.textContent = msgs.join(' ');
      warn.hidden = !msgs.length;
    });
  }

  function nextListId() {
    const nums = db.lists.map((l) => parseInt(l.id, 10)).filter((n) => !isNaN(n));
    return String(nums.length ? Math.max(...nums) + 1 : 1);
  }

  // ---- Page ------------------------------------------------------------
  function render() {
    root.replaceChildren(
      el('h2', {}, 'Edit database'),
      el('p', { class: 'note' },
        'Changes save automatically in this browser only. Use Export to keep a Markdown copy, and Import to load one (for example on another device).'),
      toolbar(),

      el('h3', {}, 'Topics'),
      el('p', { class: 'note' }, 'Each pattern picks one entry from each list, in order. A topic with several patterns uses one at random each time.'),
      el('div', { class: 'stack' }, db.topics.map(topicCard)),
      el('button', {
        class: 'btn btn-add', type: 'button',
        onclick: () => {
          db.topics.push({ name: 'New topic', patterns: [] });
          render();
          changed();
          root.querySelector(`[data-topic="${db.topics.length - 1}"] .name`).select();
        },
      }, '+ Add topic'),

      el('h3', {}, 'Lists'),
      el('div', { class: 'stack' }, db.lists.map(listCard)),
      el('button', {
        class: 'btn btn-add', type: 'button',
        onclick: () => {
          db.lists.push({ id: nextListId(), label: 'New list', entries: [] });
          render();
          changed();
          const cards = root.querySelectorAll('.list-card');
          const card = cards[cards.length - 1];
          card.open = true;
          card.querySelector('.name').select();
        },
      }, '+ Add list'),
    );

    root.querySelectorAll('textarea').forEach(autosize);
    root.querySelectorAll('details').forEach((d) =>
      d.addEventListener('toggle', () => d.querySelectorAll('textarea').forEach(autosize)));
    updateWarnings();
  }

  return { init, setDb, render };
})();
