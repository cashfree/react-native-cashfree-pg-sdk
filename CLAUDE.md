# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the **react-native-cashfree-pg-sdk** — a React Native SDK that bridges JavaScript and native payment processing (iOS/Android) for Cashfree Payment Gateway. It is distributed as an NPM package with native modules on both platforms.

Current version: **3.0.0** (iOS native: 2.4.0, Android native: 2.4.0)

**Requires React Native 0.73.0 or newer.** As of 3.0.0 the SDK is a codegen TurboModule on
both platforms and no longer depends on React Native's legacy-module interop layer; it still
works unmodified on the legacy architecture. See [docs/MIGRATION-3.0.md](docs/MIGRATION-3.0.md)
for the merchant-facing migration notes (the only breaking change is the RN floor).

## Commands

### SDK (root)

```sh
yarn                  # Install dependencies
yarn bootstrap        # Full setup: install deps + all three sample app deps
yarn prepare          # Compile with react-native-builder-bob (outputs to lib/); also runs before publish
yarn lint             # ESLint on all JS/TS/TSX files
yarn typescript       # Type-check without emitting (tsc --noEmit)
yarn test             # Run Jest tests
yarn release          # Cut a release with release-it
```

### Sample Apps

> **Important:** The sample apps use **npm** (each has `package-lock.json`). Always use `npm`, never `yarn`, for sample app commands — Yarn Berry treats them as separate projects and fails.

```sh
yarn pods:oldarch              # Install iOS CocoaPods for a sample app (also pods:newarch, pods:expo)
npm --prefix sampleApps/OldArchSample run android   # old-arch control (RN 0.73)
npm --prefix sampleApps/NewArchSample run android   # new-arch repro (RN 0.81, bridgeless)
npm --prefix sampleApps/ExpoSample run prebuild   # Expo needs prebuild first
npm --prefix sampleApps/ExpoSample run android    # merchant's exact stack
```

### Single test file

```sh
yarn test -- path/to/test.spec.ts
```

## Architecture

### Layer structure

```
JS/TS Layer (src/)
    ↓  codegen Spec (src/NativeCashfreePgApi.ts) via TurboModuleRegistry
Generated glue (RNCashfreePgApiSpec, codegen'd from the Spec at build time)
    ↓
iOS: CashfreePgApiAdapter.{h,mm}   Android: NativeCashfreePgApiSpec (generated base class)
    ↓  owns ObjC class `CashfreePgApi`      ↓  extended by CashfreePgApiModule
Platform SDKs (CashfreePG CocoaPod / Cashfree PG Gradle dependency)
```

The SDK is a TurboModule on both platforms, described by a single codegen spec. `codegenConfig`
in `package.json` (name `RNCashfreePgApiSpec`) drives React Native's codegen to generate the
native-side interfaces (`NativeCashfreePgApiSpec.h` on iOS, `NativeCashfreePgApiSpec` base class
on Android) from that one spec — one signature per method, shared by both platforms. This is why
`getInstalledUpiApps()` became a single `Promise<string>` natively: codegen can't express "Android
answers via callback, iOS via event" as two different contracts. The JS-visible result is unchanged
(both platforms already answered `"[]"` for an empty list).

The module still works with the interop layer off and, unmodified, on the legacy architecture —
`NativeModules.CashfreePgApi` resolves to the same TurboModule either way.

### Source (`src/`)

