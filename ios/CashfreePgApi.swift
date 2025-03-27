import CashfreePGCoreSDK
import CashfreePGUISDK
import CashfreePG

@objc(CashfreePgApi)
class CashfreePgApi: NSObject {

    var analyticsCallbackEnabled: Bool = false

    override init() {
        super.init()
    }

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc func doPayment(_ paymentObject: NSString) -> Void {
        do {
            let dropObject = try! parseDropPayment(paymentObject: "\(paymentObject)")
            if (dropObject != nil) {
                let vc = RCTPresentedViewController()
                try CFPaymentGatewayService.getInstance().doPayment(dropObject!, viewController: vc!)
            }
        }
        catch {
            print (error)
        }
    }

    @objc func doUPIPayment(_ paymentObject: NSString) -> Void {
            do {
                let upiObject = try! parseUPIPayment(paymentObject: "\(paymentObject)")
                if (upiObject != nil) {
                    let vc = RCTPresentedViewController()
                    try CFPaymentGatewayService.getInstance().doPayment(upiObject!, viewController: vc!)
                }
            }
            catch {
                print (error)
            }
        }

    @objc func doWebPayment(_ paymentObject: NSString) -> Void {
        do {
            if let sessionObj = try parseWebPayment(paymentObject: "\(paymentObject)") {
                let cfPaymentObject = try! CFWebCheckoutPayment.CFWebCheckoutPaymentBuilder()
                    .setSession(sessionObj)
                    .build()
                if let vc = RCTPresentedViewController() {
                    try CFPaymentGatewayService.getInstance().doPayment(cfPaymentObject, viewController: vc)
                }
            }
        }
        catch {
            print (error)
        }
    }

    @objc func doCardPayment(_ paymentObject: NSString) -> Void {
        do {
            if let cfCardPayment = try parseCardObject(paymentObject: "\(paymentObject)") {
                if let vc = RCTPresentedViewController() {
                    try CFPaymentGatewayService.getInstance().doPayment(cfCardPayment, viewController: vc)
                }
            }
        }
        catch {
            print (error)
        }
    }

    @objc func getInstalledUpiApps(){
        let upiApplications = CFUPIUtils().getInstalledUPIApplications()
        var appsToSend: [NSDictionary] = []
        for upi in upiApplications {
            if (upi["id"] ?? "").contains("cred") {
                continue
            }
            appsToSend.append([
                "appPackage": upi["id"] ?? "",
                "appName": upi["displayName"] ?? ""
            ])
        }
        CashfreeEmitter.sharedInstance.dispatch(name: "cfUpiApps", body: stringify(json: appsToSend))
    }

    @objc func doElementUPIPayment(_ paymentObject: NSString) -> Void {
        do {
            if let cfUPIPayment = try parseUpiObject(paymentObject: "\(paymentObject)") {
                if let vc = RCTPresentedViewController() {
                    try CFPaymentGatewayService.getInstance().doPayment(cfUPIPayment, viewController: vc)
                }
            }
        }
        catch {
            print (error)
        }
    }

    @objc func setCallback() -> Void {
        CFPaymentGatewayService.getInstance().setCallback(self)
    }

    @objc func setEventSubscriber() -> Void {
        analyticsCallbackEnabled = true
    }

    @objc func removeEventSubscriber() -> Void {
        analyticsCallbackEnabled = false
    }

    private func parseCardObject(paymentObject: String) throws -> CFCardPayment? {
        let data = paymentObject.data(using: .utf8)!
        if let output = try! JSONSerialization.jsonObject(with: data, options: .allowFragments) as? Dictionary<String, Any> {
            do {
                let finalSession = getSession(paymentObject: output)
                if let cfCard = getCard(paymentObject: output){
                    let savePaymentMethod = isForSavePayment(paymentObject: output)
                    print(savePaymentMethod)
                    
                    let cardPayment = try CFCardPayment.CFCardPaymentBuilder()
                        .setCard(cfCard)
                        .setSession(finalSession!)
                        .saveInstrument(savePaymentMethod)
                        .build()
                    
                    let systemVersion = UIDevice.current.systemVersion

                    cardPayment.setPlatform("irnx-e-2.2.1-x-m-s-x-i-\(systemVersion.prefix(4))")
                    
                    return cardPayment
                }
                return nil
            } catch let e {
                let error = e as! CashfreeError
                print(error.localizedDescription)
            }
        }
        return nil
    }

