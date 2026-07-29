from modeltranslation.translator import translator, TranslationOptions
from .models import Activity, Function


class ActivityTranslationOptions(TranslationOptions):
    fields = ('name', 'description')

class FunctionTranslationOptions(TranslationOptions):
    fields = ('name', 'description')


translator.register(Activity, ActivityTranslationOptions) 
translator.register(Function, FunctionTranslationOptions) 