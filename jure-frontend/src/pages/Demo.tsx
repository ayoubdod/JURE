
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Play, Pause, RotateCcw, Zap, Shield, Users, BookOpen, FileText, Calendar, MessageSquare, Search, Brain, Scale } from 'lucide-react';

const Demo = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const demoSteps = [
    {
      title: "Tableau de bord intelligent",
      description: "Découvrez votre espace de travail personnalisé avec une vue d'ensemble de tous vos dossiers, tâches et rendez-vous.",
      icon: <Zap className="w-8 h-8" />,
      content: (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 h-80 relative overflow-hidden">
          <div className="grid grid-cols-3 gap-4 h-full">
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 shadow-sm animate-fade-in">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Dossier urgent</span>
                </div>
                <p className="text-xs text-gray-600">Contrat de vente immobilière</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm animate-fade-in animation-delay-200">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium">En cours</span>
                </div>
                <p className="text-xs text-gray-600">Divorce à l'amiable</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 shadow-sm animate-scale-in">
                <Calendar className="w-6 h-6 text-purple-600 mb-2" />
                <p className="text-sm font-medium">3 RDV aujourd'hui</p>
                <p className="text-xs text-gray-600">Prochain: 14h30</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm animate-scale-in animation-delay-300">
                <MessageSquare className="w-6 h-6 text-blue-600 mb-2" />
                <p className="text-sm font-medium">7 nouveaux messages</p>
              </div>
            </div>
           <div className="animated-gradient rounded-lg p-6 text-white animate-slide-in-right hover-lift pulse-glow shimmer-effect floating-particles relative">
  <div className="relative z-10">
    <div className="flex items-center mb-3">
      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.734.99A.996.996 0 0118 6v2a1 1 0 11-2 0v-.277l-1.254.145a1 1 0 11-.992-1.736L14.984 6l-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.723V12a1 1 0 11-2 0v-1.277l-1.246-.855a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.277l1.246.855a1 1 0 01-.372 1.364l-1.75-1A.996.996 0 013 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a.996.996 0 01-.52.878l-1.75 1a1 1 0 11-.372-1.364L16 14.277V12a1 1 0 011-1zm-9.618 4.504a1 1 0 01.372-1.364L9 13.848l1.254.716a1 1 0 01-.372 1.364l-1.75 1a.996.996 0 01-.992 0l-1.75-1z" clipRule="evenodd"></path>
        </svg>
      </div>
      <h3 className="font-bold text-lg">Assistant IA</h3>
    </div>
    <p className="text-sm opacity-90 mb-4 leading-relaxed">
      Prêt à vous aider avec vos recherches juridiques
    </p>
    <Button size="sm" className="bg-white text-purple-600 hover:bg-gray-100 hover:text-purple-700 hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">
      Démarrer
    </Button>
  </div>
</div>
          </div>
        </div>
      )
    },
    {
      title: "Assistant IA juridique",
      description: "L'IA de Jure vous aide dans vos recherches, analyses de contrats et rédaction de documents juridiques.",
      icon: <Brain className="w-8 h-8" />,
      content: (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 h-80 relative">
          <div className="flex h-full">
            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm animate-fade-in">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    U
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Peux-tu analyser ce contrat de bail et identifier les clauses problématiques ?</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg p-4 shadow-sm animate-fade-in animation-delay-500">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">J'ai analysé votre contrat. J'ai identifié 3 clauses potentiellement problématiques :</p>
                    <ul className="text-xs mt-2 space-y-1 opacity-90">
                      <li>• Clause de résiliation abusive (Art. 12)</li>
                      <li>• Dépôt de garantie non conforme (Art. 8)</li>
                      <li>• Charges non détaillées (Art. 15)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-32 ml-4 flex flex-col justify-center">
              <div className="bg-white rounded-lg p-3 shadow-sm text-center animate-scale-in animation-delay-1000">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Contrat analysé</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Gestion des dossiers",
      description: "Organisez vos affaires avec un système de gestion avancé, suivi des échéances et collaboration en équipe.",
      icon: <FileText className="w-8 h-8" />,
      content: (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 h-80">
          <div className="grid grid-cols-4 gap-4 h-full">
            <div className="col-span-3 space-y-3">
              <div className="bg-white rounded-lg p-4 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Affaire Dupont vs. Martin</h4>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">En cours</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Client</p>
                    <p className="font-medium">M. Dupont</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Type</p>
                    <p className="font-medium">Commercial</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Échéance</p>
                    <p className="font-medium text-orange-600">3 jours</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg p-3 shadow-sm animate-scale-in animation-delay-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs">Documents: 12</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm animate-scale-in animation-delay-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-xs">Tâches: 5</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm animate-scale-in animation-delay-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs">Notes: 8</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 shadow-sm animate-slide-in-right">
                <Users className="w-6 h-6 text-gray-400 mb-2" />
                <p className="text-xs font-medium">Équipe</p>
                <div className="flex -space-x-1 mt-2">
                  <div className="w-6 h-6 bg-purple-500 rounded-full border-2 border-white"></div>
                  <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
                  <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm animate-slide-in-right animation-delay-400">
                <Calendar className="w-6 h-6 text-gray-400 mb-2" />
                <p className="text-xs font-medium">Prochaine audience</p>
                <p className="text-xs text-gray-600">15 Nov 2024</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Bibliothèque juridique",
      description: "Accédez à une vaste base de données juridique avec recherche intelligente et références croisées.",
      icon: <BookOpen className="w-8 h-8" />,
      content: (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 h-80">
          <div className="flex h-full space-x-4">
            <div className="w-1/3 space-y-3">
              <div className="bg-white rounded-lg p-4 shadow-sm animate-fade-in">
                <Search className="w-6 h-6 text-gray-400 mb-3" />
                <div className="space-y-2">
                  <div className="bg-gray-100 rounded px-3 py-2 text-sm">
                    "responsabilité civile contractuelle"
                  </div>
                  <Button size="sm" className="w-full">
                    Rechercher
                  </Button>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm animate-fade-in animation-delay-300">
                <p className="text-xs font-medium text-gray-600 mb-2">Filtres</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" className="w-3 h-3" defaultChecked />
                    <span>Code civil</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" className="w-3 h-3" />
                    <span>Jurisprudence</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" className="w-3 h-3" />
                    <span>Doctrine</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="bg-white rounded-lg p-4 shadow-sm animate-slide-in-right">
                <div className="flex items-start space-x-3">
                  <Scale className="w-6 h-6 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-sm mb-1">Article 1147 du Code civil</h4>
                    <p className="text-xs text-gray-600 mb-2">
                      Le débiteur est condamné, s'il y a lieu, au paiement de dommages et intérêts...
                    </p>
                    <div className="flex space-x-2">
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Contrats</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Responsabilité</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm animate-slide-in-right animation-delay-300">
                <div className="flex items-start space-x-3">
                  <BookOpen className="w-6 h-6 text-orange-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-sm mb-1">Cass. Civ. 1ère, 15 mars 2023</h4>
                    <p className="text-xs text-gray-600 mb-2">
                      Arrêt de principe sur la responsabilité contractuelle en matière de...
                    </p>
                    <div className="flex space-x-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Jurisprudence</span>
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Récent</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Collaboration d'équipe",
      description: "Travaillez efficacement en équipe avec des outils de partage, commentaires et suivi des modifications.",
      icon: <Users className="w-8 h-8" />,
      content: (
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6 h-80">
          <div className="grid grid-cols-2 gap-6 h-full">
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm animate-fade-in">
                <h4 className="font-medium mb-3">Équipe sur l'affaire Martin</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      AH
                    </div>
                    <div>
                      <p className="text-sm font-medium">Ahmed Hassan</p>
                      <p className="text-xs text-gray-500">Avocat principal</p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full ml-auto"></div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      SB
                    </div>
                    <div>
                      <p className="text-sm font-medium">Sarah Benali</p>
                      <p className="text-xs text-gray-500">Collaboratrice</p>
                    </div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full ml-auto"></div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm animate-fade-in animation-delay-400">
                <h4 className="font-medium mb-3">Activité récente</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-8 bg-blue-500 rounded"></div>
                    <div>
                      <p><strong>Sarah</strong> a ajouté un commentaire</p>
                      <p className="text-gray-500">Il y a 5 min</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-8 bg-green-500 rounded"></div>
                    <div>
                      <p><strong>Ahmed</strong> a modifié le document</p>
                      <p className="text-gray-500">Il y a 1h</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm animate-slide-in-right">
                <h4 className="font-medium mb-3">Commentaires</h4>
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      <span className="text-xs font-medium">Sarah</span>
                      <span className="text-xs text-gray-500">14:30</span>
                    </div>
                    <p className="text-xs">Je pense qu'il faut revoir la clause 12. Qu'en pensez-vous ?</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                      <span className="text-xs font-medium">Ahmed</span>
                      <span className="text-xs text-gray-500">14:45</span>
                    </div>
                    <p className="text-xs">Bonne observation ! Je vais apporter les modifications.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm animate-slide-in-right animation-delay-300">
                <h4 className="font-medium mb-3">Permissions</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span>Lecture</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Tous</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Modification</span>
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">Équipe</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Administration</span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Ahmed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            if (currentStep < demoSteps.length - 1) {
              setCurrentStep(prev => prev + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 100;
            }
          }
          return prev + 2;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentStep, demoSteps.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setProgress(0);
    setIsPlaying(false);
  };

  const handleNext = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setProgress(0);
      setIsPlaying(false);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setProgress(0);
      setIsPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              Démonstration de Jure
            </h1>
            <p className="text-slate-600 mt-2">Découvrez comment Jure révolutionne votre pratique juridique</p>
          </div>
          <Button
            onClick={() => navigate('/signin')}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            Commencer maintenant
          </Button>
        </div>

        {/* Demo Navigation */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          {demoSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentStep(index);
                setProgress(0);
                setIsPlaying(false);
              }}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'bg-purple-600 scale-125'
                  : index < currentStep
                  ? 'bg-purple-400'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Main Demo Content */}
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 overflow-hidden">
            <CardHeader className="text-center bg-gradient-to-r from-purple-50 to-purple-100 border-b">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl flex items-center justify-center text-white">
                  {demoSteps[currentStep].icon}
                </div>
                <div>
                  <CardTitle className="text-2xl text-slate-900">
                    {demoSteps[currentStep].title}
                  </CardTitle>
                  <p className="text-slate-600 mt-1">
                    {demoSteps[currentStep].description}
                  </p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-600 to-purple-700 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              {demoSteps[currentStep].content}
              
              {/* Controls */}
              <div className="flex items-center justify-between mt-8">
                <Button
                  onClick={handlePrev}
                  variant="outline"
                  disabled={currentStep === 0}
                  className="border-slate-200"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Précédent
                </Button>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleRestart}
                    variant="outline"
                    size="sm"
                    className="border-slate-200"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handlePlayPause}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    size="sm"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                </div>
                
                <Button
                  onClick={handleNext}
                  variant="outline"
                  disabled={currentStep === demoSteps.length - 1}
                  className="border-slate-200"
                >
                  Suivant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feature highlights */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="bg-white/60 backdrop-blur-sm border-slate-200/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 text-center">
                <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">Sécurité maximale</h3>
                <p className="text-slate-600 text-sm">Vos données sont protégées par un chiffrement de niveau bancaire</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/60 backdrop-blur-sm border-slate-200/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 text-center">
                <Zap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">Performance optimisée</h3>
                <p className="text-slate-600 text-sm">Interface rapide et réactive pour une productivité maximale</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/60 backdrop-blur-sm border-slate-200/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">Collaboration fluide</h3>
                <p className="text-slate-600 text-sm">Travaillez en équipe efficacement avec des outils intégrés</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo;
