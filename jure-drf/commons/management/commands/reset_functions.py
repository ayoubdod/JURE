from django.core.management.base import BaseCommand
from commons.models import Function


class Command(BaseCommand):
    help = 'Delete all functions and add 10 new working domain functions'

    def handle(self, *args, **options):
        # Delete all existing functions
        deleted_count = Function.objects.all().delete()[0]
        self.stdout.write(
            self.style.SUCCESS(f'Successfully deleted {deleted_count} functions')
        )

        # Working domain functions data
        functions_data = [
            {
                'name_en': 'Self-employed',
                'name_ar': 'العامل الحر',
                'name_fr': 'Auto-entrepreneur',
                'description_en': 'Self-employed professional or freelancer working independently.',
                'description_ar': 'مهني مستقل أو عامل حر يعمل بشكل مستقل.',
                'description_fr': 'Professionnel indépendant ou freelance travaillant de manière autonome.',
                'slug': 'auto-entrepreneur',
                'for_company': False
            },
            {
                'name_en': 'Managing Partner',
                'name_ar': 'شريك مدير',
                'name_fr': 'Associé Gérant',
                'description_en': 'Partner who also serves as the managing director of the company.',
                'description_ar': 'شريك يعمل أيضاً كمدير تنفيذي للشركة.',
                'description_fr': 'Associé qui exerce également les fonctions de gérant de la société.',
                'slug': 'associe-gerant',
                'for_company': False
            },
            {
                'name_en': 'Partner',
                'name_ar': 'شريك',
                'name_fr': 'Associé',
                'description_en': 'Business partner or shareholder in a company.',
                'description_ar': 'شريك تجاري أو مساهم في شركة.',
                'description_fr': 'Associé ou actionnaire dans une société.',
                'slug': 'associe',
                'for_company': False
            },
            {
                'name_en': 'Craftsman',
                'name_ar': 'حرفي',
                'name_fr': 'Artisan',
                'description_en': 'Skilled craftsman or artisan with specialized trade skills.',
                'description_ar': 'حرفي ماهر أو صانع بمهارات تجارية متخصصة.',
                'description_fr': 'Artisan qualifié avec des compétences de métier spécialisées.',
                'slug': 'artisan',
                'for_company': False
            },
            {
                'name_en': 'Architect',
                'name_ar': 'مهندس معماري',
                'name_fr': 'Architecte',
                'description_en': 'Professional architect designing buildings and structures.',
                'description_ar': 'مهندس معماري محترف يصمم المباني والهياكل.',
                'description_fr': 'Architecte professionnel concevant des bâtiments et structures.',
                'slug': 'architecte',
                'for_company': False
            },
            {
                'name_en': 'Lawyer',
                'name_ar': 'محامي',
                'name_fr': 'Avocat',
                'description_en': 'Legal professional providing legal counsel and representation.',
                'description_ar': 'مهني قانوني يقدم الاستشارات والتمثيل القانوني.',
                'description_fr': 'Professionnel du droit fournissant conseil et représentation juridiques.',
                'slug': 'avocat',
                'for_company': False
            },
            {
                'name_en': 'Business Owner',
                'name_ar': 'صاحب عمل',
                'name_fr': 'Chef d\'entreprise',
                'description_en': 'Owner and leader of a business enterprise.',
                'description_ar': 'مالك وقائد مؤسسة تجارية.',
                'description_fr': 'Propriétaire et dirigeant d\'une entreprise.',
                'slug': 'chef-entreprise',
                'for_company': False
            },
            {
                'name_en': 'Coach',
                'name_ar': 'مدرب',
                'name_fr': 'Coach',
                'description_en': 'Professional coach providing guidance and development support.',
                'description_ar': 'مدرب محترف يقدم التوجيه والدعم التطويري.',
                'description_fr': 'Coach professionnel fournissant accompagnement et soutien au développement.',
                'slug': 'coach',
                'for_company': False
            },
            {
                'name_en': 'Chartered Accountant',
                'name_ar': 'محاسب معتمد',
                'name_fr': 'Comptable agréé',
                'description_en': 'Certified accountant with professional accreditation.',
                'description_ar': 'محاسب معتمد مع اعتماد مهني.',
                'description_fr': 'Comptable certifié avec accréditation professionnelle.',
                'slug': 'comptable-agree',
                'for_company': False
            },
            {
                'name_en': 'Deputy General Manager',
                'name_ar': 'نائب المدير العام',
                'name_fr': 'DGA',
                'description_en': 'Deputy General Manager or Deputy CEO of a company.',
                'description_ar': 'نائب المدير العام أو نائب الرئيس التنفيذي للشركة.',
                'description_fr': 'Directeur Général Adjoint d\'une entreprise.',
                'slug': 'dga',
                'for_company': False
            },
            {
                'name_en': 'General Manager',
                'name_ar': 'المدير العام',
                'name_fr': 'DG/GM',
                'description_en': 'General Manager or CEO of a company.',
                'description_ar': 'المدير العام أو الرئيس التنفيذي للشركة.',
                'description_fr': 'Directeur Général ou CEO d\'une entreprise.',
                'slug': 'dg-gm',
                'for_company': False
            },
            {
                'name_en': 'Chartered Accountant',
                'name_ar': 'محاسب قانوني',
                'name_fr': 'Expert comptable',
                'description_en': 'Expert accountant with advanced professional qualifications.',
                'description_ar': 'محاسب خبير بمؤهلات مهنية متقدمة.',
                'description_fr': 'Expert comptable avec qualifications professionnelles avancées.',
                'slug': 'expert-comptable',
                'for_company': False
            },
            {
                'name_en': 'Manager',
                'name_ar': 'مدير',
                'name_fr': 'Gérant',
                'description_en': 'Manager or administrator of a business or department.',
                'description_ar': 'مدير أو مسؤول عن عمل أو قسم.',
                'description_fr': 'Gérant ou administrateur d\'une entreprise ou département.',
                'slug': 'gerant',
                'for_company': False
            },
            {
                'name_en': 'Doctor',
                'name_ar': 'طبيب',
                'name_fr': 'Médecin',
                'description_en': 'Medical doctor or physician.',
                'description_ar': 'طبيب أو ممارس طبي.',
                'description_fr': 'Médecin ou praticien médical.',
                'slug': 'medecin',
                'for_company': False
            },
            {
                'name_en': 'Notary',
                'name_ar': 'كاتب عدل',
                'name_fr': 'Notaire',
                'description_en': 'Notary public providing legal authentication services.',
                'description_ar': 'كاتب عدل يقدم خدمات المصادقة القانونية.',
                'description_fr': 'Notaire fournissant des services d\'authentification juridique.',
                'slug': 'notaire',
                'for_company': False
            },
            {
                'name_en': 'Pharmacist',
                'name_ar': 'صيدلي',
                'name_fr': 'Pharmacien',
                'description_en': 'Licensed pharmacist or pharmacy owner.',
                'description_ar': 'صيدلي مرخص أو مالك صيدلية.',
                'description_fr': 'Pharmacien diplômé ou propriétaire de pharmacie.',
                'slug': 'pharmacien',
                'for_company': False
            },
            {
                'name_en': 'CEO',
                'name_ar': 'الرئيس التنفيذي',
                'name_fr': 'PDG/CEO',
                'description_en': 'Chief Executive Officer or President of a company.',
                'description_ar': 'الرئيس التنفيذي أو رئيس الشركة.',
                'description_fr': 'Président Directeur Général ou CEO d\'une entreprise.',
                'slug': 'pdg-ceo',
                'for_company': False
            },
            {
                'name_en': 'Retired',
                'name_ar': 'متقاعد',
                'name_fr': 'Retraité',
                'description_en': 'Retired professional or business person.',
                'description_ar': 'مهني متقاعد أو رجل أعمال متقاعد.',
                'description_fr': 'Professionnel ou homme d\'affaires retraité.',
                'slug': 'retraite',
                'for_company': False
            },
            {
                'name_en': 'Startup',
                'name_ar': 'شركة ناشئة',
                'name_fr': 'StartUp',
                'description_en': 'Startup founder or entrepreneur.',
                'description_ar': 'مؤسس شركة ناشئة أو رجل أعمال.',
                'description_fr': 'Fondateur de startup ou entrepreneur.',
                'slug': 'startup',
                'for_company': False
            }
        ]

        # Create new functions
        created_functions = []
        
        for function_data in functions_data:
            function = Function.objects.create(**function_data)
            created_functions.append(function)

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {len(created_functions)} new working domain functions')
        )

        # Display created functions
        self.stdout.write('\nCreated working domain functions:')
        for i, function in enumerate(created_functions, 1):
            self.stdout.write(f'{i}. {function.name_en} (ID: {function.id}, Slug: {function.slug})')

        self.stdout.write(
            self.style.SUCCESS('\nWorking domain functions reset completed successfully!')
        ) 