from sqlalchemy.ext.asyncio import AsyncSession


class JobApplicationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, application_id: int):
        return None

    async def list_recent(self, limit: int = 10):
        return []
