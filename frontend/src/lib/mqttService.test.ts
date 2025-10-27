import { test, expect, beforeEach, vi } from 'vitest';

const mockClient = vi.hoisted(() => {
    return {
        on: vi.fn(),
        subscribe: vi.fn(),
        publish: vi.fn(),
        connect: vi.fn(),
    };
})

// @ts-ignore
vi.mock(import("mqtt"), async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        default: {
            connect: mockClient.connect,
            publish: mockClient.publish,
        },
        on: mockClient.on,
        subscribe: mockClient.subscribe,
    };
})

vi.useFakeTimers();

beforeEach(async () => {
    vi.clearAllMocks();

    vi.resetModules();

    mockClient.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
            setTimeout(() => handler(), 0);
        }
    });

    mockClient.subscribe.mockImplementation((topic, options, callback) => callback(null));

    mockClient.publish.mockImplementation((topic, payload, options, callback) => callback(null));

    mockClient.connect.mockImplementation((BrokerUrl) => {
        return {
            on: mockClient.on,
            subscribe: mockClient.subscribe,
            publish: mockClient.publish,
        };
    });
})

test('connectAndSubscribe initializes client and sets status', async () => {
    const mqttService = await import('./mqttService');
    const state = await import('./state.svelte');

    const restaurantState = state.restaurantState;

    mqttService.connectAndSubscribe();

    expect(mockClient.connect).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10);

    expect(restaurantState.isConnected).toBe(true);

    expect(mockClient.subscribe).toHaveBeenCalledWith(
        'osensa/table/+/food',
        { qos: 2 },
        expect.any(Function),
    );
});

test('publishOrder calls client.publish with correct payload', async () => {
    const mqttService = await import('./mqttService');
    const state = await import('./state.svelte');

    mqttService.connectAndSubscribe();
    state.setConnectionStatus(true);

    const tableId = 3;
    const foodName = 'Pizza';

    mqttService.publishOrder(tableId, foodName);

    expect(mockClient.publish).toHaveBeenCalledWith(
        'osensa/orders',
        JSON.stringify({ tableId, foodName }),
        { qos: 2 },
        expect.any(Function),
    );
});

test('publishOrder does nothing if not connected', async () => {
    const mqttService = await import('./mqttService');
    const state = await import('./state.svelte');

    state.setConnectionStatus(false);

    mqttService.publishOrder(1, 'Steak');

    expect(mockClient.publish).not.toHaveBeenCalled();
});
