# React Native SDK 2.4.0 — New Architecture compatibility

**As of:** 28 Sep 2026

`react-native-cashfree-pg-sdk` 2.4.0 runs on the React Native New Architecture
(bridgeless + Fabric) across RN 0.73 → 0.87 and Expo 57, on both platforms,
**with no source changes** — but it runs there only through React Native's
legacy-module interop layer, which is on by default. It is not itself a New
Architecture module.

Both statements matter. The first means merchants are not blocked today. The
second means the SDK's compatibility is inherited from a shim, not earned, and
the shim is a single app-wide switch we do not control.

---

## Verdict

| Question | Answer |
| --- | --- |
| Does it run on the New Architecture with default settings? | **Yes.** Verified end to end on four stacks, both platforms, including a minified Android release build. |
| Is it a New Architecture (TurboModule) library? | **No.** No codegen spec, no `codegenConfig`. reactnative.directory lists New Architecture support as unknown. |
| Does it work with the interop layer turned off? | **No.** Android: module resolves `null`, no payment can start. iOS: hard crash on first SDK use. |
| Can the layer be kept on for Cashfree only? | **No.** The switch is global in React Native. There is no per-library setting. |
| Does a merchant have to migrate anything? | **No**, as long as they keep React Native's defaults. |
| Do we have to migrate? | Not urgently. But "New Architecture supported" is not a claim we can currently make. |

---

## Compatibility matrix (interop layer on — RN default)

| Stack | Module loads | Payment completes | JS callback |
| --- | --- | --- | --- |
| Android, RN 0.73, legacy arch | Yes | Yes | Yes |
| Android, RN 0.81.5, bridgeless + Fabric | Yes | Yes | Yes (`onVerify` fired) |
| Android, Expo 57 / RN 0.86.3 | Yes | Yes | Yes (`onVerify` fired) |
| iOS, RN 0.81.5, bridgeless + Fabric | Yes | Yes | Yes (`onVerify` fired) |
| Android, RN 0.87.1, bridgeless + Fabric | Yes | Yes (UPI Intent reached PAID) | Yes, incl. R8 release build |
| iOS, RN 0.87.1 | Yes (incl. `use_frameworks! :linkage => :static`) | Not run | Not run |

Additional checks on RN 0.87.1: Google Play 16 KB page size **passes** (the SDK
ships no native `.so`); no JS APIs removed by Fabric or React 19 are used.

### Why it works without a migration

- `getCurrentActivity()` returns a valid Activity under `BridgelessReactContext`
  — resolution through `ReactHost` works, contrary to the initial hypothesis.
- The legacy Java module registers and is reachable: `NativeModules.CashfreePgApi`
  resolves with all methods present, carried by the TurboModule interop layer.
- On iOS the Swift `RCT_EXTERN_MODULE` bridge and the `CashfreeEventEmitter`
  (`RCTEventEmitter`) path both survive the same layer.
- The SDK's pre-0.71 `android/build.gradle` still compiles: RN's Gradle plugin
  substitutes `com.facebook.react:react-native:+` → `com.facebook.react:react-android:<ver>`.
- Expo 55+ removed the legacy architecture entirely, and the SDK still works
  there — so this is not a case of Expo quietly falling back.

---

## How it works today

```
JS: CFPaymentGatewayService.makePayment(...)
        │
        ▼
RN legacy-module interop layer        ← ON by default
        │  wraps the old module so the New Architecture can call it
        ▼
Cashfree native module (Java / Swift)
        │  result returns as an event
        ▼
Android: RCTNativeAppEventEmitter     iOS: RCTEventEmitter
        │
        ▼
JS: onVerify / onError
```

Who turns the layer on:

- **Android** — RN's stable release feature flags set `useTurboModuleInterop = true`.
- **iOS** — RN calls `RCTEnableTurboModuleInterop(YES)` at every app start.

A real TurboModule skips this path entirely.

---

## Strict mode: interop layer off

Same build, same device, only the layer switched off. Reference TurboModules in
the *same app* were used as a control.

| Module | Type | Layer on | Layer off |
| --- | --- | --- | --- |
| Cashfree `CashfreePgApi` | Legacy native module | Found | **Null** on Android and iOS; no payment can start |
| Cashfree `CashfreeEventEmitter` (iOS) | Legacy event emitter | Found | **Null**; SDK throws `new NativeEventEmitter() requires a non-null argument` |
| Reference TurboModule (promises + events) | TurboModule (codegen) | Works | Works |
| Reference pure C++ TurboModule | TurboModule (codegen) | Works | Works |
| Reference Fabric component | Fabric | Works | Works |

