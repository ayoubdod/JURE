
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Clock } from 'lucide-react';
import { Link } from 'react-router';

const VerificationPending = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Inscription soumise avec succès !</CardTitle>
          <CardDescription>
            Votre demande d'inscription a été transmise à notre équipe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <Mail className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                Vérification de votre email
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Un email de vérification a été envoyé à votre adresse email. 
                Veuillez cliquer sur le lien dans l'email pour activer votre compte.
              </p>
              <div className="bg-white border rounded p-4 text-left">
                <p className="text-sm text-gray-700">
                  <strong>Objet :</strong> Inscription Jure
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  Bonjour [Prénom] [Nom] !
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  Félicitations pour la création de votre compte Jure. Pour finaliser votre souscription, 
                  il vous suffit de l'activer depuis le lien ci-dessous :
                </p>
                <p className="text-sm text-blue-600 mt-2">[Lien d'activation]</p>
                <p className="text-sm text-gray-700 mt-2">
                  À très bientôt,<br />
                  L'équipe Jure
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                Examen de votre dossier
              </h3>
              <p className="text-gray-600 text-sm">
                <strong>Vos données sont bien prises en compte.</strong> Une confirmation vous sera envoyée 
                par email dès mise à jour de votre compte.
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Délai de traitement : maximum 48 heures
              </p>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Email d'activation final</h4>
              <p className="text-sm text-gray-600 mb-2">
                Une fois votre compte validé par notre équipe, vous recevrez :
              </p>
              <div className="bg-white border rounded p-3 text-left text-sm">
                <p><strong>Objet :</strong> Activation de votre compte Jure</p>
                <p className="mt-1">Bonjour [Prénom] [Nom] !</p>
                <p className="mt-1">
                  "Nous avons le plaisir de vous informer que votre profil est désormais à jour. 
                  Nous vous invitons à le consulter rapidement en vous connectant sur votre espace."
                </p>
                <p className="mt-1">L'équipe Jure</p>
                <p className="text-blue-600 mt-1">[Lien de connexion]</p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Vous n'avez pas reçu l'email ? Vérifiez votre dossier spam ou contactez notre support.
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" asChild>
                <Link to="/signin">
                  Retour à la connexion
                </Link>
              </Button>
              <Button variant="outline">
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
