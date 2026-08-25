import Alpine from 'alpinejs';

import './main.css';
import { stories } from './stories.js';
import { reviews } from './reviews.js';
import { timeAgo } from './timeago.js';


function app() {
    return {
        menu: false,
        faqOpen: null,
        viewedStories: [],
        heart: false,
        // viewer.storyIdx = which highlight circle is open, viewer.slideIdx = which photo inside it
        viewer: { open: false, storyIdx: 0, slideIdx: 0 },
        reviewViewer: { open: false, reviewIdx: 0, photoIdx: 0 },

        // ── PWA install ──────────────────────────────────────────────
        canInstall: false,
        isStandalone: false,
        iosHint: false,
        bannerDismissed: false,
        _deferredPrompt: null,

        init() {
            const isStandalone =
                window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            this.isStandalone = isStandalone;

            if (isStandalone) {
                // Уже установлено на главный экран — кнопку установки никогда не показываем,
                // а часть вводного/маркетингового контента скрываем через x-show="!isStandalone"
                this.canInstall = false;
                return;
            }

            const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;

            if (isIOS) {
                // На iOS Safari нет системного окна установки — показываем свою кнопку с инструкцией
                this.canInstall = true;
                this._isIOS = true;
                return;
            }

            // Android / Chrome / Edge: ждём системное событие готовности установки
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this._deferredPrompt = e;
                this.canInstall = true;
            });

            window.addEventListener('appinstalled', () => {
                this.canInstall = false;
                this._deferredPrompt = null;
            });
        },

        async installApp() {
            if (this._isIOS) {
                this.iosHint = true;
                return;
            }
            if (!this._deferredPrompt) return;
            this._deferredPrompt.prompt();
            const { outcome } = await this._deferredPrompt.userChoice;
            if (outcome === 'accepted') this.canInstall = false;
            this._deferredPrompt = null;
        },

        nav: [
            { t: "Услуги", h: "#services", hideInApp: true },
            { t: "Наши работы", h: "#works" },
            { t: "Калькулятор", h: "#calculator" },
            { t: "Цены", h: "#prices", hideInApp: true },
            { t: "Отзывы", h: "#reviews", hideInApp: true },
            { t: "Вопросы", h: "#faq", hideInApp: true },
            { t: "О нас", h: "#about", hideInApp: true },
            { t: "Контакты", h: "#contacts" },
        ],
        get visibleNav() {
            return this.nav.filter((l) => !l.hideInApp || !this.isStandalone);
        },
        stats: [
            { v: "5+ лет", t: "опыта" },
            { v: "1000+", t: "довольных клиентов" },
            { v: "Выезд", t: "за 1–2 часа" },
            { v: "Безопасно", t: "для детей и животных" },
        ],
        steps: [
            { icon: "camera", t: "Вы присылаете фото", d: "Мы оцениваем объём и сложность работы" },
            { icon: "tag", t: "Сообщаем стоимость", d: "Предварительная цена и свободные даты" },
            { icon: "van", t: "Приезжаем", d: "Со всем оборудованием и профессиональной химией" },
            { icon: "spray", t: "Проводим химчистку", d: "Удаляем загрязнения и запахи" },
            { icon: "sparkle", t: "Вы принимаете работу", d: "И наслаждаетесь чистой мебелью" },
        ],
        services: [
            { icon: "sofa", t: "Химчистка мебели", d: "Диваны, кресла, стулья, матрасы — любая ткань и степень загрязнения." },
            { icon: "rug", t: "Химчистка ковров", d: "Выводим пятна и запахи, восстанавливаем цвет ворса." },
            { icon: "broom", t: "Уборка квартир и домов", d: "Поддерживающая и генеральная уборка, разовая или на регулярной основе." },
            { icon: "spray", t: "Уборка после ремонта", d: "Убираем строительную пыль и грязь, готовим квартиру к жизни." },
            { icon: "window", t: "Мытьё окон", d: "Окна, балконы и витражи — без разводов, с выездом бригады." },
            { icon: "building", t: "Клининг офисов и ресторанов", d: "Разовая и постоянная уборка коммерческих помещений." },
        ],
        prices: [
            { t: "Диван 2-местный", p: "от 3 500 ₽" },
            { t: "Диван 3-местный", p: "от 4 500 ₽" },
            { t: "Угловой диван", p: "от 5 500 ₽" },
            { t: "Кресло", p: "от 1 500 ₽" },
            { t: "Стул", p: "от 600 ₽ / шт." },
            { t: "Матрас (1 спальное место)", p: "от 1 500 ₽" },
            { t: "Ковёр", p: "от 250 ₽ / м²" },
            { t: "Поддерживающая уборка квартиры", p: "от 2 500 ₽" },
            { t: "Генеральная уборка квартиры", p: "от 4 000 ₽" },
            { t: "Уборка после ремонта", p: "от 6 000 ₽" },
            { t: "Мытьё окон", p: "от 200 ₽ / створка" },
            { t: "Уборка офиса", p: "по договорённости" },
        ],
        calcItems: [
            { icon: "sofa", t: "Диван 3-местный", p: 4500, qty: 0 },
            { icon: "armchair", t: "Кресло", p: 1500, qty: 0 },
            { icon: "chair", t: "Стул", p: 600, unit: "шт.", qty: 0 },
            { icon: "mattress", t: "Матрас", p: 1500, qty: 0 },
            { icon: "rug", t: "Ковёр", p: 250, unit: "м²", qty: 0 },
            { icon: "officechair", t: "Офисное кресло", p: 900, qty: 0 },
        ],
        stains: [
            { icon: "wine", t: "Пятна от еды и напитков" },
            { icon: "paw", t: "Следы животных и запахи" },
            { icon: "drop", t: "Жир и засаленность" },
            { icon: "pen", t: "Краски и чернила" },
            { icon: "toy", t: "Детские пятна" },
            { icon: "sparkles-clean", t: "Сложные и старые загрязнения" },
        ],
        why: [
            { icon: "toolbox", t: "Профессиональное оборудование", d: "Мощные экстракторы и щётки для глубокой очистки" },
            { icon: "flask", t: "Профессиональная химия", d: "Безопасные составы, которые не портят ткань" },
            { icon: "medal", t: "Опыт и ответственность", d: "Более 5 лет опыта и тысячи выполненных заказов" },
            { icon: "shield", t: "Гарантия качества", d: "Если что-то не устроит — исправим бесплатно" },
        ],
        reviews,
        stories,

        faqs: [
            { q: "Сколько сохнет мебель после химчистки?", a: "В среднем 4–8 часов в зависимости от ткани и погоды. Пользоваться мебелью можно уже в этот же день, полное высыхание — к утру." },
            { q: "Безопасно для детей и животных?", a: "Да, используем сертифицированную профессиональную химию без резкого запаха. После высыхания мебель полностью безопасна." },
            { q: "А если пятно не отойдёт до конца?", a: "Честно предупредим об этом заранее, до начала работы, а не после оплаты. Если пятно проявится повторно после высыхания — приедем и переделаем бесплатно." },
            { q: "Нужно ли готовиться к приезду мастера?", a: "Нет, ничего специально готовить не нужно. Достаточно освободить доступ к мебели — остальное сделаем сами." },
            { q: "Работаете в выходные?", a: "Да, работаем ежедневно с 8:00 до 22:00, без выходных." },
            { q: "Как оплатить?", a: "Наличными или картой мастеру на месте после приёмки работы." },
        ],

        timeAgo,

        get calcTotal() {
            return this.calcItems.reduce((sum, i) => sum + i.p * i.qty, 0);
        },

        get waLink() {
            const chosen = this.calcItems.filter((i) => i.qty > 0).map((i) => `${i.t} × ${i.qty}`);
            let msg = "Здравствуйте! Хочу узнать стоимость химчистки.";
            if (chosen.length) {
                msg += ` Предметы: ${chosen.join(", ")}. Предварительно: ${this.calcTotal.toLocaleString("ru-RU")} ₽.`;
            }
            return "https://wa.me/79035981041?text=" + encodeURIComponent(msg);
        },

        openReviewPhotos(reviewIdx, photoIdx) {
            this.reviewViewer = { open: true, reviewIdx, photoIdx };
        },
        nextReviewPhoto() {
            const photos = this.reviews[this.reviewViewer.reviewIdx]?.photos || [];
            if (this.reviewViewer.photoIdx < photos.length - 1) this.reviewViewer.photoIdx++;
            else this.reviewViewer.open = false;
        },
        prevReviewPhoto() {
            if (this.reviewViewer.photoIdx > 0) this.reviewViewer.photoIdx--;
        },

        openStories(i) {
            if (!this.viewedStories.includes(i)) this.viewedStories.push(i);
            this.viewer = { open: true, storyIdx: i, slideIdx: 0 };
        },
        closeViewer() {
            this.viewer.open = false;
        },
        get currentSlide() {
            return this.stories[this.viewer.storyIdx]?.slides[this.viewer.slideIdx];
        },
        likeSlide() {
            this.heart = true;
            setTimeout(() => (this.heart = false), 700);
        },
        nextViewer() {
            const story = this.stories[this.viewer.storyIdx];
            if (this.viewer.slideIdx < story.slides.length - 1) {
                this.viewer.slideIdx++;
            } else if (this.viewer.storyIdx < this.stories.length - 1) {
                this.viewer.storyIdx++;
                this.viewer.slideIdx = 0;
                if (!this.viewedStories.includes(this.viewer.storyIdx)) this.viewedStories.push(this.viewer.storyIdx);
            } else {
                this.closeViewer();
            }
        },
        prevViewer() {
            if (this.viewer.slideIdx > 0) {
                this.viewer.slideIdx--;
            } else if (this.viewer.storyIdx > 0) {
                this.viewer.storyIdx--;
                this.viewer.slideIdx = this.stories[this.viewer.storyIdx].slides.length - 1;
            }
        },

        icon(name) {
            const s = 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"';
            const icons = {
                telegram: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 18.9 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.4-4.8 8.7-7.9c.4-.3-.1-.5-.6-.2L6.2 12.9l-4.6-1.4c-1-.3-1-1 .2-1.5l18-6.9c.8-.3 1.5.2 1.2 1.2Z"/></svg>`,
                whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.4-1.1-2.7s.7-1.9 1-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4-.1.7.5l.8 2c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.1.6.1.3.6 1.1 1.4 1.8 1 .8 1.7 1.1 2 1.2.2.1.4.1.6-.1l.8-.9c.2-.2.3-.2.6-.1l1.9.9c.3.1.5.2.5.4.1.1.1.7-.1 1.5Z"/></svg>`,
                instagram: `<svg viewBox="0 0 24 24" ${s}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none"/></svg>`,
                phone: `<svg viewBox="0 0 24 24" ${s}><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8Z"/></svg>`,
                camera: `<svg viewBox="0 0 24 24" ${s}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="14" r="3.5"/></svg>`,
                send: `<svg viewBox="0 0 24 24" ${s}><path d="M4 12 20 4 13 20l-2-7-7-1Z"/></svg>`,
                check: `<svg viewBox="0 0 24 24" ${s}><path d="M5 12.5 9.5 17 19 7"/></svg>`,
                plus: `<svg viewBox="0 0 24 24" ${s}><path d="M12 5v14M5 12h14"/></svg>`,
                download: `<svg viewBox="0 0 24 24" ${s}><path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></svg>`,
                upload: `<svg viewBox="0 0 24 24" ${s}><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/></svg>`,
                swap: `<svg viewBox="0 0 24 24" ${s}><path d="M8 8h10l-3-3M16 16H6l3 3"/></svg>`,
                sofa: `<svg viewBox="0 0 24 24" ${s}><path d="M5 12v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/><path d="M3 12h18v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4Z"/><path d="M4 17v2M20 17v2"/></svg>`,
                armchair: `<svg viewBox="0 0 24 24" ${s}><path d="M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/><path d="M4 11h2v4H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Zm14 0h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2v-4Z"/><path d="M6 11h12v6a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-6Z"/><path d="M5 18v2M19 18v2"/></svg>`,
                chair: `<svg viewBox="0 0 24 24" ${s}><path d="M7 4h10l-1 8H8L7 4Z"/><path d="M8 12v6M16 12v6M7 20h10"/></svg>`,
                mattress: `<svg viewBox="0 0 24 24" ${s}><rect x="3" y="8" width="18" height="9" rx="1.5"/><path d="M3 12h18M8 8v4M16 8v4"/></svg>`,
                rug: `<svg viewBox="0 0 24 24" ${s}><rect x="3" y="5" width="18" height="14" rx="1.5"/><rect x="6.5" y="8.5" width="11" height="7" rx="1"/></svg>`,
                officechair: `<svg viewBox="0 0 24 24" ${s}><path d="M7 5h8l1 6H6l1-6Z"/><path d="M6 11h10l-1 4H7l-1-4Z"/><path d="M12 15v3m-4 3 4-3 4 3M9 21h6"/></svg>`,
                dots: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>`,
                wine: `<svg viewBox="0 0 24 24" ${s}><path d="M7 3h10l-1 6a4 4 0 0 1-8 0L7 3Z"/><path d="M12 13v6M8.5 21h7"/></svg>`,
                paw: `<svg viewBox="0 0 24 24" ${s}><circle cx="12" cy="15" r="3.4"/><circle cx="6.5" cy="9.5" r="1.6"/><circle cx="17.5" cy="9.5" r="1.6"/><circle cx="9" cy="6.5" r="1.4"/><circle cx="15" cy="6.5" r="1.4"/></svg>`,
                drop: `<svg viewBox="0 0 24 24" ${s}><path d="M12 3s6 6.8 6 11a6 6 0 0 1-12 0c0-4.2 6-11 6-11Z"/></svg>`,
                pen: `<svg viewBox="0 0 24 24" ${s}><path d="m4 20 1-4 11-11 3 3-11 11-4 1Z"/><path d="m14 6 3-3"/></svg>`,
                toy: `<svg viewBox="0 0 24 24" ${s}><circle cx="9" cy="9" r="3"/><circle cx="16" cy="9" r="2"/><path d="M4 20a5 5 0 0 1 10 0M13 20a4 4 0 0 1 7-2.5"/></svg>`,
                "sparkles-clean": `<svg viewBox="0 0 24 24" ${s}><path d="M6 18c3-1 4-2 5-5 1 3 2 4 5 5-3 1-4 2-5 5-1-3-2-4-5-5Z"/><path d="M15 5c1.5-.5 2-1 2.5-2.5C18 4 18.5 4.5 20 5c-1.5.5-2 1-2.5 2.5C17 6 16.5 5.5 15 5Z"/></svg>`,
                toolbox: `<svg viewBox="0 0 24 24" ${s}><rect x="3" y="9" width="18" height="10" rx="1.5"/><path d="M9 9V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M3 14h18"/></svg>`,
                flask: `<svg viewBox="0 0 24 24" ${s}><path d="M10 3h4M10 3v6l-5 9a1.5 1.5 0 0 0 1.3 2.2h11.4A1.5 1.5 0 0 0 19 18l-5-9V3"/><path d="M8.5 15h7"/></svg>`,
                medal: `<svg viewBox="0 0 24 24" ${s}><circle cx="12" cy="9" r="5"/><path d="m9 13-2 8 5-3 5 3-2-8"/></svg>`,
                shield: `<svg viewBox="0 0 24 24" ${s}><path d="M12 3 5 5.5V11c0 5 3 8.5 7 10 4-1.5 7-5 7-10V5.5L12 3Z"/><path d="m9 12 2 2 4-4"/></svg>`,
                tag: `<svg viewBox="0 0 24 24" ${s}><path d="M12 3h6a1 1 0 0 1 1 1v6l-9 9-7-7 9-9Z"/><circle cx="16" cy="8" r="1.3" fill="currentColor" stroke="none"/></svg>`,
                van: `<svg viewBox="0 0 24 24" ${s}><path d="M3 8h11v8H3z"/><path d="M14 11h4l3 3v2h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></svg>`,
                broom: `<svg viewBox="0 0 24 24" ${s}><path d="M14 3 6 11"/><path d="M11 6 4 13c-1 1-1 2.5 0 3.5s2.5 1 3.5 0l7-7"/><path d="m17 9 3 3-6 6-3-3"/><path d="M6 18 4 21"/></svg>`,
                window: `<svg viewBox="0 0 24 24" ${s}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M12 3v18M4 12h16"/></svg>`,
                building: `<svg viewBox="0 0 24 24" ${s}><rect x="4" y="3" width="10" height="18" rx="1"/><path d="M14 8h6v13h-6M7 7h1M10 7h1M7 11h1M10 11h1M7 15h1M10 15h1M16 12h1M16 16h1"/></svg>`,
                spray: `<svg viewBox="0 0 24 24" ${s}><path d="M9 3h3v3H9zM9 8h6l1 12H8L9 8Z"/><path d="M17 9h3M18 6h2.5M17 12h3"/></svg>`,
                sparkle: `<svg viewBox="0 0 24 24" ${s}><path d="M12 3v4M12 17v4M4 12h4M16 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>`,
            };
            return icons[name] || icons.dots;
        },
    };
}
window.Alpine = Alpine;
Alpine.data('app', app);
Alpine.start();