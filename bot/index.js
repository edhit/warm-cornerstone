import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Telegraf, Markup } from 'telegraf';
import { writeStoriesJs, writeReviewsJs } from './generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Явно указываем путь к .env рядом со скриптом — не зависит от того,
// откуда запущен процесс (npm run bot из корня, pm2, systemd и т.д.)
dotenv.config({ path: path.join(__dirname, '.env') });

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_IDS = (process.env.OWNER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const SITE_ROOT = path.resolve(__dirname, process.env.SITE_ROOT || '..');

if (!BOT_TOKEN) {
    console.error('Заполните BOT_TOKEN в .env (см. .env.example)');
    process.exit(1);
}
if (!OWNER_IDS.length) {
    console.error('Заполните OWNER_IDS в .env — ваш Telegram Chat ID (через запятую, если владельцев несколько)');
    process.exit(1);
}

const STORIES_DB_PATH = path.join(__dirname, 'data', 'stories.json');
const REVIEWS_DB_PATH = path.join(__dirname, 'data', 'reviews.json');
const STORIES_IMG_DIR = path.join(SITE_ROOT, 'public', 'img', 'stories');
const REVIEWS_IMG_DIR = path.join(SITE_ROOT, 'public', 'img', 'reviews');
const STORIES_JS_OUT = path.join(SITE_ROOT, 'src', 'stories.js');
const REVIEWS_JS_OUT = path.join(SITE_ROOT, 'src', 'reviews.js');

function loadDb(p) {
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
        return [];
    }
}

function saveDb(p, data) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ── состояние по каждому чату (в памяти; после перезапуска бота сбрасывается) ──
// mode: 'stories' | 'reviews'
// pendingCategory: выбранная категория сторис, ждём фото
// awaitingNewCategory: ждём текст с названием новой категории
// categoryChoices: список категорий, которые сейчас показаны кнопками
//                  (нужен, чтобы сопоставить нажатую кнопку с названием)
const chatState = new Map();
function getState(id) {
    if (!chatState.has(id)) {
        chatState.set(id, { mode: 'stories', pendingCategory: null, awaitingNewCategory: false, categoryChoices: [] });
    }
    return chatState.get(id);
}

// ── категории сторис (заголовки под кружками) ─────────────────────
function getExistingCategories() {
    const db = loadDb(STORIES_DB_PATH);
    const seen = new Set();
    const list = [];
    for (const e of db) {
        if (!seen.has(e.title)) {
            seen.add(e.title);
            list.push(e.title);
        }
    }
    return list;
}

function showCategoryPicker(ctx) {
    const state = getState(ctx.chat.id);
    const categories = getExistingCategories();
    state.categoryChoices = categories;

    const buttons = categories.map((title, i) => [Markup.button.callback(title, `cat:${i}`)]);
    buttons.push([Markup.button.callback('➕ Новая категория', 'cat:new')]);

    return ctx.reply('В какую категорию сторис добавить фото?', Markup.inlineKeyboard(buttons));
}

// ── разбор текста отзыва ──────────────────────────────────────────
function splitReviewText(text) {
    const parts = text.split('|').map((p) => p.trim());
    if (parts.length === 3) return { n: parts[0], c: parts[1], t: parts[2] };
    if (parts.length === 2) return { n: parts[0], c: '', t: parts[1] };
    return { n: 'Клиент', c: '', t: text.trim() };
}

