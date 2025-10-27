import asyncio
import json
import aiomqtt
import random
import logging
import certifi
from dotenv import load_dotenv
import os

# Define logging settings
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# LOAD ENV VARIABLES
load_dotenv(dotenv_path="../.env")

BROKER_HOSTNAME = os.getenv("BROKER_HOSTNAME")
BROKER_PORT = int(os.getenv("BROKER_PORT"))
ORDER_TOPIC = os.getenv("ORDER_TOPIC")

# Function responsible for cooking the food and publishing the ready food to the table.
async def cook_food(table_id: int, food_name: str, client: aiomqtt.Client):
    # Chef takes a random amount of time to cook food between 5 and 15 seconds.
    cook_time = random.uniform(5.0, 15.0)
    logging.info(f"Chef started cooking: {food_name} for Table {table_id}. ETA: "
                 f"{cook_time:.2f}s.")

    # Simulate chef cooking.
    await asyncio.sleep(cook_time)

    # Get the table to publish to based off of the order id
    food_ready_topic = f"osensa/table/{table_id}/food"

    # Prepare the payload to be published
    payload = json.dumps({
        "foodName": food_name,
    })
    try:
        # Attempt to publish the payload with qos=2 to ensure that the front of house only
        # receives 1 of the food that was cooked
        await client.publish(food_ready_topic, qos=2, payload=payload)
        logging.info(f"Chef finished: Published '{food_name}' to {food_ready_topic}.")
    except Exception as e:
        logging.error(f"Chef error: Failed to publish to {food_ready_topic}: {e}")

async def main():
    logging.info("Starting Backend. Connecting...")

    # Set up the MQTTClient
    async with aiomqtt.Client(
        hostname=BROKER_HOSTNAME,
        port=BROKER_PORT,
        transport="websockets",
        tls_params=aiomqtt.TLSParameters(
            ca_certs=certifi.where(),
        ),
    ) as client:
        logging.info("MQTT: Connected to Broker.")

        # Subscribe to ORDER_TOPIC with qos=2 to ensure that the kitchen only receives 1 ticket
        # for the food ordered
        await client.subscribe(ORDER_TOPIC, qos=2)
        logging.info(f"MQTT: Subscribed to listener topic: {ORDER_TOPIC}")

        # Asynchronously check for messages sent to the MQTTClient
        async for message in client.messages:
            # If the topic is not ORDER_TOPIC then log it and do nothing
            if message.topic.value != ORDER_TOPIC:
                logging.info(f"MQTT: Incorrect ORDER_TOPIC")
                continue

            logging.info(f"MQTT: Correct ORDER_TOPIC")

            try:
                # Attempt to parse the JSON and extract the necessary order details
                payload = json.loads(message.payload.decode())
                table_id = payload.get('tableId')
                food_name = payload.get('foodName')

                # If the front of house sends an order for a table that does not exist,
                # then do not cook the food for that non-existent table.
                if not isinstance(table_id, int) or not isinstance(food_name, str):
                    logging.warning(f"MQTT: Received invalid order payload: {payload}")
                    continue

                # If successfully parsed the payload, then start cooking the food without
                # blocking the message listener
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
