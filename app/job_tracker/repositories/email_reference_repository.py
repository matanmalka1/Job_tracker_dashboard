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
        await self.session.commit()
        await self.session.refresh(record)
        return record, True

    async def list_paginated(self, limit: int, offset: int) -> tuple[list[EmailReference], int]:
        total = await self.session.scalar(select(func.count()).select_from(EmailReference))

        result = await self.session.execute(
            select(EmailReference)
            .order_by(EmailReference.received_at.desc())
            .limit(limit)
            .offset(offset)
        )
        items = result.scalars().all()
        return items, total or 0
