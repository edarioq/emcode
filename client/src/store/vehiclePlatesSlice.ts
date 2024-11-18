import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store/store';

interface VehiclePlatesState {
  plates: string[];
}

const initialState: VehiclePlatesState = {
  plates: [
    "DXB-AX-36352",
    "DXB-BX-36355",
    "DXB-CX-36357",
    "DXB-CX-36358",
    "DXB-DX-36353",
    "DXB-DX-36357",
    "DXB-DX-36359",
    "DXB-IX-36356",
    "DXB-IX-36360",
    "DXB-XX-36353",
  ]
};

export const vehiclePlatesSlice = createSlice({
  name: 'vehiclePlates',
  initialState,
  reducers: {
    addPlate: (state, action: PayloadAction<string>) => {
      state.plates.push(action.payload);
    },
    removePlate: (state, action: PayloadAction<string>) => {
      state.plates = state.plates.filter(plate => plate !== action.payload);
    }
  }
});

export const { addPlate, removePlate } = vehiclePlatesSlice.actions;
export const selectPlates = (state: RootState) => state.vehiclePlates.plates;
