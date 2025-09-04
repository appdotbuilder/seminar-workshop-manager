import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { 
  Seminar, 
  Registration, 
  Certificate, 
  CreateRegistrationInput,
  RegistrationType,
  RegistrationStatus 
} from '../../../server/src/schema';

interface ParticipantDashboardProps {
  userId: number;
  seminars: Seminar[];
  registrations: Registration[];
  certificates: Certificate[];
  onRegistrationUpdate: () => void;
}

export function ParticipantDashboard({ 
  userId, 
  seminars, 
  registrations, 
  certificates, 
  onRegistrationUpdate 
}: ParticipantDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userCertificates, setUserCertificates] = useState<Certificate[]>([]);

  // Load user's certificates
  const loadUserCertificates = useCallback(async () => {
    try {
      // Get user's registration IDs
      const userRegistrationIds = registrations.map((r: Registration) => r.id);
      
      // Filter certificates for user's registrations
      const filteredCertificates = certificates.filter((cert: Certificate) => 
        userRegistrationIds.includes(cert.registration_id)
      );
      
      setUserCertificates(filteredCertificates);
    } catch (error) {
      console.error('Failed to load certificates:', error);
    }
  }, [registrations, certificates]);

  useEffect(() => {
    loadUserCertificates();
  }, [loadUserCertificates]);

  const handleRegister = async (seminarId: number) => {
    setIsLoading(true);
    try {
      const input: CreateRegistrationInput = {
        seminar_id: seminarId,
        participant_id: userId,
        status: 'pending'
      };
      await trpc.createRegistration.mutate(input);
      onRegistrationUpdate();
    } catch (error) {
      console.error('Failed to register for seminar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRegistration = async (registrationId: number) => {
    setIsLoading(true);
    try {
      await trpc.cancelRegistration.mutate({ id: registrationId, status: 'cancelled' });
      onRegistrationUpdate();
    } catch (error) {
      console.error('Failed to cancel registration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRegistrationStatus = (seminarId: number): RegistrationStatus | null => {
    const registration = registrations.find((r: Registration) => r.seminar_id === seminarId);
    return registration ? registration.status : null;
  };

  const getRegistrationId = (seminarId: number): number | null => {
    const registration = registrations.find((r: Registration) => r.seminar_id === seminarId);
    return registration ? registration.id : null;
  };

  const getRegistrationTypeBadge = (type: RegistrationType) => {
    switch (type) {
      case 'free':
        return <Badge className="bg-green-100 text-green-800">🆓 Free</Badge>;
      case 'approval_required':
        return <Badge className="bg-orange-100 text-orange-800">✋ Approval Required</Badge>;
      case 'payment_required':
        return <Badge className="bg-blue-100 text-blue-800">💳 Payment Required</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: RegistrationStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">✅ Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">❌ Rejected</Badge>;
      case 'paid':
        return <Badge className="bg-blue-100 text-blue-800">💳 Paid</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">🚫 Cancelled</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  // Filter available seminars (not registered or cancelled)
  const availableSeminars = seminars.filter((seminar: Seminar) => {
    const status = getRegistrationStatus(seminar.id);
    const matchesSearch = searchTerm === '' || 
      seminar.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seminar.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return (!status || status === 'cancelled') && matchesSearch;
  });

  // Get user's registered seminars
  const registeredSeminars = seminars.filter((seminar: Seminar) => {
    const status = getRegistrationStatus(seminar.id);
    return status && status !== 'cancelled';
  });

  // Get user's certificates with seminar info
  const certificatesWithSeminar = userCertificates.map((cert: Certificate) => {
    const registration = registrations.find((r: Registration) => r.id === cert.registration_id);
    const seminar = registration ? seminars.find((s: Seminar) => s.id === registration.seminar_id) : null;
    return { ...cert, seminar, registration };
  });

  const getActionButton = (seminar: Seminar) => {
    const status = getRegistrationStatus(seminar.id);
    const registrationId = getRegistrationId(seminar.id);
    
    if (!status || status === 'cancelled') {
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              📝 Register Now
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Register for Seminar</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to register for "{seminar.title}"?
                {seminar.registration_type === 'approval_required' && (
                  <div className="mt-2 p-2 bg-orange-50 rounded text-orange-800">
                    ⚠️ This seminar requires approval. Your registration will be pending until approved by an administrator.
                  </div>
                )}
                {seminar.registration_type === 'payment_required' && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-blue-800">
                    💳 This seminar requires payment of ${seminar.cost?.toFixed(2)}. Your registration will be pending until payment is confirmed.
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleRegister(seminar.id)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Confirm Registration
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    
    if (['pending', 'approved', 'paid'].includes(status) && registrationId) {
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              🚫 Cancel Registration
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Registration</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel your registration for "{seminar.title}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Registration</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleCancelRegistration(registrationId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Cancel Registration
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">👤 Participant Dashboard</h2>
        <p className="text-gray-600">Browse and register for seminars and workshops</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{registeredSeminars.length}</div>
            <div className="text-sm text-gray-600">📚 Registered Seminars</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {registrations.filter((r: Registration) => ['approved', 'paid'].includes(r.status)).length}
            </div>
            <div className="text-sm text-gray-600">✅ Confirmed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{userCertificates.length}</div>
            <div className="text-sm text-gray-600">🏆 Certificates</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">🛍️ Available Seminars</TabsTrigger>
          <TabsTrigger value="registered">📚 My Registrations</TabsTrigger>
          <TabsTrigger value="certificates">🏆 My Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          <div className="space-y-4">
            <div>
              <Input
                placeholder="🔍 Search seminars by title or description..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid gap-4">
              {availableSeminars.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-500">
                      <div className="text-4xl mb-2">🔍</div>
                      <div>
                        {seminars.length === 0 
                          ? 'No seminars available at the moment.'
                          : 'No seminars match your search criteria.'
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                availableSeminars.map((seminar: Seminar) => (
                  <Card key={seminar.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{seminar.title}</CardTitle>
                          <div className="flex gap-2 mt-2">
                            {getRegistrationTypeBadge(seminar.registration_type)}
                            {seminar.cost && seminar.cost > 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                💰 ${seminar.cost.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {getActionButton(seminar)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">{seminar.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-gray-700">📅 Date</div>
                          <div>{seminar.date.toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">🕐 Time</div>
                          <div>{seminar.time}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">📍 Location</div>
                          <div>{seminar.location}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">👥 Capacity</div>
                          <div>{seminar.capacity} participants</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="registered">
          <div className="grid gap-4">
            {registeredSeminars.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    <div className="text-4xl mb-2">📚</div>
                    <div>You haven't registered for any seminars yet.</div>
                    <div className="text-sm mt-2">Browse available seminars to get started!</div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              registeredSeminars.map((seminar: Seminar) => {
                const status = getRegistrationStatus(seminar.id)!;
                const registration = registrations.find((r: Registration) => r.seminar_id === seminar.id)!;
                
                return (
                  <Card key={seminar.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{seminar.title}</CardTitle>
                          <div className="flex gap-2 mt-2">
                            {getStatusBadge(status)}
                            {getRegistrationTypeBadge(seminar.registration_type)}
                          </div>
                        </div>
                        {getActionButton(seminar)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">{seminar.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-gray-700">📅 Date</div>
                          <div>{seminar.date.toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">🕐 Time</div>
                          <div>{seminar.time}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">📍 Location</div>
                          <div>{seminar.location}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">📝 Registered</div>
                          <div>{registration.registration_date.toLocaleDateString()}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="certificates">
          <div className="grid gap-4">
            {certificatesWithSeminar.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    <div className="text-4xl mb-2">🏆</div>
                    <div>You don't have any certificates yet.</div>
                    <div className="text-sm mt-2">Attend seminars to earn certificates!</div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              certificatesWithSeminar.map((cert) => (
                <Card key={cert.id} className="border-yellow-200 bg-yellow-50 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">
                          🏆 Certificate of Attendance
                        </h3>
                        <div className="text-gray-700 mb-2">
                          📚 {cert.seminar?.title || 'Unknown Seminar'}
                        </div>
                        <div className="text-gray-600 mb-2">
                          📅 Seminar Date: {cert.seminar?.date.toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          🏆 Certificate Issued: {cert.issue_date.toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-yellow-100 text-yellow-800 mb-2">
                          ✅ Certified
                        </Badge>
                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(cert.certificate_url, '_blank')}
                          >
                            🔗 View Certificate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}