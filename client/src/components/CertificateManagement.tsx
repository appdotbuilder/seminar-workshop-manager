import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Certificate, Registration, Seminar, User, Attendance } from '../../../server/src/schema';

interface CertificateManagementProps {
  certificates: Certificate[];
  registrations: Registration[];
  seminars: Seminar[];
  users: User[];
  onCertificateUpdate: () => void;
}

export function CertificateManagement({ 
  certificates, 
  registrations, 
  seminars, 
  users, 
  onCertificateUpdate 
}: CertificateManagementProps) {
  const [selectedSeminar, setSelectedSeminar] = useState<number | 'all'>('all');
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load attendance records for a specific seminar
  const loadAttendanceForSeminar = useCallback(async (seminarId: number) => {
    if (seminarId === 0) return;
    
    setIsLoading(true);
    try {
      const attendance = await trpc.getAttendanceBySeminar.query({ seminar_id: seminarId });
      setAttendanceRecords(attendance);
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setAttendanceRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load attendance when seminar changes
  useEffect(() => {
    if (typeof selectedSeminar === 'number') {
      loadAttendanceForSeminar(selectedSeminar);
    } else {
      setAttendanceRecords([]);
    }
  }, [selectedSeminar, loadAttendanceForSeminar]);

  const handleGenerateCertificate = async (registrationId: number) => {
    setIsLoading(true);
    try {
      await trpc.generateCertificate.mutate({ registration_id: registrationId });
      onCertificateUpdate();
      
      // Reload attendance data if needed
      if (typeof selectedSeminar === 'number') {
        await loadAttendanceForSeminar(selectedSeminar);
      }
    } catch (error) {
      console.error('Failed to generate certificate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeminarTitle = (seminarId: number) => {
    const seminar = seminars.find((s: Seminar) => s.id === seminarId);
    return seminar ? seminar.title : 'Unknown Seminar';
  };

  const getParticipantName = (participantId: number) => {
    const participant = users.find((u: User) => u.id === participantId);
    return participant ? participant.name : 'Unknown Participant';
  };

  const getParticipantEmail = (participantId: number) => {
    const participant = users.find((u: User) => u.id === participantId);
    return participant ? participant.email : 'Unknown Email';
  };

  // Check if participant attended the seminar
  const hasAttended = (registrationId: number) => {
    const attendance = attendanceRecords.find((a: Attendance) => a.registration_id === registrationId);
    return attendance ? attendance.attended : false;
  };

  // Check if certificate already exists for registration
  const hasCertificate = (registrationId: number) => {
    return certificates.some((cert: Certificate) => cert.registration_id === registrationId);
  };

  // Get certificate for registration
  const getCertificate = (registrationId: number) => {
    return certificates.find((cert: Certificate) => cert.registration_id === registrationId);
  };

  // Get eligible registrations (attended participants)
  const getEligibleRegistrations = () => {
    if (selectedSeminar === 'all') return [];
    
    return registrations.filter((registration: Registration) => 
      registration.seminar_id === selectedSeminar && 
      ['approved', 'paid'].includes(registration.status) &&
      hasAttended(registration.id)
    );
  };

  // Filter registrations by search term
  const filteredRegistrations = getEligibleRegistrations().filter((registration: Registration) => {
    const participantName = getParticipantName(registration.participant_id).toLowerCase();
    const participantEmail = getParticipantEmail(registration.participant_id).toLowerCase();
    const matchesSearch = searchTerm === '' || 
      participantName.includes(searchTerm.toLowerCase()) ||
      participantEmail.includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Get seminars with attended participants
  const seminarsWithAttendees = seminars.filter((seminar: Seminar) => 
    registrations.some((reg: Registration) => 
      reg.seminar_id === seminar.id && 
      ['approved', 'paid'].includes(reg.status)
    )
  );

  const getCertificateStats = () => {
    if (selectedSeminar === 'all') {
      const totalCertificates = certificates.length;
      return { 
        eligible: 0, 
        issued: totalCertificates, 
        pending: 0,
        percentage: 0 
      };
    }
    
    const eligible = getEligibleRegistrations();
    const issued = eligible.filter((reg: Registration) => hasCertificate(reg.id)).length;
    const pending = eligible.length - issued;
    const percentage = eligible.length > 0 ? Math.round((issued / eligible.length) * 100) : 0;
    
    return { 
      eligible: eligible.length, 
      issued, 
      pending,
      percentage 
    };
  };

  const stats = getCertificateStats();

  const AllCertificatesView = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🏆 All Certificates Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-yellow-600 mb-2">{certificates.length}</div>
            <div className="text-gray-600">Total Certificates Issued</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {certificates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <div className="text-4xl mb-2">🏆</div>
                <div>No certificates have been issued yet.</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          certificates.map((certificate: Certificate) => {
            const registration = registrations.find((r: Registration) => r.id === certificate.registration_id);
            return (
              <Card key={certificate.id} className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">
                        🏆 Certificate #{certificate.id}
                      </h3>
                      {registration && (
                        <>
                          <div className="text-gray-700 mb-1">
                            👤 {getParticipantName(registration.participant_id)}
                          </div>
                          <div className="text-gray-600 mb-2">
                            📚 {getSeminarTitle(registration.seminar_id)}
                          </div>
                        </>
                      )}
                      <div className="text-sm text-gray-500">
                        Issued: {certificate.issue_date.toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-yellow-100 text-yellow-800 mb-2">
                        ✅ Issued
                      </Badge>
                      <div className="text-sm">
                        <a 
                          href={certificate.certificate_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          🔗 View Certificate
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">🏆 Certificate Management</h2>
      </div>

      {/* Seminar Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Seminar for Certificate Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedSeminar.toString()} 
            onValueChange={(value: string) => setSelectedSeminar(value === 'all' ? 'all' : parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a seminar or view all certificates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🏆 View All Certificates</SelectItem>
              {seminarsWithAttendees.map((seminar: Seminar) => (
                <SelectItem key={seminar.id} value={seminar.id.toString()}>
                  📚 {seminar.title} - {seminar.date.toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSeminar === 'all' ? (
        <AllCertificatesView />
      ) : (
        <>
          {/* Certificate Stats */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Certificate Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{stats.eligible}</div>
                  <div className="text-sm text-blue-800">Eligible for Certificate</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">{stats.issued}</div>
                  <div className="text-sm text-yellow-800">Certificates Issued</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
                  <div className="text-sm text-orange-800">Pending Issuance</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{stats.percentage}%</div>
                  <div className="text-sm text-green-800">Completion Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div>
            <Input
              placeholder="🔍 Search participants by name or email..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Certificate Generation List */}
          <div className="grid gap-4">
            {filteredRegistrations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    <div className="text-4xl mb-2">🏆</div>
                    <div>
                      {getEligibleRegistrations().length === 0 
                        ? 'No participants eligible for certificates.'
                        : 'No participants match your search criteria.'
                      }
                    </div>
                    <div className="text-sm mt-2">
                      Only participants who attended the seminar are eligible for certificates.
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredRegistrations.map((registration: Registration) => {
                const certificateExists = hasCertificate(registration.id);
                const certificate = getCertificate(registration.id);
                
                return (
                  <Card 
                    key={registration.id} 
                    className={`hover:shadow-md transition-shadow ${
                      certificateExists ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div>
                              <h3 className="text-lg font-semibold">
                                👤 {getParticipantName(registration.participant_id)}
                              </h3>
                              <div className="text-gray-600">
                                ✉️ {getParticipantEmail(registration.participant_id)}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              ✅ Attended
                            </Badge>
                            {certificateExists ? (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                🏆 Certificate Issued
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800">
                                ⏳ Certificate Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {certificateExists ? (
                            <div>
                              <div className="text-sm text-gray-500 mb-2">
                                Issued: {certificate?.issue_date.toLocaleDateString()}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => certificate && window.open(certificate.certificate_url, '_blank')}
                              >
                                🔗 View Certificate
                              </Button>
                            </div>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                                  🏆 Generate Certificate
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Generate Certificate</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Generate a certificate for {getParticipantName(registration.participant_id)} 
                                    for attending "{getSeminarTitle(registration.seminar_id)}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleGenerateCertificate(registration.id)}
                                    className="bg-yellow-600 hover:bg-yellow-700"
                                  >
                                    Generate
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Bulk Certificate Generation */}
          {filteredRegistrations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>⚡ Bulk Certificate Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={isLoading || filteredRegistrations.every((reg: Registration) => hasCertificate(reg.id))}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        🏆 Generate All Missing Certificates
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Generate All Certificates</AlertDialogTitle>
                        <AlertDialogDescription>
                          Generate certificates for all participants who attended this seminar but don't have certificates yet?
                          This will generate {filteredRegistrations.filter((reg: Registration) => !hasCertificate(reg.id)).length} certificates.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            filteredRegistrations.forEach((registration: Registration) => {
                              if (!hasCertificate(registration.id)) {
                                handleGenerateCertificate(registration.id);
                              }
                            });
                          }}
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          Generate All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Generate certificates for all eligible participants who don't have them yet.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}