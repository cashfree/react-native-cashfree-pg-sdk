package com.newarchsample

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import com.facebook.react.internal.featureflags.ReactNativeNewArchitectureFeatureFlagsDefaults

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    if (BuildConfig.DISABLE_LEGACY_INTEROP) {
      // loadReactNative() -> DefaultNewArchitectureEntryPoint.load() already calls
      // ReactNativeFeatureFlags.override(...) once to turn on Fabric/TurboModules/Bridgeless.
      // A plain override() a second time hard-crashes ("cannot be overridden more than
      // once"), and calling our override BEFORE loadReactNative() hits the same crash from
      // the other direction, because load() unconditionally calls override() too. So this
      // has to be a dangerouslyForceOverride, applied after loadReactNative() has finished
      // installing its own defaults, layering useTurboModuleInterop=false on top before any
      // native module / bridge is actually created (that happens later, in the Activity).
      ReactNativeFeatureFlags.dangerouslyForceOverride(
          object : ReactNativeNewArchitectureFeatureFlagsDefaults() {
            override fun useTurboModuleInterop(): Boolean = false
          })
    }
  }
}
