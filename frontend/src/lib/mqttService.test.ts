import { test, expect, beforeEach, vi } from 'vitest';
import { connectAndSubscribe, publishOrder } from "./mqttService";
import { restaurantState, setConnectionStatus } from "./state.svelte";

vi.mock('mqtt', () => {
    const spies = {
        on: vi.fn(),
        subscribe: vi.fn(),
        publish: vi.fn(),
        connect: vi.fn(),
    };

    (globalThis as any).__MQTT_SPIES = spies;

    return {
        default: {
            connect: spies.connect,
        },
    };
});

function getSpies() {
    return (globalThis as any).__MQTT_SPIES;
}

vi.useFakeTimers();

beforeEach(() => {
    const spies = getSpies();

    vi.clearAllMocks();

    spies.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
            setTimeout(() => handler(), 0);
        }
    });

    spies.subscribe.mockImplementation((topic, options, callback) => callback(null));

    spies.connect.mockImplementation(() => ({
        on: spies.on,
        subscribe: spies.subscribe,
        publish: spies.publish,
        end: vi.fn(),
    }));

    setConnectionStatus(false);
    restaurantState.tables.forEach(t => t.foodItems = []);
})

test('connectAndSubscribe initializes client and sets status', async () => {
    const spies = getSpies();

    connectAndSubscribe();

    expect(spies.connect).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10);

    expect(restaurantState.isConnected).toBe(true);

    expect(spies.subscribe).toHaveBeenCalledWith(
        'osensa/table/+/food',
        expect.anything(),
        expect.any(Function),
    );
});

test('publishOrder calls client.publish with correct payload', () => {
    const spies = getSpies();

    connectAndSubscribe();
    setConnectionStatus(true);

    const tableId = 3;
    const foodName = 'Pizza';

    publishOrder(tableId, foodName);

    expect(spies.publish).toHaveBeenCalledWith(
        'osensa/orders',
        JSON.stringify({ tableId, foodName }),
        expect.anything(),
        expect.any(Function),
    );
});

test('publishOrder does nothing if not connected', () => {
    const spies = getSpies();

    setConnectionStatus(false);

    publishOrder(1, 'Steak');

    expect(spies.publish).not.toHaveBeenCalled();
});
