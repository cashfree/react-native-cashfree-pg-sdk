# Sample apps

Three apps, one SDK working tree. All three autolink the SDK from the repo root
(`react-native.config.js`) and resolve it through `src/index` — **not** from the
published npm package — so instrumentation added to `src/` or `android/` or
`ios/` shows up immediately.

| App | RN | Architecture | Purpose |
|---|---|---|---|
| `OldArchSample` | 0.73.11 | `newArchEnabled=false` | Old-architecture control, at the SDK's RN floor. Was `example/`. |
| `NewArchSample` | 0.81.5 | `newArchEnabled=true`, bridgeless | Bare New Architecture app; carries the boundary probes. |
| `ExpoSample` | 0.85.3 / Expo 56 | new arch only | Expo SDK 55+ removed the legacy architecture entirely, so there is no flag to set. |

All three render the same screens from `sampleApps/shared/` (`PGScreen.tsx`,
`SubscriptionScreen.tsx`), so every payment method runs on every architecture.

ExpoSample is on SDK 56 rather than 57 because `expo-modules-jsi` 57.1.0 fails
to compile under Xcode 26.2 (inside Expo's own headers, before this SDK is
reached). Expo 57 builds on Android; move back once Expo ships a fix.

`OldArchSample` at RN 0.73 is a genuine old-architecture baseline. Flipping
`newArchEnabled=true` there would not give a bridgeless runtime: RN 0.73 still
runs on the bridge, and bridgeless only became the default in 0.76. That is why
`NewArchSample` exists as a separate app rather than a flag on the old one.

## Why the metro configs look paranoid

Each app pins `react`, `react-native` and `cashfree-pg-api-contract` to exactly
one copy, and hard-blocks the repo root's `node_modules`.

This is not hygiene, it is a correctness requirement. `makePayment` in
`src/index.ts` routes payments with `instanceof`:

```ts
makePayment(cfPayment: CheckoutPayment) {
  if (cfPayment instanceof CFUPIPayment) {
    CashfreePgApi.doElementUPIPayment(paymentData);
  } else if (...) {
  } else {
    console.log('makePayment::==> Wrong payment object');   // silent no-op
  }
}
```

Two copies of `cashfree-pg-api-contract` in the tree make that check `false`.
JS then never calls native: no UPI app launches, no callback fires, the Pay
button resets. **That is symptom-identical to a real native failure** — and
local linking a sibling package is exactly how duplicate copies appear. Without
the pinning, a sample app can manufacture a convincing false positive and send
a fix in the wrong direction.

The repo root also pins `react-native: 0.73.6` as a devDependency, so an
unguarded resolution would silently mix two React Native versions in one app.

## Boundary instrumentation

Probes are logged with a `[B#]` tag so one run shows which layer a payment
stopped at, instead of pressing Pay and guessing.

| # | Boundary | Where | Says |
|---|---|---|---|
| B0 | Architecture probe | `NewArchSample/App.tsx` | bridgeless / turboModuleProxy / fabric / hermes, RN minor |
| B1a | Contract package identity | `NewArchSample/App.tsx` | `instanceof CFUPIPayment` holds, i.e. one copy of the contract package |
| B2 | Module registration | `NewArchSample/App.tsx` | `NativeModules.CashfreePgApi` present with its methods |
| B3 | Native entry reached | `CashfreePgApiModule.java` (`Log.d` at the top of each payment method) | the call crossed into native |
| B6 | Native → JS events | `shared/PGScreen.tsx` | `cfEvent` analytics arriving |
| B7 | Callback reached JS | `shared/PGScreen.tsx` | `onVerify` / `onError` fired, with the order id |

B3 needs no JS at all:

```sh
adb logcat -s CashfreePgApiModule
```

If that line prints when you press Pay, the JS layer is innocent and the
failure is native. If it does not, check B1a and B2 first.

## Callbacks: what the samples demonstrate

- **`setCallback` is registered exactly once**, in the screen that owns the UI
  feedback. Each registration receives every result, so registering in two
  places delivers each one twice. `NewArchSample/App.tsx` deliberately does not
  register at the root as well.
- **No root-level registration is needed.** The SDK re-registers its native
  callback before every payment, so results keep arriving when Android
  recreates the host Activity after a UPI app returns.
- **Confirm payments server-side.** Treat `onVerify` as the signal to check the
  order status on your server, and fulfil only on `order_status: PAID`.

## Running

```sh
# from repo root
yarn bootstrap                    # installs all three apps

# old-arch control
npm --prefix sampleApps/OldArchSample run android

# new-arch repro
npm --prefix sampleApps/NewArchSample run android

# expo — needs prebuild; the SDK ships no config plugin, so Expo Go /
# managed-only workflows can't load it
npm --prefix sampleApps/ExpoSample run prebuild
npm --prefix sampleApps/ExpoSample run android
```

UPI Intent works on an emulator provided a PSP app is installed. The
**Cashfree UPI Simulator** (`com.cashfree.cashfreetestupi`) is enough — it
completes real sandbox payments.

Two traps when driving these flows by hand:
- `PGScreen`'s UPI field ships pre-filled with `testfailure@gocash`, a **VPA**
  for Collect. Intent refuses it ("not an installed UPI app"); clear the field
  to let Intent pick an installed app, or type an installed app's id.
- Metro drops when the UPI app takes foreground and the bundle reloads, wiping
  listeners. Use a **release** build (JS bundled) to observe callbacks:
  `cd android && ./gradlew assembleRelease`.
