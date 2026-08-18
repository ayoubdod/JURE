from django.db import models
from django_extensions.db.models import TimeStampedModel
from django.core.validators import MinLengthValidator, EmailValidator
from phonenumber_field.modelfields import PhoneNumberField
from django.utils.text import slugify
from django_extensions.db.fields import AutoSlugField


# Create your models here.
class Contact(TimeStampedModel):

    name = models.CharField(max_length=255, validators=[MinLengthValidator(2)])
    email = models.EmailField()
    phone = PhoneNumberField(blank=True, null=True)
    company = models.CharField(max_length=255, blank=True, default="")
    subject = models.CharField(max_length=255, blank=True, default="")
    source = models.CharField(max_length=64, blank=True, default="contact")
    message = models.TextField(validators=[MinLengthValidator(10)])

    def __str__(self):
        return f"{self.name} <{self.email}>"


class Activity(TimeStampedModel):

    name = models.CharField(max_length=255, validators=[MinLengthValidator(2)])
    description = models.TextField(validators=[MinLengthValidator(10)])
    image = models.ImageField(upload_to='activities/',null=True,blank=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Function(TimeStampedModel):

    name = models.CharField(max_length=255, validators=[MinLengthValidator(2)])
    description = models.TextField(validators=[MinLengthValidator(10)])
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    for_company = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Tag(TimeStampedModel):

    slug = models.SlugField(max_length=255, unique=True)

    

