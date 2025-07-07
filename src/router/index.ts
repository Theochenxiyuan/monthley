import { createRouter, createWebHashHistory } from 'vue-router';
import TimelineView from '@/views/TimelineView.vue';
import SettingsView from '@/views/SettingsView.vue';
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/timeline',
    },
    {
      path: '/timeline',
      name: 'timeline',
      component: TimelineView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
  ],
});

export default router;
