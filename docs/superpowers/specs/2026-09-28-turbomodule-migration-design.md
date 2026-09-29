# TurboModule migration — design

**Date:** 2026-09-28
**Status:** awaiting review
**Target release:** `react-native-cashfree-pg-sdk` 3.0.0

---

## Why

SDK 2.4.0 already runs on the New Architecture across RN 0.73 → 0.87 and Expo 57,
on both platforms, with no source changes. This migration is **not a bug fix.**

It runs there only through React Native's legacy-module interop layer, which is
on by default. With that layer off, verified on RN 0.87.1:

- **Android** — `NativeModules.CashfreePgApi` resolves `null`; no payment can start.
- **iOS** — hard crash on first SDK load: `new NativeEventEmitter() requires a
  non-null argument`.

Reference TurboModules in the same build kept working, which isolates the cause to
our module being legacy rather than to anything environmental.

The interop switch is **global**, confirmed in RN 0.87.1 source
(`ReactPackageTurboModuleManagerDelegate` computes `shouldEnableLegacyModuleInterop`
once from `useTurboModuleInterop`; `RCTTurboModuleManager` checks the global
`RCTTurboModuleInteropEnabled()`). A merchant cannot keep it on for Cashfree alone.

**Goal:** remove the dependency on that shim before React Native removes the shim,
while keeping the legacy architecture fully supported.

**Non-goal:** fixing the known payment-correctness bugs. Those ship separately
(see Scope).

---

## Decisions

| Decision | Choice | Consequence |
|---|---|---|
| Minimum React Native | **0.73** (0.71 falsified by the Task 2 floor gate, 2026-09-28) | Codegen exists; one source set serves both architectures; no `oldarch/`/`newarch/` split |
| Payload API | **JSON strings unchanged** | Zero merchant code change; codegen types the wrapper, not the payload |
| `getInstalledUpiApps` | **Promise on both platforms** | Removes the Android-`Callback` / iOS-`event` divergence; JS signature already returns a Promise, so merchants see nothing |
| Event delivery | **Folded into the one TurboModule** | Required — see "iOS emitter" below |
| iOS strategy | **ObjC++ adapter over untouched Swift** | 632 lines of payment logic are not rewritten |
| Release | **3.0.0 major** | RN floor is breaking even though the JS API is not; 2.4.x stays available |
| Scope | **Only what the conversion forces** | Conversion is independently revertable and bisectable |

---

## Architecture

Codegen emits a base type per platform. Extend or conform to it and the *same
binary* registers as a legacy module on the bridge and as a TurboModule under
bridgeless — this is what makes "both architectures" nearly free at a 0.71 floor.

```
                      src/NativeCashfreePgApi.ts  (spec)
                                 │ codegen
              ┌──────────────────┴──────────────────┐
        Android                                    iOS
  NativeCashfreePgApiSpec.java        NativeCashfreePgApiSpec (ObjC protocol)
  (abstract; still extends            NativeCashfreePgApiSpecJSI (C++)
   ReactContextBaseJavaModule)                    │
           │                                      │
  CashfreePgApiModule.java            CashfreePgApiAdapter.mm
  (method bodies unchanged)           (forwards into CashfreePgApi.swift,
                                       unchanged)
```

---

## The spec

`src/NativeCashfreePgApi.ts`:

```ts
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
```

`getEnforcing` resolves via `NativeModules` on the legacy architecture, so this
single import is correct on both.

`codegenConfig` in `package.json`:

```json
"codegenConfig": {
  "name": "RNCashfreePgApiSpec",
  "type": "modules",
  "jsSrcsDir": "src",
  "android": { "javaPackageName": "com.reactnativecashfreepgsdk" }
}
```

---

## Android

`CashfreePgApiModule extends NativeCashfreePgApiSpec`. The 519 lines of method
bodies do not move. Forced changes only:

1. `getInstalledUpiApps(Callback cb)` → `getInstalledUpiApps(Promise promise)`.
2. `getJSModule(RCTNativeAppEventEmitter.class)` → `RCTDeviceEventEmitter`, so both
   platforms share one emitter path and JS can drop its `Platform.OS` branch.
3. `CashfreePgApiPackage` → `TurboReactPackage` with `getModule()` and
   `getReactModuleInfoProvider()`.
   **Not `BaseReactPackage`** — that class does not exist before RN 0.74. See Risk 2.
4. `com.facebook.react:react-native:+` → `com.facebook.react:react-android`.
5. `getCurrentActivity()` → `reactApplicationContext.currentActivity`.
6. `build.gradle` gains the codegen plugin wiring and RN's Gradle plugin application.

