"""Fault checks for the resource stop path used by long benchmarks."""

import unittest
from unittest.mock import patch

from run_case import stop_group


class StopGroupTests(unittest.TestCase):
    def test_denied_group_kills_known_children_before_parent(self):
        calls = []

        def kill(pid, signal):
            calls.append(pid)

        with patch("run_case.os.killpg", side_effect=PermissionError), \
             patch("run_case.os.kill", side_effect=kill):
            result = stop_group(10, {12, 11}, children_visible=True)
        self.assertEqual(calls, [11, 12, 10])
        self.assertTrue(result["complete"])

    def test_unknown_children_make_fallback_incomplete(self):
        with patch("run_case.os.killpg", side_effect=PermissionError), \
             patch("run_case.os.kill"):
            result = stop_group(10, children_visible=False)
        self.assertFalse(result["complete"])

    def test_failed_child_kill_is_reported(self):
        def kill(pid, signal):
            if pid == 11:
                raise PermissionError

        with patch("run_case.os.killpg", side_effect=PermissionError), \
             patch("run_case.os.kill", side_effect=kill):
            result = stop_group(10, {11}, children_visible=True)
        self.assertFalse(result["complete"])
        self.assertEqual(result["failed_child_pids"], [11])


if __name__ == "__main__":
    unittest.main()
