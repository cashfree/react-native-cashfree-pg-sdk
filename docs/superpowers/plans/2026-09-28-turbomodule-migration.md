# TurboModule Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `react-native-cashfree-pg-sdk` 3.0.0 as a codegen TurboModule that works identically on the legacy and New architectures, removing the SDK's dependence on React Native's legacy-module interop layer.

**Architecture:** One codegen spec (`src/NativeCashfreePgApi.ts`) generates a base class on Android and an Objective-C protocol plus C++ JSI class on iOS. Android's existing module extends the generated class; iOS gets a thin Objective-C++ adapter in front of the existing, near-untouched Swift implementation. No `oldarch/`/`newarch/` source-set split — the generated base types work on both architectures, which is what the RN 0.73 floor buys.

**Tech Stack:** React Native codegen, TypeScript, Java (Android), Swift + Objective-C++ (iOS), CocoaPods, Gradle, Jest.

**Spec:** `docs/superpowers/specs/2026-09-28-turbomodule-migration-design.md`

## Global Constraints

- **Minimum React Native: 0.73.** Not 0.71: `CashfreePG` 2.4.0 requires iOS 13.0, and RN 0.71/0.72 default their deployment target to 12.4, so `pod install` fails there. Established by the Task 2 floor gate; do not lower.
- **iOS deployment target is exactly `13.0`** — matching CashfreePG 2.4.0, so the SDK never imposes a stricter target than its own dependency.
- **Maximum verified React Native: 0.87.x.** Both ends must build (Task 2).
- **Native module name is `CashfreePgApi`.** It must not change — merchants and `src/index.ts` both depend on it.
- **Event names are `cfSuccess`, `cfFailure`, `cfEvent`, `cfUpiApps`.** They must not change.
- **Merchant-facing JS API must not change.** `CFPaymentGatewayService.makePayment()`, `setCallback()`, `makeSubsPayment()`, `doPayment()`, `getInstalledUpiApps()` keep their exact signatures. The only breaking change in 3.0.0 is the RN floor.
- **Payload format stays JSON strings.** Every payment method takes one `string` produced by `JSON.stringify`.
- **Use `TurboReactPackage`, not `BaseReactPackage`.** `BaseReactPackage` does not exist before 0.74, and the floor is 0.73. `TurboReactPackage` spans 0.73 → 0.87 (Kotlin by 0.87), with a deprecation warning on recent versions. Accept the warning.
- **Use the 6-argument `ReactModuleInfo` constructor** (no `hasConstants`). It is the primary constructor from 0.73 onward and is not deprecated. The 7-arg form also exists but is deprecated — do not use it.
- **Do not fix known payment bugs in this plan.** Silent-failure paths, `onVerify` semantics, iOS `onError` on back-out, force-unwraps and the main-thread violation ship as separate PRs. If you touch a line containing one, leave the behaviour exactly as it is.
- **Codegen spec name is `RNCashfreePgApiSpec`.** The iOS import path `<RNCashfreePgApiSpec/RNCashfreePgApiSpec.h>` derives from it.
- **Commit after every task.** Conventional Commits, enforced by commitlint.

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/NativeCashfreePgApi.ts` | The codegen spec. Single source of truth for the native interface. |
| `src/__tests__/index.test.ts` | JS routing and resolution tests. |
| `ios/CashfreePgApiAdapter.h` | Adapter interface; conditional protocol conformance. |
| `ios/CashfreePgApiAdapter.mm` | Adapter implementation; forwards to Swift, hosts `getTurboModule:`. |
| `docs/MIGRATION-3.0.md` | Merchant-facing migration note. |

**Modified:**

| File | Change |
|---|---|
| `package.json` | `codegenConfig`, `peerDependencies`, jest `testPathIgnorePatterns`, `files` |
| `react-native-cashfree-pg-sdk.podspec` | `install_modules_dependencies(s)`, drop redundant `React-Core`, raise deployment target |
| `android/build.gradle` | codegen plugin, `react-android` dependency, Java 17 |
| `android/src/main/java/com/reactnativecashfreepgsdk/CashfreePgApiModule.java` | extend generated spec; emitter and Activity changes |
| `android/src/main/java/com/reactnativecashfreepgsdk/CashfreePgApiPackage.java` | `TurboReactPackage` |
| `ios/CashfreePgApi.swift` | class + 13 forwarded methods made `public` (visibility only); one additive `getInstalledUpiApps` completion method in Task 6 |
| `ios/CashfreeEmitter.swift` | accept any `RCTEventEmitter`; expose to Objective-C |
| `src/index.ts` | consume the spec; single emitter; drop the `LINKING_ERROR` proxy |

**Deleted:**

| File | Reason |
|---|---|
| `src/index.js`, `src/Card/index.js`, `src/Card/CFCardComponent.js`, `src/Card/CFSubsCardComponent.js` | Compiled twins that shadow the `.ts` sources |
| `ios/CashfreePgApi.m` | Replaced by the adapter |
| `ios/CashfreeEventEmitter.m`, `ios/CashfreeEventEmitter.swift` | The adapter is now the emitter |

---

## Correction to the spec, discovered while planning

The spec says Swift is edited exactly once. **It is edited twice.** `CashfreeEmitter.swift` holds `private var eventEmitter: CashfreeEventEmitter!` and its `registerEventEmitter` takes that concrete type. Once the adapter becomes the emitter, that type must widen to `RCTEventEmitter` and the class must be reachable from Objective-C. Both edits are in Task 3. Neither touches payment logic.

---

### Task 1: Test harness and removal of the compiled JS twins

Nothing else can be verified until Jest runs against `src/` and the `.js` twins are gone. `package.json` sets `"react-native": "src/index"`, and Metro resolves `.js` before `.ts` — so consumers currently load `src/index.js`, and any edit to `index.ts` alone would be dead code.

**Files:**
- Create: `src/__tests__/index.test.ts`
- Modify: `package.json` (jest config)
- Delete: `src/index.js`, `src/Card/index.js`, `src/Card/CFCardComponent.js`, `src/Card/CFSubsCardComponent.js`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `yarn test` against `src/`; `require.resolve('../index')` resolving to `src/index.ts`.

- [ ] **Step 1: Scope Jest to the SDK**

Jest currently only discovers tests inside the sample apps, which have no `node_modules`. In `package.json`, replace the `jest` block with:

```json
"jest": {
  "preset": "react-native",
  "testPathIgnorePatterns": [
    "<rootDir>/sampleApps/",
    "<rootDir>/lib/",
    "<rootDir>/node_modules/"
  ],
  "modulePathIgnorePatterns": [
    "<rootDir>/sampleApps/OldArchSample/node_modules",
    "<rootDir>/sampleApps/NewArchSample/node_modules",
    "<rootDir>/sampleApps/ExpoSample/node_modules",
    "<rootDir>/lib/"
  ]
}
```

- [ ] **Step 2: Write the failing test**

Create `src/__tests__/index.test.ts`:

```ts
describe('package entry resolution', () => {
  it('resolves to the TypeScript source, not a compiled twin', () => {
    expect(require.resolve('../index')).toMatch(/src\/index\.ts$/);
  });

  it('has no compiled .js twin shadowing a .ts source', () => {
    const fs = require('fs');
    const path = require('path');
    const twins = [
      'index.js',
      path.join('Card', 'index.js'),
      path.join('Card', 'CFCardComponent.js'),
      path.join('Card', 'CFSubsCardComponent.js'),
    ];
    const present = twins.filter((t) =>
      fs.existsSync(path.join(__dirname, '..', t))
    );
    expect(present).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
yarn test src/__tests__/index.test.ts
```

Expected: both tests FAIL. The first reports a path ending `src/index.js`; the second lists all four twins.

- [ ] **Step 4: Delete the twins**

```bash
git rm src/index.js src/Card/index.js src/Card/CFCardComponent.js src/Card/CFSubsCardComponent.js
```

- [ ] **Step 5: Run the test and confirm it passes**

```bash
yarn test src/__tests__/index.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Confirm the package still type-checks and lints**

```bash
yarn typescript && yarn lint
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json src/__tests__/index.test.ts
git commit -m "test: scope jest to src and remove compiled js twins

The .js files shadowed their .ts sources because package.json points
react-native at src/index and Metro resolves .js first, so consumers
were running the compiled twins."
```

---

### Task 2: Codegen spec, build wiring, and the floor/ceiling build gate

This task proves the RN 0.73 → 0.87 band empirically. The spike established it from RN's published sources; nothing has been built yet. Do this before writing any module code, so a podspec surprise lands against an empty diff.

**Files:**
- Create: `src/NativeCashfreePgApi.ts`
- Modify: `package.json` (codegenConfig, peerDependencies), `react-native-cashfree-pg-sdk.podspec`, `android/build.gradle`

**Interfaces:**
- Consumes: Task 1's Jest harness.
- Produces: the `Spec` interface below; generated artifacts `NativeCashfreePgApiSpec` (Java class `com.reactnativecashfreepgsdk.NativeCashfreePgApiSpec`) and `<RNCashfreePgApiSpec/RNCashfreePgApiSpec.h>` (iOS), both consumed by Tasks 3 and 4.

- [ ] **Step 1: Write the spec**

Create `src/NativeCashfreePgApi.ts`:

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

- [ ] **Step 2: Add codegenConfig and raise the peer dependency**

In `package.json`, add a top-level `codegenConfig` and change `peerDependencies`:

```json
"codegenConfig": {
  "name": "RNCashfreePgApiSpec",
  "type": "modules",
  "jsSrcsDir": "src",
  "android": {
    "javaPackageName": "com.reactnativecashfreepgsdk"
  }
},
"peerDependencies": {
  "react": "*",
  "react-native": ">=0.73.0"
}
```

- [ ] **Step 3: Update the podspec**

Replace the body of `react-native-cashfree-pg-sdk.podspec` below the metadata with:

```ruby
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://www.cashfree.com/.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.frameworks = "WebKit"

  s.dependency "CashfreePG", "2.4.0"

  install_modules_dependencies(s)
```

Two deliberate removals. `s.dependency "React-Core"` goes because `install_modules_dependencies` already adds it. `:ios => "10.0"` goes because it is below what `CashfreePG` 2.4.0 itself requires (13.0). Use exactly `13.0` — matching the dependency, not RN's 13.4 default, so the SDK adds no constraint of its own.

- [ ] **Step 4: Wire Android codegen**

In `android/build.gradle`, apply the codegen plugin and replace the dynamic React Native dependency. At the top, after `apply plugin: 'com.android.library'`, add:

```groovy
apply plugin: 'com.facebook.react'
```

In the `buildscript` `dependencies` block, add alongside the Android Gradle plugin:

```groovy
classpath 'com.facebook.react:react-native-gradle-plugin'
```

In the `dependencies` block at the bottom, replace the React Native line:

```groovy
  implementation 'com.facebook.react:react-android'
```

And raise the Java target, which RN 0.73+ requires:

```groovy
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
```

- [ ] **Step 5: Bootstrap the sample apps**

Their `node_modules` are absent.

```bash
yarn install
npm --prefix sampleApps/OldArchSample install
npm --prefix sampleApps/NewArchSample install
```

- [ ] **Step 6: Ceiling gate — verify iOS codegen on the newest RN**

`NewArchSample` is RN 0.81.5.

```bash
cd sampleApps/NewArchSample
env -u GEM_PATH -u GEM_HOME -u RUBYOPT -u BUNDLE_GEMFILE -u RUBYLIB \
  /opt/homebrew/bin/pod install --project-directory=ios
```

Expected: `pod install` completes. Then confirm the generated header exists:

```bash
find sampleApps/NewArchSample/ios -name 'RNCashfreePgApiSpec.h' | head
```

Expected: at least one path under `ios/build/generated/ios/` or `ios/Pods/`.

The CocoaPods invocation is unusual because this machine's RVM shim breaks `pod`; the `env -u` form is the one that works. Do not simplify it.

- [ ] **Step 7: Floor gate — verify iOS codegen on RN 0.73**

`OldArchSample` is RN 0.73, which is the floor. No throwaway app is needed.

First bump it off RN 0.73.0. That exact patch release vendors a `boost.podspec` pointing at
`https://boostorg.jfrog.io/...`, which now serves an HTML redirect instead of the tarball, so
`pod install` fails on the checksum. React Native fixed this in **0.73.2** by moving the source
to `https://archives.boost.io/...`. Verified: the jfrog URL returns 302 with 138 bytes of HTML;
the archives.boost.io URL returns 200. This is unrelated to the SDK, to CashfreePG, and to the
floor decision — it is an upstream packaging fix, so take it rather than work around it.

In `sampleApps/OldArchSample/package.json`, change the dependency:

```json
    "react-native": "0.73.11",
```

Then reinstall and run the gate:

```bash
npm --prefix sampleApps/OldArchSample install
cd sampleApps/OldArchSample
env -u GEM_PATH -u GEM_HOME -u RUBYOPT -u BUNDLE_GEMFILE -u RUBYLIB \
  /opt/homebrew/bin/pod install --project-directory=ios
```

Expected: `pod install` completes. No `undefined method 'install_modules_dependencies'`, and no "required a higher minimum deployment target".

If it fails, STOP and report BLOCKED with the exact error. Do not work around it, do not change the deployment target, do not raise the floor yourself.

- [ ] **Step 8: Verify Android codegen**

```bash
cd sampleApps/NewArchSample/android
./gradlew :react-native-cashfree-pg-sdk:generateCodegenArtifactsFromSchema > /tmp/codegen.log 2>&1; echo "exit=$?"
tail -20 /tmp/codegen.log
find . -name 'NativeCashfreePgApiSpec.java' | head
```

Expected: exit 0, and a generated `NativeCashfreePgApiSpec.java`.

Capture the exit code directly. Do not pipe Gradle into `tail` — the pipeline returns `tail`'s status and will mask a failure.

- [ ] **Step 9: Commit**

```bash
git add src/NativeCashfreePgApi.ts package.json react-native-cashfree-pg-sdk.podspec android/build.gradle sampleApps/OldArchSample/package.json sampleApps/OldArchSample/package-lock.json
git commit -m "feat: add codegen spec and build wiring for TurboModule

Verified pod install and Android codegen on RN 0.73 and 0.81."
```

---

### Task 3: iOS adapter and emitter consolidation

The adapter is what makes the module a TurboModule on iOS. Folding the event emitter into it is not optional: `CashfreeEventEmitter` is a separate legacy module today, and leaving it separate keeps `NativeModules.CashfreeEventEmitter` null in strict mode — the exact cause of the observed `new NativeEventEmitter() requires a non-null argument` crash.

**Files:**
- Create: `ios/CashfreePgApiAdapter.h`, `ios/CashfreePgApiAdapter.mm`
- Modify: `ios/CashfreeEmitter.swift`
- Delete: `ios/CashfreePgApi.m`, `ios/CashfreeEventEmitter.m`, `ios/CashfreeEventEmitter.swift`

**Interfaces:**
- Consumes: `<RNCashfreePgApiSpec/RNCashfreePgApiSpec.h>` and the `NativeCashfreePgApiSpec` protocol from Task 2; the existing Swift class `CashfreePgApi` with `@objc` methods `doPayment:`, `doUPIPayment:`, `doWebPayment:`, `doSubscriptionPayment:`, `doCardPayment:`, `doElementNBPayment:`, `doElementUPIPayment:`, `doSubsCardPayment:`, `doSubsUPIPayment:`, `doSubsNBPayment:`, `setCallback`, `setEventSubscriber`, `removeEventSubscriber`, each taking `NSString *` where parameterised.
- Produces: native module `CashfreePgApi` registered on both architectures, emitting `cfSuccess`, `cfFailure`, `cfEvent`, `cfUpiApps`.

- [ ] **Step 1: Widen the Swift emitter registration**

`CashfreeEmitter` stores the concrete `CashfreeEventEmitter`, which is being deleted. Edit `ios/CashfreeEmitter.swift`: mark the class `@objc` so Objective-C++ can reach it, and widen the stored type.

```swift
@objc(CashfreeEmitter)
public class CashfreeEmitter: NSObject {

    /// Shared Instance.
    @objc public static var sharedInstance = CashfreeEmitter()

    // The active RCTEventEmitter, registered by the module when React Native creates it.
    private var eventEmitter: RCTEventEmitter?

    private override init() {}

    // When React Native instantiates the emitter it is registered here.
    @objc public func registerEventEmitter(eventEmitter: RCTEventEmitter) {
        self.eventEmitter = eventEmitter
    }

    @objc public func dispatch(name: String, body: Any?) {
        eventEmitter?.sendEvent(withName: name, body: body)
    }

    /// All Events which must be supported by React Native.
    @objc public lazy var allEvents: [String] = {
        var allEventNames: [String] = ["cfSuccess", "cfFailure", "cfEvent", "cfUpiApps"]

        // Append all events here

        return allEventNames
    }()
}
```

Note the change from `eventEmitter!` to `eventEmitter?`. The force-unwrap would crash if an event arrived before registration; the optional drops the event instead. This is a behaviour change and it is intentional — dropping an event beats terminating a payment session.

- [ ] **Step 1a: Rename the Swift class's Objective-C exposure**

React Native resolves a module name to an Objective-C class of the SAME NAME before it ever
consults the `RCT_EXPORT_MODULE` custom-name registry
(`RCTTurboModuleManager.mm`: `getFallbackClassFromName` at line 174 is called at line 835; the
registry lookup is at line 842 and is never reached). So whichever class is named
`CashfreePgApi` in the Objective-C runtime MUST be the module.

Today that name belongs to the Swift implementation, which is not a bridge module. Change only
its Objective-C exposure — the Swift-side name stays `CashfreePgApi`:

```swift
@objc(CashfreePgApiImpl)
public class CashfreePgApi: NSObject {
```

This previously worked by accident: `RCT_EXTERN_MODULE(CashfreePgApi, NSObject)` declared a
*category* on the Swift class, so the Swift class itself was the bridge module.

- [ ] **Step 1b: Make the Swift module class visible to Objective-C**

The pod builds as a Clang module (`MODULEMAP_FILE` is set and `-import-underlying-module` is
passed), so the generated `react_native_cashfree_pg_sdk-Swift.h` contains **only `public` and
`open` declarations**. `CashfreePgApi` is `internal`, so it is filtered out of that header
entirely and the adapter cannot see the type.

This is a visibility change only. Do not touch a single method body, and do not change
behaviour.

In `ios/CashfreePgApi.swift`, change the class declaration:

```swift
@objc(CashfreePgApi)
public class CashfreePgApi: NSObject {
```

Then add `public` to the thirteen `@objc` methods the adapter forwards, leaving every
`private` helper untouched:

```swift
    @objc public func doPayment(_ paymentObject: NSString) -> Void {
    @objc public func doUPIPayment(_ paymentObject: NSString) -> Void {
    @objc public func doWebPayment(_ paymentObject: NSString) -> Void {
    @objc public func doSubscriptionPayment(_ paymentObject: NSString) -> Void {
    @objc public func doCardPayment(_ paymentObject: NSString) -> Void {
    @objc public func doElementNBPayment(_ paymentObject: NSString) -> Void {
    @objc public func doElementUPIPayment(_ paymentObject: NSString) -> Void {
    @objc public func doSubsCardPayment(_ paymentObject: NSString) -> Void {
    @objc public func doSubsUPIPayment(_ paymentObject: NSString) -> Void {
    @objc public func doSubsNBPayment(_ paymentObject: NSString) -> Void {
    @objc public func setCallback() -> Void {
    @objc public func setEventSubscriber() -> Void {
    @objc public func removeEventSubscriber() -> Void {
```

Leave `getInstalledUpiApps` alone — Task 6 owns it.

Then make the three `CFResponseDelegate` callbacks public as well:

```swift
    public func onError(_ error: CFErrorResponse, order_id: String) {
    public func verifyPayment(order_id: String) {
    public func receivedEvent(event_name: String, meta_data: Dictionary<String, Any>) {
```

These are NOT needed by the adapter, and nothing calls them from Objective-C. Swift requires
them anyway: `CFResponseDelegate` is a `public` protocol vendored by `CashfreePGCoreSDK`, and a
public type's witnesses to a public protocol must themselves be public. The compiler enforces
this regardless of callers — without it the build fails with *"must be declared public because
it matches a requirement in public protocol 'CFResponseDelegate'"*.

Do NOT make the `private` parsing helpers public. They witness nothing.

Verify the header now exposes the class, after the next `pod install` and build:

```bash
find sampleApps/NewArchSample/ios -name 'react_native_cashfree_pg_sdk-Swift.h' \
  -exec grep -n '@interface CashfreePgApi' {} \;
```

- [ ] **Step 2: Write the adapter header**

Create `ios/CashfreePgApiAdapter.h`:

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNCashfreePgApiSpec/RNCashfreePgApiSpec.h>

@interface CashfreePgApi : RCTEventEmitter <NativeCashfreePgApiSpec>
@end

#else

@interface CashfreePgApi : RCTEventEmitter <RCTBridgeModule>
@end

#endif
```

- [ ] **Step 3: Write the adapter implementation**

Use `RCT_EXPORT_METHOD` for every forwarded method, not plain Objective-C definitions. This is
load-bearing: codegen emits the `NativeCashfreePgApiSpec` protocol **only** under
`RCT_NEW_ARCH_ENABLED`. On the legacy architecture there is no protocol, and React Native
discovers methods solely through the `RCT_EXPORT_METHOD` metadata. Plain method definitions
would export nothing on old arch — the module would register with zero methods.
`RCT_EXPORT_METHOD` defines the method *and* registers it, so it satisfies the protocol on new
arch and exports on old arch from one source.

Create `ios/CashfreePgApiAdapter.mm`. Note the deliberate filename/class mismatch: the CLASS
must be `CashfreePgApi` (see Step 1a), but the FILE cannot be named `CashfreePgApi.mm` because
it would collide with `CashfreePgApi.swift` at the object-file level — both compile to
`CashfreePgApi.o` in one target. Carry that explanation as a comment at the top of the file.

```objc
#import "CashfreePgApiAdapter.h"
#import "react_native_cashfree_pg_sdk-Swift.h"

@implementation CashfreePgApi {
  CashfreePgApiImpl *_impl;
}

RCT_EXPORT_MODULE(CashfreePgApi)

- (instancetype)init
{
  if (self = [super init]) {
    _impl = [CashfreePgApiImpl new];
    [[CashfreeEmitter sharedInstance] registerEventEmitterWithEventEmitter:self];
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ @"cfSuccess", @"cfFailure", @"cfEvent", @"cfUpiApps" ];
}

RCT_EXPORT_METHOD(doPayment:(NSString *)paymentData) { [_impl doPayment:paymentData]; }
RCT_EXPORT_METHOD(doUPIPayment:(NSString *)paymentData) { [_impl doUPIPayment:paymentData]; }
RCT_EXPORT_METHOD(doWebPayment:(NSString *)paymentData) { [_impl doWebPayment:paymentData]; }
RCT_EXPORT_METHOD(doSubscriptionPayment:(NSString *)paymentData) { [_impl doSubscriptionPayment:paymentData]; }
RCT_EXPORT_METHOD(doCardPayment:(NSString *)paymentData) { [_impl doCardPayment:paymentData]; }
RCT_EXPORT_METHOD(doElementUPIPayment:(NSString *)paymentData) { [_impl doElementUPIPayment:paymentData]; }
RCT_EXPORT_METHOD(doElementNBPayment:(NSString *)paymentData) { [_impl doElementNBPayment:paymentData]; }
RCT_EXPORT_METHOD(doSubsCardPayment:(NSString *)paymentData) { [_impl doSubsCardPayment:paymentData]; }
RCT_EXPORT_METHOD(doSubsUPIPayment:(NSString *)paymentData) { [_impl doSubsUPIPayment:paymentData]; }
RCT_EXPORT_METHOD(doSubsNBPayment:(NSString *)paymentData) { [_impl doSubsNBPayment:paymentData]; }
RCT_EXPORT_METHOD(setCallback) { [_impl setCallback]; }
RCT_EXPORT_METHOD(setEventSubscriber) { [_impl setEventSubscriber]; }
RCT_EXPORT_METHOD(removeEventSubscriber) { [_impl removeEventSubscriber]; }

#ifdef RCT_NEW_ARCH_ENABLED
// Declared by the generated protocol. Events are delivered through RCTEventEmitter
// (supportedEvents / sendEventWithName), so there is nothing to wire here. Implemented
// to satisfy conformance and to avoid an unrecognised-selector crash if RN calls it.
- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *)eventEmitterCallbackWrapper
{
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeCashfreePgApiSpecJSI>(params);
}
#endif

@end
```

`addListener:` and `removeListeners:` are NOT implemented here. `RCTEventEmitter` already
exports both, with `removeListeners:(double)count` — which matches what codegen emits.

`getInstalledUpiApps` is deliberately absent — it lands in Task 6. Until then the build will
warn about incomplete protocol conformance under `RCT_NEW_ARCH_ENABLED`; that is expected and
Task 6 closes it.

The Swift selector `registerEventEmitterWithEventEmitter:` is the Objective-C name generated
from `registerEventEmitter(eventEmitter:)`. If the compiler reports an unknown selector, read
the actual name from the generated header rather than guessing:

```bash
find sampleApps/NewArchSample/ios -name 'react_native_cashfree_pg_sdk-Swift.h' \
  -exec grep -n 'registerEventEmitter' {} \;
```

- [ ] **Step 4: Delete the replaced files**

```bash
git rm ios/CashfreePgApi.m ios/CashfreeEventEmitter.m ios/CashfreeEventEmitter.swift
```

- [ ] **Step 5: Build on the new architecture**

```bash
cd sampleApps/NewArchSample
env -u GEM_PATH -u GEM_HOME -u RUBYOPT -u BUNDLE_GEMFILE -u RUBYLIB \
  RCT_NEW_ARCH_ENABLED=1 /opt/homebrew/bin/pod install --project-directory=ios
xcodebuild -workspace ios/NewArchSample.xcworkspace -scheme NewArchSample \
  -configuration Debug -sdk iphonesimulator -derivedDataPath /tmp/dd-newarch \
  build > /tmp/ios-newarch.log 2>&1; echo "exit=$?"
tail -30 /tmp/ios-newarch.log
```

Expected: exit 0.

- [ ] **Step 6: Build on the legacy architecture**

```bash
cd sampleApps/OldArchSample
env -u GEM_PATH -u GEM_HOME -u RUBYOPT -u BUNDLE_GEMFILE -u RUBYLIB \
  /opt/homebrew/bin/pod install --project-directory=ios
xcodebuild -workspace ios/CashfreePgApiExample.xcworkspace -scheme CashfreePgApiExample \
  -configuration Debug -sdk iphonesimulator -derivedDataPath /tmp/dd-oldarch \
  build > /tmp/ios-oldarch.log 2>&1; echo "exit=$?"
tail -30 /tmp/ios-oldarch.log
```

Expected: exit 0. This is the "both architectures" proof for iOS.

- [ ] **Step 7: Verify WebKit is still linked**

The podspec changed, and a missing WebKit link is a hard crash at the first payment screen.

```bash
otool -L /tmp/dd-newarch/Build/Products/Debug-iphonesimulator/NewArchSample.app/NewArchSample \
  | grep -c WebKit
```

Expected: 2 or more. If 0, `s.frameworks = "WebKit"` was lost from the podspec — restore it.

- [ ] **Step 8: Commit**

```bash
git add ios/CashfreePgApiAdapter.h ios/CashfreePgApiAdapter.mm ios/CashfreeEmitter.swift
git commit -m "feat(ios): add TurboModule adapter and fold in the event emitter

The separate CashfreeEventEmitter legacy module is removed; the adapter
is now the RCTEventEmitter, which is what removes the strict-mode crash."
```

---

### Task 4: Android spec class and package registration

**Files:**
- Modify: `android/src/main/java/com/reactnativecashfreepgsdk/CashfreePgApiModule.java`, `android/src/main/java/com/reactnativecashfreepgsdk/CashfreePgApiPackage.java`

**Interfaces:**
- Consumes: generated `com.reactnativecashfreepgsdk.NativeCashfreePgApiSpec` from Task 2.
- Produces: `CashfreePgApiModule.NAME` (a `public static final String` equal to `"CashfreePgApi"`), used by `CashfreePgApiPackage`.

- [ ] **Step 1: Extend the generated spec**

In `CashfreePgApiModule.java`, change the class declaration and add the name constant:

```java
public class CashfreePgApiModule extends NativeCashfreePgApiSpec
    implements CFCheckoutResponseCallback, CFEventsSubscriber, CFSubscriptionResponseCallback {

  public static final String NAME = "CashfreePgApi";

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }
```

Remove the old `extends ReactContextBaseJavaModule` and any existing `getName()` returning a string literal. Add `@Override` to every method the spec declares — the compiler will name any that are missing or mis-signed.

**You must implement every abstract method the generated spec declares.** Unlike an
Objective-C protocol, an unimplemented Java abstract method is a hard compile error, not a
warning. The spec declares three the module does not currently satisfy:
`getInstalledUpiApps(Promise)`, `addListener(String)` and `removeListeners(double)`. Step 1b
below covers all three.

- [ ] **Step 1b: Implement the three remaining abstract methods**

Replace the existing `getInstalledUpiApps(Callback cb)` with the `Promise` form. The body is
unchanged apart from how the result is delivered — same intent query, same JSON shape, same log
line. Do not alter the UPI resolution logic.

```java
  @Override
  public void getInstalledUpiApps(Promise promise) {
    Activity activity = getReactApplicationContext().getCurrentActivity();
    final Intent intent = new Intent();
    intent.setAction(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("upi://pay"));
    PackageManager pm = activity.getPackageManager();
    final List<ResolveInfo> resInfo = pm.queryIntentActivities(intent, 0);
    JSONArray packageNames = new JSONArray();
    try {
      for (ResolveInfo info : resInfo) {
        JSONObject appInfo = new JSONObject();
        String appName = (String) activity.getPackageManager().getApplicationLabel(info.activityInfo.applicationInfo);
        appInfo.put("appName", appName);
        appInfo.put("appPackage", info.activityInfo.packageName);
        packageNames.put(appInfo);
      }
    } catch (Exception ex) {
      ex.printStackTrace();
    }
    Log.d("CashfreePgApiModule", "getInstalledUpiApps::--" + packageNames);
    promise.resolve(packageNames.toString());
  }
```

Note this resolves with the JSON string even when the list is empty, exactly as the `Callback`
version invoked with an empty array. The JS layer already treats an empty result as a rejection
(`src/index.ts`), so behaviour is preserved. Do not add a `promise.reject` path — that would be
a behaviour change, and behaviour changes belong to a later PR.

Then add the two event-subscription methods the spec requires. They are deliberately empty:
Android delivers events through `RCTDeviceEventEmitter`, which needs no per-module
bookkeeping. They exist to satisfy `NativeEventEmitter`'s contract on the JS side.

```java
  @Override
  public void addListener(String eventName) {
    // Required by the generated spec / NativeEventEmitter contract. Events are
    // delivered via RCTDeviceEventEmitter, so there is nothing to register here.
  }

  @Override
  public void removeListeners(double count) {
    // Required by the generated spec. `double` is what codegen emits for a JS number.
  }
```

Add `import com.facebook.react.bridge.Promise;` and remove the now-unused `Callback` import.

- [ ] **Step 2: Switch the event emitter**

Find the three emit sites using `RCTNativeAppEventEmitter` (around lines 470, 486 and 506) and change each to `RCTDeviceEventEmitter`, so both platforms share one path. Replace the import:

```java
import com.facebook.react.modules.core.DeviceEventManagerModule;
```

and each emit call:

```java
getReactApplicationContext()
    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
    .emit(eventName, params);
```

Keep the event names and the payload construction exactly as they are.

- [ ] **Step 3: Replace the deprecated Activity accessor**

Replace every `getCurrentActivity()` call with:

```java
Activity activity = getReactApplicationContext().getCurrentActivity();
```

Do not change the surrounding null handling. The `throw new IllegalStateException(...)` inside the `catch (CFException ...)` blocks stays exactly as written — fixing it is PR 2, not this one.

- [ ] **Step 4: Convert the package to TurboReactPackage**

Replace `CashfreePgApiPackage.java` entirely:

```java
package com.reactnativecashfreepgsdk;

import androidx.annotation.Nullable;

import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

public class CashfreePgApiPackage extends TurboReactPackage {

  @Nullable
  @Override
  public NativeModule getModule(String name, ReactApplicationContext reactContext) {
    if (CashfreePgApiModule.NAME.equals(name)) {
      return new CashfreePgApiModule(reactContext);
    }
    return null;
  }

  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    return () -> {
      Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
      moduleInfos.put(
          CashfreePgApiModule.NAME,
          new ReactModuleInfo(
              CashfreePgApiModule.NAME, // name
              CashfreePgApiModule.NAME, // className
              false, // canOverrideExistingModule
              false, // needsEagerInit
              false, // isCxxModule
              true // isTurboModule
              ));
      return moduleInfos;
    };
  }
}
```

The six-argument constructor is the primary form from React Native 0.73 onward and is not deprecated. Do not use the seven-argument form that takes `hasConstants` — it exists but is deprecated.

- [ ] **Step 5: Build on the new architecture**

```bash
cd sampleApps/NewArchSample/android
./gradlew assembleDebug > /tmp/android-newarch.log 2>&1; echo "exit=$?"
grep -E "error:|FAILURE" /tmp/android-newarch.log | head -20
```

Expected: exit 0.

- [ ] **Step 6: Build on the legacy architecture**

```bash
cd sampleApps/OldArchSample/android
./gradlew assembleDebug > /tmp/android-oldarch.log 2>&1; echo "exit=$?"
grep -E "error:|FAILURE" /tmp/android-oldarch.log | head -20
```

Expected: exit 0. This is the "both architectures" proof for Android.

- [ ] **Step 7: Commit**

```bash
git add android/src/main/java/com/reactnativecashfreepgsdk/
git commit -m "feat(android): extend generated spec and register via TurboReactPackage"
```

---

### Task 5: JS layer consumes the spec

**Files:**
- Modify: `src/index.ts`
- Test: `src/__tests__/index.test.ts`

**Interfaces:**
- Consumes: the default export of `src/NativeCashfreePgApi.ts` from Task 2.
- Produces: `CFPaymentGatewayService` with an unchanged public surface.

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/index.test.ts`:

```ts
describe('makePayment routing', () => {
  const nativeMock = {
    doElementUPIPayment: jest.fn(),
    doCardPayment: jest.fn(),
    doElementNBPayment: jest.fn(),
    setCallback: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.doMock('../NativeCashfreePgApi', () => ({
      __esModule: true,
      default: nativeMock,
    }));
  });

  it('routes a UPI payment to doElementUPIPayment', () => {
    const { CFPaymentGatewayService } = require('../index');
    const { CFUPIPayment, CFUPI, UPIMode, CFSession, CFEnvironment } =
      require('cashfree-pg-api-contract');

    // CFSession(sessionID, orderID, environment) -> fields payment_session_id, orderID, environment
    const session = new CFSession('token', 'order_1', CFEnvironment.SANDBOX);
    const payment = new CFUPIPayment(session, new CFUPI(UPIMode.INTENT, 'tez://'));

    CFPaymentGatewayService.makePayment(payment);

    expect(nativeMock.doElementUPIPayment).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(nativeMock.doElementUPIPayment.mock.calls[0][0]);
    expect(sent.session.orderID).toBe('order_1');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
yarn test src/__tests__/index.test.ts -t 'makePayment routing'
```

Expected: FAIL — `src/index.ts` reads `NativeModules.CashfreePgApi`, which the mock does not replace.

- [ ] **Step 3: Consume the spec**

In `src/index.ts`, delete the `LINKING_ERROR` constant and the entire `CashfreePgApi` proxy block (lines 23-38), and replace the imports at the top:

```ts
import {
  EmitterSubscription,
  NativeEventEmitter,
} from 'react-native';
import CashfreePgApi from './NativeCashfreePgApi';
```

`Platform` and `NativeModules` and `NativeAppEventEmitter` are no longer used — remove them from the import if nothing else references them.

- [ ] **Step 4: Collapse to one emitter**

Replace the constructor body:

```ts
  constructor() {
    this.emitter = new NativeEventEmitter(CashfreePgApi as any);
  }
```

and narrow the field declaration:

```ts
  private emitter: NativeEventEmitter;
```

Both platforms now deliver through the same path: `RCTDeviceEventEmitter` on Android (Task 4) and `RCTEventEmitter` on iOS (Task 3).

- [ ] **Step 4b: Simplify `getInstalledUpiApps` — forced by the typed spec**

The spec declares `getInstalledUpiApps(): Promise<string>`, so the existing call passing a
callback (`CashfreePgApi.getInstalledUpiApps((apps: string) => {...})`) is a compile error the
moment the spec replaces `NativeModules`. This cannot be deferred.

Replace the whole method (currently `src/index.ts:79-105`) with:

```ts
  async getInstalledUpiApps(): Promise<string> {
    return CashfreePgApi.getInstalledUpiApps();
  }
```

Delete the `upiAppsSubscription` field declaration and every assignment to it — the `cfUpiApps`
listener it managed is gone, since both platforms now answer through the promise.

Leave `cfUpiApps` in the native `supportedEvents` lists. Removing it is a native change and is
not this task.

Note the behaviour difference this removes: the old code rejected with `'No UPI apps found'`
when the payload was empty. The native side now resolves with an empty JSON array in that case,
so callers receive `"[]"` instead of a rejection. Record this in your report — it is a real
behaviour change, forced by unifying two divergent platform signatures, and it must appear in
the 3.0.0 migration notes.

- [ ] **Step 4c: Add a test for it**

Append to `src/__tests__/index.test.ts`:

```ts
describe('getInstalledUpiApps', () => {
  it('resolves with the native payload', async () => {
    jest.resetModules();
    jest.doMock('../NativeCashfreePgApi', () => ({
      __esModule: true,
      default: {
        getInstalledUpiApps: jest.fn().mockResolvedValue('["tez://","phonepe://"]'),
        setCallback: jest.fn(),
        addListener: jest.fn(),
        removeListeners: jest.fn(),
      },
    }));
    const { CFPaymentGatewayService } = require('../index');
    await expect(CFPaymentGatewayService.getInstalledUpiApps()).resolves.toBe(
      '["tez://","phonepe://"]'
    );
  });
});
```

- [ ] **Step 5: Run the test and confirm it passes**

```bash
yarn test
```

Expected: PASS, all tests.

- [ ] **Step 6: Type-check and lint**

```bash
yarn typescript && yarn lint
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/index.ts src/__tests__/index.test.ts
git commit -m "feat: consume the codegen spec from JS and unify the event emitter

Removes the LINKING_ERROR proxy, whose message also named the wrong
package, and the Platform branch on the emitter."
```

---

### Task 6: iOS `getInstalledUpiApps` promise support

Android was converted in Task 4 (Java abstract methods forced it) and the JS layer in Task 5
(the typed spec forced it). What remains is the iOS native half: the Swift implementation
answers by emitting a `cfUpiApps` event and returns nothing, so there is no value for the
adapter to resolve a promise with.

**Files:**
- Modify: `ios/CashfreePgApi.swift` (one additive method), `ios/CashfreePgApiAdapter.mm`

**Interfaces:**
- Consumes: the adapter and `CashfreeEmitter` from Task 3; the JS caller from Task 5.
- Produces: the adapter's conformance to `NativeCashfreePgApiSpec` becomes complete, closing the
  expected `-Wprotocol` warning from Task 3.

- [ ] **Step 1: Add the Swift completion method**

In `ios/CashfreePgApi.swift`, leave the existing `getInstalledUpiApps()` untouched and add
beside it:

```swift
    @objc public func getInstalledUpiApps(_ completion: @escaping (NSString?) -> Void) {
        let apps = CFPaymentGatewayService.getInstance().getInstalledUPIApps()
        completion(self.stringify(json: apps) as NSString)
    }
```

If `getInstalledUPIApps()` is not the accessor the existing method uses, mirror exactly what the
existing `getInstalledUpiApps()` body does to obtain the list, and pass that same value to
`completion` instead of emitting it. Do not change the existing method.

- [ ] **Step 2: Forward it in the adapter**

Add to `ios/CashfreePgApiAdapter.mm`, before the `#ifdef RCT_NEW_ARCH_ENABLED` block:

```objc
RCT_EXPORT_METHOD(getInstalledUpiApps:(RCTPromiseResolveBlock)resolve
                              reject:(RCTPromiseRejectBlock)reject)
{
  [_impl getInstalledUpiApps:^(NSString *apps) {
    resolve(apps ?: @"[]");
  }];
}
```

Resolve with `"[]"` rather than rejecting when there is nothing, matching what Android does and
what Task 5's JS layer now expects. Do not add a reject path.

- [ ] **Step 3: Build on the new architecture**

```bash
cd sampleApps/NewArchSample
env -u GEM_PATH -u GEM_HOME -u RUBYOPT -u BUNDLE_GEMFILE -u RUBYLIB \
  RCT_NEW_ARCH_ENABLED=1 /opt/homebrew/bin/pod install --project-directory=ios
xcodebuild -workspace ios/NewArchSample.xcworkspace -scheme NewArchSample \
  -configuration Debug -sdk iphonesimulator -derivedDataPath /tmp/dd-t6-new \
  build > /tmp/ios-t6-new.log 2>&1; echo "exit=$?"
grep -c ": error:" /tmp/ios-t6-new.log
```

Expected: exit 0. Also expected: the `-Wprotocol` incomplete-conformance warning from Task 3 is
now GONE. Confirm that explicitly:

```bash
grep -cE "warning:.*(incomplete implementation|does not conform|method in protocol)" /tmp/ios-t6-new.log
```

Expected: 0.

Do NOT grep for the bare string `Wprotocol` — it appears as a compiler *flag* on every clang
invocation line, so the count is in the thousands regardless of diagnostics. Match the warning
text, not the flag.

- [ ] **Step 4: Build on the legacy architecture**

```bash
cd sampleApps/OldArchSample
env -u GEM_PATH -u GEM_HOME -u RUBYOPT -u BUNDLE_GEMFILE -u RUBYLIB \
  /opt/homebrew/bin/pod install --project-directory=ios
xcodebuild -workspace ios/CashfreePgApiExample.xcworkspace -scheme CashfreePgApiExample \
  -configuration Debug -sdk iphonesimulator -derivedDataPath /tmp/dd-t6-old \
  build > /tmp/ios-t6-old.log 2>&1; echo "exit=$?"
grep -c ": error:" /tmp/ios-t6-old.log
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add ios/CashfreePgApi.swift ios/CashfreePgApiAdapter.mm
git commit -m "feat(ios): resolve getInstalledUpiApps through a promise

Completes the adapter's conformance to the generated spec. Android and the
JS layer were converted in Tasks 4 and 5."
```

---

### Task 7: Strict-mode acceptance gate

This is the task that distinguishes the migration from what already worked. Everything before it merely preserved behaviour.

**Files:**
- Modify: `sampleApps/NewArchSample/android/app/src/main/java/com/newarchsample/MainApplication.kt`, `sampleApps/NewArchSample/ios/NewArchSample/AppDelegate.mm`
- Modify: `sampleApps/README.md`

**Interfaces:**
- Consumes: everything from Tasks 3-6.
- Produces: a reproducible strict-mode switch documented for future regression runs.

- [ ] **Step 1: Add the Android strict-mode switch**

In `MainApplication.kt`, inside `onCreate()` before `super.onCreate()`:

```kotlin
    if (BuildConfig.DISABLE_LEGACY_INTEROP) {
      ReactNativeFeatureFlags.dangerouslyForceOverride(
          object : ReactNativeNewArchitectureFeatureFlagsDefaults() {
            override fun useTurboModuleInterop(): Boolean = false
          })
    }
```

And in `android/app/build.gradle`, inside `defaultConfig`:

```groovy
        buildConfigField "boolean", "DISABLE_LEGACY_INTEROP",
            (project.hasProperty("disableLegacyInterop") ? "true" : "false")
```

Note the base class: `ReactNativeNewArchitectureFeatureFlagsDefaults`, not `ReactNativeFeatureFlagsDefaults`. The latter defaults `useTurboModuleInterop` to `false`, which would disable interop unconditionally and make the control run meaningless.

- [ ] **Step 2: Add the iOS strict-mode switch**

In `AppDelegate.mm`, at the top of `application:didFinishLaunchingWithOptions:`:

```objc
#import <React/RCTTurboModuleManager.h>

  if ([[NSProcessInfo processInfo].arguments containsObject:@"-DisableLegacyInterop"]) {
    RCTEnableTurboModuleInterop(NO);
  }
```

- [ ] **Step 3: Run the Android strict-mode gate**

```bash
cd sampleApps/NewArchSample/android
./gradlew assembleRelease -PdisableLegacyInterop > /tmp/strict-android.log 2>&1; echo "exit=$?"
adb uninstall com.newarchsample 2>/dev/null
adb install app/build/outputs/apk/release/app-release.apk
adb logcat -c && adb shell am start -n com.newarchsample/.MainActivity
```

Drive a UPI Intent payment against the Cashfree UPI Simulator (`com.cashfree.cashfreetestupi`).

```bash
adb logcat -d | grep -E "onVerify|cfSuccess|CashfreePgApiModule|doesn't seem to be linked"
```

Expected: the payment completes and `onVerify` fires. Expected absent: any "doesn't seem to be linked" message.

Use a release build. In debug, Metro reloads when the UPI app takes the foreground and wipes the listeners, which looks like a lost callback but is not one.

- [ ] **Step 4: Run the iOS strict-mode gate**

```bash
cd sampleApps/NewArchSample
xcrun simctl boot "iPhone 16 Pro" 2>/dev/null
xcodebuild -workspace ios/NewArchSample.xcworkspace -scheme NewArchSample \
  -configuration Release -sdk iphonesimulator -derivedDataPath /tmp/dd-strict \
  build > /tmp/strict-ios.log 2>&1; echo "exit=$?"
xcrun simctl install booted /tmp/dd-strict/Build/Products/Release-iphonesimulator/NewArchSample.app
xcrun simctl launch --console booted org.reactjs.native.example.NewArchSample -DisableLegacyInterop
```

Expected: the app launches and reaches the payment screen without `NSInvalidArgumentException` from `NativeEventEmitter`. That crash is the pre-migration failure; its absence is the result being verified.

- [ ] **Step 5: Confirm the legacy architecture is untouched**

```bash
cd sampleApps/OldArchSample
npm run android
```

Drive the same UPI Intent flow. Expected: it behaves exactly as before the migration, with no merchant-side code change.

- [ ] **Step 6: Record the results**

Update the findings table in `sampleApps/README.md` with a strict-mode column, and note the two switches and how to pass them.

- [ ] **Step 7: Commit**

```bash
git add sampleApps/
git commit -m "test: add strict-mode interop switches and record acceptance results"
```

---

### Task 8: Packaging and release preparation

**Files:**
- Modify: `package.json`, `CLAUDE.md`, `README.md`
- Create: `docs/MIGRATION-3.0.md`

**Interfaces:**
- Consumes: the finished migration.
- Produces: a publishable 3.0.0 tarball.

- [ ] **Step 1: Verify the tarball**

```bash
npm pack --dry-run 2>&1 | grep -E "NativeCashfreePgApi|CashfreePgApiAdapter|lib/|index\.js"
```

Expected present: `src/NativeCashfreePgApi.ts`, `ios/CashfreePgApiAdapter.h`, `ios/CashfreePgApiAdapter.mm`, `lib/commonjs/index.js`.
Expected absent: `src/index.js` and the other deleted twins.

- [ ] **Step 2: Install the tarball into a clean app**

```bash
npm pack
cd /tmp && npx --yes @react-native-community/cli init TarballCheck --skip-install
cd /tmp/TarballCheck && npm install
npm install /Users/kishankumarmaurya/Development/ReactNative/RN_PG_APP/react-native-cashfree-pg-sdk/react-native-cashfree-pg-sdk-3.0.0.tgz
env -u GEM_PATH -u GEM_HOME -u RUBYOPT -u BUNDLE_GEMFILE -u RUBYLIB \
  /opt/homebrew/bin/pod install --project-directory=ios
```

Expected: `pod install` completes, and `RNCashfreePgApiSpec` appears in the generated pods. This catches a missing `files` entry, which a local symlink install would hide.

- [ ] **Step 3: Write the migration note**

Create `docs/MIGRATION-3.0.md`:

```markdown
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

## If you were relying on undocumented behaviour

- Android events moved from `NativeAppEventEmitter` to `RCTDeviceEventEmitter`.
  If you added listeners directly rather than through `setCallback`, move them
  to `setCallback`.
- `NativeModules.CashfreeEventEmitter` no longer exists on iOS. The one module
  `CashfreePgApi` now emits every event.

## Staying on 2.4.x

2.4.x remains available for apps below React Native 0.73.

## Unrelated but important

`onVerify` firing is not proof that a payment succeeded. Confirm every payment
server-side with `GET /pg/orders/{order_id}` and fulfil only on
`order_status: PAID`. This is true in every version, including 2.4.x.
```

- [ ] **Step 4: Update the repository docs**

In `CLAUDE.md`, change the architecture section to describe the codegen spec, the Android generated base class and the iOS adapter, and record the RN 0.73 floor. In `README.md`, add the floor to the installation requirements.

- [ ] **Step 5: Run the full check**

```bash
yarn lint && yarn typescript && yarn test
```

Expected: all three exit 0.

- [ ] **Step 6: Commit**

```bash
git add package.json docs/MIGRATION-3.0.md CLAUDE.md README.md
git commit -m "docs: 3.0.0 migration notes and packaging verification"
```

---

## Verification summary

The migration is done when all of the following hold:

| # | Check | Task |
|---|---|---|
| 1 | Android strict mode: UPI Intent completes, `onVerify` fires | 7 |
| 2 | iOS strict mode: no `NativeEventEmitter` crash, payment screen reached | 7 |
| 3 | Legacy architecture unchanged, no merchant code change | 7 |
| 4 | New architecture at default settings unchanged | 7 |
| 5 | Builds on RN 0.73 and RN 0.87.x | 2 |
| 6 | Android release build with R8 delivers callbacks | 7 |
| 7 | `npm pack` tarball installs and pods resolve in a clean app | 8 |
| 8 | `yarn lint`, `yarn typescript`, `yarn test` pass | 8 |

Checks 1 and 3 together are the deliverable: independence from the interop layer, without abandoning anyone.
