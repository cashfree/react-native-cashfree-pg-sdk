package com.reactnativecashfreepgapi;

import com.cashfree.pg.core.api.CFSession;
import com.cashfree.pg.core.api.CFTheme;
import com.cashfree.pg.core.api.exception.CFInvalidArgumentException;
import com.cashfree.pg.ui.api.CFDropCheckoutPayment;
import com.cashfree.pg.ui.api.CFPaymentComponent;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class DropPaymentParser {
  public static CFDropCheckoutPayment getDropCheckoutPayment(String cfPaymentString) throws JSONException, CFInvalidArgumentException {
    JSONObject cfPaymentJson = new JSONObject(cfPaymentString);
    CFSession cfSession = getCFSession(cfPaymentJson.getJSONObject("session"));
    CFTheme cfTheme = getCFTheme(cfPaymentJson.getJSONObject("theme"));
    CFPaymentComponent cfPaymentComponent = getCFComponents(cfPaymentJson.getJSONArray("components"));
    CFDropCheckoutPayment cfDropCheckoutPayment = new CFDropCheckoutPayment
      .CFDropCheckoutPaymentBuilder()
      .setSession(cfSession)
      .setCFUIPaymentModes(cfPaymentComponent)
      .setCFNativeCheckoutUITheme(cfTheme)
      .build();
    String version = cfPaymentJson.getString("version");
    cfDropCheckoutPayment.setPlatform("android-rn-" + version);
    return cfDropCheckoutPayment;
  }

  private static CFPaymentComponent getCFComponents(JSONArray components) throws JSONException {
    CFPaymentComponent.CFPaymentComponentBuilder cfPaymentComponentBuilder = new CFPaymentComponent.CFPaymentComponentBuilder();
    for (int i = 0; i < components.length(); i++) {
      cfPaymentComponentBuilder.add(CFPaymentComponent.CFPaymentModes.valueOf(components.getString(i)));
    }
    return cfPaymentComponentBuilder.build();
  }

  private static CFTheme getCFTheme(JSONObject theme) throws JSONException, CFInvalidArgumentException {
    return new CFTheme.CFThemeBuilder()
      .setNavigationBarBackgroundColor(theme.getString("navigationBarBackgroundColor"))
      .setNavigationBarTextColor(theme.getString("navigationBarTextColor"))
      .setButtonBackgroundColor(theme.getString("buttonBackgroundColor"))
      .setButtonTextColor(theme.getString("buttonTextColor"))
      .setPrimaryTextColor(theme.getString("primaryTextColor"))
      .setSecondaryTextColor(theme.getString("secondaryTextColor"))
      .build();
  }

  private static CFSession getCFSession(JSONObject session) throws JSONException, CFInvalidArgumentException {
    return new CFSession.CFSessionBuilder()
      .setEnvironment(CFSession.Environment.valueOf(session.getString("environment")))
      .setOrderId(session.getString("orderID"))
      .setOrderToken(session.getString("token"))
      .build();
  }
}