- [src/NativeCashfreePgApi.ts](src/NativeCashfreePgApi.ts) — The codegen spec (`Spec extends TurboModule`). Every native method surfaced by the SDK is declared here; this is the single source of truth codegen reads to generate both platforms' native interfaces. Not shipping this file in the npm tarball would mean codegen produces nothing for consumers — verify its presence with `npm pack`.
- [src/index.ts](src/index.ts) — Main entry. Contains `CFPaymentGateway` class which resolves the `CashfreePgApi` TurboModule via `TurboModuleRegistry`/`NativeCashfreePgApi` and wires up a `NativeEventEmitter` for success/failure/event callbacks. Exports `CFPaymentGatewayService` singleton and all public types. Key methods: `doPayment`, `doWebPayment`, `doUPIPayment`, `doCardPayment`, `doSubscriptionPayment`, `makePayment` (element routing), `makeSubsPayment` (subscription element routing).
- [src/Card/CFCardComponent.tsx](src/Card/CFCardComponent.tsx) — `CFCard` React component for card element payments. Handles Luhn validation, card network detection (Visa, MC, Amex, RuPay, etc.), BIN-based TDR fetching, and exposes an imperative handle (`doPayment`, `doPaymentWithPaymentSessionId`) via `forwardRef`. Makes live HTTP calls to `https://api.cashfree.com/pg/sdk/js/{sessionId}/cardBin` and `.../v2/tdr` during card input (uses `sandbox.cashfree.com` for `SANDBOX` environment).
- [src/Card/CFSubsCardComponent.tsx](src/Card/CFSubsCardComponent.tsx) — `CFSubsCard` React component for NonPCI subscription card input. Handles card number formatting (4-digit groups), Luhn validation, BIN lookup via `POST /pg/sdk/js/subscription/card/bin` (authenticated with `x-sub-session-id`), and exposes an imperative handle (`doSubscriptionPayment`, `doSubscriptionPaymentWithNewSession`) via `forwardRef`. Exported as `CFSubsCard` from `src/index.ts`. Accepts `cfSubscriptionSession` (required) and `cardListener` (required callback receiving a JSON string with `card_network`, `card_bin_info`, `input_validation`, `luhn_check_info`, `last_four_digit`, `card_length`).
- [src/Card/index.ts](src/Card/index.ts) — Re-exports `CFCard` (default) from `CFCardComponent` and `SubsCardInput` (named) from `CFSubsCardComponent`.

### Native modules

**iOS** ([ios/](ios/)):
- [CashfreePgApiAdapter.h](ios/CashfreePgApiAdapter.h) / [CashfreePgApiAdapter.mm](ios/CashfreePgApiAdapter.mm) — The ObjC TurboModule adapter. It declares and implements the ObjC class **`CashfreePgApi`** (deliberately not renamed to match the file — React Native's TurboModule lookup resolves `NSClassFromString("CashfreePgApi")` directly, before consulting `RCTGetModuleClasses()`, so the class name is load-bearing and must stay `CashfreePgApi` regardless of the file's name). Under `RCT_NEW_ARCH_ENABLED` it conforms to the codegen'd `NativeCashfreePgApiSpec` protocol; otherwise to plain `RCTBridgeModule`. It is an `RCTEventEmitter` subclass — the single module that now emits every event (`cfSuccess`, `cfFailure`, `cfEvent`, `cfUpiApps`) via `supportedEvents`. Each exported method (`doPayment`, `doUPIPayment`, `doWebPayment`, `doSubscriptionPayment`, `doCardPayment`, `doElementUPIPayment`, `doElementNBPayment`, `doSubsCardPayment`, `doSubsUPIPayment`, `doSubsNBPayment`, `getInstalledUpiApps` (Promise-based), `setCallback`, `setEventSubscriber`, `removeEventSubscriber`) is a thin `RCT_EXPORT_METHOD` forwarding to `_impl`, an instance of `CashfreePgApiImpl`.
- [CashfreePgApi.swift](ios/CashfreePgApi.swift) — The Swift implementation, exposed to ObjC as **`CashfreePgApiImpl`** (not `CashfreePgApi` — that ObjC name belongs to the adapter above; keeping the Swift class under a different bridged name avoids both compiling to `CashfreePgApi.o` and colliding at link time). Implements the actual payment logic via `CFPaymentGatewayService`, plus `getInstalledUpiApps` (resolves a JSON string; `"[]"` when no UPI app is installed). Callback is registered via `setCallback()` which calls `CFPaymentGatewayService.getInstance().setCallback(self)`. Implements `CFResponseDelegate` with `verifyPayment(order_id:)`, `onError(_:order_id:)`, and `receivedEvent(event_name:meta_data:)`, which hand off to `CashfreeEmitter` to emit back to JS.
- `CashfreeEmitter.swift` — Singleton event dispatcher. Holds a reference to the registered `RCTEventEmitter` (now the adapter's `CashfreePgApi` instance itself, registered via `registerEventEmitterWithEventEmitter:` in the adapter's `init`) and calls `sendEvent`. The `allEvents` array here must match JS listener names.
- CocoaPod: `CashfreePG 2.4.0` (declared in `react-native-cashfree-pg-sdk.podspec`; exact version pin, not pessimistic).
- Deleted in the TurboModule migration (do not resurrect): `CashfreePgApi.m` (ObjC bridge, superseded by the adapter), `CashfreeEventEmitter.swift`/`.m` (separate `RCTEventEmitter` subclass — the adapter is now the sole emitter).

