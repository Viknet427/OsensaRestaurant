import { test, expect, beforeEach, vi } from 'vitest';

const mockClient = vi.hoisted(() => {
    return {
        on: vi.fn(),
        subscribe: vi.fn(),
        publish: vi.fn(),
        connect: vi.fn(),
    };
})

let messageHandler: (topic: string, payload: Buffer) => void;

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
        switch (event) {
            case 'connect':
                setTimeout(() => handler(), 0);
                break;
            case 'message':
                messageHandler = handler;
                break;
            default:
                break;
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

test('connectAndSubscribe does nothing when client is initialized', async () => {
    const mqttService = await import('./mqttService');

    mqttService.connectAndSubscribe();
    await vi.advanceTimersByTimeAsync(10);

    mqttService.connectAndSubscribe();
    await vi.advanceTimersByTimeAsync(10);

    expect(mockClient.connect).toHaveBeenCalledTimes(1);
});

test('connectAndSubscribe processes a ready food message', async () => {
    const mqttService = await import('./mqttService');
    const state = await import('./state.svelte');

    mqttService.connectAndSubscribe();
    await vi.advanceTimersByTimeAsync(10);

    const messageTopic = 'osensa/table/3/food';
    const messagePayload = JSON.stringify({ foodName: 'Sushi' });

    const initialTable3 = state.restaurantState.tables.find(t => t.id === 3)!;
    expect(initialTable3.foodItems).toHaveLength(0);

    messageHandler(messageTopic, Buffer.from(messagePayload));

    const updatedTable3 = state.restaurantState.tables.find(t => t.id === 3)!;
    expect(updatedTable3.foodItems).toHaveLength(1)
    expect(updatedTable3.foodItems[0].name).toBe('Sushi');
})

test('connectAndSubscribe does not process invalid ready food message', async () => {
    const mqttService = await import('./mqttService');
    const state = await import('./state.svelte');

    mqttService.connectAndSubscribe();
    await vi.advanceTimersByTimeAsync(10);

    const messageTopic = 'osensa/table/5/food';
    const messagePayload = JSON.stringify({ invalidName: 'Ramen' });

    const initialTable4 = state.restaurantState.tables.find(t => t.id === 4)!;
    expect(initialTable4.foodItems).toHaveLength(0);

    messageHandler(messageTopic, Buffer.from(messagePayload));

    const updatedTable4 = state.restaurantState.tables.find(t => t.id === 4)!;
    expect(updatedTable4.foodItems).toHaveLength(0);

})

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
