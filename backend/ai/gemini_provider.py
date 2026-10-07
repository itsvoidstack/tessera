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
                id="gemini-3.6-flash",
                name="Gemini 3.6 Flash",
                description="Fast, highly efficient model optimized for code analysis and insights.",
                context_window=1000000,
                is_default=True,
            ),
            ModelInfo(
                id="gemini-1.5-pro",
                name="Gemini 1.5 Pro",
                description="Reasoning-intensive model for deep codebase understanding.",
                context_window=2000000,
                is_default=False,
            ),
            ModelInfo(
                id="gemini-1.5-flash",
                name="Gemini 1.5 Flash",
                description="Standard fast model for high-throughput repository scanning.",
                context_window=1000000,
                is_default=False,
            ),
        ]

    def get_info(self) -> ProviderInfo:
        return ProviderInfo(
            id=self.provider_id,
            name=self.name,
            description="Google's multimodal Gemini models offering fast inference and 1M+ token context windows.",
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
                "Connect using your Google Gemini API Key (aistudio.google.com). "
                "Note: Consumer Google Accounts do not currently offer a 3rd-party OAuth scope to consume personal web subscription quota via external backend APIs."
            ),
        )

    def _get_client(
        self,
        api_key: Optional[str] = None,
        oauth_tokens: Optional[Dict[str, str]] = None
    ) -> genai.Client:
        if oauth_tokens and oauth_tokens.get("access_token"):
            creds = Credentials(
                token=oauth_tokens["access_token"],
                refresh_token=oauth_tokens.get("refresh_token"),
                token_uri="https://oauth2.googleapis.com/token",
            )
            return genai.Client(credentials=creds)

        key_to_use = api_key or self._server_api_key
        if not key_to_use:
            raise ValueError("No Gemini API key configured on server or provided by user.")
        return genai.Client(api_key=key_to_use)

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        model_name = request.model or "gemini-3.6-flash"
        client = self._get_client(api_key=request.api_key, oauth_tokens=request.oauth_tokens)

        prompt_text = request.prompt
        if request.system_instruction:
            prompt_text = f"System Instruction:\n{request.system_instruction}\n\nTask:\n{prompt_text}"

        def _call_gemini():
            return client.models.generate_content(
                model=model_name,
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

    async def validate_connection(
        self,
        api_key: Optional[str] = None,
        oauth_tokens: Optional[Dict[str, str]] = None
    ) -> bool:
        try:
            client = self._get_client(api_key=api_key, oauth_tokens=oauth_tokens)

            def _test():
                return client.models.generate_content(
                    model="gemini-3.6-flash",
                    contents="Ping",
                )

            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, _test)
            return True
        except Exception:
            return False