Method bodies are restructured only enough that the PR 2 failure-path fix is a
clean follow-up rather than a rewrite. No behaviour change in this PR.

---

## iOS

### Adapter

`CashfreePgApi.swift` is **not edited**, with one small additive exception (Wrinkle 1). New `ios/CashfreePgApiAdapter.mm`:

- always conforms to `RCTBridgeModule`
- under `#ifdef RCT_NEW_ARCH_ENABLED`, conforms to `NativeCashfreePgApiSpec` and
  implements `- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:`
- forwards every method into the Swift class via the generated
  `react_native_cashfree_pg_sdk-Swift.h`

`ios/CashfreePgApi.m` and `ios/CashfreeEventEmitter.m` are deleted.

### iOS emitter — the part that actually removes the crash

`CashfreeEventEmitter` is currently a **separate** legacy `RCTEventEmitter` module.
Converting only `CashfreePgApi` would leave `NativeModules.CashfreeEventEmitter`
null in strict mode, and `new NativeEventEmitter(null)` is precisely the crash
observed on RN 0.87.1. It is therefore not optional:

- the adapter subclasses `RCTEventEmitter` and owns `supportedEvents`
- `CashfreeEmitter.sharedInstance` is pointed at the adapter
- `CashfreeEventEmitter.swift` is removed as a distinct module

Event names (`cfSuccess`, `cfFailure`, `cfEvent`, `cfUpiApps`) are unchanged.

### Wrinkle 1 — `getInstalledUpiApps` needs one additive Swift method

The Swift implementation answers by emitting a `cfUpiApps` event rather than
returning a value, so there is nothing for the adapter to turn into a Promise.

**Decision: add a completion-handler overload (~5 lines) to `CashfreePgApi.swift`.**
It is additive, the existing event-emitting method stays for the legacy path, and
it is trivially reviewable.

*Rejected alternative:* have the adapter hold the pending `RCTPromiseResolveBlock`
and resolve it when `cfUpiApps` passes through — possible, since the adapter is now
the emitter, but it hides control flow inside an event path. Clever is a liability
in payment code, and a five-line additive method is the smaller risk.

**Correction (found during planning):** there is a *second* Swift edit.
`CashfreeEmitter.swift` stores `private var eventEmitter: CashfreeEventEmitter!`
and its `registerEventEmitter` takes that concrete type. Once the adapter becomes
the emitter, that type must widen to `RCTEventEmitter` and the class must be
reachable from Objective-C (`@objc`). The force-unwrap also becomes an optional,
so an event arriving before registration is dropped rather than crashing the app.
Neither edit touches payment logic.

---

## JS layer

### Prerequisite: delete the compiled twins

`src/index.js`, `src/Card/index.js`, `src/Card/CFCardComponent.js`,
`src/Card/CFSubsCardComponent.js` are committed, type-stripped outputs of the `.ts`
sources. `package.json` sets `"react-native": "src/index"` and Metro resolves `.js`
before `.ts` — empirically confirmed in this repo when `App.js` shadowed `App.tsx`
in `OldArchSample`.

**Merchants are running `src/index.js` today.** They are currently in sync with the
`.ts` sources, so nothing is broken right now, but any JS change made only to
`index.ts` is dead code for consumers. Deleting them is a hard prerequisite for this
migration, not cleanup.

### Changes to `src/index.ts`

- import the spec instead of `NativeModules.CashfreePgApi`
- delete the `LINKING_ERROR` Proxy — `getEnforcing` supersedes it, and the wrong
  package name in that message (`react-native-cashfree-pg-api`) goes with it
- one emitter: `new NativeEventEmitter(NativeCashfreePgApi)` on both platforms,
  removing the `Platform.OS === 'ios'` branch at `src/index.ts:48`
- `getInstalledUpiApps()` collapses to awaiting the spec's Promise; the public
  signature is unchanged

**Merchant-facing API is unchanged.** `CFPaymentGatewayService.makePayment(...)`,
`setCallback(...)`, `makeSubsPayment(...)`, event names — all identical. The only
breaking change in 3.0.0 is the React Native floor.

---

## Packaging

- `peerDependencies.react-native` → `>=0.73.0`
- podspec: add a bare `install_modules_dependencies(s)` (no `defined?` guard — see spike), drop `:ios => "10.0"` and bare
  `React-Core`, keep `s.frameworks = "WebKit"` (fixed in `c63c276`)
