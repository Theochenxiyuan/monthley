<template>
    <header class="action-bar">
        <div class="action-bar-info">
            <span class="action-bar-title">{{ t("timeline.title") }}</span>
            <span class="action-bar-divider">{{ t("punctuation.dash") }}</span>
            <span class="action-bar-subtitle">
                {{ t("timeline.updatedAt") }}{{ t("punctuation.colon") }}
                {{
                    timelineStore.lastUpdated
                        ? smartFormatDateTime(timelineStore.lastUpdated)
                        : t("timeline.noRecord")
                }}
            </span>
        </div>
        <div class="action-bar-actions">
            <el-button type="primary" text @click="drawerVisible = true"
                ><el-icon size="20"><Operation /></el-icon
            ></el-button>
            <el-button type="primary" text @click="searchVisible = true"
                ><el-icon size="20"><Search /></el-icon
            ></el-button>
            <el-button type="primary" @click="dialogStore.open()" size="default"
                ><el-icon><Plus /></el-icon>{{ t("common.add") }}</el-button
            >
        </div>
    </header>

    <div class="timeline-content">
        <EntryDialog />
        <SearchPanel
            v-model="searchVisible"
            @select-entry="handleSearchSelect"
        />
        <el-drawer
            v-model="drawerVisible"
            show-close
            size="340px"
            modal
            :title="t('filters.title')"
            direction="ltr"
            @close="
                typeFilters = filtersStore.activeFilters.type;
                statusFilters = filtersStore.activeFilters.status;
            "
            @open="
                typeFilters = filtersStore.activeFilters.type;
                statusFilters = filtersStore.activeFilters.status;
            "
        >
            <div class="filter-item">
                <el-text
                    >{{ t("filters.categories")
                    }}{{ t("punctuation.colon") }}</el-text
                >
                <el-checkbox-group v-model="typeFilters">
                    <el-checkbox-button
                        v-for="option in typeOptions"
                        :key="option.value"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </el-checkbox-button>
                </el-checkbox-group>
            </div>
            <div class="filter-item">
                <el-text
                    >{{ t("filters.status")
                    }}{{ t("punctuation.colon") }}</el-text
                >
                <el-checkbox-group v-model="statusFilters">
                    <el-checkbox-button
                        v-for="option in statusOptions"
                        :key="option.value"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </el-checkbox-button>
                </el-checkbox-group>
            </div>

            <el-text>{{ t("filters.notes") }}</el-text>
            <template #footer>
                <el-button type="primary" text @click="resetFilters()">{{
                    t("common.reset")
                }}</el-button>
                <el-button type="primary" @click="confirmFilters()">{{
                    t("common.save")
                }}</el-button>
            </template>
        </el-drawer>

        <el-timeline>
            <el-timeline-item
                :timestamp="
                    timelineStore.canLoadUp ? '' : t('timeline.topReached')
                "
                placement="top"
            ></el-timeline-item>

            <el-timeline-item
                v-for="timelineMonth in timelineStore.visibleMonths"
                :key="formatYearMonth(timelineMonth)"
