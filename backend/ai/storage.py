import os
import json
import base64
import logging
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from cryptography.fernet import Fernet

logger = logging.getLogger("tessera_ai_storage")

# Derive a 32-byte Fernet key deterministically from system secret or ENCRYPTION_KEY
_SECRET_SEED = os.getenv("ENCRYPTION_KEY") or os.getenv("SECRET_KEY", "tessera_ai_secure_production_secret_key_2026")
_FERNET_KEY = base64.urlsafe_b64encode(hashlib.sha256(_SECRET_SEED.encode("utf-8")).digest())
_cipher = Fernet(_FERNET_KEY)


def mask_secret(secret: str) -> str:
    if not secret:
        return ""
    if len(secret) <= 8:
        return "****"
    return f"{secret[:4]}...{secret[-4:]}"


def encrypt_credential(credential: str) -> str:
    if not credential:
        return ""
    return _cipher.encrypt(credential.encode("utf-8")).decode("utf-8")


def decrypt_credential(encrypted_str: str) -> str:
    if not encrypted_str:
        return ""
    try:
        return _cipher.decrypt(encrypted_str.encode("utf-8")).decode("utf-8")
    except Exception as e:
        logger.warning(f"Failed to decrypt Fernet credential: {e}")
        return ""


class AIProviderStore:
    """
    Manages user provider connections (OAuth tokens and BYOK API keys),
    encrypted credentials using AES-128-CBC/Fernet, active selections, and fallback rules.
    """

    def __init__(self, data_file: Optional[Path] = None):
        self.data_file = data_file or (Path(__file__).resolve().parent.parent / "ai_provider_connections.json")
        self.connections: Dict[str, Dict[str, Any]] = {}
        self.primary_provider: str = "gemini"
        self.fallback_provider: Optional[str] = "claude"
        self.provider_models: Dict[str, str] = {
            "gemini": "gemini-3.6-flash",
            "openai": "gpt-4o",
            "claude": "claude-3-5-sonnet-latest",
        }
        self.load()

    def load(self):
        if self.data_file.exists():
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.connections = data.get("connections", {})
                    self.primary_provider = data.get("primary_provider", "gemini")
                    self.fallback_provider = data.get("fallback_provider", "claude")
                    self.provider_models = data.get("provider_models", self.provider_models)
            except Exception as e:
                logger.warning(f"Error loading AI provider storage: {e}")

    def save(self):
        try:
            data = {
                "connections": self.connections,
                "primary_provider": self.primary_provider,
                "fallback_provider": self.fallback_provider,
                "provider_models": self.provider_models,
            }
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving AI provider storage: {e}")

    def set_byok_connection(self, provider_id: str, api_key: str) -> Dict[str, Any]:
        encrypted = encrypt_credential(api_key)
        record = {
            "provider_id": provider_id,
            "auth_source": "user_byok",
            "status": "connected",
            "masked_key": mask_secret(api_key),
            "encrypted_key": encrypted,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self.connections[provider_id] = record
        self.save()
        return record

    def set_oauth_connection(
        self,
        provider_id: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        account_email: Optional[str] = None,
        expires_in: Optional[int] = None,
    ) -> Dict[str, Any]:
        record = {
            "provider_id": provider_id,
            "auth_source": "user_oauth",
            "status": "connected",
            "account_email": account_email or "Connected Provider Account",
            "masked_key": mask_secret(access_token),
            "encrypted_access_token": encrypt_credential(access_token),
            "encrypted_refresh_token": encrypt_credential(refresh_token) if refresh_token else "",
            "expires_at": (datetime.now(timezone.utc).timestamp() + expires_in) if expires_in else None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self.connections[provider_id] = record
        self.save()
        return record

    def disconnect(self, provider_id: str):
        if provider_id in self.connections:
            del self.connections[provider_id]
            self.save()

    def get_decrypted_key(self, provider_id: str) -> Optional[str]:
        conn = self.connections.get(provider_id)
        if not conn:
            return None
        if conn.get("encrypted_key"):
            return decrypt_credential(conn["encrypted_key"])
        if conn.get("encrypted_access_token"):
            return decrypt_credential(conn["encrypted_access_token"])
        return None

    def get_oauth_tokens(self, provider_id: str) -> Optional[Dict[str, str]]:
        conn = self.connections.get(provider_id)
        if not conn or conn.get("auth_source") != "user_oauth":
            return None
        return {
            "access_token": decrypt_credential(conn.get("encrypted_access_token", "")),
            "refresh_token": decrypt_credential(conn.get("encrypted_refresh_token", "")),
            "account_email": conn.get("account_email", ""),
        }

    def get_connection_status(self, provider_id: str, server_key_available: bool = False) -> Dict[str, Any]:
        conn = self.connections.get(provider_id)
        if conn:
            return {
                "provider_id": provider_id,
                "connected": True,
                "auth_source": conn.get("auth_source", "user_byok"),
                "account_email": conn.get("account_email", ""),
                "masked_key": conn.get("masked_key", ""),
                "status": conn.get("status", "connected"),
                "selected_model": self.provider_models.get(provider_id),
            }
        if server_key_available and provider_id == "gemini":
            return {
                "provider_id": provider_id,
                "connected": True,
                "auth_source": "server_default",
                "masked_key": "Server Environment Key (GEMINI_API_KEY)",
                "status": "connected",
                "selected_model": self.provider_models.get(provider_id, "gemini-3.6-flash"),
            }
        return {
            "provider_id": provider_id,
            "connected": False,
            "auth_source": "none",
            "masked_key": "",
            "status": "not_connected",
            "selected_model": self.provider_models.get(provider_id),
        }
