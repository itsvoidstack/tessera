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


class OpenAIProvider(AIProvider):
    """
    OpenAI Adapter for Tessera AI Gateway.
    Connects to OpenAI's official Chat Completions API via API Key (BYOK or server env).
    """

    def __init__(self, server_api_key: Optional[str] = None):
        self._server_api_key = server_api_key or os.getenv("OPENAI_API_KEY")

    @property
    def provider_id(self) -> str:
        return "openai"

    @property
    def name(self) -> str:
        return "OpenAI"

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="gpt-4o",
                name="GPT-4o",
                description="Flagship OpenAI intelligence model for complex code reasoning and architecture.",
                context_window=128000,
                is_default=True,
            ),
            ModelInfo(
                id="gpt-4o-mini",
                name="GPT-4o Mini",
                description="Fast, cost-efficient model ideal for quick code analysis.",
                context_window=128000,
                is_default=False,
            ),
            ModelInfo(
                id="o3-mini",
                name="o3-mini",
                description="Specialized reasoning model for deep technical auditing.",
                context_window=200000,
                is_default=False,
            ),
        ]

    def get_info(self) -> ProviderInfo:
        return ProviderInfo(
            id=self.provider_id,
            name=self.name,
            description="OpenAI's industry-leading GPT-4o family of models for software engineering.",
            auth_type="api_key",
            supports_byok=True,
            supported_models=self.get_models(),
            capabilities=ProviderCapability(
                streaming=True,
                tool_calling=True,
                context_window=128000,
                structured_output=True,
                vision=True,
            ),
            official_auth_note=(
                "Connect using your OpenAI API Key (platform.openai.com). "
                "OpenAI officially requires API key authorization for third-party backend API consumption."
            ),
        )

    def _get_api_key(self, api_key: Optional[str] = None) -> str:
        key = api_key or self._server_api_key
        if not key:
            raise ValueError("No OpenAI API key provided. Please connect your OpenAI API Key in Settings.")
        return key

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        key = self._get_api_key(request.api_key)
        model_name = request.model or "gpt-4o"

        messages = []
        if request.system_instruction:
            messages.append({"role": "system", "content": request.system_instruction})
        messages.append({"role": "user", "content": request.prompt})

        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": request.temperature,
        }
        if request.max_tokens:
            payload["max_tokens"] = request.max_tokens

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

        def _call_openai():
            res = requests.post(
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=60,
            )
            if res.status_code != 200:
                err_detail = res.json().get("error", {}).get("message", res.text)
                raise RuntimeError(f"OpenAI API Error ({res.status_code}): {err_detail}")
            return res.json()

        loop = asyncio.get_running_loop()
        data = await loop.run_in_executor(None, _call_openai)
        text = data["choices"][0]["message"]["content"]
        finish_reason = data["choices"][0].get("finish_reason", "stop")
        usage = data.get("usage")

        return GenerateResponse(
            text=text,
            provider=self.provider_id,
            model=model_name,
            finish_reason=finish_reason,
            usage=usage,
        )

    async def validate_connection(self, api_key: Optional[str] = None) -> bool:
        try:
            key = self._get_api_key(api_key)
            headers = {"Authorization": f"Bearer {key}"}

            def _test():
                res = requests.get("https://api.openai.com/v1/models", headers=headers, timeout=10)
                return res.status_code == 200

            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(None, _test)
        except Exception:
            return False
