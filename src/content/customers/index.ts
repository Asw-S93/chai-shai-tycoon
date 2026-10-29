import { CustomerArchetype } from '../../domain/entities';
import { CustomerArchetypeId } from '../../domain/value-objects';

/**
 * Customer Archetypes matching Section 5:
 * - Office worker: 22 seconds patience, higher tip potential, more common during rush.
 * - Student: 32 seconds patience, typically low tip.
 * - Regular: 28 seconds patience, balanced.
 */
export const CUSTOMERS_CATALOG: readonly CustomerArchetype[] = [
  {
    id: 'office_worker',
    name: 'Office Worker',
    basePatienceMs: 22_000,
    tipMultiplier: 1.25,
    normalSpawnWeight: 25,
    rushSpawnWeight: 60,
  },
  {
    id: 'student',
    name: 'College Student',
    basePatienceMs: 32_000,
    tipMultiplier: 0.55,
    normalSpawnWeight: 35,
    rushSpawnWeight: 15,
  },
  {
    id: 'regular',
    name: 'Mohalla Regular',
    basePatienceMs: 28_000,
    tipMultiplier: 1.0,
    normalSpawnWeight: 40,
    rushSpawnWeight: 25,
  },
] as const;

export const CUSTOMER_ARCHETYPE_BY_ID: Record<CustomerArchetypeId, CustomerArchetype> = {
  office_worker: CUSTOMERS_CATALOG[0],
  student: CUSTOMERS_CATALOG[1],
  regular: CUSTOMERS_CATALOG[2],
};

export const CUSTOMER_FIRST_NAMES: Record<CustomerArchetypeId, readonly string[]> = {
  office_worker: ['Rohan', 'Priya', 'Vikram', 'Neha', 'Arjun', 'Kavita'],
  student: ['Aarav', 'Diya', 'Kabir', 'Ananya', 'Ishaan', 'Meera'],
  regular: ['Chacha Ji', 'Sharma Ji', 'Bua Ji', 'Raju Bhai', 'Master Ji', 'Dadi'],
};
