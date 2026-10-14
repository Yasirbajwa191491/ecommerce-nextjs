import httpx
import pytest

from app.core.config import Settings
from app.integrations.convex import ConvexClient, ConvexClientError


def _settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "_env_file": None,
        "app_env": "test",
        "convex_internal_url": "https://happy-animal-123.convex.site",
        "convex_service_token": "convex-service-token-value",
    }
    values.update(overrides)
    return Settings(**values)


@pytest.mark.asyncio
async def test_unconfigured_probe_does_not_call_the_network() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        raise AssertionError("network call")

    settings = Settings(_env_file=None, app_env="test")
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        result = await ConvexClient(settings, client=http).probe()
    assert result.configured is False
    assert result.checked is False
    assert result.reachable is None
    assert result.authenticated is None


@pytest.mark.asyncio
async def test_probe_sends_bearer_token_and_does_not_claim_authorization() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(404, json={"error": "missing"})

    settings = _settings()
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        follow_redirects=False,
    ) as http:
        result = await ConvexClient(settings, client=http).probe()

    assert result.configured is True
    assert result.checked is True
    assert result.reachable is True
    assert result.status_code == 404
    assert result.authenticated is None
    assert seen[0].headers["authorization"] == "Bearer convex-service-token-value"
    assert "convex-service-token-value" not in result.model_dump_json()


@pytest.mark.asyncio
async def test_cloud_url_alone_is_not_probed() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        raise AssertionError("network call")

    settings = _settings(
        convex_url="https://happy-animal-123.convex.cloud",
        convex_internal_url="",
        convex_service_token="convex-service-token-value",
    )
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        result = await ConvexClient(settings, client=http).probe()
    assert result.configured is False
    assert result.checked is False


@pytest.mark.asyncio
async def test_redirects_are_not_followed() -> None:
    calls = {"count": 0}

    def handler(_: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        return httpx.Response(302, headers={"Location": "https://evil.example/collect"})

    settings = _settings()
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        follow_redirects=False,
    ) as http:
        result = await ConvexClient(settings, client=http).probe()
    assert calls["count"] == 1
    assert result.reachable is False
    assert result.status_code == 302
    assert result.authenticated is None


@pytest.mark.asyncio
async def test_network_errors_are_not_reported_as_healthy() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("unavailable")

    settings = _settings()
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        result = await ConvexClient(settings, client=http).probe()
    assert result.checked is True
    assert result.reachable is False
    assert result.status_code is None
    assert result.authenticated is None


@pytest.mark.asyncio
async def test_redirecting_client_is_refused_before_a_request() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        raise AssertionError("network call")

    settings = _settings()
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        follow_redirects=True,
    ) as http:
        with pytest.raises(ConvexClientError, match="redirects"):
            await ConvexClient(settings, client=http).probe()


@pytest.mark.asyncio
async def test_data_paths_are_not_allowlisted() -> None:
    client = ConvexClient(_settings())
    for path in ("/orders", "/api/products", "/customers", "../orders", "//evil", "/export?all=1"):
        with pytest.raises(ConvexClientError):
            await client.call_allowlisted(path, json_body={"limit": 100})
