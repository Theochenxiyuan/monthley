import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import enUs from 'element-plus/es/locale/lang/en';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import 'element-plus/theme-chalk/dark/css-vars.css';
import { autoAnimatePlugin } from '@formkit/auto-animate/vue';
import App from './App.vue';
import router from './router';
import i18n from './i18n';

const app = createApp(App);

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}
app.use(ElementPlus, {
  locale: zhCn,
});
app.use(autoAnimatePlugin);
app.use(createPinia());
app.use(router);
app.use(i18n);

app.mount('#app');
