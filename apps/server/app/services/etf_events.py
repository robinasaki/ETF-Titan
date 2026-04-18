from __future__ import annotations

import asyncio
from collections.abc import Mapping
from typing import Any

ETFEventQueue = asyncio.Queue[dict[str, str]]

_event_subscribers: set[ETFEventQueue] = set()


def subscribe_etf_events() -> ETFEventQueue:
    """Create and register one in-process ETF event subscriber queue."""
    subscriber_queue: ETFEventQueue = asyncio.Queue()
    _event_subscribers.add(subscriber_queue)
    return subscriber_queue


def unsubscribe_etf_events(subscriber_queue: ETFEventQueue) -> None:
    """Unregister one in-process ETF event subscriber queue."""
    _event_subscribers.discard(subscriber_queue)


def publish_etf_uploaded_event(payload: Mapping[str, Any]) -> None:
    """Publish an ETF upload-complete event to all current subscribers."""
    normalized_payload = {key: str(value) for key, value in payload.items()}
    for subscriber_queue in list(_event_subscribers):
        subscriber_queue.put_nowait(normalized_payload)
