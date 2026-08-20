"""Small immutable models used by the alarm runtime."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True, slots=True)
class Media:
    """A media-selector value kept in a service-call-safe form."""
    content_id: str
    content_type: str
    metadata: dict[str, Any] | None = None

    @classmethod
    def from_value(cls, value: Any) -> "Media | None":
        if not value:
            return None
        if isinstance(value, str):
            return cls(value, "music")
        if isinstance(value, dict) and value.get("media_content_id"):
            return cls(value["media_content_id"], value.get("media_content_type", "music"), value.get("metadata"))
        return None

    def as_service_data(self) -> dict[str, Any]:
        data: dict[str, Any] = {"media_content_id": self.content_id, "media_content_type": self.content_type}
        if self.metadata:
            data["metadata"] = self.metadata
        return data
