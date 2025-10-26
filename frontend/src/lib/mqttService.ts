import mqtt from 'mqtt';
import { restaurantState, addFoodToTable, setConnectionStatus } from "./state.svelte";

const BROKER_URL = 'ws://broker.hivemq.com:8000/mqtt';
const ORDER_TOPIC = 'osensa/orders';
const FOOD_READY_TOPIC_WILDCARD = 'osensa/table/+/food';

let client: mqtt.MqttClient | null = null;

export function connectAndSubscribe() {
    if (client) return;

    client = mqtt.connect(BROKER_URL);

    client.on('connect', () => {
        console.log('MQTT: Connected to Broker, Subscribing to food-ready topics...');
        setConnectionStatus(true);

        client!.subscribe(FOOD_READY_TOPIC_WILDCARD, { qos: 2 }, (err) => {
            if (err) console.error('MQTT Subscription Error: ', err)
            else console.log("MQTT: Connected, Subscribed to food-ready topics!")
        });
    });

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

    client.on('error', (err) => {
        console.error('MQTT Connection Error: ', err);
        setConnectionStatus(false);
    });
}

export function publishOrder(tableId: number, foodName: string) {
    if (!client || !restaurantState.isConnected) {
        console.error('Cannot publish: client is not connected.');
        return;
    }

    const payload = JSON.stringify({
        tableId,
        foodName,
    });

    client.publish(ORDER_TOPIC, payload, { qos: 2 }, (err) => {
        if (err) console.error('MQTT Publish Error: ', err);
        else console.log(`MQTT: Published order from Table ${tableId}: ${foodName}`);
    });
}
