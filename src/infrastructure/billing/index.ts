import { BillingPort } from '../../domain/ports';
import { GooglePlayBillingAdapter } from './GooglePlayBillingAdapter';

export * from './MockBillingAdapter';
export * from './GooglePlayBillingAdapter';

export function createBillingAdapter(): BillingPort {
  return new GooglePlayBillingAdapter();
}


