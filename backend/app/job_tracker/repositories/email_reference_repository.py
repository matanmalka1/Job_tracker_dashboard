from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.job_tracker.models.email_reference import EmailReference


class EmailReferenceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_from_raw_message(self, data: dict) -> tuple[EmailReference | None, bool]:
        message_id = data.get("gmail_message_id")
        if not message_id:
            return None, False

        existing = await self.session.scalar(
            select(EmailReference).where(EmailReference.gmail_message_id == message_id)
        )
        if existing:
            return existing, False

        record = EmailReference(**data)
        self.session.add(record)
        return record, True

    async def bulk_create(self, items: list[dict]) -> tuple[int, int]:
        if not items:
            return 0, 0

        ids = [item.get("gmail_message_id") for item in items if item.get("gmail_message_id")]
        existing_ids = set()
        if ids:
            result = await self.session.execute(
                select(EmailReference.gmail_message_id).where(EmailReference.gmail_message_id.in_(ids))
            )
            existing_ids = set(result.scalars().all())

        to_insert = [item for item in items if item.get("gmail_message_id") not in existing_ids]
        records = [EmailReference(**item) for item in to_insert]
        self.session.add_all(records)
        await self.session.flush()
        return len(records), len(existing_ids)

    async def list_paginated(self, limit: int, offset: int) -> tuple[list[EmailReference], int]:
        total = await self.session.scalar(select(func.count()).select_from(EmailReference))

        result = await self.session.execute(
            select(EmailReference)
            .order_by(EmailReference.received_at.desc())
            .limit(limit)
            .offset(offset)
        )
        items = result.scalars().all()
        return list(items), total or 0