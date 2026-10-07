import unittest
from ai.base import GenerateRequest, ModelInfo
from ai.gateway import AIGateway
from ai.gemini_provider import GeminiProvider
from ai.openai_provider import OpenAIProvider
from ai.claude_provider import ClaudeProvider
from ai.storage import AIProviderStore, encrypt_credential, decrypt_credential, mask_secret


class TestAIGateway(unittest.TestCase):

    def test_fernet_encryption(self):
        secret = "sk-proj-1234567890abcdef_secret_token"
        encrypted = encrypt_credential(secret)
        self.assertNotEqual(secret, encrypted)
        decrypted = decrypt_credential(encrypted)
        self.assertEqual(secret, decrypted)

    def test_credential_masking(self):
        secret = "sk-proj-1234567890abcdef"
        masked = mask_secret(secret)
        self.assertTrue(masked.startswith("sk-p"))
        self.assertTrue(masked.endswith("cdef"))

    def test_gateway_providers_list(self):
        gateway = AIGateway()
        providers = gateway.list_providers()
        provider_ids = [p.id for p in providers]
        self.assertIn("gemini", provider_ids)
        self.assertIn("openai", provider_ids)
        self.assertIn("claude", provider_ids)

    def test_gateway_status(self):
        gateway = AIGateway()
        status = gateway.get_status()
        self.assertIn("primary_provider", status)
        self.assertIn("providers", status)
        self.assertIn("gemini", status["providers"])
        self.assertIn("openai", status["providers"])
        self.assertIn("claude", status["providers"])

    def test_store_byok_connections(self):
        store = AIProviderStore()
        store.set_byok_connection("openai", "sk-proj-testkey123")
        conn_status = store.get_connection_status("openai")
        self.assertTrue(conn_status["connected"])
        self.assertEqual(conn_status["auth_source"], "user_byok")
        self.assertEqual(store.get_decrypted_key("openai"), "sk-proj-testkey123")
        store.disconnect("openai")
        conn_status_after = store.get_connection_status("openai")
        self.assertFalse(conn_status_after["connected"])

    def test_store_oauth_connections(self):
        store = AIProviderStore()
        store.set_oauth_connection(
            provider_id="gemini",
            access_token="ya29.test_access_token_12345",
            refresh_token="1//test_refresh_token_67890",
            account_email="test.dev@gmail.com",
            expires_in=3600,
        )
        conn_status = store.get_connection_status("gemini")
        self.assertTrue(conn_status["connected"])
        self.assertEqual(conn_status["auth_source"], "user_oauth")
        self.assertEqual(conn_status["account_email"], "test.dev@gmail.com")

        tokens = store.get_oauth_tokens("gemini")
        self.assertIsNotNone(tokens)
        self.assertEqual(tokens["access_token"], "ya29.test_access_token_12345")
        self.assertEqual(tokens["refresh_token"], "1//test_refresh_token_67890")
        store.disconnect("gemini")


if __name__ == "__main__":
    unittest.main()
