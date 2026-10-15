import os
import asyncio
from typing import Optional, List, Dict, Any
from google import genai
from google.oauth2.credentials import Credentials
from .base import (
    AIProvider,
    ProviderInfo,
    ModelInfo,
    ProviderCapability,
    GenerateRequest,
    GenerateResponse,
)


class GeminiProvider(AIProvider):
    """
    Google Gemini Adapter for Tessera AI Gateway.
    Decoupled model adapter supporting server default API key and user-supplied API Key (BYOK).
    Architecture is pre-wired to support official third-party OAuth user-account authorization when enabled by Google.
    """

    def __init__(self, server_api_key: Optional[str] = None):
        self._server_api_key = server_api_key or os.getenv("GEMINI_API_KEY")

    @property
    def provider_id(self) -> str:
        return "gemini"

    @property
    def name(self) -> str:
        return "Google Gemini"

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="gemini-2.5-flash",
                name="Gemini 2.5 Flash",
                description="Fast, highly efficient model optimized for code analysis, architecture planning, and insights.",
                context_window=1000000,
                is_default=True,
            ),
            ModelInfo(
                id="gemini-1.5-flash",
                name="Gemini 1.5 Flash",
                description="Ultra-fast high-throughput model for rapid responses.",
                context_window=1000000,
                is_default=False,
            ),
            ModelInfo(
                id="gemini-1.5-pro",
                name="Gemini 1.5 Pro",
                description="High-reasoning model for complex codebase evaluation and deep audits.",
                context_window=2000000,
                is_default=False,
            ),
        ]

    def get_info(self) -> ProviderInfo:
        return ProviderInfo(
            id=self.provider_id,
            name=self.name,
            description="Google Gemini Intelligence Engine powers Tessera's mind planning, code auditing, and hackathon evaluation.",
            auth_type="api_key",
            supports_byok=True,
            supported_models=self.get_models(),
            capabilities=ProviderCapability(
                streaming=True,
                tool_calling=True,
                context_window=1000000,
                structured_output=True,
                vision=True,
            ),
            official_auth_note=(
                "Powered by your backend-attached GEMINI_API_KEY. You can also provide a custom Gemini API Key override in Settings."
            ),
        )

    def _get_client(
        self,
        api_key: Optional[str] = None,
        oauth_tokens: Optional[Dict[str, str]] = None
    ) -> genai.Client:
        key_to_use = api_key or self._server_api_key or os.getenv("GEMINI_API_KEY")
        if not key_to_use:
            raise ValueError("No Gemini API key configured on server or provided by user.")
        return genai.Client(api_key=key_to_use)

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        requested = request.model or "gemini-2.5-flash"
        # Sanitize deprecated or non-existent models from old storage/configs
        if requested in ("gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-3.6-flash", "models/gemini-2.0-flash"):
            requested = "gemini-2.5-flash"

        candidate_models = [
            requested,
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
        ]
        # Remove deprecated models and deduplicate
        candidate_models = list(dict.fromkeys([
            m for m in candidate_models 
            if m and m not in ("gemini-2.0-flash", "gemini-2.0-flash-exp", "models/gemini-2.0-flash")
        ]))

        client = self._get_client(api_key=request.api_key, oauth_tokens=request.oauth_tokens)

        prompt_text = request.prompt
        if request.system_instruction:
            prompt_text = f"System Instruction:\n{request.system_instruction}\n\nTask:\n{prompt_text}"

        last_error = None
        for model_name in candidate_models:
            try:
                def _call_gemini(m=model_name):
                    return client.models.generate_content(
                        model=m,
                        contents=prompt_text,
                    )

                loop = asyncio.get_running_loop()
                res = await loop.run_in_executor(None, _call_gemini)

                return GenerateResponse(
                    text=res.text or "",
                    provider=self.provider_id,
                    model=model_name,
                    finish_reason="stop",
                )
            except Exception as e:
                last_error = e
                continue

        raise last_error or RuntimeError("Gemini content generation failed across all candidate models.")

    async def validate_connection(
        self,
        api_key: Optional[str] = None,
        oauth_tokens: Optional[Dict[str, str]] = None
    ) -> bool:
        try:
            client = self._get_client(api_key=api_key, oauth_tokens=oauth_tokens)

            def _test():
                for test_model in ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]:
                    try:
                        return client.models.generate_content(
                            model=test_model,
                            contents="Ping test",
                        )
                    except Exception:
                        continue
                raise RuntimeError("All models failed validation ping.")

            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, _test)
            return True
        except Exception:
            return False
