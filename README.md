# Gaelic Practice

A mobile-friendly web app that builds random English sentences from word lists, for practising translation into Scottish Gaelic.

It is a static site with no server-side code. Upload `index.html` plus the `css/` and `js/` folders to any web host, or open `index.html` directly in a browser.

## Using it

- **Topic menu** (always visible): choose Inversion, Infinitive, Question Prefix or Conjunction. A random sentence appears; tap **Next** for another.
- **Check translation** opens Google Translate (English → Scottish Gaelic) with the current sentence. Machine translation of Gaelic isn't always right.
- **Hint** box: tap **Add**/**Edit** to write a note for that topic. Hints save with the database.
- **Edit**: change topics, patterns and lists. Changes save automatically **in that browser only** (localStorage).
  - **Export .md** downloads the whole database as a Markdown file.
  - **Import .md** loads one (e.g. to move your lists to another device).
  - **Reset to starter** restores the built-in lists in `js/starter.js`.

## Database format

```markdown
# Gaelic Practice Database

## Topics

### Question Prefix
> Question words take the dependent form.
- 8 + 2
- 8 + 4

## Lists

### 8: Question words
- where
- when
```

- Under `## Topics`, each `###` heading is a topic and each `- ` line is a pattern: list numbers joined by `+`, used in that order. If a topic has more than one pattern, one is chosen at random each time. Optional `> ` lines under a topic heading are its hint.
- Under `## Lists`, each heading is `### <number>: <label>`, followed by one entry per `- ` line.
