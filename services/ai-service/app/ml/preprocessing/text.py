"""Deterministic text cleanup for product fields.

Nulls stay empty. They are never turned into the words "None" or "nan".
"""

import math
import re
import unicodedata

_WHITESPACE = re.compile(r"\s+")


def is_missing(value: object) -> bool:
    if value is None:
        return True
    return isinstance(value, float) and math.isnan(value)


def normalize_text(value: object) -> str:
    """Return a casefolded, whitespace-collapsed string.

    Non-strings, including None and NaN, become an empty string. The literal
    text "None" is kept, because it is data rather than a null.
    """

    if is_missing(value) or not isinstance(value, str):
        return ""
    normalized = unicodedata.normalize("NFKC", value).casefold()
    return _WHITESPACE.sub(" ", normalized).strip()
