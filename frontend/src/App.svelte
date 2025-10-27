<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { restaurantState } from "./lib/state.svelte";
    import { connectAndSubscribe, publishOrder, disconnect } from "./lib/mqttService";

    onMount(() => {
        connectAndSubscribe();
    });

    function handleOrder(tableId: number) {
        if (!restaurantState.isConnected) {
            alert("Cannot place order: MQTT not connected.");
            return;
        }

        const foodName = window.prompt(`Table ${tableId}: What food would you like to order?`);

        if (foodName && foodName.trim() !== ' ') {
            publishOrder(tableId, foodName.trim());
        }
    }

    onDestroy(() => {
        disconnect();
    });
</script>

<main class="restaurant-layout">
    <h1>OSENSA Restaurant</h1>

    <p class="status-indictaor">
        Connection Status:
        <span class="{restaurantState.isConnected ? 'status-connected' : 'status-disconnected'}">
            {restaurantState.isConnected ? '✅ Connected' : '❌ Disconnected'}
        </span>
    </p>

    <div class="tables-container">
        {#each restaurantState.tables as table (table.id)}
            <div class="table-card">
                <h2>Table {table.id}</h2>

                <button
                    onclick={() => handleOrder(table.id)}
                    disabled={!restaurantState.isConnected}
                    class="order-button"
                >
                    ORDER FOOD
                </button>

                <h3>Ready Food:</h3>

                {#if table.foodItems.length === 0}
                    <p class="empty-list">No food ready yet.</p>
                {:else}
                    <ul class="food-list">
                        {#each table.foodItems as food (food.id)}
                            <li>{food.name}</li>
                        {/each}
                    </ul>
                {/if}
            </div>
        {/each}
    </div>
</main>

<style>
    .restaurant-layout { font-family: sans-serif; padding: 20px; }
    .tables-container { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 20px; }
    .table-card {
        border: 1px solid #000808;
        padding: 15px;
        border-radius: 8px;
        width: 200px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        background-color: #454747;
    }
    .status-connected { color: green; }
    .status-disconnected { color: red; }
    .order-button {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
    }
    .order-button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }
    .food-list { list-style: none; padding-left: 0}
    .food-list li {
        background-color: #6b97b0;
        margin: 5px 0;
        padding: 8px;
        border-radius: 4px;
        border-left: 5px solid #007bff;
        font-weight: 500;
    }
    .empty-list { font-style: italic; color: #666}
</style>