**Android** ([android/](android/)):
- [CashfreePgApiModule.java](android/src/main/java/com/reactnativecashfreepgsdk/CashfreePgApiModule.java) — `extends NativeCashfreePgApiSpec`, the abstract base class codegen generates from `src/NativeCashfreePgApi.ts`. Implements `CFCheckoutResponseCallback`, `CFEventsSubscriber`, `CFSubscriptionResponseCallback`. Parses JSON payment data from JS, calls Cashfree Android SDK, emits events via `RCTDeviceEventEmitter` (moved from `NativeAppEventEmitter` — see migration notes if you were listening directly instead of via `setCallback`). Subscription element methods: `doSubsCardPayment`, `doSubsUPIPayment`, `doSubsNBPayment` (routed by `doSubscriptionElementPayment`). `getInstalledUpiApps` resolves its Promise with a JSON string (`"[]"` on an empty list).
  - **Callback re-registration is load-bearing.** Every payment method calls `registerCheckoutCallback()` (or `registerSubscriptionCallback()`) before starting, so the current module instance always receives the result — including after Android recreates the host Activity when a UPI app returns. It sets a single callback rather than appending, so it never duplicates. Do not "simplify" it down to the one call in `setCallback()`. iOS needs no equivalent.
- `CashfreePgApiPackage.java` — `extends TurboReactPackage`, registers the module with React Native for both architectures.
- Gradle dependency: `com.cashfree.pg:api:2.4.0`.

### Build output (`lib/`)

Built by **react-native-builder-bob** into three targets:
- `lib/commonjs/` — CJS for Node/test environments
- `lib/module/` — ES modules for bundlers
- `lib/typescript/` — `.d.ts` declaration files

The `react-native` field in package.json points to `src/index` so Metro uses the raw source.

### Key API contract dependency

`cashfree-pg-api-contract` (v2.1.1) provides the TypeScript types and payment session contract shared between the JS layer and native modules. Payment objects (e.g., `CFDropCheckoutPayment`, `CFWebCheckoutPayment`, `CFCardPayment`) come from this package.

**Subscription types** (added in contract v2.1.0):
- `CFSubscriptionSession` — session object with `subscription_session_id`, `subscription_id`, and `CFEnvironment`
- `CFSubscriptionCheckoutPayment` — web checkout flow for subscriptions
- `CFSubsCardPayment` — card-based subscription payment (element flow)
- `CFSubsUPIPayment` — UPI-based subscription payment (element flow)
- `CFSubsNBPayment` — net banking subscription payment (`CFSubsNB` holds bank details, element flow)

**Subscription element payment routing** (`makeSubsPayment`):
```
CFPaymentGatewayService.makeSubsPayment(payment)
  ↓ identifies type (CFSubsUPIPayment | CFSubsCardPayment | CFSubsNBPayment)
  ↓ calls native: doSubsUPIPayment / doSubsCardPayment / doSubsNBPayment
  ↓ emits cfSuccess / cfFailure events
```

**Shared sample screens** (used by all three sample apps):
- `sampleApps/shared/PGScreen.tsx` — demonstrates standard payment flows (drop checkout, web, UPI, card)
- `sampleApps/shared/SubscriptionScreen.tsx` — demonstrates subscription flows: web checkout, card element (PCI), card element (NonPCI via `CFSubsCard`), net banking element, UPI intent. All sections are wrapped in `CollapsibleSection` (expand/collapse UI). Key behaviours:
  - `showAlert(message)` — module-level helper that wraps `Alert.alert('Response', message)`. Used for all payment responses.
  - `onVerify` / `onError` callbacks call `showAlert()` with the result. `onVerify` also clears the `upiScheme` state so the UPI input is reset after a successful payment.
  - **Auto-create on mount:** `createSubscription()` is called in `componentDidMount`, so a subscription order is created as soon as the screen loads. The "Create Subscription" button still works to refresh/retry.
  - UPI intent: a `upiScheme` text input is shown above the "Pay with UPI Intent" button.
    - If the field has a value, pressing the button calls `_doSubsUpiPayment` directly with that scheme (no sheet shown).
    - If the field is empty, `getInstalledUpiApps()` is called and a `Modal` + `FlatList` bottom sheet is shown. Falls back to hardcoded `[tez://, phonepe://, paytmmp://, bhim://]` if the list is empty or the call fails.
    - On selecting from the sheet, `upiScheme` is populated with the selected `appPackage` for reference.
    - `appPackage` passed to `CFUPI(UPIMode.INTENT, appPackage)` must use the `scheme://` format (e.g. `'tez://'`).
  - **NonPCI card section:** `createCFSubsCard()` builds a `CustomSubsCardInput` (wraps `CFSubsCard`) in the constructor with a placeholder session and stores it as `this.cfSubsCardInstance`. `handleSubsCardInput` receives the JSON callback on each keystroke and updates `subsCardNetwork` state to show the detected card network logo. `_startSubsCardPaymentNonPCI` calls `this.subsCardRef.current.doSubscriptionPayment(elementCard)` using the session already held inside the component; `doSubscriptionPaymentWithNewSession` is available when a fresh session is needed.
  - Pre-filled test data: card `4400060119105004`, expiry `09/30`, CVV `123`; NB account `123456789`, bank `UTIB`, type `SAVINGS`.