The iOS failure fires on **first SDK load**, not at payment time. Because Metro
loads modules lazily, the app launches fine and then crashes when the payment
screen first touches the SDK. In a release build that closes the app.

On Android, calling the SDK with the layer off surfaces the SDK's own message:
*"The package 'react-native-cashfree-pg-api' doesn't seem to be linked… run pod
install / rebuild"*. That is misleading twice over — the package **is** installed,
and the name it prints is wrong.

### Can a merchant hit this?

Only deliberately, or by one specific accident.

| Platform | How it gets switched off | Likelihood |
| --- | --- | --- |
| Android | Override RN feature flags with `useTurboModuleInterop = false` via `ReactNativeFeatureFlags.dangerouslyForceOverride` | Rare, deliberate |
| Android | Build RN from source with `UNSTABLE_ENABLE_MINIFY_LEGACY_ARCHITECTURE=true` ("Strict Mode") | Very rare |
| iOS | Call `RCTEnableTurboModuleInterop(NO)` before modules load | Rare, deliberate |
| iOS | Compile with `RCT_REMOVE_LEGACY_MODULE_INTEROP` | Very rare |

**The accidental path, and the one worth warning merchants about.** RN's *base*
default for `useTurboModuleInterop` is `false`; only the new-architecture
defaults class flips it true. A merchant who customises feature flags for any
unrelated reason and extends `ReactNativeFeatureFlagsDefaults` instead of
`ReactNativeNewArchitectureFeatureFlagsDefaults` disables interop without
realising it — and then gets our misleading "not linked" error.

### It is all or nothing

RN 0.87.1 source confirms there is no per-module control:

- **Android** — `ReactPackageTurboModuleManagerDelegate` computes
  `shouldEnableLegacyModuleInterop` once from the global flag; per module it only
  asks `resolvedModule !is TurboModule`. No allow-list.
- **iOS** — `RCTTurboModuleManager` checks the global `RCTTurboModuleInteropEnabled()`
  for every non-TurboModule.

| Merchant's choice | Effect |
| --- | --- |
| Layer ON (RN default) | Cashfree works, and so does every other legacy library |
| Layer OFF | Cashfree breaks — and so does **every** other legacy library they use |
| "Off for everything except Cashfree" | Not possible |

That last row is why the guidance is simply *keep the default*. In practice most
merchant apps still carry some other legacy library that needs the layer anyway.

---

## Bugs found during verification

### iOS podspec never declared WebKit — **fixed**

`react-native-cashfree-pg-sdk.podspec` omitted `s.frameworks = "WebKit"`.
CashfreePGCoreSDK ships XIBs referencing `WKWebView`; with WebKit unlinked the
app hard-crashes the moment the SDK presents its payment view controller:

```
NSInvalidUnarchiveOperationException: Could not instantiate class named WKWebView
because no class named WKWebView was found
```

Confirmed by `otool -L` (WebKit absent → present) and fixed with one line.

**Why it was never caught:** the existing sample app depends on
`react-native-webview`, which links WebKit and masked the gap. It needs *both*
(a) no WebKit-linking dependency in the app and (b) reaching a `WKWebView` XIB,
so it is not universal — but any iOS merchant without such a dependency is
exposed. Not architecture-specific.

**Follow-up:** the declaration belongs upstream in `CashfreePGCoreSDK.podspec`.
Neither it nor `CashfreePG` declares `frameworks` today.

### `onVerify` is not proof of payment — **open, highest merchant risk**

`onVerify` fired **twice** while Cashfree's own API reported the order
`NOT_ATTEMPTED` or `PENDING`. Any merchant fulfilling on the callback alone can
ship unpaid orders. This is not New Architecture related and is the single most
important thing to tell merchants.

### Callback lost on Activity recreation — integration pattern, not an SDK bug

The host Activity is recreated when the external UPI app returns, remounting the
React root. If `setCallback` is registered inside a screen (as the old sample app
did in `PGScreen`), the app resets to home on remount, that screen never
re-mounts, and nothing re-registers — the callback is silently lost. Registering
at app root survives it.

**Guidance: register `setCallback` at app root, never inside a screen that can
unmount.** This looks exactly like "the SDK never called back".

