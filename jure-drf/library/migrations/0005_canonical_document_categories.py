from collections import Counter

from django.db import migrations, models


LEGACY_CATEGORY_MAP = {
    'law': 'legislation_regulations',
    'templates': 'forms_templates',
    'contracts': 'contracts_agreements',
    'research': 'legal_research_opinions',
    'legal_forms': 'forms_templates',
    'training': 'training_knowledge',
    'evidence': 'evidence_case_materials',
}

CANONICAL_CATEGORIES = (
    'legislation_regulations',
    'case_law_jurisprudence',
    'contracts_agreements',
    'pleadings_proceedings',
    'forms_templates',
    'legal_research_opinions',
    'corporate_governance',
    'compliance_policies',
    'evidence_case_materials',
    'training_knowledge',
)

# Best-effort reverse: forms_templates collapses templates + legal_forms.
REVERSE_CATEGORY_MAP = {
    'legislation_regulations': 'law',
    'forms_templates': 'templates',
    'contracts_agreements': 'contracts',
    'legal_research_opinions': 'research',
    'training_knowledge': 'training',
    'evidence_case_materials': 'evidence',
    'case_law_jurisprudence': 'law',
    'pleadings_proceedings': 'evidence',
    'corporate_governance': 'training',
    'compliance_policies': 'templates',
}


def forwards_map_categories(apps, schema_editor):
    Document = apps.get_model('library', 'Document')
    mapped = 0
    for old, new in LEGACY_CATEGORY_MAP.items():
        mapped += Document.objects.filter(category=old).update(category=new)

    unknown = Counter(
        Document.objects.exclude(category__in=CANONICAL_CATEGORIES)
        .exclude(category='')
        .values_list('category', flat=True)
    )
    print(f'Migrated {mapped} library document(s) to canonical categories.')
    if unknown:
        report = ', '.join(f'{value!r} ({count})' for value, count in sorted(unknown.items()))
        print(
            'WARNING: Unmapped library document categories preserved for manual classification: '
            + report
        )


def backwards_map_categories(apps, schema_editor):
    Document = apps.get_model('library', 'Document')
    for canonical, legacy in REVERSE_CATEGORY_MAP.items():
        Document.objects.filter(category=canonical).update(category=legacy)


class Migration(migrations.Migration):

    dependencies = [
        ('library', '0004_alter_document_tags'),
    ]

    operations = [
        migrations.AlterField(
            model_name='document',
            name='category',
            field=models.CharField(
                choices=[
                    ('legislation_regulations', 'Legislation & Regulations'),
                    ('case_law_jurisprudence', 'Case Law & Jurisprudence'),
                    ('contracts_agreements', 'Contracts & Agreements'),
                    ('pleadings_proceedings', 'Pleadings & Proceedings'),
                    ('forms_templates', 'Forms & Templates'),
                    ('legal_research_opinions', 'Legal Research & Opinions'),
                    ('corporate_governance', 'Corporate & Governance'),
                    ('compliance_policies', 'Compliance & Policies'),
                    ('evidence_case_materials', 'Evidence & Case Materials'),
                    ('training_knowledge', 'Training & Knowledge'),
                ],
                max_length=255,
            ),
        ),
        migrations.RunPython(forwards_map_categories, backwards_map_categories),
    ]
