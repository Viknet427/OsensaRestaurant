import asyncio
import json
import aiomqtt
import random
import logging

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

BROKER_HOSTNAME = "broker.hivemq.com"
BROKER_PORT = 8000
ORDER_TOPIC = "osensa/orders"

async def cook_food(table_id: int, food_name: str, client: aiomqtt.Client):
    cook_time = random.uniform(5.0, 15.0)
    logging.info(f"Chef started cooking: {food_name} for Table {table_id}. ETA: "
                 f"{cook_time:.2f}s.")

    await asyncio.sleep(cook_time)

    food_ready_topic = f"osensa/table/{table_id}/food"

    payload = json.dumps({
        "foodName": food_name,
    })
    try:
        await client.publish(food_ready_topic, qos=2, payload=payload)
        logging.info(f"Chef finished: Published '{food_name}' to {food_ready_topic}.")
    except Exception as e:
        logging.error(f"Chef error: Failed to publish to {food_ready_topic}: {e}")

async def main():
    logging.info("Starting Backend. Connecting...")

    async with aiomqtt.Client(
        hostname=BROKER_HOSTNAME,
        port=BROKER_PORT,
        transport="websockets",
    ) as client:
        logging.info("MQTT: Connected to Broker.")

        await client.subscribe(ORDER_TOPIC, qos=2)
        logging.info(f"MQTT: Subscribed to listener topic: {ORDER_TOPIC}")

        async for message in client.messages:
            if message.topic.value != ORDER_TOPIC:
                logging.info(f"MQTT: Incorrect ORDER_TOPIC")
                continue

            logging.info(f"MQTT: Correct ORDER_TOPIC")

            try:
                payload = json.loads(message.payload.decode())
                table_id = payload.get('tableId')
                food_name = payload.get('foodName')

                if not isinstance(table_id, int) or not isinstance(food_name, str):
                    logging.warning(f"MQTT: Received invalid order payload: {payload}")
                    continue

                asyncio.create_task(cook_food(table_id, food_name, client))

            except json.JSONDecodeError:
                logging.error(f"MQTT: Failed to decode JSON from order message: {message.payload}")
            except Exception as e:
                logging.error(f"MQTT: An unexpected error occurred: {e}", exc_info=True)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Backend shut down cleanly.")
