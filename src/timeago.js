// Считает подпись вида "3 дня назад", как в Instagram — вычисляется
// в браузере в момент показа страницы, поэтому всегда актуальна и не
// требует пересборки сайта только ради того, чтобы дата не «протухла».

function pluralRu(n, forms) {
    // forms = [один, два-четыре, пять-и-больше], например ["день", "дня", "дней"]
    const mod100 = Math.abs(n) % 100;
    const mod10 = mod100 % 10;
    if (mod100 > 10 && mod100 < 20) return forms[2];
    if (mod10 > 1 && mod10 < 5) return forms[1];
    if (mod10 === 1) return forms[0];
    return forms[2];
}

export function timeAgo(dateStr) {
    if (!dateStr) return "";
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return "";

    const diffMs = Date.now() - then;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;

    if (diffMs < minute) return "только что";
    if (diffMs < hour) {
        const m = Math.floor(diffMs / minute);
        return `${m} ${pluralRu(m, ["минуту", "минуты", "минут"])} назад`;
    }
    if (diffMs < day) {
        const h = Math.floor(diffMs / hour);
        return `${h} ${pluralRu(h, ["час", "часа", "часов"])} назад`;
    }
    if (diffMs < week) {
        const d = Math.floor(diffMs / day);
        return `${d} ${pluralRu(d, ["день", "дня", "дней"])} назад`;
    }
    if (diffMs < month) {
        const w = Math.floor(diffMs / week);
        return `${w} ${pluralRu(w, ["неделю", "недели", "недель"])} назад`;
    }
    const mo = Math.floor(diffMs / month);
    return `${mo} ${pluralRu(mo, ["месяц", "месяца", "месяцев"])} назад`;
}
