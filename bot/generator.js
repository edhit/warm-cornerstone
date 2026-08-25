// generator.js
// Строит src/stories.js и src/reviews.js из локальной JSON-базы.
// Логика (группировка по заголовку и т.д.) — та же, что была в
// прежнем инструменте синхронизации с Google Sheets.

import fs from 'fs';
import path from 'path';

function jsStringLiteral(str) {
  return JSON.stringify(str || '');
}

export function writeStoriesJs(db, outPath) {
  // Несколько фото с одинаковым заголовком объединяются в одну "сторис"
  // с несколькими слайдами (как разделы "Диваны" или "Стулья и кресла").
  // Порядок групп = порядок первого появления заголовка.
  const order = [];
  const groups = new Map();
  for (const entry of db) {
    if (!groups.has(entry.title)) {
      groups.set(entry.title, []);
      order.push(entry.title);
    }
    groups.get(entry.title).push(entry);
  }

  const blocks = order.map((title) => {
    const entries = groups.get(title).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const createdAt = entries[entries.length - 1].createdAt; // дата самого свежего фото в группе
    const slides = entries
      .map((e) => `      { img: ${jsStringLiteral(e.img)}, desc: ${jsStringLiteral(e.desc)} },`)
      .join('\n');
    return (
      `  {\n` +
      `    title: ${jsStringLiteral(title)},\n` +
      `    createdAt: ${jsStringLiteral(createdAt)},\n` +
      `    slides: [\n${slides}\n    ],\n` +
      `  },`
    );
  });

  const content =
    `// ─────────────────────────────────────────────────────────────────\n` +
    `// СТОРИС — этот файл автоматически перезаписывается ботом (bot/index.js)\n` +
    `// сразу после того, как владелец пришлёт новое фото в Telegram.\n` +
    `// РУЧНЫЕ ПРАВКИ ЗДЕСЬ БУДУТ ПОТЕРЯНЫ при следующей записи —\n` +
    `// добавляйте новые фото через бота, а не редактируя этот файл.\n` +
    `// ─────────────────────────────────────────────────────────────────\n` +
    `export const stories = [\n${blocks.join('\n')}\n];\n`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, 'utf8');
}

export function writeReviewsJs(db, outPath) {
  const sorted = db.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const blocks = sorted.map((r) => {
    const photos = r.photo ? `[${jsStringLiteral(r.photo)}]` : '[]';
    return (
      `  {\n` +
      `    n: ${jsStringLiteral(r.n)},\n` +
      `    c: ${jsStringLiteral(r.c)},\n` +
      `    t: ${jsStringLiteral(r.t)},\n` +
      `    createdAt: ${jsStringLiteral(r.createdAt)},\n` +
      `    photos: ${photos},\n` +
      `  },`
    );
  });

  const content =
    `// ─────────────────────────────────────────────────────────────────\n` +
    `// ОТЗЫВЫ — этот файл автоматически перезаписывается ботом (bot/index.js)\n` +
    `// сразу после того, как владелец пришлёт новый отзыв в Telegram.\n` +
    `// РУЧНЫЕ ПРАВКИ ЗДЕСЬ БУДУТ ПОТЕРЯНЫ при следующей записи —\n` +
    `// добавляйте новые отзывы через бота, а не редактируя этот файл.\n` +
    `// ─────────────────────────────────────────────────────────────────\n` +
    `export const reviews = [\n${blocks.join('\n')}\n];\n`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, 'utf8');
}
