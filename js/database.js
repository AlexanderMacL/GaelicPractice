// Database model: parse/serialise the Markdown format and persist it in the
// browser. There is no server: edits live in localStorage until exported.
window.DB = (() => {
  const STORAGE_KEY = 'gaelicPractice.database';
  const DEFAULT_TITLE = 'Gaelic Practice Database';

  function parse(md) {
    const db = { title: DEFAULT_TITLE, topics: [], lists: [] };
    let section = null;
    let current = null;

    for (const raw of String(md).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      let m;

      if ((m = line.match(/^#\s+(.+)$/))) {
        db.title = m[1].trim();
        continue;
      }
      if ((m = line.match(/^##\s+(.+)$/))) {
        const h = m[1].trim().toLowerCase();
        section = h.startsWith('topic') ? 'topics' : h.startsWith('list') ? 'lists' : null;
        current = null;
        continue;
      }
      if ((m = line.match(/^###\s+(.+)$/))) {
        const heading = m[1].trim();
        if (section === 'topics') {
          current = { name: heading, hint: '', hintLines: [], patterns: [] };
          db.topics.push(current);
        } else if (section === 'lists') {
          const lm = heading.match(/^([^:]+?)\s*:\s*(.*)$/);
          current = {
            id: cleanId(lm ? lm[1] : heading),
            label: lm ? lm[2].trim() : '',
            entries: [],
          };
          db.lists.push(current);
        } else {
          current = null;
        }
        continue;
      }
      if (section === 'topics' && current && (m = raw.trim().match(/^>\s?(.*)$/))) {
        current.hintLines.push(m[1].trimEnd());
        continue;
      }
      if ((m = line.match(/^[-*]\s+(.*)$/)) && current) {
        const text = m[1].trim();
        if (!text) continue;
        if (section === 'topics') {
          const pattern = parsePattern(text);
          if (pattern.length) current.patterns.push(pattern);
        } else {
          current.entries.push(text);
        }
      }
    }
    for (const t of db.topics) {
      t.hint = t.hintLines.join('\n').trim();
      delete t.hintLines;
    }
    return db;
  }

  function serialize(db) {
    const out = [`# ${db.title || DEFAULT_TITLE}`, ''];
    out.push('## Topics', '');
    for (const t of db.topics) {
      out.push(`### ${t.name}`);
      if (t.hint) {
        for (const l of t.hint.split('\n')) out.push(l.trim() ? `> ${l.trimEnd()}` : '>');
      }
      for (const p of t.patterns) out.push(`- ${p.join(' + ')}`);
      out.push('');
    }
    out.push('## Lists', '');
    for (const l of db.lists) {
      out.push(l.label ? `### ${l.id}: ${l.label}` : `### ${l.id}`);
      for (const e of l.entries) out.push(`- ${e}`);
      out.push('');
    }
    return out.join('\n');
  }

  // "8 + 2" -> ["8", "2"]
  function parsePattern(text) {
    return text.split('+').map(cleanId).filter(Boolean);
  }

  // List ids can't contain the characters the format uses as separators.
  function cleanId(s) {
    return String(s).replace(/[+:#\n]/g, '').trim();
  }

  function load() {
    try {
      const md = localStorage.getItem(STORAGE_KEY);
      if (md) return parse(md);
    } catch (e) { /* storage unavailable: fall back to starter */ }
    return parse(window.STARTER_DATABASE);
  }

  function save(db) {
    try {
      localStorage.setItem(STORAGE_KEY, serialize(db));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    return parse(window.STARTER_DATABASE);
  }

  return { parse, serialize, parsePattern, cleanId, load, save, reset };
})();
