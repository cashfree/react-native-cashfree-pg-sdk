import {
  EmitterSubscription,
  EventEmitter,
  NativeAppEventEmitter,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import { version } from '../package.json';
import type { CheckoutPayment } from 'cashfree-pg-api-contract';

const LINKING_ERROR =
  `The package 'react-native-cashfree-pg-api' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

const CashfreePgApi = NativeModules.CashfreePgApi
  ? NativeModules.CashfreePgApi
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

class CFPaymentGateway {
  private emitter: EventEmitter;
  private successSubscription: EmitterSubscription | null = null;
  private failureSubscription: EmitterSubscription | null = null;

  constructor() {
    this.emitter =
      Platform.OS === 'ios'
        ? new NativeEventEmitter(NativeModules.CashfreeEventEmitter)
        : NativeAppEventEmitter;
  }

  doPayment(checkoutPayment: CheckoutPayment) {
    checkoutPayment.version = version;
    CashfreePgApi.doPayment(JSON.stringify(checkoutPayment));
  }

  setCallback(cfCallback: CFCallback) {
    // this.cfCallback = cfCallback;
    let successFunction = (orderID: string) => {
      console.log('response is : ' + JSON.stringify(orderID));
      cfCallback.onVerify(orderID);
    };
    let failureFunction = (error: string) => {
      console.log('reason: ' + JSON.stringify(error));
      const response = new CFErrorResponse();
      // @ts-ignore
      const message = JSON.parse(error);
      response.fromJSON(message.error);
      // @ts-ignore
      cfCallback.onError(response, message.orderID);
    };
    this.successSubscription = this.emitter.addListener(
      'cfSuccess',
      successFunction
    );
    this.failureSubscription = this.emitter.addListener(
      'cfFailure',
      failureFunction
    );
    CashfreePgApi.setCallback();
  }

  removeCallback() {
    if (
      this.successSubscription !== undefined &&
      this.successSubscription !== null
    ) {
      this.emitter.removeSubscription(this.successSubscription);
      this.successSubscription = null;
    }
    if (
      this.failureSubscription !== undefined &&
      this.failureSubscription !== null
    ) {
      this.emitter.removeSubscription(this.failureSubscription);
      this.failureSubscription = null;
    }
  }
}

export interface CFCallback {
  onVerify(orderID: string): void;

  onError(error: CFErrorResponse, orderID: string): void;
}

export class CFErrorResponse {
  private status: string = 'FAILED';
  private message: string = 'payment has failed';
  private code: string = 'payment_failed';
  private type: string = 'request_failed';

  fromJSON(errorString: string) {
    console.log('errorString :' + errorString);
    const object = JSON.parse(errorString);
    console.log('errorStringObject :' + object);
    this.status = object.status;
    this.message = object.message;
    this.code = object.code;
    this.type = object.type;
  }

  getStatus(): string {
    return this.status;
  }

  getMessage(): string {
    return this.message;
  }

  getCode(): string {
    return this.code;
  }

  getType(): string {
    return this.type;
  }
}

export var CFPaymentGatewayService = new CFPaymentGateway();
