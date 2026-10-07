import logging
from typing import Dict, List, Optional, Any
from .base import (
    AIProvider,
    ProviderInfo,
    GenerateRequest,
    GenerateResponse,
    ModelInfo,
)
from .gemini_provider import GeminiProvider
from .openai_provider import OpenAIProvider
from .claude_provider import ClaudeProvider
from .storage import AIProviderStore

logger = logging.getLogger("tessera_ai_gateway")


class AIGateway:
    """
    Central AI Gateway for Tessera.
    Decouples all codebase auditing, learning agents, and synthesis tools from underlying LLM providers.
    Supports dynamic provider selection, BYOK user keys, server default keys, and fallback rules.
    """

    def __init__(self, store: Optional[AIProviderStore] = None):
        self.store = store or AIProviderStore()
        self.providers: Dict[str, AIProvider] = {
            "gemini": GeminiProvider(),
            "openai": OpenAIProvider(),
            "claude": ClaudeProvider(),
        }

    def get_provider(self, provider_id: str) -> AIProvider:
        if provider_id not in self.providers:
            raise ValueError(f"Unknown AI Provider: '{provider_id}'. Available: {list(self.providers.keys())}")
        return self.providers[provider_id]

    def list_providers(self) -> List[ProviderInfo]:
        return [p.get_info() for p in self.providers.values()]

    def get_status(self) -> Dict[str, Any]:
        statuses = {}
        for pid in self.providers.keys():
            server_default = (pid == "gemini" and bool(self.providers["gemini"]._server_api_key))
            statuses[pid] = self.store.get_connection_status(pid, server_key_available=server_default)

        return {
            "primary_provider": self.store.primary_provider,
            "fallback_provider": self.store.fallback_provider,
            "provider_models": self.store.provider_models,
            "providers": statuses,
        }

    async def generate(self, request: GenerateRequest, preferred_provider: Optional[str] = None) -> GenerateResponse:
        """
        Execute AI content generation with automatic provider resolution and optional fallback.
        """
        target_provider_id = preferred_provider or self.store.primary_provider

        # Attempt generation on primary provider
        try:
            return await self._execute_on_provider(target_provider_id, request)
        except Exception as primary_err:
            logger.warning(f"AI Gateway: Primary provider '{target_provider_id}' failed: {primary_err}")

            # Check if fallback provider is enabled and configured
            fallback_id = self.store.fallback_provider
            if fallback_id and fallback_id != target_provider_id and fallback_id in self.providers:
                logger.info(f"AI Gateway: Attempting fallback execution on '{fallback_id}'...")
                try:
                    res = await self._execute_on_provider(fallback_id, request)
                    res.text = f"*[Note: Generated using fallback provider '{fallback_id}']*\n\n" + res.text
                    return res
                except Exception as fallback_err:
                    logger.error(f"AI Gateway: Fallback provider '{fallback_id}' also failed: {fallback_err}")
                    raise RuntimeError(
                        f"Primary AI provider ('{target_provider_id}') failed ({primary_err}) and "
                        f"fallback provider ('{fallback_id}') also failed ({fallback_err})."
                    )

            # No fallback or fallback disabled
            raise primary_err

    async def _execute_on_provider(self, provider_id: str, request: GenerateRequest) -> GenerateResponse:
        provider = self.get_provider(provider_id)
        
        # Determine credentials to use
        api_key = request.api_key or self.store.get_decrypted_key(provider_id)
        oauth_tokens = request.oauth_tokens or self.store.get_oauth_tokens(provider_id)
        
        # Determine model to use
        selected_model = request.model or self.store.provider_models.get(provider_id)

        req_copy = GenerateRequest(
            prompt=request.prompt,
            system_instruction=request.system_instruction,
            model=selected_model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            api_key=api_key,
            oauth_tokens=oauth_tokens,
        )

        return await provider.generate(req_copy)


# Singleton gateway instance for Tessera app
ai_gateway = AIGateway()
