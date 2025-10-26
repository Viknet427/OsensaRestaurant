import pytest
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock
import random

from ..main import cook_food

@pytest.mark.asyncio
async def test_cook_food_publishes_correctly(monkeypatch):
    mock_client = MagicMock()
    mock_client.publish = AsyncMock()

    mock_sleep = AsyncMock(return_value=None)
    monkeypatch.setattr(asyncio, "sleep", mock_sleep)
    monkeypatch.setattr(random, "uniform", MagicMock(return_value=0.1))

    TEST_TABLE_ID = 3
    TEST_FOOD_NAME = "Spaghetti Carbonara"

    await cook_food(TEST_TABLE_ID, TEST_FOOD_NAME, mock_client)

    mock_sleep.assert_awaited_once_with(0.1)

    expected_topic = f"osensa/table/{TEST_TABLE_ID}/food"
    expected_payload = json.dumps({
        "foodName": TEST_FOOD_NAME,
        "tableId": TEST_TABLE_ID
    })

    mock_client.publish.assert_awaited_once_with(
        expected_topic,
        payload=expected_payload
    )
