import { create } from 'zustand';

interface InstagramClipboardNoticeState {
  visible: boolean;
  title: string;
  body: string;
  show: (title: string, body: string) => void;
  hide: () => void;
}

export const useInstagramClipboardNoticeStore = create<InstagramClipboardNoticeState>((set) => ({
  visible: false,
  title: '',
  body: '',
  show: (title, body) => set({ visible: true, title, body }),
  hide: () => set({ visible: false, title: '', body: '' }),
}));
