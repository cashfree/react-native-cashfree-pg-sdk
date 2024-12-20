import {
  EmitterSubscription,
  EventEmitter,
  NativeAppEventEmitter,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import { version } from '../package.json';
import { type CheckoutPayment, type CFSession, CFUPIPayment, CFCardPayment } from 'cashfree-pg-api-contract';
import CFCardComponent from './Card/CFCardComponent';

const LINKING_ERROR =
  `The package 'react-native-cashfree-pg-api' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: '- You have run \'pod install\'\n', default: '' }) +
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
    },
  );

class CFPaymentGateway {
  private emitter: EventEmitter;
  private successSubscription: EmitterSubscription | null = null;
  private failureSubscription: EmitterSubscription | null = null;
  private eventSubscription: EmitterSubscription | null = null;
  private upiAppsSubscription: EmitterSubscription | null = null;

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

  doUPIPayment(checkoutPayment: CheckoutPayment) {
    checkoutPayment.version = version;
    CashfreePgApi.doUPIPayment(JSON.stringify(checkoutPayment));
  }

  doWebPayment(cfSession: CFSession) {
    CashfreePgApi.doWebPayment(JSON.stringify(cfSession));
  }

  /**
   * @deprecated : Instead call makePayment
   */
  doCardPayment(cardPayment: CheckoutPayment) {
    this.makePayment(cardPayment);
  }

  async getInstalledUpiApps() {
    return new Promise((resolve, reject) => {
      if(Platform.OS === 'ios'){
        let fetchUpiList = (apps: string) => {
          console.log(JSON.stringify(apps));
          if (apps) {
            resolve(apps);
          } else {
            reject('No UPI apps found');
          }
        };
        this.upiAppsSubscription = this.emitter.addListener('cfUpiApps', fetchUpiList);
        CashfreePgApi.getInstalledUpiApps()
      }
      else {
        CashfreePgApi.getInstalledUpiApps((apps: string) => {
          if (apps) {
            resolve(apps);
          } else {
            reject('No UPI apps found');
          }
        });
      }
    });
  }

  makePayment(cfPayment: CheckoutPayment) {
    cfPayment.version = version;
    const paymentData = JSON.stringify(cfPayment);
    if (cfPayment instanceof CFUPIPayment) {
      CashfreePgApi.doElementUPIPayment(paymentData);
    } else if (cfPayment instanceof CFCardPayment) {
      CashfreePgApi.doCardPayment(paymentData);
    } else {
      console.log('makePayment::==> Wrong payment object');
    }
  }

  setEventSubscriber(cfEventCallback: CFEventCallback) {
    let eventFunction = (event: string) => {
      console.log(JSON.stringify(event));
      let data = JSON.parse(event);
      cfEventCallback.onReceivedEvent(data.eventName, data.meta);
    };
    this.eventSubscription = this.emitter.addListener('cfEvent', eventFunction);
    CashfreePgApi.setEventSubscriber();
  }

  removeEventSubscriber() {
    if (
      this.eventSubscription !== undefined &&
      this.eventSubscription !== null
    ) {
      this.eventSubscription.remove();
      this.eventSubscription = null;
    }
    CashfreePgApi.removeEventSubscriber();
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
      successFunction,
    );
    this.failureSubscription = this.emitter.addListener(
      'cfFailure',
      failureFunction,
    );
    CashfreePgApi.setCallback();
  }

  removeCallback() {
    if (
      this.successSubscription !== undefined &&
      this.successSubscription !== null
    ) {
      this.successSubscription.remove();
      this.successSubscription = null;
    }
    if (
      this.failureSubscription !== undefined &&
      this.failureSubscription !== null
    ) {
      this.failureSubscription.remove();
      this.failureSubscription = null;
    }
    if (
      this.upiAppsSubscription !== undefined &&
      this.upiAppsSubscription !== null
    ) {
      this.upiAppsSubscription.remove();
      this.upiAppsSubscription = null;
    }
  }
}

export interface CFCallback {
  onVerify(orderID: string): void;

  onError(error: CFErrorResponse, orderID: string): void;
}

export interface CFEventCallback {
  onReceivedEvent(eventName: string, map: Map<string, string>): void;
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

export const CFCard = CFCardComponent
export const CFPaymentGatewayService = new CFPaymentGateway();
