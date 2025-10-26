import { test, expect, beforeEach, vi } from 'vitest';
import { restaurantState, addFoodToTable, setConnectionStatus } from "./state.svelte";
import { type Table } from "./state.svelte";

const getInitialState = (): { tables: Table[]; isConnected: boolean} => ({
    tables: [
        { id: 1, foodItems: [] },
        { id: 2, foodItems: [] },
        { id: 3, foodItems: [] },
        { id: 4, foodItems: [] },
    ],
    isConnected: false,
});

beforeEach(() => {
    const initialState = getInitialState();
    restaurantState.tables = initialState.tables;
    restaurantState.isConnected = initialState.isConnected;
    vi.clearAllMocks();
});

test('restaurantState initializes correctly', () => {
    expect(restaurantState.tables).toHaveLength(4);
    expect(restaurantState.isConnected).toBe(false);
});

test('setConnectionStatus updates isConnected flag', () => {
    setConnectionStatus(false);
    expect(restaurantState.isConnected).toBe(false);
    setConnectionStatus(true);
    expect(restaurantState.isConnected).toBe(true);
});

test('addFoodToTable adds food to the correct table', () => {
    const tableIdToTest = 2;
    const foodName = 'Spaghetti';

    let tableTwo = restaurantState.tables.find(t => t.id === tableIdToTest);
    expect(tableTwo!.foodItems).toHaveLength(0);

    addFoodToTable(tableIdToTest, foodName);

    tableTwo = restaurantState.tables.find(t => t.id === tableIdToTest);
    expect(tableTwo!.foodItems).toHaveLength(1);
    expect(tableTwo!.foodItems[0].id).toBeTypeOf('number');
    expect(tableTwo!.foodItems[0].name).toBe(foodName);
});

test('addFoodToTable does nothing for non-existent table', () => {
    const tableIdToTest = 99;
    const foodName = 'Invalid Food';

    const initialTableCount = restaurantState.tables.length;

    addFoodToTable(tableIdToTest, foodName);

    expect(restaurantState.tables.length).toBe(initialTableCount);
})
