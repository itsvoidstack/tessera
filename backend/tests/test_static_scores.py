import unittest

from backend.main import static_scores


def repository_tree(*paths: str) -> dict:
    return {
        "tree": [
            {"path": path, "type": "blob"}
            for path in paths
        ]
    }


class StaticScoreTests(unittest.TestCase):
    def test_scores_reward_documented_tested_project_structure(self):
        tree = repository_tree(
            "README.md",
            "package.json",
            "backend/main.py",
            "frontend/app/page.tsx",
            "backend/tests/test_static_scores.py",
        )
        scores, health_score = static_scores(
            tree,
            [{"content": "export function add(a, b) { return a + b; }"}],
        )

        self.assertEqual(scores["testing"], 85)
        self.assertEqual(scores["documentation"], 85)
        self.assertEqual(scores["dependencies"], 86)
        self.assertGreaterEqual(health_score, 75)

    def test_risky_patterns_reduce_security_score(self):
        tree = repository_tree("README.md", "requirements.txt", "src/main.py")
        safe_scores, _ = static_scores(tree, [{"content": "print('safe')"}])
        risky_scores, _ = static_scores(tree, [{"content": "eval(user_input)"}])

        self.assertLess(risky_scores["security"], safe_scores["security"])


if __name__ == "__main__":
    unittest.main()
