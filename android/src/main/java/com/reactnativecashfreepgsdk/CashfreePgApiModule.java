package com.reactnativecashfreepgapi;

import android.app.Activity;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cashfree.pg.api.CFPaymentGatewayService;
import com.cashfree.pg.cf_analytics.CFAnalyticsService;
import com.cashfree.pg.cf_analytics.CFEventsSubscriber;
import com.cashfree.pg.core.api.CFSession;
import com.cashfree.pg.core.api.base.CFPayment;
import com.cashfree.pg.core.api.callback.CFCheckoutResponseCallback;
import com.cashfree.pg.core.api.card.CFCard;
import com.cashfree.pg.core.api.card.CFCardPayment;
import com.cashfree.pg.core.api.exception.CFException;
import com.cashfree.pg.core.api.utils.CFErrorResponse;
import com.cashfree.pg.core.api.webcheckout.CFWebCheckoutPayment;
import com.cashfree.pg.ui.api.CFDropCheckoutPayment;
import com.cashfree.pg.ui.api.upi.intent.CFUPIIntentCheckoutPayment;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;
import com.cashfree.pg.api.util.DropPaymentParser;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;

@ReactModule(name = CashfreePgApiModule.NAME)
public class CashfreePgApiModule extends ReactContextBaseJavaModule implements CFCheckoutResponseCallback, CFEventsSubscriber {
    public static final String NAME = "CashfreePgApi";

    public CashfreePgApiModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
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
            cfupiIntentCheckoutPayment.setCfSDKFlavour(CFPayment.CFSDKFlavour.DROP);
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
    public void doCardPayment(String data) {
      Log.d("CashfreePgApiModule Card", data);
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
          Log.d("CashfreePgApiModule", "Saved Card");
          card = new CFCard.CFCardBuilder()
            .setInstrumentId(cardObject.getString("instrumentId"))
            .setCVV(cardObject.getString("cardCvv"))
            .build();
        } else {
          Log.d("CashfreePgApiModule", "Normal Card");
          Log.d("CashfreePgApiModule", "Save :: " + saveCard);
          card = new CFCard.CFCardBuilder()
            .setCardNumber(cardObject.getString("cardNumber"))
            .setCardHolderName(cardObject.getString("cardHolderName"))
            .setCardExpiryMonth(cardObject.getString("cardExpiryMM"))
            .setCardExpiryYear(cardObject.getString("cardExpiryYY"))
            .setCVV(cardObject.getString("cardCvv"))
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
            jsonObject.put("orderID", orderID);
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
}
