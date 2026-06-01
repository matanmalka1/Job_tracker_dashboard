"""Compatibility entry point for the Job Dashboard test suite.

Run the full suite with:
    pytest scripts/test_all.py -v

The actual tests live under scripts/use_cases/ and are grouped by behavior.
"""

from use_cases.test_application_management import *  # noqa: F401,F403
from use_cases.test_email_ingestion import *  # noqa: F401,F403
from use_cases.test_email_matching import *  # noqa: F401,F403
from use_cases.test_email_parsing import *  # noqa: F401,F403
from use_cases.test_health import *  # noqa: F401,F403
