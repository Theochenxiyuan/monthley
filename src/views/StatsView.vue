<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useStats } from '@/composables/useStats';
import StatCard from '@/components/stats/StatCard.vue';
import TypeDistribution from '@/components/stats/TypeDistribution.vue';
import StatusRing from '@/components/stats/StatusRing.vue';
import YearHeatmap from '@/components/stats/YearHeatmap.vue';
import { Icon } from '@iconify/vue';

const { t } = useI18n();
const {
  totalCount,
  completedCount,
  inProgressCount,
  completionRate,
  totalMonthsWithEntries,
  typeStats,
  statusStats,
  yearHeatmapData,
  years,
} = useStats();
</script>

<template>
  <header class="action-bar">
    <h3>{{ t('stats.title') }}</h3>
  </header>

  <div class="stats-content">
    <div v-if="totalCount === 0" class="empty-state">
      <el-empty :description="t('stats.noData')">
        <template #image>
          <Icon icon="mdi:chart-bar" width="64" style="color: var(--el-text-color-placeholder)" />
        </template>
      </el-empty>
    </div>

    <template v-else>
      <div class="stats-section overview-cards">
        <StatCard
          :label="t('stats.totalEntries')"
          :value="totalCount"
          type="primary"
        />
        <StatCard
          :label="t('stats.completed')"
          :value="completedCount"
          type="success"
        />
        <StatCard
          :label="t('stats.completionRate')"
          :value="completionRate"
          type="warning"
          suffix="%"
        />
      </div>

      <div class="stats-section additional-cards">
        <StatCard
          :label="t('stats.inProgress')"
          :value="inProgressCount"
          type="primary"
        />
        <StatCard
          :label="t('stats.totalMonths')"
          :value="totalMonthsWithEntries"
          type="info"
        />
      </div>

      <div class="stats-section ring-row">
        <div class="ring-col">
          <TypeDistribution :type-stats="typeStats" />
        </div>
        <div class="ring-col">
          <StatusRing
            :status-stats="statusStats"
            :total-count="totalCount"
          />
        </div>
      </div>

      <div class="stats-section">
        <YearHeatmap
          :heatmap-data="yearHeatmapData"
          :years="years"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-content {
  padding: 1rem;
}

.stats-section {
  margin-top: 0.75rem;
}

.overview-cards {
  display: flex;
  gap: 0.75rem;
}

.additional-cards {
  display: flex;
  gap: 0.75rem;
}

.additional-cards > :deep(.stat-card) {
  max-width: 50%;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 40vh;
}

.ring-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 600px) {
  .ring-row {
    flex-direction: row;
  }
  .ring-col {
    flex: 1;
    min-width: 0;
  }
}
</style>