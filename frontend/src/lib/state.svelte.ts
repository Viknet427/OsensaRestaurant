export interface FoodItem {
    id: number;
    name: string;
}

export interface Table {
    id: number;
    foodItems: FoodItem[];
}

const initialTables: Table[] = [
    { id: 1, foodItems: [] },
    { id: 2, foodItems: [] },
    { id: 3, foodItems: [] },
    { id: 4, foodItems: [] },
];

// Make restaurantState a reactive variable so updates to it will get rendered
export const restaurantState = $state({
    tables: initialTables,
    isConnected: false,
});


// Setter function for changing isConnected
export function setConnectionStatus(status: boolean) {
    restaurantState.isConnected = status;
}

// Adds a new ready food item to a specific table in restaurantState.
// If the tableId is not found, the function silently exits.
export function addFoodToTable(tableId: number, foodName: string) {
    const table = restaurantState.tables.find((t) => t.id === tableId);
    if (table) {
        table.foodItems.push({
            id: Date.now(),
            name: foodName,
        });
        console.log(`State updated: Food "${foodName}" added to Table ${tableId}`)
    }
}
