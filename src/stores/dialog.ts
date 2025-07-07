import { defineStore } from 'pinia';
import type { TimelineEntry, EntryFormData } from '@/types/models';

export const useDialogStore = defineStore('dialog', {
  state: () => ({
    visible: false,
    formData: {} as EntryFormData,
    entryToEdit: {
      id: null as string | null,
      monthYear: null as { year: number; month: number } | null,
    },
  }),
  getters: {
    isEditing(): boolean {
      return this.entryToEdit.id !== null && this.entryToEdit.monthYear != null;
    },
  },
  actions: {
    open(initialData?: Partial<EntryFormData>, entryId: string | null = null) {
      if (entryId && initialData?.month) {
        this.entryToEdit.id = entryId;
        this.entryToEdit.monthYear = {
          month: initialData.month.getMonth() + 1,
          year: initialData.month.getFullYear(),
        };
      }
      this.formData = {
        ...initialData,
        name: initialData?.name ? initialData?.name : '',
        type: initialData?.type ? initialData?.type : '',
        status: initialData?.status ? initialData.status : 'not_started',
        month: initialData?.month ? new Date(initialData.month) : new Date(),
      };
      this.visible = true;
    },
    close() {
      this.entryToEdit.id = null;
      this.entryToEdit.monthYear = null;
      this.visible = false;
    },
  },
});
