describe('makePayment routing', () => {
  const nativeMock = {
    doElementUPIPayment: jest.fn(),
    doCardPayment: jest.fn(),
    doElementNBPayment: jest.fn(),
    setCallback: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.doMock('../NativeCashfreePgApi', () => ({
      __esModule: true,
      default: nativeMock,
    }));
  });

  it('routes a UPI payment to doElementUPIPayment', () => {
    const { CFPaymentGatewayService } = require('../index');
    const { CFUPIPayment, CFUPI, UPIMode, CFSession, CFEnvironment } =
      require('cashfree-pg-api-contract');

    // CFSession(sessionID, orderID, environment) -> fields payment_session_id, orderID, environment
    const session = new CFSession('token', 'order_1', CFEnvironment.SANDBOX);
    const payment = new CFUPIPayment(session, new CFUPI(UPIMode.INTENT, 'tez://'));

    CFPaymentGatewayService.makePayment(payment);

    expect(nativeMock.doElementUPIPayment).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(nativeMock.doElementUPIPayment.mock.calls[0][0]);
    expect(sent.session.orderID).toBe('order_1');
  });
});

describe('getInstalledUpiApps', () => {
  it('resolves with the native payload', async () => {
    jest.resetModules();
    jest.doMock('../NativeCashfreePgApi', () => ({
      __esModule: true,
      default: {
        getInstalledUpiApps: jest.fn().mockResolvedValue('["tez://","phonepe://"]'),
        setCallback: jest.fn(),
        addListener: jest.fn(),
        removeListeners: jest.fn(),
      },
    }));
    const { CFPaymentGatewayService } = require('../index');
    await expect(CFPaymentGatewayService.getInstalledUpiApps()).resolves.toBe(
      '["tez://","phonepe://"]'
    );
  });
});

describe('package entry resolution', () => {
  it('resolves to the TypeScript source, not a compiled twin', () => {
    expect(require.resolve('../index')).toMatch(/src\/index\.ts$/);
  });

  it('has no compiled .js twin shadowing a .ts source', () => {
    const fs = require('fs');
    const path = require('path');
    const twins = [
      'index.js',
      path.join('Card', 'index.js'),
      path.join('Card', 'CFCardComponent.js'),
      path.join('Card', 'CFSubsCardComponent.js'),
    ];
    const present = twins.filter((t) =>
      fs.existsSync(path.join(__dirname, '..', t))
    );
    expect(present).toEqual([]);
  });
});
