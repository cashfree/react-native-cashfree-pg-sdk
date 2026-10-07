import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  doPayment(paymentData: string): void;
  doUPIPayment(paymentData: string): void;
  doWebPayment(paymentData: string): void;
  doSubscriptionPayment(paymentData: string): void;
  doCardPayment(paymentData: string): void;
  doElementUPIPayment(paymentData: string): void;
  doElementNBPayment(paymentData: string): void;
  doSubsCardPayment(paymentData: string): void;
  doSubsUPIPayment(paymentData: string): void;
  doSubsNBPayment(paymentData: string): void;
  getInstalledUpiApps(): Promise<string>;
  setCallback(): void;
  setEventSubscriber(): void;
  removeEventSubscriber(): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CashfreePgApi');
