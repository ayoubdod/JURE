from django.shortcuts import render
from rest_framework import viewsets,mixins
from rest_framework import permissions
from rest_framework.permissions import AllowAny
from .models import Contact, Activity, Function, Tag
from .serializers import ContactSerializer, ActivitySerializer, FunctionSerializer, TagSerializer

# Create your views here.

class ContactViewSet(mixins.CreateModelMixin,viewsets.GenericViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [AllowAny]


class ActivityViewSet(mixins.ListModelMixin,viewsets.GenericViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [AllowAny]

class FunctionViewSet(mixins.ListModelMixin,viewsets.GenericViewSet):
    queryset = Function.objects.all()
    serializer_class = FunctionSerializer
    permission_classes = [AllowAny]

class TagViewSet(mixins.ListModelMixin,mixins.CreateModelMixin,viewsets.GenericViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
