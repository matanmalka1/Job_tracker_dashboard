"""
Assembles all route sub-modules into a single APIRouter under /job-tracker.

Split by use case:
  routes/applications.py — application CRUD and email linking
  routes/pipeline.py     — Kanban pipeline
  routes/companies.py    — company summaries
  routes/dashboard.py    — dashboard stats
  routes/scans.py        — scan trigger, SSE progress stream, scan history
  routes/emails.py       — email list
  scan_tokens.py         — short-lived SSE auth tokens
  deps.py                — shared dependencies and factory helpers
"""
from fastapi import APIRouter

from app.job_tracker.api.routes import applications, companies, dashboard, emails, pipeline, scans

router = APIRouter(prefix="/job-tracker", tags=["job-tracker"])

router.include_router(pipeline.router)
router.include_router(applications.router)
router.include_router(companies.router)
router.include_router(dashboard.router)
router.include_router(scans.router)
router.include_router(emails.router)
