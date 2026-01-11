//
//  CashfreeEmitter.swift
//  react-native-cashfree-pg-api
//
//  Created by Aabhas Jindal on 14/06/22.
//

class CashfreeEmitter {

    /// Shared Instance.
    public static var sharedInstance = CashfreeEmitter()

    // ReactNativeEventEmitter is instantiated by React Native with the bridge.
    private var eventEmitter: CashfreeEventEmitter!

    private init() {}

    // When React Native instantiates the emitter it is registered here.
    func registerEventEmitter(eventEmitter: CashfreeEventEmitter) {
        self.eventEmitter = eventEmitter
    }

    func dispatch(name: String, body: Any?) {
        eventEmitter.sendEvent(withName: name, body: body)
    }

    /// All Events which must be support by React Native.
    lazy var allEvents: [String] = {
        var allEventNames: [String] = ["cfSuccess", "cfFailure", "cfEvent", "cfUpiApps"]

        // Append all events here

        return allEventNames
    }()

}