:timestamp="
          formatMonth(timelineMonth) +
          (isCurrentMonth(timelineMonth)
                        ? t('punctuation.space.betweenWords') +
                          t('punctuation.bracket.round[0]') +
                          t('timeline.current') +
                          t('punctuation.bracket.round[1]')
                        : '')
                "
                :type="isCurrentMonth(timelineMonth) ? 'primary' : undefined"
                placement="top"
            >
                <MonthCard
                    :data-month-key="formatYearMonth(timelineMonth)"
                    :month="timelineMonth"
                    :highlight-entry-id="
                        highlightEntryId &&
                        highlightYear === timelineMonth.year &&
                        highlightMonth === timelineMonth.month
                            ? highlightEntryId
                            : undefined
                    "
                    :force-expand="
                        !!(
                            highlightEntryId &&
                            highlightYear === timelineMonth.year &&
                            highlightMonth === timelineMonth.month
                        )
                    "
                ></MonthCard>
            </el-timeline-item>

            <el-timeline-item
                :timestamp="
                    timelineStore.canLoadDown ? '' : t('timeline.bottomReached')
                "
                placement="top"
            ></el-timeline-item>
        </el-timeline>
    </div>

    <Teleport to="body">
        <Transition name="load-fade">
            <button
                v-if="timelineStore.canLoadUp && showLoadUp"
                class="load-more-float load-more-up"
                @click="handleLoadUp"
            >
                {{ t("timeline.loadEarlier") }}
            </button>
        </Transition>
        <Transition name="load-fade">
            <button
                v-if="timelineStore.canLoadDown && showLoadDown"
                class="load-more-float load-more-down"
                @click="handleLoadDown"
            >
                {{ t("timeline.loadLater") }}
            </button>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, onActivated, onDeactivated } from "vue";
import { useI18n } from "vue-i18n";
import EntryDialog from "@/components/EntryDialog.vue";
import MonthCard from "@/components/MonthCard.vue";
import SearchPanel from "@/components/SearchPanel.vue";
import { Search, Plus } from "@element-plus/icons-vue";
import { useTimelineStore, VISIBLE_WINDOW } from "@/stores/timeline";
import { useDialogStore } from "@/stores/dialog";
import { useFiltersStore } from "@/stores/filters";
import {
    formatMonth,
    smartFormatDateTime,
    isCurrentMonth,
    formatYearMonth,
} from "@/utils/dateFormatter";

const { t } = useI18n();
const drawerVisible = ref(false);
const searchVisible = ref(false);
const highlightEntryId = ref<string | undefined>(undefined);
const highlightYear = ref<number>(0);
const highlightMonth = ref<number>(0);
const showLoadUp = ref(false);
const showLoadDown = ref(false);
const timelineStore = useTimelineStore();
const dialogStore = useDialogStore();
const filtersStore = useFiltersStore();
const typeOptions = [
    { label: t("entry.shortTypes.learn"), value: "learn" },
    { label: t("entry.shortTypes.play"), value: "play" },
    { label: t("entry.shortTypes.watch"), value: "watch" },
    { label: t("entry.shortTypes.read"), value: "read" },
];
const typeFilters = ref([...filtersStore.activeFilters.type]);

const statusOptions = [
    { label: t("entry.statuses.not_started"), value: "not_started" },
    { label: t("entry.statuses.in_progress"), value: "in_progress" },
    { label: t("entry.statuses.completed"), value: "completed" },
];

const statusFilters = ref([...filtersStore.activeFilters.status]);

const THRESHOLD = 80;
let scrollContainer: HTMLElement | null = null;

function onScroll() {
    if (!scrollContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    showLoadUp.value = scrollTop < THRESHOLD;
    showLoadDown.value = scrollHeight - scrollTop - clientHeight < THRESHOLD;
}

onActivated(() => {
    scrollContainer = document.querySelector(".main-content");
    if (scrollContainer) {
        scrollContainer.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }
});

onDeactivated(() => {
    if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", onScroll);
    }
    showLoadUp.value = false;
    showLoadDown.value = false;
});

function handleLoadUp() {
    if (!scrollContainer) return;
    const prevHeight = scrollContainer.scrollHeight;
    const prevScroll = scrollContainer.scrollTop;
    timelineStore.loadMoreUp();
    nextTick(() => {
        if (!scrollContainer) return;
        const newHeight = scrollContainer.scrollHeight;
        scrollContainer.scrollTop = prevScroll + (newHeight - prevHeight);
        onScroll();
    });
}

function handleLoadDown() {
    if (!scrollContainer) return;
    timelineStore.loadMoreDown();
    nextTick(onScroll);
}

