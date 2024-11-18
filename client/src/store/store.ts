import { configureStore } from '@reduxjs/toolkit';
import { vehiclePlatesSlice } from './vehiclePlatesSlice';

export const store = configureStore({
  reducer: {
    vehiclePlates: vehiclePlatesSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
