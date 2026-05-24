const translations = {};
let currentLocale = localStorage.getItem('locale') || 'ru';

export const i18n = {
    async load(locale) {
        if (translations[locale]) {
            currentLocale = locale;
            return;
        }
        const res = await fetch(`/static/locales/${locale}.json`);
        translations[locale] = await res.json();
        currentLocale = locale;
        localStorage.setItem('locale', locale);
    },

    t(key, params = {}) {
        const keys = key.split('.');
        let value = translations[currentLocale];
        for (const k of keys) value = value?.[k];
        return value?.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`) ?? key;
    }
};

await i18n.load(currentLocale);
