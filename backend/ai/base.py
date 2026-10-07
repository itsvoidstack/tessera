from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ProviderCapability(BaseModel):
    streaming: bool = True
    tool_calling: bool = False
    context_window: int = 128000
    structured_output: bool = True
    vision: bool = False


class ModelInfo(BaseModel):
    id: str
    name: str
    description: str
    context_window: int
    is_default: bool = False


class ProviderInfo(BaseModel):
    id: str
    name: str
    description: str
    auth_type: str  # "api_key" | "oauth" | "server_default"
    supports_byok: bool = True
    supported_models: List[ModelInfo]
    capabilities: ProviderCapability
    official_auth_note: str


class GenerateRequest(BaseModel):
    prompt: str
    system_instruction: Optional[str] = None
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    api_key: Optional[str] = None  # User provided BYOK if any
    oauth_tokens: Optional[Dict[str, str]] = None  # User OAuth token object



class GenerateResponse(BaseModel):
    text: str
    provider: str
    model: str
    finish_reason: Optional[str] = "stop"
    usage: Optional[Dict[str, Any]] = None


class AIProvider(ABC):
    """
    Abstract base class for all AI Providers in Tessera.
    Decouples Tessera's repository analysis and agent logic from specific AI models.
    """

    @property
    @abstractmethod
    def provider_id(self) -> str:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def get_info(self) -> ProviderInfo:
        pass

    @abstractmethod
    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        pass

    @abstractmethod
    async def validate_connection(self, api_key: Optional[str] = None) -> bool:
        pass

    @abstractmethod
    def get_models(self) -> List[ModelInfo]:
        pass
