# Sample apps

Three apps, one SDK working tree. All three autolink the SDK from the repo root
(`react-native.config.js`) and resolve it through `src/index` — **not** from the
published npm package — so instrumentation added to `src/` or `android/` or
`ios/` shows up immediately.

| App | RN | Architecture | Purpose |
|---|---|---|---|
| `OldArchSample` | 0.73.0 | `newArchEnabled=false` | Known-good control. Was `example/`. |
| `NewArchSample` | 0.81.5 | `newArchEnabled=true`, bridgeless | Repro target for the MID 1305659 UPI Intent failure. |
| `ExpoSample` | 0.86.3 / Expo 57 | new arch only | Latest Expo. SDK 55+ removed the legacy architecture entirely, so there is no flag to set. |

`OldArchSample` at RN 0.73 is a genuine old-architecture baseline. Note that
flipping `newArchEnabled=true` there would **not** reproduce the bug: RN 0.73
still runs on the bridge, and bridgeless only became the default in 0.76. That
is why `NewArchSample` exists as a separate app rather than a flag on the old
one.

## Why the metro configs look paranoid

Each app pins `react`, `react-native` and `cashfree-pg-api-contract` to exactly
one copy, and hard-blocks the repo root's `node_modules`.

This is not hygiene, it is a correctness requirement for the investigation.
`src/index.ts:110` routes payments with `instanceof`:

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
button resets. **That is symptom-identical to the New Architecture bug under
investigation** — and local linking a sibling package is exactly how duplicate
copies appear. Without the pinning, the repro app can manufacture a convincing
false positive and send the fix in the wrong direction.

The repo root also pins `react-native: 0.73.6` as a devDependency, so an
unguarded resolution would silently mix 0.73 and 0.81 inside a 0.81 app.

## Boundary instrumentation

`NewArchSample/App.tsx` is a deliberately minimal harness — create order, pay
by UPI Intent, on-screen log. The point is that **one run identifies the failing
layer**, instead of pressing Pay and guessing.

| # | Boundary | Where | Says |
|---|---|---|---|
| B0 | Architecture probe | App.tsx | bridgeless / turboModuleProxy / fabric / hermes |
| B1a | Contract package identity | App.tsx | is there exactly one copy of the contract package |
| B1b | `instanceof` at the call site | App.tsx | the exact check `makePayment` performs |
| B2 | JS → native module | App.tsx | real module, or the `LINKING_ERROR` proxy from `src/index.ts:29` |
| B3 | Native entry reached | `CashfreePgApiModule.java:248` (existing `Log.d`) | did the call cross the bridge |
| B4 | `getCurrentActivity()` | `CashfreePgApiModule.java` `[NEWARCH-PROBE]` | Activity + ReactContext class |
| B5 | Native SDK call threw | `CashfreePgApiModule.java` `[NEWARCH-PROBE]` | enter/exit around `doPayment` |
| B6 | Native → JS events | App.tsx | `cfEvent` analytics arriving |
| B7 | Callback reached JS | App.tsx | `cfSuccess` / `cfFailure`, plus an 8s no-callback timeout |

B3 is free — it already exists in the SDK:

```sh
adb logcat -s CashfreePgApiModule
```

If that line prints when you press Pay, the JS layer is innocent and the
failure is native. If it does not print, the cause is B1/B2. Bisect there first.

## Findings so far (2026-09-23)

| | Intent launches | Payment succeeds | JS callback |
|---|---|---|---|
| OldArchSample (RN 0.73) | yes | yes | **no** — see below |
| NewArchSample (RN 0.81, bridgeless) | yes | yes | **yes** |
| ExpoSample (Expo 57 / RN 0.86) | yes | yes | **yes** |

**The New Architecture works end to end on RN 0.81 AND on Expo 57 / RN 0.86.** `getCurrentActivity()` returns a valid
Activity under `BridgelessReactContext`, the legacy (non-TurboModule) native
module registers and is reachable through RN's interop layer, and `onVerify`
fires with the correct order id.

**Why OldArchSample loses its callback — and it is not an SDK bug.** On both
architectures the host Activity is recreated when the external UPI app returns,
remounting the React root. What differs is *where* `setCallback` is registered:
`PGScreen` registers it, and after the remount the app resets to its home screen
so `PGScreen` never re-mounts and nothing re-registers. `NewArchSample` registers
it in a root-level `useEffect`, so the remount re-registers and the event lands.

Guidance worth passing to merchants: **register `setCallback` at app root, never
inside a screen that can unmount.** An Activity recreated during the UPI hop
otherwise silently loses the callback, which looks exactly like "the SDK never
called back".

## Running

```sh
# from repo root
yarn bootstrap                    # installs all three apps

# old-arch control
npm --prefix sampleApps/OldArchSample run android

# new-arch repro
npm --prefix sampleApps/NewArchSample run android

# expo (bare/prebuild — the SDK ships no config plugin, managed workflow is
# explicitly unsupported per src/index.ts:27)
npm --prefix sampleApps/ExpoSample run prebuild
npm --prefix sampleApps/ExpoSample run android
```

UPI Intent works on an emulator provided a PSP app is installed. The
**Cashfree UPI Simulator** (`com.cashfree.cashfreetestupi`) is enough — it
completes real sandbox payments.

Two traps when driving these flows by hand:
- `PGScreen`'s UPI field ships pre-filled with `testfailure@gocash`, a **VPA**,
  which overrides the installed-PSP fallback in `_makeUpiIntentPayment`. Clear
  the field to let it resolve the actual app package.
- Metro drops when the UPI app takes foreground and the bundle reloads, wiping
  listeners. Use a **release** build (JS bundled) to observe callbacks:
  `cd android && ./gradlew assembleRelease`.