function handleSearchSelect(entryId: string, year: number, month: number) {
    highlightEntryId.value = entryId;
    highlightYear.value = year;
    highlightMonth.value = month;

    const all = timelineStore.allMonths;
    const idx = all.findIndex((m) => m.year === year && m.month === month);
    if (idx >= 0) {
        const ci = timelineStore.currentMonthIndex;
        while (idx < ci - VISIBLE_WINDOW - timelineStore.visibleUp) {
            timelineStore.loadMoreUp();
        }
        while (idx >= ci + VISIBLE_WINDOW + 1 + timelineStore.visibleDown) {
            timelineStore.loadMoreDown();
        }
    }

    nextTick(() => {
        const key = formatYearMonth({ year, month });
        const el = document.querySelector(`[data-month-key="${key}"]`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });

    setTimeout(() => {
        highlightEntryId.value = undefined;
    }, 2000);
}

function confirmFilters(): void {
    filtersStore.activeFilters.type = typeFilters.value;
    filtersStore.activeFilters.status = statusFilters.value;
    drawerVisible.value = false;
}
function resetFilters(): void {
    typeFilters.value = [];
    statusFilters.value = [];
}
</script>

<style scoped>
.timeline-content {
    padding-left: 6px;
    padding-right: 10px;
    padding-top: 16px;
    padding-bottom: 8px;
}
.blank {
    height: 50px;
}
.filter-item {
    margin: 10px 0;
    padding: 5px;
}
.filter-item * {
    margin: 5px 0;
}
:deep(.el-timeline-item) {
    transition: border-color 0.3s ease;
}
.action-bar-info {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
}
.action-bar-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--el-text-color-primary);
    white-space: nowrap;
}
.action-bar-divider {
    color: var(--el-text-color-placeholder);
    font-size: 0.85rem;
}
.action-bar-subtitle {
    font-size: 0.8rem;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.action-bar-actions {
    display: flex;
    align-items: center;
    gap: 0;
    flex-shrink: 0;
}
.action-bar-actions :deep(.el-button + .el-button) {
  margin-left: 2px;
}
.action-bar-actions :deep(.el-button--text) {
  padding: 4px;
}
.action-bar-actions :deep(.el-button--primary:not(.el-button--text)) {
  padding: 4px 8px;
  font-size: 0.8rem;
  margin-left: 6px;
}
.action-bar-actions :deep(.el-button--text) {
    padding: 4px;
}
.action-bar-actions :deep(.el-button--primary:not(.el-button--text)) {
  padding: 4px 8px;
  font-size: 0.8rem;
  margin-left: 6px;
}
</style>

<style>
.load-more-float {
    position: fixed;
    z-index: 100;
    left: 0;
    right: 0;
    margin: 0 auto;
    max-width: 720px;
    background: var(--el-color-primary-light-9);
    border: 1px solid var(--el-color-primary-light-7);
    color: var(--el-color-primary);
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0.4rem 1.2rem;
    border-radius: 999px;
    line-height: 1.4;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    white-space: nowrap;
    width: max-content;
    transition:
        background-color 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease;
}
.load-more-float:hover {
    background: var(--el-color-primary-light-8);
    border-color: var(--el-color-primary-light-5);
    color: var(--el-color-primary-dark-2);
}
.load-more-up {
    top: 56px;
    transform: translateY(0);
}
.load-more-down {
    bottom: 76px;
    transform: translateY(0);
}

.load-fade-enter-active,
.load-fade-leave-active {
    transition:
        opacity 0.25s ease,
        transform 0.25s ease;
}
.load-fade-enter-from.load-more-up {
    opacity: 0;
    transform: translateY(-8px);
}
.load-fade-leave-to.load-more-up {
    opacity: 0;
    transform: translateY(-8px);
}
.load-fade-enter-from.load-more-down {
    opacity: 0;
    transform: translateY(8px);
}
.load-fade-leave-to.load-more-down {
    opacity: 0;
    transform: translateY(8px);
}
</style>
