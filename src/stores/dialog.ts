import { defineStore } from 'pinia';
import type { TimelineEntry, EntryFormData } from '@/types/models';

export const useDialogStore = defineStore('dialog', {
  state: () => ({
    visible: false,
    formData: {} as EntryFormData,
    entryToEdit: {
      id: null as string | null,
      monthYear: null as { year: number; month: number } | null,
      isUnscheduled: false,
    },
  }),
  getters: {
    isEditing(): boolean {
      return this.entryToEdit.id !== null;
    },
  },
  actions: {
    open(initialData?: Partial<EntryFormData>, entryId: string | null = null) {
      this.entryToEdit = {
        id: entryId,
        isUnscheduled: entryId !== null && initialData?.isUnscheduled === true,
        monthYear: entryId !== null && initialData?.month
          ? {
              month: initialData.month.getMonth() + 1,
              year: initialData.month.getFullYear(),
            }
          : null,
      };
      this.formData = {
        ...initialData,
        name: initialData?.name ? initialData?.name : '',
        type: initialData?.type ? initialData?.type : '',
        status: initialData?.status ? initialData.status : 'not_started',
        month: initialData?.month ? new Date(initialData.month) : new Date(),
        isUnscheduled: initialData?.isUnscheduled === true,
      };
      this.visible = true;
    },
    close() {
      this.entryToEdit.id = null;
      this.entryToEdit.monthYear = null;
      this.entryToEdit.isUnscheduled = false;
      this.visible = false;
    },
  },
});