### Other open issues

| Severity | Issue | Impact |
| --- | --- | --- |
| High | No codegen spec / TurboModule implementation | Breaks if the interop layer is disabled now, or removed in a future RN release |
| High | iOS `onError` not fired when the user backs out of the payment page (GitHub #97) | App waits forever; "payment in progress" state never clears |
| Medium | Failure paths in `doElementUPIPayment` / `doElementNBPayment` / `doSubscriptionElementPayment` throw `IllegalStateException` or `printStackTrace()` and emit **nothing** to JS | JS sees silence instead of `cfFailure` |
| Medium | iOS force-unwraps (`try!`, `session!`) | Malformed order/session id crashes instead of returning an error |
| Medium | iOS reads `RCTPresentedViewController()` off the main queue | Main Thread Checker warnings, intermittent UI crashes; also true on the legacy architecture |
| Medium | Deprecated RN APIs: `getCurrentActivity()`, `ReactPackage.createNativeModules`, `NativeAppEventEmitter`, `react-native:+`, Java 1.8 target | Builds today; likely to break in a future RN release |
| Medium | No edge-to-edge inset handling; RN 0.87 targets Android SDK 36 | SDK screens may draw under system bars on Android 15+. Not device-verified |
| Low | `CFEventCallback.onReceivedEvent` typed `Map<string, string>`; native delivers a plain object from `JSON.parse` | Type lies to consumers |
| Low | Podspec still declares `:ios => "10.0"`, bare `React-Core`, no `install_modules_dependencies` | Pre-0.71 patterns |
| Low | Misleading "package isn't linked" error, naming `react-native-cashfree-pg-api` | Sends merchants debugging the wrong problem |

Separately, `order_token_invalid` ("token is not present") appeared intermittently
across flows in sandbox. **Root cause confirmed by the Cashfree team: a backend
issue — an internal API is slow, `nextgenconsumer` times out, and the timeout
surfaces to the client as `order_token_invalid`.** It is not a client, session,
or architecture problem, and it is not specific to drop-in checkout. Earlier
notes in this document attributing it to account configuration or to session
reuse were client-side inference and were wrong.

---

## Guidance for merchants

1. **Keep React Native's defaults.** Don't disable legacy-module interop anywhere
   in the app while using SDK 2.4.0. On Android, if you override RN feature flags
   for any reason, extend `ReactNativeNewArchitectureFeatureFlagsDefaults` — the
   base defaults class has interop **off**.
2. **Never fulfil on `onVerify` alone.** Fetch `GET /pg/orders/{order_id}` server
   side and fulfil only on `order_status: PAID`. Reconcile with webhooks too, in
   case the app is killed while the customer is in their UPI app.
3. **Register `setCallback` at app root**, never inside a screen that can unmount.
4. **Guard the module.** Check `NativeModules.CashfreePgApi` exists before calling
   and show your own error instead of ours.
5. **On iOS, load the SDK lazily** after checking `NativeModules.CashfreeEventEmitter`.
   That converts the strict-mode crash into a handleable error.
6. **Validate inputs in JS.** Reject empty/malformed `order_id`,
   `payment_session_id`, UPI app id before calling.
7. **Time out a pending checkout** (issue #97) and re-check order status on
   foreground.
8. **Test the release build** — physical device, R8/ProGuard on for Android,
   Main Thread Checker on for iOS.
9. **Check Cashfree screens on Android 15+** with target SDK 36.

---

## Should we migrate to TurboModules?

Not urgently — but the reason is narrower than "it works fine".

| Gain | Value here |
| --- | --- |
| Type safety from codegen | **Low.** 13 of 14 methods are `(string) => void` carrying `JSON.stringify(payment)`. Codegen would type the wrapper, not the payload. |
| JSI performance | **Low.** A handful of calls per checkout, not a hot path. |
| Lazy module init | **Low–medium.** |
| Independence from the interop layer | **High.** This is the real driver, and strict-mode testing makes it concrete rather than hypothetical. |
| Being able to claim New Architecture support | **Medium.** reactnative.directory detects `codegenConfig`; today we show as unknown. |

**Recommendation: don't migrate now, but stop describing the current state as
"New Architecture supported".** Revisit when React Native announces a removal
version for the interop layer, or when the payload contract is reworked anyway
— doing both at once is the cheap moment.

### Rough scope when we do

1. Typed codegen spec (`NativeCashfreePgApi.ts`) + `codegenConfig` in `package.json`.
2. Android: extend the generated spec class, register via `BaseReactPackage`.
   Split source sets (`main/Impl` + `newarch/` + `oldarch/`) if both flows must
   coexist behind a flag.
3. iOS: the generated protocol is C++, and Swift cannot conform to it — an
   Objective-C++ shim over 632 lines of Swift is **the dominant unknown** in the
   estimate.
4. Replace `RCTEventEmitter` / `RCTNativeAppEventEmitter` with the codegen
   `EventEmitter` type or promises.
5. Replace the deprecated calls: `reactApplicationContext.currentActivity`,
   `com.facebook.react:react-android`.
6. Return errors to JS instead of force-unwraps and uncaught exceptions; move
   UIKit work to the main thread.

Merchants cannot do this from their side. The only merchant-side alternative is
writing their own TurboModule over the native Android and iOS SDKs — real work,
and they would then maintain a payments integration themselves.

---

## Open engineering items

- [ ] Emit `cfFailure` on all failure paths in `doElementUPIPayment` /
      `doElementNBPayment` / `doSubscriptionElementPayment`
- [ ] Upstream `s.frameworks = "WebKit"` into `CashfreePGCoreSDK.podspec`
- [ ] Fix `CFEventCallback` typing
- [ ] Modernise the podspec (`:ios => "10.0"`, bare `React-Core`,
      `install_modules_dependencies`)
- [ ] Fix the misleading "package isn't linked" error text
- [ ] Add an `npm pack` release gate
- [ ] Verify on an iOS physical device; run iOS payment flows on RN 0.87
- [ ] Decide and document a position on the interop layer before RN announces a
      removal version

---

## Known gaps in this analysis

- iOS payment flows on RN 0.87.1 were not run (build and module load only).
- No iOS physical-device run; simulator only.
- Expo SDK 54–56 untested. Expo 57 passes; Expo 55+ has no legacy fallback.
- The SDK ships no Expo config plugin — managed workflow is unsupported.
- The Android feature-flag accident path was confirmed in RN 0.87.1 source but
  not reproduced as a merchant setup.
- Edge-to-edge behaviour on Android 15+ not device-verified.

---

## Test environment

| Item | Setup |
| --- | --- |
| React Native | 0.73.0 / 0.81.5 / 0.86.3 (Expo 57) / 0.87.1 — bridgeless, Fabric, Hermes |
| React | up to 19.2.3 |
| SDK | `react-native-cashfree-pg-sdk` 2.4.0, `cashfree-pg-api-contract` 2.1.1; native CashfreePG 2.4.0 (iOS), `com.cashfree.pg:api` 2.4.0 (Android) |
| Android | Pixel 9 Pro API 36 emulator; API 34 emulator; Realme RMX1801 Android 10 (physical, arm64) |
| iOS | iPhone 16 Pro simulator, Xcode 26.2 |
| Payments | Cashfree sandbox; Cashfree UPI Simulator (`com.cashfree.cashfreetestupi`) |
| Strict-mode switch | Android `useTurboModuleInterop = false` over stable defaults; iOS `RCTEnableTurboModuleInterop(NO)` before runtime start |
| Reproduction apps | `sampleApps/OldArchSample`, `sampleApps/NewArchSample`, `sampleApps/ExpoSample`, plus a standalone RN 0.87.1 app carrying reference TurboModules as a control |

The sandbox was intermittently unhealthy during testing (HTTP 500/504 on order
creation, 10 s timeouts). Failures traced to that were not counted against the SDK.

## Sources

- React Native 0.76 — the New Architecture is here — https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here
- React Native 0.82 release notes — https://reactnative.dev/blog/2025/10/08/react-native-0.82
- React Native 0.87 release notes — https://reactnative.dev/blog/2026/08/11/react-native-0.87
- New Architecture working group, interop layer limitations — https://github.com/reactwg/react-native-new-architecture/discussions/237
- reactnative.directory entry — https://reactnative.directory/api/libraries?search=react-native-cashfree-pg-sdk
- Cashfree React Native integration guide — https://www.cashfree.com/docs/payments/online/mobile/react-native
- RN 0.87.1 source, read directly: `ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android.kt`,
  `ReactPackageTurboModuleManagerDelegate.kt`, `RCTRootViewFactory.mm`, `RCTTurboModuleManager.mm`
