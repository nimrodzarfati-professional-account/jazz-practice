/**
 * Database & Cloud Client Initialization for Shed Engine V2
 */
import * as SQLite from 'expo-sqlite';
import { SupabaseClient } from '@supabase/supabase-js';
import { initDatabase } from './repository';
import { getSupabaseClient as getCloudClient } from '../services/CloudSyncService';

export function getSupabaseClient(): SupabaseClient | null {
  return getCloudClient();
}

export function getDatabaseSync() {
  initDatabase();
  return SQLite.openDatabaseSync('shed_engine_v2.db');
}
