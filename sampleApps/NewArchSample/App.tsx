/**
 * New Architecture sample app — react-native-cashfree-pg-sdk
 *
 * Wired to the same shared screens as OldArchSample and ExpoSample
 * (sampleApps/shared/PGScreen.tsx, sampleApps/shared/SubscriptionScreen.tsx),
 * so all 14 native payment methods run against the migrated TurboModule on
 * the New Architecture, not just UPI Intent.
 *
 * The boundary probes below (B0/B1a/B2/B6/B7) predate this wiring — they were
 * built to find which layer dropped the UPI Intent call for MID 1305659.
 * Kept at the app root intentionally:
 *   - B0/B1a/B2 report architecture + module-registration state once on mount.
 *   - B6/B7's setCallback/setEventSubscriber registration MUST stay at the
 *     root, not inside a screen. The host Activity is recreated when an
 *     external UPI app returns to this app; a callback registered inside a
 *     screen component is lost across that remount. Root registration is why
 *     this app catches callbacks when OldArchSample historically did not.
 *     (Boundaries 3/4/5 live in native code.)
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {CFErrorResponse, CFPaymentGatewayService} from 'react-native-cashfree-pg-sdk';
import {CFEnvironment, CFSession, CFUPI, CFUPIPayment, UPIMode} from 'cashfree-pg-api-contract';
import PGScreen from 'shared/PGScreen';
import SubscriptionScreen from 'shared/SubscriptionScreen';

type Screen = 'home' | 'pg' | 'subscription';

/**
 * Boundary 0 — which architecture are we actually running?
 *
 * Reported rather than branched on. Razorpay hand-rolled this detection in
 * their v3.0.0 JS layer, got it wrong, and shipped a follow-up fix commit;
 * we only ever print it.
 */
function archProbe() {
  const g = global as any;
  return {
    bridgeless: g.RN$Bridgeless === true,
    turboModuleProxy: g.__turboModuleProxy != null,
    fabric: g.nativeFabricUIManager != null,
    hermes: g.HermesInternal != null,
  };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [log, setLog] = useState<string[]>([]);

  const line = useCallback((tag: string, msg: string) => {
    const stamp = new Date().toISOString().slice(11, 23);
    const entry = `[${stamp}] ${tag} ${msg}`;
    // eslint-disable-next-line no-console
    console.log(entry);
    setLog(prev => [...prev, entry]);
  }, []);

  // ---- Boundary 0 + 1a + 2, once on mount ---------------------------------
  useEffect(() => {
    const a = archProbe();
    line(
      'B0',
      `arch: bridgeless=${a.bridgeless} turboModuleProxy=${a.turboModuleProxy} ` +
        `fabric=${a.fabric} hermes=${a.hermes} platform=${Platform.OS} ` +
        `rn=${Platform.constants?.reactNativeVersion?.minor ?? '?'}`,
    );

    // Boundary 2: is the native module actually registered, or are we holding
    // the LINKING_ERROR Proxy from src/index.ts:29? The Proxy throws on any
    // property access, so probe it defensively.
    let moduleState: string;
    try {
      const mod = NativeModules.CashfreePgApi;
      if (mod == null) {
        moduleState = 'NULL — native module not registered';
      } else {
        const hasMethod = typeof mod.doElementUPIPayment === 'function';
        moduleState = hasMethod
          ? 'OK — doElementUPIPayment present'
          : `PRESENT but doElementUPIPayment missing (keys: ${Object.keys(mod).join(',')})`;
      }
    } catch (e: any) {
      moduleState = `THREW on access — LINKING_ERROR proxy: ${e.message}`;
    }
    line('B2', `NativeModules.CashfreePgApi → ${moduleState}`);

    // Boundary 1a: prove there is exactly one copy of the contract package.
    // Two copies make `instanceof CFUPIPayment` false inside makePayment,
    // which drops the payment with no native call — symptom-identical to a
    // real native bug. metro.config.js pins this; verify it held.
    const probe = new CFUPIPayment(
      new CFSession('probe', 'probe', CFEnvironment.SANDBOX),
      new CFUPI(UPIMode.INTENT, 'tez://'),
    );
    line(
      'B1a',
      `contract identity: ctor=${probe.constructor.name} ` +
        `instanceof CFUPIPayment=${probe instanceof CFUPIPayment}`,
    );
  }, [line]);

  // ---- Boundary 6/7: root-level callback + event registration -------------
  // Deliberately at the root (see file header) — not inside PGScreen /
  // SubscriptionScreen — so a callback survives the Activity being recreated
  // when an external UPI/net-banking app returns control to this app.
  useEffect(() => {
    CFPaymentGatewayService.setCallback({
      onVerify(orderId: string) {
        line('B7', `onVerify FIRED → orderID=${orderId}`);
      },
      onError(error: CFErrorResponse, orderId: string) {
        line('B7', `onError FIRED → orderID=${orderId} error=${JSON.stringify(error)}`);
      },
    });

    // Boundary 6: the native SDK's own analytics events. If these arrive but
    // B7 never does, native ran and the failure is in the response path, not
    // in dispatch.
    CFPaymentGatewayService.setEventSubscriber({
      onReceivedEvent(eventName: string, meta: unknown) {
        line('B6', `event=${eventName} meta=${JSON.stringify(meta)}`);
      },
    });

    return () => {
      CFPaymentGatewayService.removeCallback();
      CFPaymentGatewayService.removeEventSubscriber();
    };
  }, [line]);

  if (screen === 'pg') {
    return <PGScreen onBack={() => setScreen('home')} />;
  }
  if (screen === 'subscription') {
    return <SubscriptionScreen onBack={() => setScreen('home')} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cashfree RN SDK</Text>
      <Text style={styles.subtitle}>Select a payment mode to continue</Text>

      <Pressable
        style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setScreen('pg')}>
        <Text style={styles.cardIcon}>💳</Text>
        <Text style={styles.cardTitle}>Payment Gateway</Text>
        <Text style={styles.cardDesc}>
          Drop, Web Checkout, UPI, Card & Saved Card payments
        </Text>
      </Pressable>

      <Pressable
        style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setScreen('subscription')}>
        <Text style={styles.cardIcon}>🔁</Text>
        <Text style={styles.cardTitle}>Subscription</Text>
        <Text style={styles.cardDesc}>
          Recurring subscription checkout, Card & UPI payments
        </Text>
      </Pressable>

      <ScrollView style={styles.logBox}>
        {log.map((l, i) => (
          <Text key={i} style={styles.logLine} selectable>
            {l}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 40,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{scale: 0.98}],
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  logBox: {
    width: '100%',
    maxHeight: 160,
    backgroundColor: '#0b0d13',
    borderRadius: 8,
    padding: 8,
  },
  logLine: {
    color: '#b8ffb8',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
});
