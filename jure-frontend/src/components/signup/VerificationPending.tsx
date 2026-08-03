
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Clock } from 'lucide-react';
import { Link } from 'react-router';

const VerificationPending = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="landing-glass border-0 shadow-none ring-1 ring-[#64499D]/12 dark:ring-[#8B6FD1]/20">
        <CardHeader className="text-center bg-gradient-to-r from-[#F4F1FF]/80 to-transparent dark:from-[#64499D]/15 dark:to-transparent border-b border-[#64499D]/10 dark:border-[#8B6FD1]/20">
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#64499D] to-[#4D3680] rounded-2xl shadow-lg">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display text-slate-900 dark:text-slate-100">Inscription soumise avec succès !</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Votre demande d'inscription a été transmise à notre équipe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="text-center">
            <div className="bg-gradient-to-r from-[#F4F1FF]/60 to-transparent dark:from-[#64499D]/10 dark:to-transparent border border-[#64499D]/15 dark:border-[#8B6FD1]/20 rounded-xl p-6">
              <Mail className="h-8 w-8 text-[#64499D] dark:text-[#8B6FD1] mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Vérification de votre email
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                Un email de vérification a été envoyé à votre adresse email. 
                Veuillez cliquer sur le lien dans l'email pour activer votre compte.
              </p>
              <div className="landing-glass border-0 ring-1 ring-[#64499D]/10 dark:ring-[#8B6FD1]/20 rounded-lg p-4 text-left">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>Objet :</strong> Inscription Jure
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                  Bonjour [Prénom] [Nom] !
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                  Félicitations pour la création de votre compte Jure. Pour finaliser votre souscription, 
                  il vous suffit de l'activer depuis le lien ci-dessous :
                </p>
                <p className="text-sm text-[#64499D] dark:text-[#CFC2FF] mt-2">[Lien d'activation]</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                  À très bientôt,<br />
                  L'équipe Jure
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-gradient-to-r from-amber-50/60 to-transparent dark:from-amber-500/10 dark:to-transparent border border-amber-200/80 dark:border-amber-500/30 rounded-xl p-6">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Examen de votre dossier
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                <strong className="text-slate-800 dark:text-slate-200">Vos données sont bien prises en compte.</strong> Une confirmation vous sera envoyée 
                par email dès mise à jour de votre compte.
              </p>
              <p className="text-slate-500 dark:text-slate-500 text-xs mt-2">
                Délai de traitement : maximum 48 heures
              </p>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-gradient-to-r from-emerald-50/60 to-transparent dark:from-emerald-500/10 dark:to-transparent border border-emerald-200/80 dark:border-emerald-500/30 rounded-xl p-4">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Email d'activation final</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Une fois votre compte validé par notre équipe, vous recevrez :
              </p>
              <div className="landing-glass border-0 ring-1 ring-[#64499D]/10 dark:ring-[#8B6FD1]/20 rounded-lg p-3 text-left text-sm text-slate-700 dark:text-slate-300">
                <p><strong>Objet :</strong> Activation de votre compte Jure</p>
                <p className="mt-1">Bonjour [Prénom] [Nom] !</p>
                <p className="mt-1">
                  "Nous avons le plaisir de vous informer que votre profil est désormais à jour. 
                  Nous vous invitons à le consulter rapidement en vous connectant sur votre espace."
                </p>
                <p className="mt-1">L'équipe Jure</p>
                <p className="text-[#64499D] dark:text-[#CFC2FF] mt-1">[Lien de connexion]</p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Vous n'avez pas reçu l'email ? Vérifiez votre dossier spam ou contactez notre support.
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" asChild className="border-[#64499D]/30 text-[#64499D] dark:text-[#CFC2FF] hover:bg-[#64499D]/10 dark:hover:bg-[#64499D]/20">
                <Link to="/signin">
                  Retour à la connexion
                </Link>
              </Button>
              <Button variant="outline" className="border-[#64499D]/30 text-[#64499D] dark:text-[#CFC2FF] hover:bg-[#64499D]/10 dark:hover:bg-[#64499D]/20">
                Renvoyer l'email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationPending;