- `files` allowlist already includes `src`, so the spec ships
- `npm pack` gate added to verify `lib/` and the spec are present in the tarball

---

## Definition of done

The acceptance test is the thing that distinguishes this work from what we already
have. Session `a1f52820`'s strict-mode switches become the gate:

1. **Strict mode passes.** UPI Intent completes end to end with the interop layer
   **off** — Android `useTurboModuleInterop = false`, iOS
   `RCTEnableTurboModuleInterop(NO)` — on both platforms.
2. **Legacy architecture unchanged.** `OldArchSample` (RN 0.73, `newArchEnabled=false`)
   passes UPI Intent with no merchant-side code change.
3. **New architecture unchanged.** `NewArchSample` and `ExpoSample` pass with the
   interop layer at its default.
4. **Release build.** Android R8/ProGuard on; callbacks still delivered.
5. **Floor and ceiling build.** The package builds on the lowest supported RN and on
   0.87.x.
6. **`npm pack`** produces a tarball that installs and runs in a clean app.

Items 1 and 2 together are the whole point: independence from the shim, without
abandoning anyone.

---

## Risks

**Risk 1 — RESOLVED by spike (2026-09-28). See "Podspec spike result" below.**
The floor is 0.71. `install_modules_dependencies` does not exist in 0.70; from 0.71
through 0.87 the call signature is unchanged. No conditionals needed.

**Risk 2 — `TurboReactPackage` vs `BaseReactPackage`.**
`BaseReactPackage` does not exist before RN 0.74. With the floor now at 0.71, the
answer is `TurboReactPackage`: it spans 0.71 → 0.87, at the cost of a deprecation
warning on recent versions. Revisit only if the floor is ever raised to 0.74+.

**Risk 3 — the one Swift edit (Wrinkle 1).**
Additive only; the existing event path is untouched, so the legacy flow cannot regress.

**Risk 4 — Expo.**
The SDK ships no Expo config plugin and the managed workflow is unsupported.
Conversion does not change that. `ExpoSample` (prebuild) stays in the gate.

**Risk 5 — emitter path change on Android.**
Moving from `RCTNativeAppEventEmitter` to `RCTDeviceEventEmitter` is invisible to
merchants using `setCallback`, but would break any merchant listening to
`NativeAppEventEmitter` directly. That is undocumented usage and acceptable in a
major, but belongs in the changelog.

---

## Out of scope — shipping separately

