import * as SQLite from 'expo-sqlite';
import { SqlDatabaseAdapter, SqliteSaveRepository } from './SqliteSaveRepository';

const DB_NAME = 'chai_shai_tycoon.db';

export async function createExpoSqlDatabaseAdapter(): Promise<SqlDatabaseAdapter> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  return {
    async execAsync(sql: string): Promise<void> {
      await db.execAsync(sql);
    },
    async runAsync(
      sql: string,
      params: (string | number | null)[] = []
    ): Promise<void> {
      await db.runAsync(sql, params);
    },
    async getFirstAsync<T>(
      sql: string,
      params: (string | number | null)[] = []
    ): Promise<T | null> {
      return await db.getFirstAsync<T>(sql, params);
    },
    async getAllAsync<T>(
      sql: string,
      params: (string | number | null)[] = []
    ): Promise<T[]> {
      return await db.getAllAsync<T>(sql, params);
    },
    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      await db.withTransactionAsync(task);
    },
  };
}

export function createDeviceSaveRepository(): SqliteSaveRepository {
  return new SqliteSaveRepository(createExpoSqlDatabaseAdapter);
}
