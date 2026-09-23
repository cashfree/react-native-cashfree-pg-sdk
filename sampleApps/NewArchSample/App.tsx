/**
 * New Architecture repro harness — react-native-cashfree-pg-sdk
 *
 * Reproduces the UPI Intent failure reported by MID 1305659 on RN 0.81 /
 * Expo 54 with the New Architecture enabled:
 *   - payment session creates fine (server logs confirm)
 *   - makePayment() for UPI Intent does nothing
 *   - no UPI app launches, no cfSuccess/cfFailure reaches JS
 *   - Pay button resets
 *
 * This app deliberately does NOT try to fix anything. It instruments each
 * boundary so a single run says WHICH layer drops the call. Boundaries 3/4/5
 * live in native code and are added separately; 1, 2, 6 and 7 are here.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  NativeModules,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CFErrorResponse,
  CFPaymentGatewayService,
} from 'react-native-cashfree-pg-sdk';
import {
  CFEnvironment,
  CFSession,
  CFUPI,
  CFUPIPayment,
  UPIMode,
} from 'cashfree-pg-api-contract';

// Public Cashfree sandbox test credentials, same pair already committed in
// sampleApps/OldArchSample/src/PGScreen.tsx. Sandbox only — never prod keys.
const SANDBOX_CLIENT_ID = 'TEST430329ae80e0f32e41a393d78b923034';
const SANDBOX_CLIENT_SECRET =
  'TESTaf195616268bd6202eeb3bf8dc458956e7192a85';
const ORDERS_URL = 'https://sandbox.cashfree.com/pg/orders';

const newOrderId = () =>
  'newarch_' + Math.floor(Math.random() * 9e18 + 1e18).toString();

// The iOS Simulator has no tap automation available here (`idb`/`fbsimctl` are
// not installed and `osascript` lacks assistive access), while Android is driven
// with `adb shell input tap`. So on iOS the harness drives itself: create an
// order on mount, then fire the UPI Intent once the session lands.
const AUTO_RUN = Platform.OS === 'ios';

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
  const [log, setLog] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [orderId, setOrderId] = useState('');
  // Empty by default so we fall back to whatever PSP app is actually installed
  // (the Cashfree UPI Simulator on the test AVD). Mirrors PGScreen.js's
  // _makeUpiIntentPayment in OldArchSample, so the two runs are like-for-like.
  const [upiScheme, setUpiScheme] = useState('');
  const [busy, setBusy] = useState(false);
  const callbackFired = useRef(false);

  const line = useCallback((tag: string, msg: string) => {
    const stamp = new Date().toISOString().slice(11, 23);
    const entry = `[${stamp}] ${tag} ${msg}`;
    // eslint-disable-next-line no-console
    console.log(entry);
    setLog(prev => [...prev, entry]);
  }, []);

  // ---- Boundary 0 + 2, once on mount --------------------------------------
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
          : `PRESENT but doElementUPIPayment missing (keys: ${Object.keys(
              mod,
            ).join(',')})`;
      }
    } catch (e: any) {
      moduleState = `THREW on access — LINKING_ERROR proxy: ${e.message}`;
    }
    line('B2', `NativeModules.CashfreePgApi → ${moduleState}`);

    // Boundary 1a: prove there is exactly one copy of the contract package.
    // Two copies make `instanceof CFUPIPayment` false inside makePayment,
    // which drops the payment with no native call — symptom-identical to the
    // bug we are chasing. metro.config.js pins this; verify it held.
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

  // ---- Boundary 7: did any callback actually reach JS? --------------------
  useEffect(() => {
    CFPaymentGatewayService.setCallback({
      onVerify(oid: string) {
        callbackFired.current = true;
        line('B7', `onVerify FIRED → orderID=${oid}`);
        setBusy(false);
      },
      onError(error: CFErrorResponse, oid: string) {
        callbackFired.current = true;
        line(
          'B7',
          `onError FIRED → orderID=${oid} error=${JSON.stringify(error)}`,
        );
        setBusy(false);
      },
    });

    // Boundary 6: the native SDK's own analytics events. If these arrive but
    // B7 never does, native ran and the failure is in the response path, not
    // in dispatch.
    CFPaymentGatewayService.setEventSubscriber({
      // CFEventCallback declares `map: Map<string, string>` (src/index.ts:214)
      // but setEventSubscriber hands over the result of JSON.parse — a plain
      // object, not a Map. Typed loosely here so the harness reflects what
      // actually arrives. Worth fixing in the SDK separately.
      onReceivedEvent(eventName: string, meta: unknown) {
        line('B6', `event=${eventName} meta=${JSON.stringify(meta)}`);
      },
    });

    return () => {
      CFPaymentGatewayService.removeCallback();
      CFPaymentGatewayService.removeEventSubscriber();
    };
  }, [line]);

  const createOrder = useCallback(async () => {
    setBusy(true);
    line('ORDER', 'creating sandbox order…');
    try {
      const res = await fetch(ORDERS_URL, {
        method: 'POST',
        headers: {
          'x-client-id': SANDBOX_CLIENT_ID,
          'x-client-secret': SANDBOX_CLIENT_SECRET,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-version': '2025-01-01',
        },
        body: JSON.stringify({
          order_amount: 1.0,
          order_currency: 'INR',
          order_id: newOrderId(),
          customer_details: {
            customer_id: 'newarch_repro',
            customer_phone: '9876543210',
          },
        }),
      });
      const data = await res.json();
      if (data.payment_session_id) {
        setSessionId(data.payment_session_id);
        setOrderId(data.order_id);
        line('ORDER', `OK order=${data.order_id}`);
      } else {
        line('ORDER', `FAILED ${JSON.stringify(data)}`);
      }
    } catch (e: any) {
      line('ORDER', `THREW ${e.message}`);
    } finally {
      setBusy(false);
    }
  }, [line]);

  const payUpiIntent = useCallback(async () => {
    if (!sessionId) {
      line('PAY', 'no session — create an order first');
      return;
    }
    callbackFired.current = false;
    setBusy(true);

    // Same resolution order as PGScreen.js#_makeUpiIntentPayment: an explicit
    // field value wins, otherwise use the last installed PSP app's package.
    let target = upiScheme;
    if (!target) {
      try {
        const apps = await CFPaymentGatewayService.getInstalledUpiApps();
        JSON.parse(apps as string).forEach((item: {appPackage: string}) => {
          target = item.appPackage;
        });
        line('PAY', `resolved installed PSP app → ${target || '(none found)'}`);
      } catch (e: any) {
        line('PAY', `getInstalledUpiApps FAILED ${e?.message ?? e}`);
      }
    }
    if (!target && AUTO_RUN) {
      // iOS Simulator has no PSP app installed, so getInstalledUpiApps returns
      // empty. Proceed anyway with a well-known scheme: the point on iOS is to
      // exercise JS -> native -> JS (the cfFailure round trip), not to complete
      // a real payment. A completed iOS payment needs a physical device.
      target = 'tez://';
      line('PAY', 'no PSP installed (simulator) — forcing tez:// to test the round trip');
    }
    if (!target) {
      line('PAY', 'no UPI target — aborting');
      setBusy(false);
      return;
    }

    const session = new CFSession(sessionId, orderId, CFEnvironment.SANDBOX);
    const upi = new CFUPI(UPIMode.INTENT, target);
    const payment = new CFUPIPayment(session, upi);

    // Boundary 1b: this is the exact check makePayment() performs at
    // src/index.ts:110. If it is false, makePayment falls through to its else
    // branch, logs 'Wrong payment object', and never calls native — no UPI
    // app, no callback, button resets. Identical symptoms, different cause.
    line(
      'B1b',
      `instanceof CFUPIPayment=${payment instanceof CFUPIPayment} ` +
        `target=${target}`,
    );

    line('PAY', 'calling CFPaymentGatewayService.makePayment()…');
    try {
      CFPaymentGatewayService.makePayment(payment);
      line('PAY', 'makePayment() returned without throwing');
    } catch (e: any) {
      line('PAY', `makePayment() THREW ${e.message}`);
      setBusy(false);
    }

    // If nothing has come back by now, native either never ran or swallowed
    // the failure. Boundaries 3/4/5 in native code disambiguate.
    setTimeout(() => {
      if (!callbackFired.current) {
        line(
          'B7',
          'NO CALLBACK after 8s — check adb logcat -s CashfreePgApiModule ' +
            'for boundary 3 (native entry) and 4 (getCurrentActivity null)',
        );
        setBusy(false);
      }
    }, 8000);
  }, [sessionId, orderId, upiScheme, line]);

  // --- AUTO_RUN (iOS): drive the flow without taps ------------------------
  const autoStarted = useRef(false);
  const autoPaid = useRef(false);

  useEffect(() => {
    if (!AUTO_RUN || autoStarted.current) {
      return;
    }
    autoStarted.current = true;
    line('AUTO', 'auto-run enabled — creating order');
    createOrder();
  }, [createOrder, line]);

  useEffect(() => {
    if (!AUTO_RUN || !sessionId || autoPaid.current) {
      return;
    }
    autoPaid.current = true;
    line('AUTO', 'session ready — firing UPI Intent');
    payUpiIntent();
  }, [sessionId, payUpiIntent, line]);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>New Arch — UPI Intent repro</Text>
      <Text style={styles.sub}>
        MID 1305659 · RN 0.81.5 · newArchEnabled=true
      </Text>

      <View style={styles.row}>
        <Pressable
          style={[styles.btn, busy && styles.btnOff]}
          disabled={busy}
          onPress={createOrder}>
          <Text style={styles.btnText}>1 · Create order</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        value={upiScheme}
        onChangeText={setUpiScheme}
        placeholder="UPI scheme e.g. tez://"
        autoCapitalize="none"
      />

      <View style={styles.row}>
        <Pressable
          style={[styles.btn, (!sessionId || busy) && styles.btnOff]}
          disabled={!sessionId || busy}
          onPress={payUpiIntent}>
          <Text style={styles.btnText}>2 · Pay with UPI Intent</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Pressable style={styles.clear} onPress={() => setLog([])}>
          <Text style={styles.clearText}>clear log</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.logBox}>
        {log.map((l, i) => (
          <Text key={i} style={styles.logLine} selectable>
            {l}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#11131a', paddingHorizontal: 16},
  title: {color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 12},
  sub: {color: '#8b93a7', fontSize: 12, marginBottom: 12},
  row: {flexDirection: 'row', marginVertical: 4},
  btn: {
    flex: 1,
    backgroundColor: '#3d5afe',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnOff: {backgroundColor: '#39406b'},
  btnText: {color: '#fff', fontWeight: '600'},
  input: {
    backgroundColor: '#1c2030',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 6,
  },
  clear: {paddingVertical: 6},
  clearText: {color: '#8b93a7', fontSize: 12},
  logBox: {
    flex: 1,
    backgroundColor: '#0b0d13',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  logLine: {
    color: '#b8ffb8',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
});
