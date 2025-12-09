import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create the Supabase client singleton
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
    return Boolean(supabaseUrl && supabaseAnonKey);
};

/**
 * Generate or retrieve a persistent user ID from localStorage.
 * This allows the same browser to reconnect to a room after a page reload.
 */
export const getLocalUserId = (): string => {
    const storageKey = 'mtg_user_id';
    let userId = localStorage.getItem(storageKey);
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem(storageKey, userId);
    }
    return userId;
};

/**
 * Generate a short, human-readable room code (6 characters).
 */
export const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like O, 0, I, 1
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Type for the room channel
export type RoomChannel = RealtimeChannel;

/**
 * Create a Supabase Realtime channel for a game room.
 * Uses Broadcast for ephemeral state sync (no database persistence).
 */
export const createRoomChannel = (roomId: string): RoomChannel => {
    return supabase.channel(`room:${roomId}`, {
        config: {
            broadcast: {
                self: false, // Don't receive our own broadcasts
            },
        },
    });
};
