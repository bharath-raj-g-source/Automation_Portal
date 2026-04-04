// src/state/index.ts
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// 1. Update the interface to include Auth state
export interface GlobalStateTypes {
  // UI State
  isSidebarCollapsed: boolean;
  isDarkMode: boolean;
  
  // Auth State
  isAuthenticated: boolean;
  oktaToken: string | null;
  dbUser: any | null; // The user data returned from FastAPI
  authStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  authError: string | null;
}

// 2. Add Auth defaults to the initial state
const initialState: GlobalStateTypes = {
  isSidebarCollapsed: true,
  isDarkMode: false,
  isAuthenticated: false,
  oktaToken: null,
  dbUser: null,
  authStatus: 'idle',
  authError: null,
};

// 3. Add the AsyncThunk to talk to FastAPI
export const syncUserWithBackend = createAsyncThunk(
  'global/syncUser',
  async (oktaProfile: { okta_uid: string; email: string; first_name?: string; last_name?: string }) => {
    // Points to your FastAPI Docker backend mapped to port 8000
    const response = await axios.post('http://localhost:8000/api/auth/sync', oktaProfile);
    return response.data; // This is the UserResponse schema from FastAPI
  }
);

// 4. Update the Slice
export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    // UI Reducers
    setIsSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    setIsDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    },
    
    // Auth Reducers
    setOktaAuth: (state, action: PayloadAction<{ token: string }>) => {
      state.isAuthenticated = true;
      state.oktaToken = action.payload.token;
    },
    logoutUser: (state) => {
      state.isAuthenticated = false;
      state.oktaToken = null;
      state.dbUser = null;
    }
  },
  // 5. Handle the FastAPI async responses
  extraReducers: (builder) => {
    builder
      .addCase(syncUserWithBackend.pending, (state) => {
        state.authStatus = 'loading';
      })
      .addCase(syncUserWithBackend.fulfilled, (state, action) => {
        state.authStatus = 'succeeded';
        state.dbUser = action.payload; // Successfully saved FastAPI user to Redux!
      })
      .addCase(syncUserWithBackend.rejected, (state, action) => {
        state.authStatus = 'failed';
        state.authError = action.error.message || 'Failed to sync user';
      });
  },
});

export const { 
    setIsSidebarCollapsed, 
    setIsDarkMode, 
    setOktaAuth, 
    logoutUser 
} = globalSlice.actions;

export default globalSlice.reducer;