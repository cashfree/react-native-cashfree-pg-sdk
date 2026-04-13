package com.reactnativecashfreepgsdk;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cashfree.pg.api.CFPaymentGatewayService;
import com.cashfree.pg.cf_analytics.CFAnalyticsService;
import com.cashfree.pg.cf_analytics.CFEventsSubscriber;
import com.cashfree.pg.core.api.CFCorePaymentGatewayService;
import com.cashfree.pg.core.api.CFSession;
import com.cashfree.pg.core.api.CFSubscriptionSession;
import com.cashfree.pg.core.api.base.CFPayment;
import com.cashfree.pg.core.api.callback.CFCheckoutResponseCallback;
import com.cashfree.pg.core.api.callback.CFSubscriptionResponseCallback;
import com.cashfree.pg.core.api.card.CFCard;
import com.cashfree.pg.core.api.card.CFCardPayment;
import com.cashfree.pg.core.api.exception.CFException;
import com.cashfree.pg.core.api.subscription.CFSubsPayment;
import com.cashfree.pg.core.api.subscription.CFSubscriptionPayment;
import com.cashfree.pg.core.api.subscription.card.CFSubsCard;
import com.cashfree.pg.core.api.subscription.card.CFSubsCardPayment;
import com.cashfree.pg.core.api.subscription.enach.CFSubsNetBanking;
import com.cashfree.pg.core.api.subscription.enach.CFSubsNetBankingPayment;
import com.cashfree.pg.core.api.subscription.upi.CFSubsUpi;
import com.cashfree.pg.core.api.subscription.upi.CFSubsUpiPayment;
import com.cashfree.pg.core.api.upi.CFUPI;
import com.cashfree.pg.core.api.upi.CFUPIPayment;
import com.cashfree.pg.core.api.utils.CFErrorResponse;
import com.cashfree.pg.core.api.utils.CFSubscriptionResponse;
import com.cashfree.pg.core.api.webcheckout.CFWebCheckoutPayment;
import com.cashfree.pg.ui.api.CFDropCheckoutPayment;
import com.cashfree.pg.ui.api.upi.intent.CFUPIIntentCheckoutPayment;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;
import com.cashfree.pg.api.util.DropPaymentParser;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;
import java.util.Map;

@ReactModule(name = CashfreePgApiModule.NAME)
public class CashfreePgApiModule extends ReactContextBaseJavaModule implements CFCheckoutResponseCallback, CFEventsSubscriber, CFSubscriptionResponseCallback {
  public static final String NAME = "CashfreePgApi";

  // Stored once via setBaseUrl(); reused by card component API calls.
  // NOTE: To propagate baseUrl into CFSession builders the underlying
  // com.cashfree.pg:api SDK also needs CFSession.setBaseUrl() support
  // (already done in the CN branch of android-pg-api-sdk).
  private static String storedBaseUrl = "";

