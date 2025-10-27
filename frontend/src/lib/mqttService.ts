import mqtt from 'mqtt';
import { restaurantState, addFoodToTable, setConnectionStatus } from "./state.svelte";

// Broker and Topics
const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const ORDER_TOPIC = 'osensa/orders';
const FOOD_READY_TOPIC_WILDCARD = 'osensa/table/+/food';

// MQTTClient, initially set to null
let client: mqtt.MqttClient | null = null;

// connectAndSubscribe is responsible for handling the connection to the Broker and for handling
// messages received from the backend.
export function connectAndSubscribe() {
    if (client) return;

    // Attempt to connect to the Broker
    client = mqtt.connect(BROKER_URL);

    // On connect try to subscribe to all the food ready topics
    client.on('connect', () => {
        console.log('MQTT: Connected to Broker, Subscribing to food-ready topics...');
        setConnectionStatus(true);

        // Subscribe with qos 2 to ensure that each order is received once and only once, so
        // that there are no extra food coming to the table
        client!.subscribe(FOOD_READY_TOPIC_WILDCARD, { qos: 2 }, (err) => {
            if (err) console.error('MQTT Subscription Error: ', err)
            else console.log("MQTT: Connected, Subscribed to food-ready topics!")
        });
    });

    // On receiving a message, verify that the foodName and tableId are valid before adding the
    // ready food to the table
    client.on('message', (topic, payload) => {
        try {
            const topicParts = topic.split('/');
            const tableId = parseInt(topicParts[2]);

            const { foodName } = JSON.parse(payload.toString());

            if (tableId && !isNaN(tableId) && foodName) addFoodToTable(tableId, foodName);
        } catch (e) {
            console.error('MQTT Message Processing Error: ', e, ' Payload: ', payload.toString());
        }
    });

    // Handles any unexpected errors by logging the error and resetting the connectionStatus
    client.on('error', (err) => {
        console.error('MQTT Connection Error: ', err);
        setConnectionStatus(false);
    });
}

// Function for sending orders to the kitchen
export function publishOrder(tableId: number, foodName: string) {
    // Do not attempt to send anything if the client is null or is not connected to the Broker
    if (!client || !restaurantState.isConnected) {
        console.error('Cannot publish: client is not connected.');
        return;
    }

    const payload = JSON.stringify({
        tableId,
        foodName,
    });

    // Publish an order with qos 2 to ensure the kitchen receives only one order so the kitchen
    // doesn't accidentally cook the same order twice
    client.publish(ORDER_TOPIC, payload, { qos: 2 }, (err) => {
        if (err) console.error('MQTT Publish Error: ', err);
        else console.log(`MQTT: Published order from Table ${tableId}: ${foodName}`);
    });
}

// Function for handling the disconnection of the client from the broker. On disconnecting the
// client, set the client back to null and the connectionStatus to false.
export function disconnect() {
    if (!client) return;

    console.log('MQTT: Disconnecting from Broker...');
    client.end(true, {}, () => {
        client = null;
        setConnectionStatus(false);
    });
}
