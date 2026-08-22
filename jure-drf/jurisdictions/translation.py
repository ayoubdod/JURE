from modeltranslation.translator import TranslationOptions, translator

from .models import Jurisdiction


class JurisdictionTranslationOptions(TranslationOptions):
    fields = ("name",)


translator.register(Jurisdiction, JurisdictionTranslationOptions)
