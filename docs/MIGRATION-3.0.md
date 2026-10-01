# Migrating to 3.0.0

## What changed

3.0.0 ships the SDK as a React Native TurboModule. It works on both the legacy
and the New architecture, and no longer depends on React Native's legacy-module
interop layer.

## What you have to do

**Raise React Native to 0.73 or newer.** That is the only required change.

Use 0.73.2 or newer if you are on the 0.73 line: React Native 0.73.0 and 0.73.1 vendor a
`boost.podspec` pointing at a host that no longer serves the tarball, so `pod install` fails
there for reasons unrelated to this SDK.

(0.71 and 0.72 are excluded because `CashfreePG` 2.4.0 requires an iOS deployment
target of 13.0, and those releases default to 12.4.)

There are no JavaScript API changes. `CFPaymentGatewayService.makePayment()`,
`setCallback()`, `makeSubsPayment()`, `getInstalledUpiApps()` and the event
names are all unchanged.

## Register `setCallback` exactly once

This is not new in 3.0.0, but it is worth checking during an upgrade. `setCallback()` is
designed to be registered once per app. Each registration receives every result, so registering
in two places — for example at the app root *and* in a payment screen — delivers every
`onVerify` / `onError` once per registration.

Register once, in one place. If the component that registers can mount more than once, call
`removeCallback()` when it unmounts:

```js
useEffect(() => {
  CFPaymentGatewayService.setCallback({ onVerify, onError });
  return () => CFPaymentGatewayService.removeCallback();
}, []);
```

There is no need to move registration to the app root. The SDK keeps its native callback
registered across payments, including when Android recreates the Activity after a UPI app
returns.

## Card element errors now surface

`CFCard` and `CFSubsCard`'s imperative methods — `doPayment`,
`doPaymentWithPaymentSessionId`, `doSubscriptionPayment`,
`doSubscriptionPaymentWithNewSession` — used to catch every error internally and
write it to `console.log`.

They now log the error and rethrow it. If you call these methods directly, wrap
them:

```js
try {
  cardRef.current.doPayment(card);
} catch (e) {
  // show the failure to the customer
}
```

Without a `catch`, these errors now propagate to your code, so you can show
the customer what went wrong.

## If you were relying on undocumented behaviour

- Android events moved from `NativeAppEventEmitter` to `RCTDeviceEventEmitter`.
  If you added listeners directly rather than through `setCallback`, move them
  to `setCallback`.
- `NativeModules.CashfreeEventEmitter` no longer exists on iOS. The one module
  `CashfreePgApi` now emits every event.
- `src/index.ts` used to wrap the native module in a Proxy that threw a
  `LINKING_ERROR` with a "run pod install / rebuild the app" hint, and only on
  first use. It now uses `TurboModuleRegistry.getEnforcing`, which throws at
  import time with React Native's own generic message instead. An app with a
  broken native link fails earlier now, but with a less specific error than
  before.
- The same import-time lookup runs under Jest, where no native module exists.
  A test file that imports anything which imports `react-native-cashfree-pg-sdk`
  now fails on import with `TurboModuleRegistry.getEnforcing(...): 'CashfreePgApi'
  could not be found`, even if the test never touches payments. Mock the SDK in
  your Jest setup file, adding whichever methods your code calls:

  ```js
  jest.mock('react-native-cashfree-pg-sdk', () => ({
    CFPaymentGatewayService: {
      setCallback: jest.fn(),
      removeCallback: jest.fn(),
      doWebPayment: jest.fn(),
      makePayment: jest.fn(),
      getInstalledUpiApps: jest.fn(() => Promise.resolve('[]')),
    },
  }));
  ```

## Staying on 2.4.x

2.4.x remains available for apps below React Native 0.73.

## Confirm payments server-side

Treat `onVerify` as the signal to check the order, not as the final word. Confirm every payment
server-side with `GET /pg/orders/{order_id}` and fulfil only on
`order_status: PAID`. This is true in every version, including 2.4.x.
