// Random sentence generation for a topic.
window.Practice = (() => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Returns { pattern, parts: [{ id, label, text }], key } or { error }.
  function generate(topic, db, previousKey) {
    const byId = new Map(db.lists.map((l) => [l.id, l]));
    const usable = topic.patterns.filter((p) =>
      p.every((id) => byId.has(id) && byId.get(id).entries.length > 0));

    if (!usable.length) {
      return {
        error: topic.patterns.length
          ? 'The lists this topic uses are missing or empty. Fix them on the Edit page.'
          : 'This topic has no patterns yet. Add one on the Edit page.',
      };
    }

    // Avoid showing the exact same sentence twice in a row (when possible).
    let result;
    for (let attempt = 0; attempt < 12; attempt++) {
      const pattern = pick(usable);
      const parts = pattern.map((id) => {
        const list = byId.get(id);
        return { id, label: list.label, text: pick(list.entries) };
      });
      result = { pattern, parts, key: parts.map((p) => p.text).join('|') };
      if (result.key !== previousKey) break;
    }
    return result;
  }

  return { generate };
})();