| PR | Content |
|---|---|
| PR 2 | Emit `cfFailure` on all failure paths in `doElementUPIPayment` / `doElementNBPayment` / `doSubscriptionElementPayment` (currently `IllegalStateException` into a `catch (CFException)` that cannot catch it, and `printStackTrace()` with nothing sent to JS) |
| PR 3 | `onVerify` is not proof of payment — documentation and guidance; server-side order-status confirmation |
| PR 4 | iOS `onError` not fired on back-out (GitHub #97) |
| PR 5 | iOS force-unwraps; `RCTPresentedViewController()` off the main queue |
| PR 6 | Upstream `s.frameworks = "WebKit"` into `CashfreePGCoreSDK.podspec` |
| PR 7 | `CFEventCallback.onReceivedEvent` typed `Map<string, string>` where native delivers a plain object |

---

## Podspec spike result (2026-09-28)

**Question:** can one podspec satisfy iOS codegen across the supported RN band?
**Answer:** yes — but the band starts at 0.71, not 0.70.

Method: read `scripts/react_native_pods.rb`, `scripts/cocoapods/new_architecture.rb`
and `scripts/cocoapods/codegen_utils.rb` from the published npm tarballs of RN
0.70.15, 0.71.19, 0.72.17, 0.73.11, 0.74.7, 0.76.9, 0.81.5 and 0.87.1, plus two
production libraries that already span the band.

### Findings

| Finding | Consequence |
|---|---|
| `install_modules_dependencies` is **absent in 0.70**, present 0.71 → 0.87 | 0.70 cannot be supported without a fallback branch |
| Its **call signature `install_modules_dependencies(spec)` is unchanged** 0.71 → 0.87, despite three internal rewrites | One unconditional line works across the whole band |
| The codegen pod was renamed `React-Codegen` → `ReactCodegen` at 0.76 | Invisible to us: the helper names it, our podspec does not |
| 0.87 auto-adds `OTHER_SWIFT_FLAGS = -DRCT_NEW_ARCH_ENABLED` | Our Swift sees the flag for free on recent RN |
| The helper already adds `spec.dependency "React-Core"` | Our explicit `React-Core` line becomes redundant and should be removed |
| Third-party `codegenConfig` discovery (`codegen_utils.rb`) works from **0.70 onward** | Codegen discovery is not the constraint; the podspec helper is |
| Generated header import is `<codegenConfig.name>/<codegenConfig.name>.h`, guarded by `#ifdef RCT_NEW_ARCH_ENABLED` — confirmed in `react-native-safe-area-context` 5.4.0 | Our adapter imports `<RNCashfreePgApiSpec/RNCashfreePgApiSpec.h>`; the path is stable because we own the name |

### Why not support 0.70 with a guard

`react-native-webview` 13.12.5 proves a single podspec *can* reach 0.70:

```ruby
if defined?(install_modules_dependencies()) != nil
  install_modules_dependencies(s)
else
  # manual wiring: folly compiler flags, boost header path,
  # React-Codegen, RCT-Folly, RCTRequired, RCTTypeSafety, ...
end
```

**Rejected anyway.** Three reasons:

1. 0.70 is the only version in the band that needs it. It shipped September 2022
   and is long past end of life.
2. The `else` branch is **untestable** without adding a fourth sample app, and an
   untested build path in a payments SDK is a liability, not a feature.
3. That branch hardcodes Folly and boost wiring — the same class of hardcoded
   Folly pin that forced Razorpay's own v3.0.0 migration. Reintroducing it to buy
   one EOL minor version is the wrong trade.

### Confidence

The call-site stability and the 0.70 gap are read directly from published RN
sources, not inferred. **No build was performed.** Definition of done item 5
(floor and ceiling build) remains the empirical check, and should be the first
implementation step: a `pod install` + build on 0.71 and on 0.87.x before any
Android work starts.

---

## Floor correction (2026-09-28, from the Task 2 floor gate)

**The floor is 0.73, not 0.71.** The podspec spike was right that
`install_modules_dependencies` exists from 0.71 — but it was not the binding
constraint. The build gate found the real one.

`CashfreePG` 2.4.0 declares `platforms: { ios: 13.0 }`. React Native's default
iOS deployment target by release:

| RN | min_ios_version_supported |
|---|---|
| 0.71, 0.72 | 12.4 |
| 0.73, 0.74 | 13.4 |
| 0.76 → 0.87 | 15.1 |

An RN 0.71 or 0.72 app therefore defaults *below* what the Cashfree pod requires,
and `pod install` fails with "required a higher minimum deployment target".
**This predates the migration** — it is a property of CashfreePG 2.4.0, not of
TurboModules.

A 0.71 merchant could raise their own Podfile to `platform :ios, '13.0'` and
proceed, but that is a merchant-side workaround on a path we do not test.

**Decisions:**
- Floor: **RN 0.73**.
- Podspec: `s.platforms = { :ios => "13.0" }` — matching CashfreePG exactly, so
  the SDK never imposes a target stricter than its own dependency.

**Secondary benefit.** `OldArchSample` is RN 0.73, so it *is* the floor
verification app. The throwaway floor app is deleted from the plan, which also
resolves the inconsistency noted when 0.71 was chosen: rejecting 0.70 because its
support path would be untestable, while adopting a 0.71 floor that needed a
throwaway app to test.

---

## Swift-edit correction (2026-09-28, from the Task 3 build gate)

The spec claimed Swift was edited once, then twice. **It is three edits**, none of which touch
payment logic:

1. `CashfreeEmitter.swift` — widen the stored emitter to `RCTEventEmitter`, add `@objc`, make
   the force-unwrap optional.
2. `CashfreePgApi.swift` — **visibility only**: the class and the thirteen forwarded `@objc`
   methods become `public`.
3. `CashfreePgApi.swift` — one additive `getInstalledUpiApps` completion method (Task 6).

Edit 2 was forced by the Task 3 build, which failed with `unknown type name 'CashfreePgApi'` on
BOTH architectures. Cause: the pod compiles as a Clang module (`MODULEMAP_FILE` set,
`-import-underlying-module` passed), and a Clang module's generated `-Swift.h` exposes only
`public`/`open` declarations. An `internal` class is invisible to the Objective-C++ adapter.

*Rejected alternative:* a new `public` Swift shim class wrapping the internal one, keeping
`CashfreePgApi.swift` byte-identical. It would have added a third language hop
(ObjC++ → Swift shim → Swift impl) and thirteen more forwarding methods to maintain, to avoid a
diff that is purely access keywords. The access-keyword diff is smaller, flatter and easier to
review.
