# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the **react-native-cashfree-pg-sdk** — a React Native SDK that bridges JavaScript and native payment processing (iOS/Android) for Cashfree Payment Gateway. It is distributed as an NPM package with native modules on both platforms.

Current version: **2.3.0** (iOS native: 2.3.1, Android native: 2.3.0)

## Commands

### SDK (root)

```sh
yarn                  # Install dependencies
yarn bootstrap        # Full setup: install deps + example deps + iOS pods
yarn prepare          # Compile with react-native-builder-bob (outputs to lib/); also runs before publish
yarn lint             # ESLint on all JS/TS/TSX files
yarn typescript       # Type-check without emitting (tsc --noEmit)
yarn test             # Run Jest tests
yarn release          # Cut a release with release-it
```

### Example App

```sh
yarn example          # Shortcut: runs yarn in example/ directory
yarn pods             # Install iOS CocoaPods for example app
cd example && yarn android    # Run example on Android
cd example && yarn ios        # Run example on iOS
cd example && yarn start      # Start Metro bundler
```

### Single test file

```sh
yarn test -- path/to/test.spec.ts
```

## Architecture

### Layer structure

```
JS/TS Layer (src/)
    ↓  NativeModules / NativeEventEmitter
Native Bridge (ios/ & android/)
    ↓
Platform SDKs (CashfreePG CocoaPod / Cashfree PG Gradle dependency)
```

### Source (`src/`)

- [src/index.ts](src/index.ts) — Main entry. Contains `CFPaymentGateway` class which wraps `NativeModules.CashfreePgApi` and wires up a `NativeEventEmitter` for success/failure/event callbacks. Exports `CFPaymentGatewayService` singleton and all public types. Key methods: `doPayment`, `doWebPayment`, `doUPIPayment`, `doCardPayment`, `doSubscriptionPayment`, `makePayment` (element routing), `makeSubsPayment` (subscription element routing).
- [src/Card/CFCardComponent.tsx](src/Card/CFCardComponent.tsx) — `CFCard` React component for card element payments. Handles Luhn validation, card network detection (Visa, MC, Amex, RuPay, etc.), BIN-based TDR fetching, and exposes an imperative handle (`doPayment`, `doPaymentWithPaymentSessionId`) via `forwardRef`. Makes live HTTP calls to `https://api.cashfree.com/pg/sdk/js/{sessionId}/cardBin` and `.../v2/tdr` during card input (uses `sandbox.cashfree.com` for `SANDBOX` environment).
- [src/Card/index.ts](src/Card/index.ts) — Re-exports `CFCard` from `CFCardComponent`.

### Native modules

**iOS** ([ios/](ios/)):
- [CashfreePgApi.swift](ios/CashfreePgApi.swift) — Primary Swift native module. Implements `doPayment`, `doWebPayment`, `doUPIPayment`, `doCardPayment`, `doSubscriptionPayment`, `getInstalledUpiApps`. Emits `cfSuccess`, `cfFailure`, `cfEvent`, `cfUpiApps` (iOS-only) events back to JS via `CashfreeEmitter`.
- `CashfreeEmitter.swift` — Singleton event dispatcher. Holds a reference to the active `CashfreeEventEmitter` and calls `sendEvent`. The `allEvents` array here must match JS listener names.
- `CashfreeEventEmitter.swift` — `RCTEventEmitter` subclass that registers itself with `CashfreeEmitter.sharedInstance` on init.
- `CashfreePgApi.m` — Objective-C bridge exposing both `CashfreePgApi` and `CashfreeEventEmitter` to React Native.
- CocoaPod: `CashfreePG 2.3.1` (declared in `react-native-cashfree-pg-sdk.podspec`; exact version pin, not pessimistic).

**Android** ([android/](android/)):
- [CashfreePgApiModule.java](android/src/main/java/com/reactnativecashfreepgsdk/CashfreePgApiModule.java) — Primary Java native module. Implements `CFCheckoutResponseCallback`, `CFEventsSubscriber`, `CFSubscriptionResponseCallback`. Parses JSON payment data from JS, calls Cashfree Android SDK, emits events via `RCTNativeAppEventEmitter`. Subscription element methods: `doSubsCardPayment`, `doSubsUPIPayment`, `doSubsNBPayment` (routed by `doSubscriptionElementPayment`).
- `CashfreePgApiPackage.java` — Registers the module with React Native.
- Gradle dependency: `com.cashfree.pg:api:2.3.0`.

### Build output (`lib/`)

Built by **react-native-builder-bob** into three targets:
- `lib/commonjs/` — CJS for Node/test environments
- `lib/module/` — ES modules for bundlers
- `lib/typescript/` — `.d.ts` declaration files

The `react-native` field in package.json points to `src/index` so Metro uses the raw source.

### Key API contract dependency

`cashfree-pg-api-contract` (v2.1.0) provides the TypeScript types and payment session contract shared between the JS layer and native modules. Payment objects (e.g., `CFDropCheckoutPayment`, `CFWebCheckoutPayment`, `CFCardPayment`) come from this package.

**Subscription types** (added in v2.1.0):
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

**Example app screens:**
- `example/src/PGScreen.tsx` — demonstrates standard payment flows (drop checkout, web, UPI, card)
- `example/src/SubscriptionScreen.tsx` — demonstrates subscription flows: web checkout, card element, net banking element, UPI intent

## Development conventions

- **TypeScript strict mode** enabled; avoid `any`.
- **Prettier + ESLint** (`@react-native-community` config) enforced via pre-commit hooks (Husky + lint-staged).
- **Commit messages** must follow Conventional Commits (enforced by commitlint).
- **Versioning:** Update native SDK version constants in `CashfreePgApi.swift` (`sdkVersion`) and `CashfreePgApiModule.java` whenever the native SDKs are bumped.
- Build artifacts in `lib/` are committed (required for NPM publish); do not gitignore them.

## Platform-specific notes

- **iOS minimum deployment target:** 10.0
- **Android minSdkVersion:** 21, compileSdkVersion: 35
- When changing the podspec or `build.gradle`, verify the example app still builds (`yarn pods` + `yarn example ios/android`).
- The native event names (`cfSuccess`, `cfFailure`, `cfEvent`, `cfUpiApps`) must stay in sync between the native emitters and the JS listeners in `src/index.ts`. On iOS, `CashfreeEmitter.swift`'s `allEvents` array is the authoritative list.
