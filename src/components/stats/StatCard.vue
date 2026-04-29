<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  type?: 'primary' | 'success' | 'warning' | 'info';
  suffix?: string;
}>();
</script>

<template>
  <div class="stat-card" :class="type || 'primary'">
    <div class="stat-value">
      {{ value }}<span v-if="suffix" class="stat-suffix">{{ suffix }}</span>
    </div>
    <div class="stat-label">{{ label }}</div>
  </div>
</template>

<style scoped>
.stat-card {
  flex: 1;
  min-width: 0;
  text-align: center;
  padding: 1rem 0.5rem;
  border-radius: 10px;
  background-color: var(--el-fill-color-light);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-card.primary .stat-value {
  color: var(--el-color-primary);
}

.stat-card.success .stat-value {
  color: var(--el-color-success);
}

.stat-card.warning .stat-value {
  color: var(--el-color-warning);
}

.stat-card.info .stat-value {
  color: var(--el-color-info);
}

.stat-suffix {
  font-size: 0.875rem;
  font-weight: 400;
  margin-left: 2px;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
  margin-top: 0.25rem;
}
</style>