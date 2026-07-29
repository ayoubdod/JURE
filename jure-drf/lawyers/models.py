from django.db import models
from typing import TYPE_CHECKING
from django_extensions.db.models import TimeStampedModel

if TYPE_CHECKING:
    from users.models import User


class Specialization(TimeStampedModel):
    name = models.CharField(max_length=100, null=False, blank=False)
    description = models.TextField(null=False, blank=False)

class LawyerProfile(TimeStampedModel):
    user :models.OneToOneField['User'] = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='lawyer_profile')
    specialization :models.ForeignKey[Specialization] = models.ForeignKey(Specialization, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=100)
    bio = models.TextField(null=True, blank=True)
    years_of_experience = models.PositiveIntegerField(default=0)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)