// ── скачивание фото из Telegram ───────────────────────────────────
async function downloadPhoto(ctx, fileId, dir, id) {
    const link = await ctx.telegram.getFileLink(fileId);
    const href = typeof link === 'string' ? link : link.href;
    const res = await fetch(href);
    if (!res.ok) throw new Error(`Не удалось скачать фото: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (href.split('.').pop() || 'jpg').toLowerCase().slice(0, 4);
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `${id}.${ext}`;
    fs.writeFileSync(path.join(dir, fileName), buf);
    return fileName;
}

// ── бот ────────────────────────────────────────────────────────────
const bot = new Telegraf(BOT_TOKEN);

bot.use((ctx, next) => {
    const id = String(ctx.from?.id || '');
    if (!OWNER_IDS.includes(id)) {
        console.log('Неавторизованный доступ от', ctx.from?.first_name, id);
        return ctx.reply(`⛔ Доступ запрещён.\nВаш Chat ID: ${id}`);
    }
    return next();
});

const keyboard = {
    reply_markup: {
        keyboard: [['📸 Сторис', '💬 Отзыв'], ['🟢 Бот на связи?']],
        resize_keyboard: true,
    },
};

bot.start((ctx) => {
    const state = getState(ctx.from.id);
    state.mode = 'stories';
    state.pendingCategory = null;
    ctx.reply(
        'Привет!\n\n' +
        'Отправьте комментарий или отправьте фото с подписью для сторис на «CODE».\n\n' +
        '📸 Сторис — сначала выберите категорию (кружок на сайте), потом присылайте фото с подписью.\n' +
        '💬 Отзыв — просто текст, либо фото с подписью.\n\n' +
        'Просто присылайте в любое время, ничего не проверяя заранее — даже если бот в этот момент ' +
        'спит или выключен, сообщение никуда не пропадёт. Telegram сам придержит его и доставит боту, ' +
        'как только он снова будет на связи — тогда придёт подтверждение. Может занять какое-то время, ' +
        'но точно дойдёт.\n\n' +
        'Переключить режим — кнопками внизу.',
        keyboard
    );
});

bot.help((ctx) => {
    ctx.reply(
        'Как это работает:\n\n' +
        '1. Нажмите «📸 Сторис» — бот покажет список категорий и кнопку «Новая категория»\n' +
        '2. Выберите существующую или создайте новую — введите название\n' +
        '3. Присылайте фото с подписью — подпись станет описанием под фото в сторис\n' +
        '4. Пока не сменили категорию — следующие фото идут туда же\n\n' +
        'Для отзыва («💬 Отзыв») — просто текст, или фото с подписью.\n' +
        'Формат текста отзыва (необязательно): Имя, город | Что чистили | Текст\n' +
        'Например: Анна, Москва | Диван, ткань | Диван как новый!\n' +
        'Без «|» отзыв тоже сохранится — с именем «Клиент» и без категории.\n\n' +
        'Ничего проверять перед отправкой не нужно: если бот сейчас не в сети, Telegram сам придержит ' +
        'сообщение и доставит, как только бот включится — тогда придёт подтверждение.\n' +
        '/ping — необязательная быстрая проверка, если вдруг любопытно, работает ли бот прямо сейчас.'
    );
});

bot.command('ping', (ctx) => ctx.reply('🟢 Бот на связи, всё работает.'));
bot.hears('🟢 Бот на связи?', (ctx) => ctx.reply('🟢 Бот на связи, всё работает.'));

bot.hears('📸 Сторис', (ctx) => {
    const state = getState(ctx.from.id);
    state.mode = 'stories';
    state.pendingCategory = null;
    showCategoryPicker(ctx);
});

bot.hears('💬 Отзыв', (ctx) => {
    const state = getState(ctx.from.id);
    state.mode = 'reviews';
    ctx.reply('💬 Режим: отзыв.\nПришлите текст отзыва, или фото с подписью.');
});

// ── выбор категории (инлайн-кнопки) ───────────────────────────────
bot.action(/^cat:(.+)$/, async (ctx) => {
    const chatId = ctx.chat.id;
    const state = getState(chatId);
    const value = ctx.match[1];
    await ctx.answerCbQuery();

    if (value === 'new') {
        state.awaitingNewCategory = true;
        return ctx.editMessageText('Введите название новой категории (короткая подпись под кружком, например «Матрасы»).');
    }

    const title = state.categoryChoices[Number(value)];
    if (!title) {
        return ctx.editMessageText('Эта категория устарела, выберите заново — нажмите «📸 Сторис».');
    }

    state.pendingCategory = title;
    await ctx.editMessageText(`Категория: ${title}\nТеперь пришлите фото с подписью (описанием) для сторис.`);
});

// Если сообщение обработалось намного позже, чем было отправлено — значит,
// оно всё это время ждало в очереди Telegram, пока бот был не в сети
// (спал/был выключен). Добавляем об этом пометку в ответ, чтобы не казалось,
// что бот "тормозит" или что-то пошло не так.
function delayNote(ctx) {
    const sentAt = ctx.message.date * 1000; // Telegram отдаёт unix-время в секундах
    const gapMs = Date.now() - sentAt;
    if (gapMs < 2 * 60 * 1000) return '';
    const minutes = Math.round(gapMs / 60000);
    return `\n\n⏱ Обработано с задержкой ~${minutes} мин. — бот в этот момент был не в сети.`;
}

bot.on('photo', async (ctx) => {
    const chatId = ctx.from.id;
    const state = getState(chatId);
    const caption = (ctx.message.caption || '').trim();

    if (!caption) {
        return ctx.reply('⚠️ Добавьте подпись к фото (caption) и пришлите ещё раз — без подписи не сохраняю.');
    }

    if (state.mode !== 'reviews' && !state.pendingCategory) {
        await ctx.reply('Сначала выберите категорию для сторис:');
        return showCategoryPicker(ctx);
    }

    const waitMsg = await ctx.reply('⏳ Загружаю фото...');

    try {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const sizes = ctx.message.photo;
        const fileId = sizes[sizes.length - 1].file_id; // самое крупное разрешение
        const note = delayNote(ctx);

        if (state.mode === 'reviews') {
            const fileName = await downloadPhoto(ctx, fileId, REVIEWS_IMG_DIR, id);
            const { n, c, t } = splitReviewText(caption);
            const db = loadDb(REVIEWS_DB_PATH);
            db.push({ id, createdAt, n, c, t, photo: `/img/reviews/${fileName}` });
            saveDb(REVIEWS_DB_PATH, db);
            writeReviewsJs(db, REVIEWS_JS_OUT);
            await ctx.reply(`✅ Отзыв с фото сохранён!\n\n«${t.slice(0, 120)}»${note}`);
        } else {
            const fileName = await downloadPhoto(ctx, fileId, STORIES_IMG_DIR, id);
            const title = state.pendingCategory;
            const db = loadDb(STORIES_DB_PATH);
            db.push({ id, createdAt, title, desc: caption, img: `/img/stories/${fileName}` });
            saveDb(STORIES_DB_PATH, db);
            writeStoriesJs(db, STORIES_JS_OUT);
            await ctx.reply(
                `✅ Добавлено в сторис «${title}»!\n\n${caption.slice(0, 120)}${note}\n\n` +
                `Ещё фото в эту же категорию — просто пришлите. Сменить категорию — «📸 Сторис».`
            );
        }
    } catch (err) {
        console.error(err);
        await ctx.reply('❌ Не удалось сохранить фото. Попробуйте ещё раз.');
    } finally {
        ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => { });
    }
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return; // неизвестная команда — молчим

    const chatId = ctx.from.id;
    const state = getState(chatId);

    if (state.awaitingNewCategory) {
        state.awaitingNewCategory = false;
        state.pendingCategory = text;
        return ctx.reply(`Новая категория: «${text}»\nТеперь пришлите фото с подписью (описанием) для сторис.`);
    }

    if (state.mode !== 'reviews') {
        return ctx.reply(
            'Сейчас режим «Сторис» — для него нужно фото с подписью.\n' +
            'Если хотели добавить отзыв текстом — нажмите «💬 Отзыв».'
        );
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const { n, c, t } = splitReviewText(text);
    const db = loadDb(REVIEWS_DB_PATH);
    db.push({ id, createdAt, n, c, t, photo: null });
    saveDb(REVIEWS_DB_PATH, db);
    writeReviewsJs(db, REVIEWS_JS_OUT);
    await ctx.reply(`✅ Отзыв сохранён!\n\n«${t.slice(0, 120)}»${delayNote(ctx)}`);
});

// На случай, если данные в data/*.json поправили руками — подтянем перед стартом
writeStoriesJs(loadDb(STORIES_DB_PATH), STORIES_JS_OUT);
writeReviewsJs(loadDb(REVIEWS_DB_PATH), REVIEWS_JS_OUT);

async function notifyOwners(text) {
    for (const id of OWNER_IDS) {
        try {
            await bot.telegram.sendMessage(id, text);
        } catch (err) {
            console.error('Не удалось отправить уведомление владельцу', id, err.message);
        }
    }
}

bot
    .launch()
    .then(() => {
        console.log('Бот CODE запущен и слушает Telegram. Ctrl+C — остановить.');
        return notifyOwners('✅ Бот CODE запущен. Можно присылать фото и отзывы.');
    })
    .catch((err) => {
        console.error('Не удалось запустить бота:', err);
        process.exit(1);
    });

// ── обнаружение сна/заморозки ноутбука ────────────────────────────
// Заранее предупредить об уходе в сон невозможно — при переходе в сон
// операционная система мгновенно замораживает процесс, без каких-либо
// сигналов для Node.js (это ограничение самой ОС, не бота).
// Но можно засечь сам факт "заморозки" по времени: если между двумя
// тиками таймера прошло намного больше, чем должно было — значит,
// ноутбук всё это время спал (или лежал в спящем режиме браузер/сессия).
// Как только он проснётся — бот тут же напишет об этом.
const HEARTBEAT_MS = 20_000; // 20 секунд
let lastTick = Date.now();

setInterval(() => {
    const now = Date.now();
    const gap = now - lastTick;
    lastTick = now;

    if (gap > HEARTBEAT_MS * 3) {
        const minutes = Math.max(1, Math.round(gap / 60000));
        console.log(`Обнаружен разрыв ~${minutes} мин — похоже, компьютер был в спящем режиме.`);
        notifyOwners(
            `🔄 Бот снова на связи.\n` +
            `Похоже, компьютер был в спящем режиме или недоступен примерно ${minutes} мин. — всё это время бот не отвечал.\n` +
            `Если недавно присылали фото или отзыв и не получили подтверждение — пришлите ещё раз.`
        );
    }
}, HEARTBEAT_MS);

async function shutdown(signal) {
    console.log(`\nПолучен сигнал ${signal}, останавливаю бота...`);
    await notifyOwners('⛔ Бот CODE остановлен. Пока он выключен, фото и отзывы отправлять не получится.');
    bot.stop(signal);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));