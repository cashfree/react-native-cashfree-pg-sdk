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

## One behaviour change

`getInstalledUpiApps()` used to **reject** with `'No UPI apps found'` when no UPI app was
installed. It now **resolves** with an empty JSON array, `"[]"`.

Before:

```js
try {
  const apps = await CFPaymentGatewayService.getInstalledUpiApps();
} catch (e) {
  // e === 'No UPI apps found'
}
```

After:

```js
const apps = JSON.parse(await CFPaymentGatewayService.getInstalledUpiApps());
if (apps.length === 0) {
  // no UPI app installed
}
```

If you have a `catch` branch handling the empty case, move it to a length check. The rejection
no longer fires, so that branch will silently stop running.

Why it changed: Android answered through a callback and iOS through an event, with different
empty-payload semantics. Codegen requires one signature for both platforms, and resolving with
an empty array is the behaviour the two could share.

## Card element errors now surface

`CFCard` and `CFSubsCard`'s imperative methods — `doPayment`,
`doPaymentWithPaymentSessionId`, `doSubscriptionPayment`,
`doSubscriptionPaymentWithNewSession` — used to catch every error internally and
write it to `console.log`. A failed call looked like nothing had happened.

They now log the error and rethrow it. If you call these methods directly, wrap
them:

```js
try {
  cardRef.current.doPayment(card);
} catch (e) {
  // show the failure to the customer
}
```

Without a `catch`, an error that was previously invisible will now propagate.
That is the intent: a payment call that fails silently is worse than one that
throws.

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

## Staying on 2.4.x

2.4.x remains available for apps below React Native 0.73.

## Unrelated but important

`onVerify` firing is not proof that a payment succeeded. Confirm every payment
server-side with `GET /pg/orders/{order_id}` and fulfil only on
`order_status: PAID`. This is true in every version, including 2.4.x.
