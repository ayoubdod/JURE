from django.core.management.base import BaseCommand
from commons.models import Activity


class Command(BaseCommand):
    help = 'Delete all activities and add 10 new working domain activities'

    def handle(self, *args, **options):
        # Delete all existing activities
        deleted_count = Activity.objects.all().delete()[0]
        self.stdout.write(
            self.style.SUCCESS(f'Successfully deleted {deleted_count} activities')
        )

        # Working domain activities data
        activities_data = [
            {
                'name_en': 'Information Technology',
                'name_ar': 'تقنية المعلومات',
                'name_fr': 'Technologies de l\'information',
                'description_en': 'Information technology sector including software development, IT consulting, cybersecurity, and digital transformation services.',
                'description_ar': 'قطاع تقنية المعلومات بما في ذلك تطوير البرمجيات والاستشارات التقنية وأمن المعلومات وخدمات التحول الرقمي.',
                'description_fr': 'Secteur des technologies de l\'information incluant développement de logiciels, conseil informatique, cybersécurité et services de transformation numérique.',
                'slug': 'information-technology'
            },
            {
                'name_en': 'Healthcare & Medical',
                'name_ar': 'الرعاية الصحية والطبية',
                'name_fr': 'Santé et médical',
                'description_en': 'Healthcare and medical services including medical consulting, health technology, pharmaceutical services, and wellness programs.',
                'description_ar': 'خدمات الرعاية الصحية والطبية بما في ذلك الاستشارات الطبية والتكنولوجيا الصحية والخدمات الصيدلانية وبرامج الرفاهية.',
                'description_fr': 'Services de santé et médicaux incluant conseil médical, technologie de santé, services pharmaceutiques et programmes de bien-être.',
                'slug': 'healthcare-medical'
            },
            {
                'name_en': 'Finance & Banking',
                'name_ar': 'التمويل والخدمات المصرفية',
                'name_fr': 'Finance et banque',
                'description_en': 'Financial services including banking, investment, insurance, fintech, and financial consulting.',
                'description_ar': 'الخدمات المالية بما في ذلك الخدمات المصرفية والاستثمار والتأمين والتكنولوجيا المالية والاستشارات المالية.',
                'description_fr': 'Services financiers incluant banque, investissement, assurance, fintech et conseil financier.',
                'slug': 'finance-banking'
            },
            {
                'name_en': 'Education & Training',
                'name_ar': 'التعليم والتدريب',
                'name_fr': 'Éducation et formation',
                'description_en': 'Education and training services including academic consulting, e-learning, professional development, and educational technology.',
                'description_ar': 'خدمات التعليم والتدريب بما في ذلك الاستشارات الأكاديمية والتعلم الإلكتروني والتطوير المهني والتكنولوجيا التعليمية.',
                'description_fr': 'Services d\'éducation et de formation incluant conseil académique, e-learning, développement professionnel et technologie éducative.',
                'slug': 'education-training'
            },
            {
                'name_en': 'Manufacturing & Industry',
                'name_ar': 'التصنيع والصناعة',
                'name_fr': 'Manufacture et industrie',
                'description_en': 'Manufacturing and industrial services including production consulting, quality control, supply chain management, and industrial automation.',
                'description_ar': 'خدمات التصنيع والصناعة بما في ذلك استشارات الإنتاج ومراقبة الجودة وإدارة سلسلة التوريد والأتمتة الصناعية.',
                'description_fr': 'Services de fabrication et industriels incluant conseil en production, contrôle qualité, gestion de chaîne d\'approvisionnement et automatisation industrielle.',
                'slug': 'manufacturing-industry'
            },
            {
                'name_en': 'Real Estate & Construction',
                'name_ar': 'العقارات والبناء',
                'name_fr': 'Immobilier et construction',
                'description_en': 'Real estate and construction services including property development, construction management, architectural services, and real estate consulting.',
                'description_ar': 'خدمات العقارات والبناء بما في ذلك تطوير العقارات وإدارة البناء والخدمات المعمارية والاستشارات العقارية.',
                'description_fr': 'Services immobiliers et de construction incluant développement immobilier, gestion de construction, services architecturaux et conseil immobilier.',
                'slug': 'real-estate-construction'
            },
            {
                'name_en': 'Retail & E-commerce',
                'name_ar': 'التجزئة والتجارة الإلكترونية',
                'name_fr': 'Commerce de détail et e-commerce',
                'description_en': 'Retail and e-commerce services including online retail, digital commerce, supply chain optimization, and customer experience management.',
                'description_ar': 'خدمات التجزئة والتجارة الإلكترونية بما في ذلك البيع بالتجزئة عبر الإنترنت والتجارة الرقمية وتحسين سلسلة التوريد وإدارة تجربة العملاء.',
                'description_fr': 'Services de commerce de détail et e-commerce incluant vente en ligne, commerce numérique, optimisation de chaîne d\'approvisionnement et gestion de l\'expérience client.',
                'slug': 'retail-ecommerce'
            },
            {
                'name_en': 'Transportation & Logistics',
                'name_ar': 'النقل والخدمات اللوجستية',
                'name_fr': 'Transport et logistique',
                'description_en': 'Transportation and logistics services including freight management, supply chain logistics, transportation consulting, and mobility solutions.',
                'description_ar': 'خدمات النقل والخدمات اللوجستية بما في ذلك إدارة الشحن والخدمات اللوجستية لسلسلة التوريد واستشارات النقل وحلول التنقل.',
                'description_fr': 'Services de transport et logistique incluant gestion du fret, logistique de chaîne d\'approvisionnement, conseil en transport et solutions de mobilité.',
                'slug': 'transportation-logistics'
            },
            {
                'name_en': 'Energy & Utilities',
                'name_ar': 'الطاقة والمرافق',
                'name_fr': 'Énergie et services publics',
                'description_en': 'Energy and utilities services including renewable energy, energy consulting, utility management, and sustainability solutions.',
                'description_ar': 'خدمات الطاقة والمرافق بما في ذلك الطاقة المتجددة والاستشارات في مجال الطاقة وإدارة المرافق وحلول الاستدامة.',
                'description_fr': 'Services d\'énergie et de services publics incluant énergies renouvelables, conseil en énergie, gestion des services publics et solutions de durabilité.',
                'slug': 'energy-utilities'
            },
            {
                'name_en': 'Media & Entertainment',
                'name_ar': 'الإعلام والترفيه',
                'name_fr': 'Médias et divertissement',
                'description_en': 'Media and entertainment services including content production, digital media, entertainment consulting, and creative services.',
                'description_ar': 'خدمات الإعلام والترفيه بما في ذلك إنتاج المحتوى والوسائط الرقمية والاستشارات الترفيهية والخدمات الإبداعية.',
                'description_fr': 'Services de médias et divertissement incluant production de contenu, médias numériques, conseil en divertissement et services créatifs.',
                'slug': 'media-entertainment'
            }
        ]

        # Create new activities
        created_activities = []
        
        for activity_data in activities_data:
            activity = Activity.objects.create(**activity_data)
            created_activities.append(activity)

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {len(created_activities)} new working domain activities')
        )

        # Display created activities
        self.stdout.write('\nCreated working domain activities:')
        for i, activity in enumerate(created_activities, 1):
            self.stdout.write(f'{i}. {activity.name_en} (ID: {activity.id}, Slug: {activity.slug})')

        self.stdout.write(
            self.style.SUCCESS('\nWorking domain activities reset completed successfully!')
        ) 