/**
 * Database & Cloud Client Initialization for Shed Engine V2
 */
import * as SQLite from 'expo-sqlite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { initDatabase } from './repository';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseInstance && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('[Supabase] Failed to initialize Supabase client:', err);
      supabaseInstance = null;
    }
  }
  return supabaseInstance;
}

export function getDatabaseSync() {
  initDatabase();
  return SQLite.openDatabaseSync('shed_engine_v2.db');
}