## Sample apps

Three apps live under `sampleApps/`, all autolinking the SDK from the repo root
via each app's `react-native.config.js` (so they exercise `src/`, not the
published npm package). See [sampleApps/README.md](sampleApps/README.md) for the
boundary-instrumentation methodology.

| App | RN | Architecture |
|---|---|---|
| `OldArchSample` | 0.73.11 | old arch — control (was `example/`) |
| `NewArchSample` | 0.81.5 | new arch, bridgeless — repro target |
| `ExpoSample` | 0.85.3 / Expo 56 | new arch only (Expo 55+ has no legacy arch) |

**Metro singleton pinning is load-bearing, not hygiene.** Each app pins `react`,
`react-native` and `cashfree-pg-api-contract` to one copy and blocks the repo
root's `node_modules`. Two copies of the contract package make
`cfPayment instanceof CFUPIPayment` (in `makePayment`, `src/index.ts`) return `false`;
`makePayment` then silently falls through to its else branch and never calls
native — no UPI app, no callback, Pay button resets. That is indistinguishable
from a real native failure, so duplicate copies can manufacture a false
reproduction.

**`setCallback` must be registered exactly once.** Each `setCallback` call in
`src/index.ts` adds its own `cfSuccess`/`cfFailure` listeners, so registering
twice (e.g. at app root *and* in a screen) delivers every result twice. The
shared screens register once, in the screen that owns the UI feedback. Root
registration is not needed for reliability — the Android module re-registers
natively before every payment.

## Development conventions

- **TypeScript strict mode** enabled; avoid `any`.
- **Prettier + ESLint** (`@react-native-community` config) enforced via pre-commit hooks (Husky + lint-staged).
- **Commit messages** must follow Conventional Commits (enforced by commitlint).
- **Versioning:** On a release, bump `version` in `package.json` and `versionNumber` in `ios/CashfreePgApi.swift` together — iOS hardcodes the RN SDK version into the platform string, while JS sends `package.json`'s version on every payment (Android has no constant). Native SDK bumps go in the podspec (`CashfreePG`) and `android/build.gradle` (`com.cashfree.pg:api`).
- Build artifacts in `lib/` are **generated, not committed** — `lib/` is gitignored. The `prepare` script (`bob build`) regenerates it before `npm publish` and before git-dependency installs, so it is always present in the published tarball. Verify with `npm pack`.

## Platform-specific notes

- **iOS minimum deployment target:** 13.0
- **Android minSdkVersion:** 21, compileSdkVersion: 35
- When changing the podspec or `build.gradle`, verify **all three** sample apps still build — they span RN 0.73 to 0.85, and the newest is the one that breaks first.
- The native event names (`cfSuccess`, `cfFailure`, `cfEvent`, `cfUpiApps`) must stay in sync between the native emitters and the JS listeners in `src/index.ts`. On iOS, the authoritative list is now the hardcoded array in `supportedEvents` in `ios/CashfreePgApiAdapter.mm` (`CashfreeEventEmitter.swift` was deleted).
- **iOS build cache:** If you get `'CFCardSubsPayment' is unavailable: cannot find Swift declaration for this class` errors, the `XCFrameworkIntermediates` build cache is stale. Fix: `rm -rf sampleApps/*/ios/build/Debug-iphonesimulator/XCFrameworkIntermediates` then rebuild.
- **iOS simulator UPI testing:** To test UPI app selection on simulator, install dummy apps with UPI URL schemes. See script below — uses `xcrun simctl install` with minimal `.app` bundles (binary compiled via `xcrun -sdk iphonesimulator clang`). Use `cat` instead of `cp` to copy binaries (hooks may intercept `cp`).
  ```sh
  # Schemes to cover: tez, phonepe, paytmmp, bhim
  xcrun -sdk iphonesimulator clang -target arm64-apple-ios14.0-simulator main.c -o dummy_bin
  # Then create .app bundle with Info.plist registering CFBundleURLTypes, install with:
  xcrun simctl install <SIMULATOR_ID> DummyApp.app
  ```
