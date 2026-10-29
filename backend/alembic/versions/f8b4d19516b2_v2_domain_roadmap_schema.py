"""v2_domain_roadmap_schema

Revision ID: f8b4d19516b2
Revises: 8f1823c3a4d1
Create Date: 2026-10-29 14:38:52.203955

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f8b4d19516b2'
down_revision: Union[str, Sequence[str], None] = '8f1823c3a4d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('roadmap_items', sa.Column('source', sa.String(length=50), server_default='curated', nullable=False))
    op.add_column('roadmaps', sa.Column('domain_id', sa.UUID().with_variant(sa.String(length=36), 'sqlite'), nullable=True))
    op.create_foreign_key('fk_roadmaps_domain_id_domains', 'roadmaps', 'domains', ['domain_id'], ['id'], ondelete='SET NULL')
    op.add_column('student_profiles', sa.Column('selected_domain_id', sa.UUID().with_variant(sa.String(length=36), 'sqlite'), nullable=True))
    op.create_foreign_key('fk_student_profiles_selected_domain_id_domains', 'student_profiles', 'domains', ['selected_domain_id'], ['id'], ondelete='SET NULL')
    try:
        op.drop_constraint('chk_user_disc_state', 'user_discovery_state', type_='check')
        op.create_check_constraint('chk_user_disc_state', 'user_discovery_state', "state IN ('saved', 'dismissed', 'accepted', 'suggested', 'added')")
    except Exception:
        pass


def downgrade() -> None:
    op.drop_constraint('fk_student_profiles_selected_domain_id_domains', 'student_profiles', type_='foreignkey')
    op.drop_column('student_profiles', 'selected_domain_id')
    op.drop_constraint('fk_roadmaps_domain_id_domains', 'roadmaps', type_='foreignkey')
    op.drop_column('roadmaps', 'domain_id')
    op.drop_column('roadmap_items', 'source')
