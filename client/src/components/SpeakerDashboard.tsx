import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import type { Seminar, Registration, User } from '../../../server/src/schema';

interface SpeakerDashboardProps {
  userId: number;
  seminars: Seminar[];
  registrations: Registration[];
  users: User[];
}

export function SpeakerDashboard({ userId, seminars, registrations, users }: SpeakerDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter seminars by search term
  const filteredSeminars = seminars.filter((seminar: Seminar) => {
    const matchesSearch = searchTerm === '' || 
      seminar.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seminar.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getParticipantName = (participantId: number) => {
    const participant = users.find((u: User) => u.id === participantId);
    return participant ? participant.name : 'Unknown Participant';
  };

  const getParticipantEmail = (participantId: number) => {
    const participant = users.find((u: User) => u.id === participantId);
    return participant ? participant.email : 'Unknown Email';
  };

  const getSeminarRegistrations = (seminarId: number) => {
    return registrations.filter((reg: Registration) => 
      reg.seminar_id === seminarId && 
      ['approved', 'paid'].includes(reg.status)
    );
  };

  const getRegistrationStats = (seminarId: number) => {
    const allRegs = registrations.filter((reg: Registration) => reg.seminar_id === seminarId);
    const confirmed = allRegs.filter((reg: Registration) => ['approved', 'paid'].includes(reg.status));
    const pending = allRegs.filter((reg: Registration) => reg.status === 'pending');
    
    return {
      total: allRegs.length,
      confirmed: confirmed.length,
      pending: pending.length
    };
  };

  const getUpcomingSeminars = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filteredSeminars.filter((seminar: Seminar) => seminar.date >= today);
  };

  const getPastSeminars = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filteredSeminars.filter((seminar: Seminar) => seminar.date < today);
  };

  const SeminarCard = ({ seminar }: { seminar: Seminar }) => {
    const stats = getRegistrationStats(seminar.id);
    const participants = getSeminarRegistrations(seminar.id);
    const isUpcoming = seminar.date >= new Date();
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">{seminar.title}</CardTitle>
              <div className="flex gap-2 mt-2">
                {isUpcoming ? (
                  <Badge className="bg-blue-100 text-blue-800">📅 Upcoming</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800">✅ Completed</Badge>
                )}
                <Badge className="bg-green-100 text-green-800">
                  👥 {stats.confirmed}/{seminar.capacity}
                </Badge>
                {stats.pending > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    ⏳ {stats.pending} pending
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{seminar.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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

          {/* Participants List */}
          {participants.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">👥 Confirmed Participants ({participants.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {participants.map((registration: Registration) => (
                  <div key={registration.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{getParticipantName(registration.participant_id)}</span>
                      <span className="text-gray-500 ml-2">{getParticipantEmail(registration.participant_id)}</span>
                    </div>
                    <Badge 
                      className={
                        registration.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }
                    >
                      {registration.status === 'approved' ? '✅' : '💳'} {registration.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {participants.length === 0 && (
            <div className="border-t pt-4 text-center text-gray-500">
              <div className="text-2xl mb-2">👥</div>
              <div>No confirmed participants yet</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const totalUpcoming = getUpcomingSeminars().length;
  const totalPast = getPastSeminars().length;
  const totalParticipants = registrations.filter((reg: Registration) => 
    seminars.some((s: Seminar) => s.id === reg.seminar_id && s.speaker_id === userId) &&
    ['approved', 'paid'].includes(reg.status)
  ).length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">🎤 Speaker Dashboard</h2>
        <p className="text-gray-600">Manage your seminars and view participant information</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalUpcoming}</div>
            <div className="text-sm text-gray-600">📅 Upcoming Seminars</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{totalPast}</div>
            <div className="text-sm text-gray-600">✅ Past Seminars</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalParticipants}</div>
            <div className="text-sm text-gray-600">👥 Total Participants</div>
          </CardContent>
        </Card>
      </div>

      {seminars.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">
              <div className="text-4xl mb-2">🎤</div>
              <div>You don't have any seminars assigned yet.</div>
              <div className="text-sm mt-2">Contact an administrator to get seminars assigned to you.</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">📅 Upcoming Seminars ({totalUpcoming})</TabsTrigger>
            <TabsTrigger value="past">✅ Past Seminars ({totalPast})</TabsTrigger>
          </TabsList>

          <div>
            <Input
              placeholder="🔍 Search seminars by title or description..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>

          <TabsContent value="upcoming">
            <div className="grid gap-4">
              {getUpcomingSeminars().length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-500">
                      <div className="text-4xl mb-2">📅</div>
                      <div>
                        {totalUpcoming === 0 
                          ? 'No upcoming seminars scheduled.'
                          : 'No upcoming seminars match your search criteria.'
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                getUpcomingSeminars().map((seminar: Seminar) => (
                  <SeminarCard key={seminar.id} seminar={seminar} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="past">
            <div className="grid gap-4">
              {getPastSeminars().length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-500">
                      <div className="text-4xl mb-2">✅</div>
                      <div>
                        {totalPast === 0 
                          ? 'No past seminars yet.'
                          : 'No past seminars match your search criteria.'
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                getPastSeminars().map((seminar: Seminar) => (
                  <SeminarCard key={seminar.id} seminar={seminar} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}