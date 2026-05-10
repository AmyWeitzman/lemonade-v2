import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../store';

interface BookmarksState {
  jobIds: string[];
  programIds: string[];
  loading: boolean;
  error: string | null;
}

const initialState: BookmarksState = {
  jobIds: [],
  programIds: [],
  loading: false,
  error: null,
};

const bookmarksSlice = createSlice({
  name: 'bookmarks',
  initialState,
  reducers: {
    setBookmarks(
      state,
      action: PayloadAction<{ jobIds: string[]; programIds: string[] }>,
    ) {
      state.jobIds = action.payload.jobIds;
      state.programIds = action.payload.programIds;
    },
    addJobBookmark(state, action: PayloadAction<string>) {
      if (!state.jobIds.includes(action.payload)) {
        state.jobIds.push(action.payload);
      }
    },
    removeJobBookmark(state, action: PayloadAction<string>) {
      state.jobIds = state.jobIds.filter((id) => id !== action.payload);
    },
    addProgramBookmark(state, action: PayloadAction<string>) {
      if (!state.programIds.includes(action.payload)) {
        state.programIds.push(action.payload);
      }
    },
    removeProgramBookmark(state, action: PayloadAction<string>) {
      state.programIds = state.programIds.filter((id) => id !== action.payload);
    },
  },
});

export const {
  setBookmarks,
  addJobBookmark,
  removeJobBookmark,
  addProgramBookmark,
  removeProgramBookmark,
} = bookmarksSlice.actions;

export const selectIsJobBookmarked =
  (jobId: string) => (state: RootState) =>
    state.bookmarks.jobIds.includes(jobId);

export const selectIsProgramBookmarked =
  (programId: string) => (state: RootState) =>
    state.bookmarks.programIds.includes(programId);

export default bookmarksSlice.reducer;
