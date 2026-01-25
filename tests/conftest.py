"""Shared fixtures for Pi-LLaMA integration tests."""

import os
from typing import Generator

import httpx
import pytest


BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:3080")
TIMEOUT = 60.0


@pytest.fixture(scope="session")
def base_url() -> str:
    """Base URL for all API requests."""
    return BASE_URL


@pytest.fixture(scope="session")
def client(base_url: str) -> Generator[httpx.Client, None, None]:
    """Synchronous HTTP client with extended timeout."""
    with httpx.Client(base_url=base_url, timeout=TIMEOUT) as client:
        yield client


@pytest.fixture(scope="session")
def async_client(base_url: str) -> Generator[httpx.AsyncClient, None, None]:
    """Asynchronous HTTP client with extended timeout."""
    with httpx.AsyncClient(base_url=base_url, timeout=TIMEOUT) as client:
        yield client


@pytest.fixture
def memory_cleanup(client: httpx.Client) -> Generator[list[str], None, None]:
    """Fixture to track and cleanup test memories after tests."""
    created_ids: list[str] = []
    yield created_ids

    # Cleanup: delete all memories created during the test
    for memory_id in created_ids:
        try:
            client.delete(f"/memory/memories/{memory_id}")
        except httpx.HTTPError:
            pass  # Ignore errors during cleanup
