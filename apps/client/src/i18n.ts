import i18n from 'i18next';
import { initReactI18next, Translation } from 'react-i18next';
import ja from '../locales/ja';
import en from '../locales/en';

i18n.use(initReactI18next).init({
    resources: {ja :{translation : ja}, en :{translation : en}},
    lng : 'ja', fallbackLng : 'en',
    interpolation : { escapeValue : false }
});

export default i18n;