import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "NewArchSample",
      in: window,
      launchOptions: launchOptions
    )

    // Strict-mode acceptance gate (Task 7): RCTRootViewFactory's
    // -initializeReactHostWithLaunchOptions: unconditionally forces
    // RCTEnableTurboModuleInterop(YES) in bridgeless mode, and that call
    // happens synchronously inside startReactNative(...) above. So the
    // override below MUST run AFTER startReactNative returns — applying it
    // beforehand gets silently clobbered back to YES. This mirrors the
    // Android fix (Task 7 brief): the flag has to be forced post-init, not
    // pre-init.
    if ProcessInfo.processInfo.arguments.contains("-DisableLegacyInterop") {
      RCTEnableTurboModuleInterop(false)
      NSLog("[StrictModeGate] RCTEnableTurboModuleInterop(false) applied post-init; RCTTurboModuleInteropEnabled=%@",
            RCTTurboModuleInteropEnabled() ? "YES" : "NO")
    }

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
