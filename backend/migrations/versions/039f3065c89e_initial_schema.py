"""initial_schema

Revision ID: 039f3065c89e
Revises:
Create Date: 2026-06-02 12:17:21.688697

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '039f3065c89e'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

applicationstatus = sa.Enum(
    'new', 'applied', 'interviewing', 'offer', 'rejected', 'hired',
    name='applicationstatus',
)


def upgrade() -> None:
    op.create_table(
        'job_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('role_title', sa.String(255), nullable=True),
        sa.Column('status', applicationstatus, nullable=False),
        sa.Column('source', sa.String(255), nullable=True),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_email_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('job_url', sa.String(2000), nullable=True),
        sa.Column('next_action_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_job_applications_id', 'job_applications', ['id'])
    op.create_index('ix_job_applications_status', 'job_applications', ['status'])
    op.create_index('ix_job_applications_company_name', 'job_applications', ['company_name'])

    op.create_table(
        'email_references',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('gmail_message_id', sa.String(255), nullable=False),
        sa.Column('gmail_thread_id', sa.String(255), nullable=True),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('sender', sa.String(255), nullable=True),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('snippet', sa.Text(), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('application_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['job_applications.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('gmail_message_id', name='uq_email_reference_message_id'),
    )
    op.create_index('ix_email_references_id', 'email_references', ['id'])
    op.create_index('ix_email_references_gmail_message_id', 'email_references', ['gmail_message_id'])

    op.create_table(
        'scan_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('emails_fetched', sa.Integer(), nullable=True),
        sa.Column('emails_inserted', sa.Integer(), nullable=True),
        sa.Column('apps_created', sa.Integer(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_scan_runs_id', 'scan_runs', ['id'])


def downgrade() -> None:
    op.drop_index('ix_scan_runs_id', table_name='scan_runs')
    op.drop_table('scan_runs')

    op.drop_index('ix_email_references_gmail_message_id', table_name='email_references')
    op.drop_index('ix_email_references_id', table_name='email_references')
    op.drop_table('email_references')

    op.drop_index('ix_job_applications_company_name', table_name='job_applications')
    op.drop_index('ix_job_applications_status', table_name='job_applications')
    op.drop_index('ix_job_applications_id', table_name='job_applications')
    op.drop_table('job_applications')

    applicationstatus.drop(op.get_bind())
