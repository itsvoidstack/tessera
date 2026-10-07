import os
import requests
import asyncio
from typing import Optional, List
from .base import (
    AIProvider,
    ProviderInfo,
    ModelInfo,
    ProviderCapability,
    GenerateRequest,
    GenerateResponse,
)


class ClaudeProvider(AIProvider):
    """
    Anthropic Claude Adapter for Tessera AI Gateway.
    Connects to Anthropic's official Messages API via API Key (BYOK or server env).
    """

    def __init__(self, server_api_key: Optional[str] = None):
        self._server_api_key = server_api_key or os.getenv("ANTHROPIC_API_KEY")

    @property
    def provider_id(self) -> str:
        return "claude"

    @property
    def name(self) -> str:
        return "Anthropic Claude"

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="claude-3-5-sonnet-latest",
                name="Claude 3.5 Sonnet",
                description="Industry-standard coding model with exceptional code context comprehension.",
                context_window=200000,
                is_default=True,
            ),
            ModelInfo(
                id="claude-3-5-haiku-latest",
                name="Claude 3.5 Haiku",
                description="Ultra-fast, responsive model for rapid repository scanning.",
                context_window=200000,
                is_default=False,
            ),
            ModelInfo(
                id="claude-3-opus-20240229",
                name="Claude 3 Opus",
                description="Powerful flagship reasoning model for intricate software architecture analysis.",
                context_window=200000,
                is_default=False,
            ),
        ]

    def get_info(self) -> ProviderInfo:
        return ProviderInfo(
            id=self.provider_id,
            name=self.name,
            description="Anthropic's Claude 3.5 state-of-the-art models for code understanding and system design.",
            auth_type="api_key",
            supports_byok=True,
            supported_models=self.get_models(),
            capabilities=ProviderCapability(
                streaming=True,
                tool_calling=True,
                context_window=200000,
                structured_output=True,
                vision=True,
            ),
            official_auth_note=(
                "Connect using an Anthropic API Key (console.anthropic.com). "
                "Anthropic officially requires API key access for external application integrations."
            ),
        )

    def _get_api_key(self, api_key: Optional[str] = None) -> str:
        key = api_key or self._server_api_key
        if not key:
            raise ValueError("No Anthropic API key provided. Please connect your Claude API Key in Settings.")
        return key

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        key = self._get_api_key(request.api_key)
        model_name = request.model or "claude-3-5-sonnet-latest"

        messages = [{"role": "user", "content": request.prompt}]

        payload = {
            "model": model_name,
            "messages": messages,
            "max_tokens": request.max_tokens or 4096,
        }
        if request.system_instruction:
            payload["system"] = request.system_instruction

        headers = {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        def _call_claude():
            res = requests.post(
                "https://api.anthropic.com/v1/messages",
                json=payload,
                headers=headers,
                timeout=60,
            )
            if res.status_code != 200:
                err_detail = res.json().get("error", {}).get("message", res.text)
                raise RuntimeError(f"Anthropic API Error ({res.status_code}): {err_detail}")
            return res.json()

        loop = asyncio.get_running_loop()
        data = await loop.run_in_executor(None, _call_claude)
        
        content_blocks = data.get("content", [])
        text = "".join(block.get("text", "") for block in content_blocks if block.get("type") == "text")
        usage = data.get("usage")

        return GenerateResponse(
            text=text,
            provider=self.provider_id,
            model=model_name,
            finish_reason=data.get("stop_reason", "stop"),
            usage=usage,
        )

    async def validate_connection(self, api_key: Optional[str] = None) -> bool:
        try:
            key = self._get_api_key(api_key)
            headers = {
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            payload = {
                "model": "claude-3-5-haiku-latest",
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "Ping"}],
            }

            def _test():
                res = requests.post(
                    "https://api.anthropic.com/v1/messages",
                    json=payload,
                    headers=headers,
                    timeout=10,
                )
                return res.status_code == 200

            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(None, _test)
        except Exception:
            return False