    private func parseUpiObject(paymentObject: String) throws -> CFUPIPayment? {
        let data = paymentObject.data(using: .utf8)!
        if let output = try! JSONSerialization.jsonObject(with: data, options: .allowFragments) as? Dictionary<String, Any> {
            do {
                let finalSession = getSession(paymentObject: output)
                let cfUPI = getUpi(paymentObject: output)

                let upiPayment = try CFUPIPayment.CFUPIPaymentBuilder()
                    .setSession(finalSession!)
                    .setUPI(cfUPI!)
                    .build()
                let systemVersion = UIDevice.current.systemVersion
                upiPayment.setPlatform("irnx-e-2.2.1-x-m-s-x-i-\(systemVersion.prefix(4))")

                return upiPayment
            } catch let e {
                let error = e as! CashfreeError
                print(error.localizedDescription)
            }
        }
        return nil
    }

    private func parseDropPayment(paymentObject: String) throws -> CFDropCheckoutPayment? {
        //        print(paymentObject)
        let data = paymentObject.data(using: .utf8)!
        if let output = try! JSONSerialization.jsonObject(with: data, options: .allowFragments) as? Dictionary<String, Any> {
            do {
                let session = getSession(paymentObject: output)
                let component = getComponents(paymentObject: output)
                let theme = getTheme(paymentObject: output)

                let nativePayment = try CFDropCheckoutPayment.CFDropCheckoutPaymentBuilder()
                    .setSession(session!)
                    .setTheme(theme!)
                    .setComponent(component!)
                    .build()
                //                 let systemVersion = UIDevice.current.systemVersion
                //                 nativePayment.setPlatform("irnx-d-" + (((output["version"]) as? String) ?? "") + "-3.3.9-m-s-x-i-\(systemVersion.prefix(4))")
                return nativePayment

            } catch let e {
                let error = e as! CashfreeError
                print(error.localizedDescription)
                // Handle errors here
            }
        }
        return nil
    }

    private func parseUPIPayment(paymentObject: String) throws -> CFDropCheckoutPayment? {
                //        print(paymentObject)
                let data = paymentObject.data(using: .utf8)!
                if let output = try! JSONSerialization.jsonObject(with: data, options: .allowFragments) as? Dictionary<String, Any> {
                    do {
                        let session = getSession(paymentObject: output)
                        let paymentComponents = try CFPaymentComponent.CFPaymentComponentBuilder()
                                            .enableComponents(["upi"])
                                            .build()
                        let theme = getTheme(paymentObject: output)

                        let nativePayment = try CFDropCheckoutPayment.CFDropCheckoutPaymentBuilder()
                            .setSession(session!)
                            .setTheme(theme!)
                            .setComponent(paymentComponents)
                            .build()
                        return nativePayment

                    } catch let e {
                        let error = e as! CashfreeError
                        print(error.localizedDescription)
                        // Handle errors here
                    }
                }
                return nil
            }

    private func parseWebPayment(paymentObject: String) throws -> CFSession? {
        //        print(paymentObject)
        let data = paymentObject.data(using: .utf8)!
        do {
            if let output = try JSONSerialization.jsonObject(with: data, options: .allowFragments) as? Dictionary<String, Any> {
                let paymentObj = ["session":output]
                let session = getSession(paymentObject: paymentObj)
                return session
            }
        } catch let e {
            let error = e as! CashfreeError
            print(error.localizedDescription)
            // Handle errors here
        }
        return nil
    }


    private func getSession(paymentObject: Dictionary<String,Any>) -> CFSession? {
        if let sessionDict = paymentObject["session"] as? Dictionary<String, String> {
            do {
                let builder =  CFSession.CFSessionBuilder()
                    .setOrderID(sessionDict["orderID"] ?? "")
                    .setPaymentSessionId(sessionDict["payment_session_id"] ?? "")
                if (sessionDict["environment"] == "SANDBOX") {
                    builder.setEnvironment(CFENVIRONMENT.SANDBOX)
                } else {
                    builder.setEnvironment(CFENVIRONMENT.PRODUCTION)
                }
                let session = try builder.build()
                return session
            } catch let e {
                let error = e as! CashfreeError
                print(error.localizedDescription)
                // Handle errors here
            }
        }
        return nil
    }

    private func getCard(paymentObject: Dictionary<String,Any>) -> CFCard? {
        let card = paymentObject["card"] as? NSDictionary ?? [:]
            do {
                var cardObject: CFCard!
                if card["instrumentId"] != nil && card["instrumentId"] as? String ?? "" != "" {
                    cardObject = try CFCard.CFCardBuilder()
                        .setCVV(card["cardCvv"] as? String ?? "")
                        .setInstrumentId(card["instrumentId"] as? String ?? "")
                        .build()
                } else {
                    cardObject = try CFCard.CFCardBuilder()
                        .setCVV(card["cardCvv"] as? String ?? "")
                        .setCardNumber(card["cardNumber"] as? String ?? "")
                        .setCardExpiryYear(card["cardExpiryYY"] as? String ?? "")
                        .setCardExpiryMonth(card["cardExpiryMM"] as? String ?? "")
                        .setCardHolderName(card["cardHolderName"] as? String ?? "")
                        .build()
                }
                return cardObject
            } catch let e {
                let error = e as! CashfreeError
                print(error.localizedDescription)
                return nil
            }
    }
    
