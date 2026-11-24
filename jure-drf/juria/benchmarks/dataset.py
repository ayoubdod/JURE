"""
Synthetic multilingual legal retrieval corpus (Phase 5A).

All passages are fictional / anonymized. No client data.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

QueryType = Literal[
    "exact",
    "synonym",
    "paraphrase",
    "natural",
    "incomplete",
    "multi_doc",
    "noisy_ocr",
    "multi_page",
]


@dataclass(frozen=True)
class Passage:
    doc_id: str
    doc_name: str
    page: int
    text: str
    lang: str
    domain: str  # contract | litigation | employment | corporate | regulatory
    tags: tuple[str, ...] = ()


@dataclass(frozen=True)
class GoldHit:
    doc_id: str
    page: int
    relevance: int = 2  # 2=exact page, 1=same doc other page


@dataclass(frozen=True)
class BenchmarkQuery:
    qid: str
    query: str
    lang: str
    query_type: QueryType
    gold: tuple[GoldHit, ...]
    notes: str = ""


@dataclass(frozen=True)
class BenchmarkDataset:
    passages: tuple[Passage, ...]
    queries: tuple[BenchmarkQuery, ...]
    name: str = "jure_legal_retrieval_v1"


def build_dataset() -> BenchmarkDataset:
    passages: list[Passage] = [
        # --- French contracts ---
        Passage(
            "fr_contrat_prestation",
            "contrat-prestation-synthetique.pdf",
            1,
            "Le présent contrat de prestation de services définit les obligations "
            "réciproques du prestataire et du client, notamment les livrables et délais.",
            "fr",
            "contract",
            ("obligations",),
        ),
        Passage(
            "fr_contrat_prestation",
            "contrat-prestation-synthetique.pdf",
            4,
            "Article 12 — Résiliation anticipée. Chacune des parties peut résilier "
            "le contrat moyennant un préavis écrit de trente (30) jours. En cas de "
            "faute grave, la résiliation peut être immédiate.",
            "fr",
            "contract",
            ("resiliation", "preavis"),
        ),
        Passage(
            "fr_contrat_prestation",
            "contrat-prestation-synthetique.pdf",
            7,
            "Les pénalités de retard sont fixées à un pour cent (1 %) du montant "
            "HT de la facture concernée par semaine de retard, plafonnées à dix pour cent.",
            "fr",
            "contract",
            ("penalites",),
        ),
        Passage(
            "fr_bail_commercial",
            "bail-commercial-synthetique.pdf",
            2,
            "Le dépôt de garantie est égal à trois mois de loyer hors taxes. "
            "Il sera restitué dans les trois mois suivant la restitution des locaux.",
            "fr",
            "contract",
            ("depot_garantie",),
        ),
        Passage(
            "fr_bail_commercial",
            "bail-commercial-synthetique.pdf",
            5,
            "Toute sous-location totale ou partielle est interdite sans accord écrit préalable du bailleur.",
            "fr",
            "contract",
            ("sous_location",),
        ),
        # --- French litigation ---
        Passage(
            "fr_mise_en_demeure",
            "mise-en-demeure-synthetique.pdf",
            1,
            "Par la présente mise en demeure, nous vous sommons de régler la somme "
            "de cent vingt mille dirhams (120 000 MAD) dans un délai de huit jours, "
            "faute de quoi des poursuites judiciaires seront engagées.",
            "fr",
            "litigation",
            ("paiement",),
        ),
        Passage(
            "fr_conclusions",
            "conclusions-demandeur-synthetique.pdf",
            3,
            "Le demandeur conclut à la résolution du contrat pour inexécution "
            "et à l'allocation de dommages-intérêts compensatoires.",
            "fr",
            "litigation",
            ("resolution", "dommages"),
        ),
        # --- French employment ---
        Passage(
            "fr_contrat_travail",
            "contrat-travail-cdi-synthetique.pdf",
            2,
            "La période d'essai est de trois mois, renouvelable une fois. "
            "Le salarié bénéficie d'un préavis de démission de deux mois.",
            "fr",
            "employment",
            ("essai", "preavis"),
        ),
        Passage(
            "fr_contrat_travail",
            "contrat-travail-cdi-synthetique.pdf",
            6,
            "Une clause de non-concurrence d'une durée de douze mois s'applique "
            "sur le territoire du Maroc, moyennant une contrepartie financière mensuelle.",
            "fr",
            "employment",
            ("non_concurrence",),
        ),
        # --- French corporate / regulatory ---
        Passage(
            "fr_statuts_sarl",
            "statuts-sarl-synthetique.pdf",
            4,
            "Le capital social est fixé à cent mille (100 000) dirhams, "
            "divisé en mille parts sociales de cent dirhams chacune.",
            "fr",
            "corporate",
            ("capital",),
        ),
        Passage(
            "fr_reglement_interieur",
            "reglement-interieur-synthetique.pdf",
            1,
            "Conformément à la réglementation applicable en matière de protection "
            "des données personnelles, tout traitement doit reposer sur une base légale.",
            "fr",
            "regulatory",
            ("donnees",),
        ),
        # --- Arabic contracts / litigation ---
        Passage(
            "ar_contrat_kira",
            "عقد-كراء-تجريبي.pdf",
            1,
            "عقد الكراء التجاري يحدد الوجيبة الكرائية الشهرية وشرط الفسخ عند عدم الأداء.",
            "ar",
            "contract",
            ("kira", "faskh"),
        ),
        Passage(
            "ar_contrat_kira",
            "عقد-كراء-تجريبي.pdf",
            3,
            "يلتزم المكتري بأداء مبلغ الضمانة يعادل ثلاثة أشهر من الوجيبة الكرائية.",
            "ar",
            "contract",
            ("damana",),
        ),
        Passage(
            "ar_hukm",
            "حكم-ابتدائي-تجريبي.pdf",
            2,
            "قضت المحكمة الابتدائية بفسخ العقد وبأداء تعويض عن الضرر قدره خمسون ألف درهم.",
            "ar",
            "litigation",
            ("hukm", "taawid"),
        ),
        Passage(
            "ar_aamal",
            "عقد-شغل-تجريبي.pdf",
            1,
            "مدة فترة التجربة ثلاثة أشهر. يمكن إنهاء عقد الشغل بإشعار مسبق وفق مدونة الشغل.",
            "ar",
            "employment",
            ("shughl",),
        ),
        Passage(
            "ar_sharika",
            "نظام-أساسي-ش.م.م-تجريبي.pdf",
            2,
            "رأس مال الشركة محدد في مائة ألف درهم مقسم إلى ألف حصة اجتماعية.",
            "ar",
            "corporate",
            ("ras_mal",),
        ),
        # --- English ---
        Passage(
            "en_msa",
            "master-services-agreement-synthetic.pdf",
            2,
            "Either party may terminate this agreement for convenience upon thirty (30) days' prior written notice.",
            "en",
            "contract",
            ("terminate",),
        ),
        Passage(
            "en_msa",
            "master-services-agreement-synthetic.pdf",
            5,
            "Liquidated damages of one percent (1%) of the overdue invoice amount apply for each week of delay, capped at ten percent.",
            "en",
            "contract",
            ("liquidated",),
        ),
        Passage(
            "en_employment",
            "employment-agreement-synthetic.pdf",
            3,
            "The employee is subject to a twelve-month non-compete covenant covering Morocco, subject to monthly consideration.",
            "en",
            "employment",
            ("noncompete",),
        ),
        Passage(
            "en_nda",
            "nda-synthetic.pdf",
            1,
            "Confidential information shall not be disclosed to third parties without prior written consent, except as required by law.",
            "en",
            "contract",
            ("confidential",),
        ),
        # --- Noisy OCR (French) ---
        Passage(
            "fr_ocr_noisy",
            "scan-contrat-bruité.pdf",
            1,
            "Cl@use de résiIiation anticlpée — préavls de trentc (30) j0urs. "
            "En cas de faute gr@ve, résiliatlon immédiate.",
            "fr",
            "contract",
            ("ocr_noise", "resiliation"),
        ),
        Passage(
            "fr_ocr_noisy",
            "scan-contrat-bruité.pdf",
            2,
            "PénaIités de rctard: 1 % du mont@nt HT par semalne, plafond 10 %.",
            "fr",
            "contract",
            ("ocr_noise", "penalites"),
        ),
        # Distractors
        Passage(
            "fr_distractor_fournitures",
            "catalogue-fournitures.pdf",
            1,
            "Liste de stylos, agrafeuses et ramettes de papier A4 pour le bureau.",
            "fr",
            "contract",
            ("distractor",),
        ),
        Passage(
            "en_distractor_menu",
            "office-canteen-menu.pdf",
            1,
            "Monday lunch special: chicken sandwich and seasonal salad.",
            "en",
            "contract",
            ("distractor",),
        ),
    ]

    queries: list[BenchmarkQuery] = [
        # A — Exact keyword
        BenchmarkQuery(
            "A1",
            "résiliation anticipée préavis trente jours",
            "fr",
            "exact",
            (GoldHit("fr_contrat_prestation", 4),),
        ),
        BenchmarkQuery(
            "A2",
            "شرط الفسخ الوجيبة الكرائية",
            "ar",
            "exact",
            (GoldHit("ar_contrat_kira", 1),),
        ),
        BenchmarkQuery(
            "A3",
            "liquidated damages overdue invoice",
            "en",
            "exact",
            (GoldHit("en_msa", 5),),
        ),
        BenchmarkQuery(
            "A4",
            "dépôt de garantie trois mois de loyer",
            "fr",
            "exact",
            (GoldHit("fr_bail_commercial", 2),),
        ),
        # B — Synonym
        BenchmarkQuery(
            "B1",
            "comment mettre fin au contrat avant terme",
            "fr",
            "synonym",
            (GoldHit("fr_contrat_prestation", 4),),
            "synonym of résiliation anticipée",
        ),
        BenchmarkQuery(
            "B2",
            "end the agreement early notice period",
            "en",
            "synonym",
            (GoldHit("en_msa", 2),),
            "synonym of terminate for convenience",
        ),
        BenchmarkQuery(
            "B3",
            "غرامة التأخير على الفاتورة",
            "ar",
            "synonym",
            (GoldHit("ar_hukm", 2, relevance=1), GoldHit("fr_contrat_prestation", 7, relevance=1)),
            "Arabic synonym for delay penalty — gold may be weak; primary Arabic judgment damages",
        ),
        BenchmarkQuery(
            "B4",
            "interdiction de louer à un tiers",
            "fr",
            "synonym",
            (GoldHit("fr_bail_commercial", 5),),
            "synonym of sous-location",
        ),
        # C — Paraphrase
        BenchmarkQuery(
            "C1",
            "Quelles sont les conditions pour rompre le contrat de prestation immédiatement ?",
            "fr",
            "paraphrase",
            (GoldHit("fr_contrat_prestation", 4),),
        ),
        BenchmarkQuery(
            "C2",
            "What happens if the supplier delivers late under the master agreement?",
            "en",
            "paraphrase",
            (GoldHit("en_msa", 5),),
        ),
        BenchmarkQuery(
            "C3",
            "ما هي آثار الحكم المتعلق بفسخ العقد والتعويض؟",
            "ar",
            "paraphrase",
            (GoldHit("ar_hukm", 2),),
        ),
        BenchmarkQuery(
            "C4",
            "Le salarié peut-il être empêché de travailler chez un concurrent après son départ ?",
            "fr",
            "paraphrase",
            (GoldHit("fr_contrat_travail", 6),),
        ),
        # D — Natural language
        BenchmarkQuery(
            "D1",
            "Combien vaut le capital de la SARL dans les statuts ?",
            "fr",
            "natural",
            (GoldHit("fr_statuts_sarl", 4),),
        ),
        BenchmarkQuery(
            "D2",
            "How long is the non-compete in the employment agreement?",
            "en",
            "natural",
            (GoldHit("en_employment", 3),),
        ),
        BenchmarkQuery(
            "D3",
            "كم مدة فترة التجربة في عقد الشغل؟",
            "ar",
            "natural",
            (GoldHit("ar_aamal", 1),),
        ),
        # E — Incomplete terminology
        BenchmarkQuery(
            "E1",
            "clause non-concurrence Maroc",
            "fr",
            "incomplete",
            (GoldHit("fr_contrat_travail", 6), GoldHit("en_employment", 3, relevance=1)),
        ),
        BenchmarkQuery(
            "E2",
            "mise en demeure paiement",
            "fr",
            "incomplete",
            (GoldHit("fr_mise_en_demeure", 1),),
        ),
        BenchmarkQuery(
            "E3",
            "confidential third parties",
            "en",
            "incomplete",
            (GoldHit("en_nda", 1),),
        ),
        # F — Multi-document
        BenchmarkQuery(
            "F1",
            "Compare les règles de préavis de résiliation et de démission",
            "fr",
            "multi_doc",
            (
                GoldHit("fr_contrat_prestation", 4),
                GoldHit("fr_contrat_travail", 2),
            ),
        ),
        BenchmarkQuery(
            "F2",
            "pénalités de retard et liquidated damages",
            "fr",
            "multi_doc",
            (
                GoldHit("fr_contrat_prestation", 7),
                GoldHit("en_msa", 5),
            ),
        ),
        # G — Noisy OCR
        BenchmarkQuery(
            "G1",
            "résiliation anticipée préavis trente jours",
            "fr",
            "noisy_ocr",
            (
                GoldHit("fr_contrat_prestation", 4, relevance=2),
                GoldHit("fr_ocr_noisy", 1, relevance=2),
            ),
            "Should surface clean and/or noisy OCR page",
        ),
        BenchmarkQuery(
            "G2",
            "pénalités de retard un pour cent",
            "fr",
            "noisy_ocr",
            (
                GoldHit("fr_contrat_prestation", 7, relevance=2),
                GoldHit("fr_ocr_noisy", 2, relevance=1),
            ),
        ),
        # H — Multi-page evidence
        BenchmarkQuery(
            "H1",
            "obligations du prestataire et pénalités de retard",
            "fr",
            "multi_page",
            (
                GoldHit("fr_contrat_prestation", 1),
                GoldHit("fr_contrat_prestation", 7),
            ),
        ),
        BenchmarkQuery(
            "H2",
            "الوجيبة الكرائية ومبلغ الضمانة",
            "ar",
            "multi_page",
            (
                GoldHit("ar_contrat_kira", 1),
                GoldHit("ar_contrat_kira", 3),
            ),
        ),
        BenchmarkQuery(
            "H3",
            "termination for convenience and liquidated damages",
            "en",
            "multi_page",
            (
                GoldHit("en_msa", 2),
                GoldHit("en_msa", 5),
            ),
        ),
        # Extra regulatory / corporate
        BenchmarkQuery(
            "D4",
            "protection des données personnelles base légale",
            "fr",
            "natural",
            (GoldHit("fr_reglement_interieur", 1),),
        ),
        BenchmarkQuery(
            "D5",
            "رأس مال الشركة مائة ألف درهم",
            "ar",
            "exact",
            (GoldHit("ar_sharika", 2),),
        ),
        BenchmarkQuery(
            "C5",
            "Le demandeur veut-il la résolution du contrat et des dommages-intérêts ?",
            "fr",
            "paraphrase",
            (GoldHit("fr_conclusions", 3),),
        ),
    ]

    return BenchmarkDataset(passages=tuple(passages), queries=tuple(queries))


# Legal synonym expansion for improved lexical / pseudo-hybrid (offline only).
LEGAL_SYNONYMS: dict[str, set[str]] = {
    # FR
    "résiliation": {"résilier", "rompre", "résolu", "résolution", "mettre", "fin", "terme", "anticipée"},
    "résilier": {"résiliation", "rompre", "fin"},
    "rompre": {"résiliation", "résilier"},
    "préavis": {"notice", "délai", "notification"},
    "pénalités": {"pénalité", "amende", "sanction", "retard", "liquidated", "damages"},
    "sous-location": {"sous", "location", "louer", "tiers", "interdiction"},
    "non-concurrence": {"concurrent", "concurrence", "noncompete", "covenant"},
    "dépôt": {"garantie", "caution", "damana"},
    "garantie": {"dépôt", "caution"},
    # EN
    "terminate": {"termination", "end", "cancel", "early", "convenience"},
    "termination": {"terminate", "end", "cancel"},
    "liquidated": {"damages", "penalty", "delay", "pénalités"},
    "confidential": {"disclosure", "nda", "third", "parties"},
    "non-compete": {"noncompete", "concurrence", "covenant"},
    # AR (normalized forms without diacritics)
    "فسخ": {"إنهاء", "إلغاء", "شرط"},
    "الوجيبة": {"كراء", "أداء", "إيجار"},
    "الكرائية": {"كراء", "إيجار"},
    "الضمانة": {"ضمان", "تأمين"},
    "تعويض": {"ضرر", "غرامة"},
    "التجربة": {"اختبار", "فترة"},
}