  public CashfreePgApiModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }

  /**
   * Set the base URL once. All card component API requests reuse this value.
   * For full baseUrl propagation into payment sessions, android-pg-api-sdk
   * also needs CFSession.setBaseUrl() support (see android-pg-api-sdk CN branch).
   */
  @ReactMethod
  public void setBaseUrl(String baseUrl) {
    storedBaseUrl = baseUrl;
  }

  @ReactMethod
  public void doPayment(String cfPaymentString) {
    Log.d("CashfreePgApiModule", cfPaymentString);
    try {
      Activity activity = getCurrentActivity();
      CFDropCheckoutPayment cfDropCheckoutPayment = DropPaymentParser.getDropCheckoutPayment(cfPaymentString);
      cfDropCheckoutPayment.setCfsdkFramework(CFPayment.CFSDKFramework.REACT_NATIVE);
      cfDropCheckoutPayment.setCfSDKFlavour(CFPayment.CFSDKFlavour.DROP);
      if (activity != null) {
        CFPaymentGatewayService.getInstance().doPayment(activity, cfDropCheckoutPayment);
      } else {
        throw new IllegalStateException("activity is null");
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  @ReactMethod
  public void doUPIPayment(String cfPaymentString) {
    Log.d("CashfreePgApiModule", cfPaymentString);
    try {
      Activity activity = getCurrentActivity();
      CFUPIIntentCheckoutPayment cfupiIntentCheckoutPayment = DropPaymentParser.getUPICheckoutPayment(cfPaymentString);
      cfupiIntentCheckoutPayment.setCfsdkFramework(CFPayment.CFSDKFramework.REACT_NATIVE);
      cfupiIntentCheckoutPayment.setCfSDKFlavour(CFPayment.CFSDKFlavour.INTENT);
      if (activity != null) {
        CFPaymentGatewayService.getInstance().doPayment(activity, cfupiIntentCheckoutPayment);
      } else {
        throw new IllegalStateException("activity is null");
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  @ReactMethod
  public void doWebPayment(String sessionString) {
    Log.d("CashfreePgApiModule Web", sessionString);
    CFSession cfSession = null;
    try {
      JSONObject jsonObject = new JSONObject(sessionString);
      cfSession = new CFSession.CFSessionBuilder()
        .setEnvironment(CFSession.Environment.valueOf(jsonObject.getString("environment")))
        .setOrderId(jsonObject.getString("orderID"))
        .setPaymentSessionID(jsonObject.getString("payment_session_id"))
        .build();
    } catch (Exception exception) {
      throw new IllegalStateException("Session is invalid");
    }
    try {
      Activity activity = getCurrentActivity();
      CFWebCheckoutPayment cfWebCheckoutPayment = new CFWebCheckoutPayment.CFWebCheckoutPaymentBuilder()
        .setSession(cfSession)
        .build();
      cfWebCheckoutPayment.setCfsdkFramework(CFPayment.CFSDKFramework.REACT_NATIVE);
      cfWebCheckoutPayment.setCfSDKFlavour(CFPayment.CFSDKFlavour.WEB_CHECKOUT);
      if (activity != null) {
        CFPaymentGatewayService.getInstance().doPayment(activity, cfWebCheckoutPayment);
      } else {
        throw new IllegalStateException("activity is null");
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  @ReactMethod
  public void doSubscriptionPayment(String sessionString) {
    CFSubscriptionSession cfSubsSession = null;
    try {
      JSONObject jsonObject = new JSONObject(sessionString);
      cfSubsSession = new CFSubscriptionSession.CFSubscriptionSessionBuilder()
        .setEnvironment(CFSubscriptionSession.Environment.valueOf(jsonObject.getString("environment")))
        .setSubscriptionId(jsonObject.getString("subscription_id"))
        .setSubscriptionSessionID(jsonObject.getString("subscription_session_id"))
        .build();
    } catch (Exception exception) {
      throw new IllegalStateException("Subscription Session is invalid");
    }
    try {
      Activity activity = getCurrentActivity();
      CFSubscriptionPayment cfSubscriptionPayment = new CFSubscriptionPayment.CFSubscriptionCheckoutBuilder()
        .setSubscriptionSession(cfSubsSession)
        .build();
      cfSubscriptionPayment.setCfsdkFramework(CFPayment.CFSDKFramework.REACT_NATIVE);
      cfSubscriptionPayment.setCfSDKFlavour(CFPayment.CFSDKFlavour.SUBSCRIPTION);
      if (activity != null) {
        CFPaymentGatewayService.getInstance().setSubscriptionCheckoutCallback(this);
        CFPaymentGatewayService.getInstance().doSubscriptionPayment(activity, cfSubscriptionPayment);
      } else {
        throw new IllegalStateException("activity is null");
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  @ReactMethod
  public void doCardPayment(String data) {
    CFSession cfSession = null;
    CFCard card = null;
    boolean saveCard;
    try {
      JSONObject jsonObject = new JSONObject(data);
      JSONObject session = jsonObject.getJSONObject("session");
      JSONObject cardObject = jsonObject.getJSONObject("card");
      saveCard = cardObject.optBoolean("saveCard", false);
      cfSession = new CFSession.CFSessionBuilder()
        .setEnvironment(CFSession.Environment.valueOf(session.getString("environment")))
        .setOrderId(session.getString("orderID"))
        .setPaymentSessionID(session.getString("payment_session_id"))
        .build();
      if (cardObject.has("instrumentId")) {
        card = new CFCard.CFCardBuilder()
          .setInstrumentId(cardObject.getString("instrumentId"))
          .setCVV(cardObject.getString("cardCvv"))
          .build();
      } else {
        card = new CFCard.CFCardBuilder()
          .setCardNumber(cardObject.getString("cardNumber"))
          .setCardHolderName(cardObject.getString("cardHolderName"))
          .setCardExpiryMonth(cardObject.getString("cardExpiryMM"))
          .setCardExpiryYear(cardObject.getString("cardExpiryYY"))
          .setCVV(cardObject.getString("cardCvv"))
          .setChannel("post")
          .build();
      }
    } catch (Exception exception) {
      throw new IllegalStateException(exception.getMessage());
    }
    try {
      Activity activity = getCurrentActivity();
      CFCardPayment cardPayment = new CFCardPayment.CFCardPaymentBuilder()
        .setSession(cfSession)
        .setCard(card)
        .setSaveCardDetail(saveCard)
        .build();
      cardPayment.setCfSDKFlow(CFPayment.CFSDKFlow.WITH_CASHFREE_FULLSCREEN_LOADER);
      cardPayment.setCfsdkFramework(CFPayment.CFSDKFramework.REACT_NATIVE);
      cardPayment.setCfSDKFlavour(CFPayment.CFSDKFlavour.ELEMENT);
      if (activity != null) {
        CFPaymentGatewayService.getInstance().doPayment(activity, cardPayment);
      } else {
        throw new IllegalStateException("activity is null");
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  @ReactMethod
  public void getInstalledUpiApps(Callback cb) {
    Activity activity = getCurrentActivity();
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
    cb.invoke(packageNames.toString());
  }

  @ReactMethod
  public void doElementUPIPayment(String upiPaymentData) {
    Log.d("CashfreePgApiModule", upiPaymentData);
    CFSession cfSession = null;
    CFUPI cfupi = null;
    try {
      JSONObject jsonObject = new JSONObject(upiPaymentData);
      JSONObject session = jsonObject.getJSONObject("session");
      JSONObject upiObject = jsonObject.getJSONObject("upi");
      cfSession = new CFSession.CFSessionBuilder()
        .setEnvironment(CFSession.Environment.valueOf(session.getString("environment")))
        .setOrderId(session.getString("orderID"))
        .setPaymentSessionID(session.getString("payment_session_id"))
        .build();
      CFUPI.Mode mode = CFUPI.Mode.valueOf(upiObject.getString("mode"));
      String upiId = upiObject.getString("id");
      cfupi = new CFUPI.CFUPIBuilder()
        .setMode(mode)
        .setUPIID(upiId)
        .build();
    } catch (Exception exception) {
      throw new IllegalStateException(exception.getMessage());
    }
    try {
      CFUPIPayment cfupiPayment = new CFUPIPayment.CFUPIPaymentBuilder()
        .setSession(cfSession)
        .setCfUPI(cfupi)
        .build();
      cfupiPayment.setCfSDKFlow(CFPayment.CFSDKFlow.WITH_CASHFREE_FULLSCREEN_LOADER);
      cfupiPayment.setCfsdkFramework(CFPayment.CFSDKFramework.REACT_NATIVE);
      cfupiPayment.setCfSDKFlavour(CFPayment.CFSDKFlavour.ELEMENT);
      Activity activity = getCurrentActivity();
      if (activity != null) {
        CFCorePaymentGatewayService.getInstance().doPayment(activity, cfupiPayment);
      } else {
        throw new IllegalStateException("activity is null");
      }
    } catch (CFException exception) {
      exception.printStackTrace();
    }
  }

  @ReactMethod
  public void doSubsCardPayment(String data) {
    CFSubscriptionSession cfSubsSession = null;
    CFSubsCard cfSubsCard = null;
    try {
      JSONObject jsonObject = new JSONObject(data);
      JSONObject sessionObject = jsonObject.getJSONObject("session");
      JSONObject cardObject = jsonObject.getJSONObject("card");

      cfSubsSession = new CFSubscriptionSession.CFSubscriptionSessionBuilder()
        .setEnvironment(CFSubscriptionSession.Environment.valueOf(sessionObject.getString("environment")))
        .setSubscriptionId(sessionObject.getString("subscription_id"))
        .setSubscriptionSessionID(sessionObject.getString("subscription_session_id"))
        .build();

      cfSubsCard = new CFSubsCard.CFSubsCardBuilder()
        .setCardNumber(cardObject.getString("cardNumber"))
        .setCardHolderName(cardObject.getString("cardHolderName"))
        .setCardExpiryMonth(cardObject.getString("cardExpiryMM"))
        .setCardExpiryYear(cardObject.getString("cardExpiryYY"))
        .setCVV(cardObject.getString("cardCvv"))
        .setChannel("link")
        .build();

      CFSubsCardPayment subsCardPayment = new CFSubsCardPayment.CFSubsCardPaymentBuilder()
        .setSubscriptionSession(cfSubsSession)
        .setSubsCard(cfSubsCard)
        .build();

      doSubscriptionElementPayment(subsCardPayment);
    } catch (Exception exception) {
      throw new IllegalStateException(exception.getMessage());
    }
  }

  @ReactMethod
  public void doSubsUPIPayment(String data) {
    CFSubscriptionSession cfSubsSession = null;
    CFSubsUpi cfSubsUpi = null;
    try {
      JSONObject jsonObject = new JSONObject(data);
      JSONObject sessionObject = jsonObject.getJSONObject("session");
      JSONObject upiObject = jsonObject.getJSONObject("upi");

      cfSubsSession = new CFSubscriptionSession.CFSubscriptionSessionBuilder()
        .setEnvironment(CFSubscriptionSession.Environment.valueOf(sessionObject.getString("environment")))
        .setSubscriptionId(sessionObject.getString("subscription_id"))
        .setSubscriptionSessionID(sessionObject.getString("subscription_session_id"))
        .build();

      cfSubsUpi = new CFSubsUpi.CFSubsUpiBuilder()
        .setUPIID(upiObject.getString("id"))
        .setMode(CFSubsUpi.Mode.INTENT)
        .build();

      CFSubsUpiPayment subsUpiPayment = new CFSubsUpiPayment.CFSubsUpiPaymentBuilder()
        .setSubscriptionSession(cfSubsSession)
        .setSubsUpi(cfSubsUpi)
        .build();

      doSubscriptionElementPayment(subsUpiPayment);
    } catch (Exception exception) {
      throw new IllegalStateException(exception.getMessage());
    }
  }

  @ReactMethod
  public void doSubsNBPayment(String data) {
    CFSubscriptionSession cfSubsSession = null;
    CFSubsNetBanking cfSubsNetBanking = null;
    try {
      JSONObject jsonObject = new JSONObject(data);
      JSONObject sessionObject = jsonObject.getJSONObject("session");
      JSONObject nbObject = jsonObject.getJSONObject("nb");

      cfSubsSession = new CFSubscriptionSession.CFSubscriptionSessionBuilder()
        .setEnvironment(CFSubscriptionSession.Environment.valueOf(sessionObject.getString("environment")))
        .setSubscriptionId(sessionObject.getString("subscription_id"))
        .setSubscriptionSessionID(sessionObject.getString("subscription_session_id"))
        .build();

      cfSubsNetBanking = new CFSubsNetBanking.CFSubsNetBankingBuilder()
        .setAccountType(nbObject.getString("accountType"))
        .setAccountNumber(nbObject.getString("accountNumber"))
        .setAccountHolderName(nbObject.getString("accountHolderName"))
        .setAccountBankCode(nbObject.getString("accountBankCode"))
        .build();

      CFSubsNetBankingPayment netBankingPayment = new CFSubsNetBankingPayment.CFNetBankingPaymentBuilder()
        .setSubscriptionSession(cfSubsSession)
        .setCfSubsNetBanking(cfSubsNetBanking)
        .build();

      doSubscriptionElementPayment(netBankingPayment);
    } catch (Exception exception) {
      throw new IllegalStateException(exception.getMessage());
    }
  }

  private void doSubscriptionElementPayment(CFSubsPayment subsPayment){
    try {
      Activity activity = getCurrentActivity();
      subsPayment.setCfsdkFramework(CFPayment.CFSDKFramework.REACT_NATIVE);
      subsPayment.setCfSDKFlavour(CFPayment.CFSDKFlavour.SUBSCRIPTION);
      if (activity != null) {
        CFPaymentGatewayService.getInstance().setSubscriptionCheckoutCallback(this);
        CFPaymentGatewayService.getInstance().doSubscriptionPayment(activity, subsPayment);
      } else {
        throw new IllegalStateException("activity is null");
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  @ReactMethod
  public void setCallback() {
    try {
      CFPaymentGatewayService.getInstance().setCheckoutCallback(this);
    } catch (CFException cfException) {
    }
  }

  @ReactMethod
  public void setEventSubscriber() {
    try {
      CFAnalyticsService.getInstance().setSubscriber(this);
    } catch (Exception ignored) {
    }
  }

  @ReactMethod
  public void removeEventSubscriber() {
    try {
      CFAnalyticsService.getInstance().removeSubscriber();
    } catch (Exception ignored) {
    }
  }

  @Override
  public void onPaymentVerify(String orderID) {
    this.getReactApplicationContext()
      .getJSModule(RCTNativeAppEventEmitter.class)
      .emit("cfSuccess", orderID);
  }

  @Override
  public void onPaymentFailure(CFErrorResponse cfErrorResponse, String orderID) {
    JSONObject jsonObject = new JSONObject();
    try {
      jsonObject.put("error", cfErrorResponse.toJSON().toString());
      if (orderID != null && !orderID.isEmpty()) {
        jsonObject.put("orderID", orderID);
      }
    } catch (JSONException e) {
      e.printStackTrace();
    }
    this.getReactApplicationContext()
      .getJSModule(RCTNativeAppEventEmitter.class)
      .emit("cfFailure", jsonObject.toString());
  }

  @Override
  public void receivedEvent(String s, @Nullable Map<String, String> map) {
    JSONObject jsonObject = new JSONObject();
    JSONObject jsonMeta = new JSONObject();
    try {
      if (map != null) {
        for (String key : map.keySet()) {
          jsonMeta.put(key, map.get(key));
        }
      }
      jsonObject.put("eventName", s);
      jsonObject.put("meta", jsonMeta);
    } catch (JSONException e) {
      e.printStackTrace();
    }
    this.getReactApplicationContext()
      .getJSModule(RCTNativeAppEventEmitter.class)
      .emit("cfEvent", jsonObject.toString());
  }

  @Override
  public void onSubscriptionVerify(CFSubscriptionResponse cfSubscriptionResponse) {
    onPaymentVerify(cfSubscriptionResponse.getSubscriptionId());
  }

  @Override
  public void onSubscriptionFailure(CFErrorResponse cfErrorResponse) {
    onPaymentFailure(cfErrorResponse, "");
  }
}