    private func isForSavePayment(paymentObject: Dictionary<String,Any>) -> Bool {
        let card = paymentObject["card"] as? NSDictionary ?? [:]
        return card["saveCard"] as? Bool ?? false
    }

    private func getUpi(paymentObject: Dictionary<String,Any>) -> CFUPI?{
        if let upi = paymentObject["upi"] as? Dictionary<String, String> {
            do {
                let cfUPI = try CFUPI.CFUPIBuilder()
                    .setChannel(upi["mode"] ?? "" == "COLLECT" ? .COLLECT : .INTENT)
                    .setUPIID(upi["id"] ?? "")
                    .build()
                return cfUPI
            } catch let e {
                let err = e as! CashfreeError
                print(err.localizedDescription)
            }
        }
        return nil
    }

    private func getComponents(paymentObject: Dictionary<String,Any>) -> CFPaymentComponent? {
        if let components = paymentObject["components"] as? Array<String> {
            do {
                var array = ["order-details"]
                components.forEach { item in
                    let component = getItemName(item: item)
                    if (component != nil) {
                        array.append(component!)
                    }
                }
                let paymentComponents = try CFPaymentComponent.CFPaymentComponentBuilder()
                    .enableComponents(array)
                    .build()
                return paymentComponents
            } catch let e {
                let error = e as! CashfreeError
                print(error.localizedDescription)
                // Handle errors here
            }
        }
        return nil
    }

    private func getItemName(item: String) -> String? {
        switch item {
        case "CARD" :
            return "card"
        case "UPI" :
            return "upi"
        case "NB" :
            return "netbanking"
        case "WALLET" :
            return "wallet"
        case "EMI" :
            return "emi"
        case "PAY_LATER" :
            return "paylater"
        default :
            return nil
        }
    }

    private func getTheme(paymentObject: Dictionary<String,Any>) -> CFTheme? {
        if let theme = paymentObject["theme"] as? Dictionary<String, String> {
            do {
                return try CFTheme.CFThemeBuilder()
                    .setNavigationBarBackgroundColor(theme["navigationBarBackgroundColor"]!)
                    .setNavigationBarTextColor(theme["navigationBarTextColor"]!)
                    .setButtonBackgroundColor(theme["buttonBackgroundColor"]!)
                    .setButtonTextColor(theme["buttonTextColor"]!)
                    .setPrimaryTextColor(theme["primaryTextColor"]!)
                    .setSecondaryTextColor(theme["secondaryTextColor"]!)
                    .build()
            } catch let e {
                let error = e as! CashfreeError
                print(error.localizedDescription)
                // Handle errors here
            }
            //            return CFTheme.CFThemeBuilder().build()
            //                .setNavigationBarBackgroundColor(theme["navigationBarBackgroundColor"] ?? "")
        }
        return nil
    }

    func stringify(json: Any) -> String {
        var options: JSONSerialization.WritingOptions = []
        do {
            let data = try JSONSerialization.data(withJSONObject: json, options: options)
            if let string = String(data: data, encoding: String.Encoding.utf8) {
                return string
            }
        } catch {
            print(error)
        }

        return ""
    }
}

extension CashfreePgApi: CFResponseDelegate {
    func onError(_ error: CFErrorResponse, order_id: String) {
        print(error.message)
        let data : [String: String] = ["status": error.status ?? ""
                                       , "message": error.message ?? ""
                                       , "code": error.code ?? ""
                                       , "type": error.type ?? ""]
        var body:[String: String] = ["error": stringify(json: data), "orderID": order_id]
        CashfreeEmitter.sharedInstance.dispatch(name: "cfFailure", body: stringify(json: body))
    }

    func verifyPayment(order_id: String) {
        print(order_id)
        CashfreeEmitter.sharedInstance.dispatch(name: "cfSuccess", body: order_id)
    }

    func receivedEvent(event_name: String, meta_data: Dictionary<String, Any>) {
        if (analyticsCallbackEnabled) {
            print(event_name)
            let data: [String: Any] = ["eventName": event_name
                                       , "meta": meta_data]
            CashfreeEmitter.sharedInstance.dispatch(name: "cfEvent", body: stringify(json: data))
        }
    }
}
