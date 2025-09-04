import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { trpc } from '@/utils/trpc';
import type { Registration, Seminar, User, Attendance, UpdateAttendanceInput } from '../../../server/src/schema';

interface AttendanceManagementProps {
  registrations: Registration[];
  seminars: Seminar[];
  users: User[];
  onAttendanceUpdate: () => void;
}

export function AttendanceManagement({ registrations, seminars, users, onAttendanceUpdate }: AttendanceManagementProps) {
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

  const handleAttendanceToggle = async (registrationId: number, attended: boolean) => {
    setIsLoading(true);
    try {
      const input: UpdateAttendanceInput = { registration_id: registrationId, attended };
      await trpc.updateAttendance.mutate(input);
      
      // Reload attendance for current seminar
      if (typeof selectedSeminar === 'number') {
        await loadAttendanceForSeminar(selectedSeminar);
      }
      onAttendanceUpdate();
    } catch (error) {
      console.error('Failed to update attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const getParticipantName = (participantId: number) => {
    const participant = users.find((u: User) => u.id === participantId);
    return participant ? participant.name : 'Unknown Participant';
  };

  const getParticipantEmail = (participantId: number) => {
    const participant = users.find((u: User) => u.id === participantId);
    return participant ? participant.email : 'Unknown Email';
  };

  // Get approved/paid registrations for the selected seminar
  const getEligibleRegistrations = () => {
    if (selectedSeminar === 'all') return [];
    
    return registrations.filter((registration: Registration) => 
      registration.seminar_id === selectedSeminar && 
      ['approved', 'paid'].includes(registration.status)
    );
  };

  // Get attendance status for a registration
  const getAttendanceStatus = (registrationId: number) => {
    const attendance = attendanceRecords.find((a: Attendance) => a.registration_id === registrationId);
    return attendance ? attendance.attended : false;
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

  // Get seminars with eligible registrations
  const seminarsWithRegistrations = seminars.filter((seminar: Seminar) => 
    registrations.some((reg: Registration) => 
      reg.seminar_id === seminar.id && ['approved', 'paid'].includes(reg.status)
    )
  );

  const getAttendanceStats = () => {
    if (selectedSeminar === 'all') return { total: 0, attended: 0, percentage: 0 };
    
    const eligible = getEligibleRegistrations();
    const attended = attendanceRecords.filter((a: Attendance) => a.attended).length;
    const total = eligible.length;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    
    return { total, attended, percentage };
  };

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">✅ Attendance Management</h2>
      </div>

      {/* Seminar Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Seminar for Attendance Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedSeminar.toString()} 
            onValueChange={(value: string) => setSelectedSeminar(value === 'all' ? 'all' : parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a seminar to manage attendance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📋 Select a seminar</SelectItem>
              {seminarsWithRegistrations.map((seminar: Seminar) => (
                <SelectItem key={seminar.id} value={seminar.id.toString()}>
                  📚 {seminar.title} - {seminar.date.toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSeminar !== 'all' && (
        <>
          {/* Attendance Stats */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Attendance Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-blue-800">Total Eligible</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{stats.attended}</div>
                  <div className="text-sm text-green-800">Attended</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{stats.percentage}%</div>
                  <div className="text-sm text-purple-800">Attendance Rate</div>
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

          {/* Attendance List */}
          <div className="grid gap-4">
            {filteredRegistrations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    <div className="text-4xl mb-2">👥</div>
                    <div>
                      {getEligibleRegistrations().length === 0 
                        ? 'No eligible participants for this seminar.'
                        : 'No participants match your search criteria.'
                      }
                    </div>
                    <div className="text-sm mt-2">
                      Only approved/paid registrations are eligible for attendance tracking.
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredRegistrations.map((registration: Registration) => {
                const isAttended = getAttendanceStatus(registration.id);
                return (
                  <Card key={registration.id} className={`hover:shadow-md transition-shadow ${isAttended ? 'border-green-200 bg-green-50' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Checkbox
                              checked={isAttended}
                              onCheckedChange={(checked: boolean) => 
                                handleAttendanceToggle(registration.id, checked)
                              }
                              disabled={isLoading}
                              className="h-5 w-5"
                            />
                            <div>
                              <h3 className="text-lg font-semibold">
                                👤 {getParticipantName(registration.participant_id)}
                              </h3>
                              <div className="text-gray-600">
                                ✉️ {getParticipantEmail(registration.participant_id)}
                              </div>
                            </div>
                          </div>
                          <div className="ml-8 flex gap-2">
                            <Badge 
                              className={
                                registration.status === 'approved' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }
                            >
                              {registration.status === 'approved' ? '✅ Approved' : '💳 Paid'}
                            </Badge>
                            {isAttended && (
                              <Badge className="bg-green-100 text-green-800">
                                ✅ Present
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            Registered: {registration.registration_date.toLocaleDateString()}
                          </div>
                          {isAttended && (
                            <div className="text-sm text-green-600 mt-1">
                              ✅ Marked as attended
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Bulk Actions */}
          {filteredRegistrations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>⚡ Bulk Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      filteredRegistrations.forEach((registration: Registration) => {
                        if (!getAttendanceStatus(registration.id)) {
                          handleAttendanceToggle(registration.id, true);
                        }
                      });
                    }}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ✅ Mark All Present
                  </Button>
                  <Button
                    onClick={() => {
                      filteredRegistrations.forEach((registration: Registration) => {
                        if (getAttendanceStatus(registration.id)) {
                          handleAttendanceToggle(registration.id, false);
                        }
                      });
                    }}
                    disabled={isLoading}
                    variant="outline"
                  >
                    ❌ Mark All Absent
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Use these buttons to quickly mark attendance for all filtered participants.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}