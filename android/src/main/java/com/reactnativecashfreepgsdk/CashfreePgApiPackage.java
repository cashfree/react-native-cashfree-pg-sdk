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
