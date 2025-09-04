import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Seminar, 
  Registration, 
  Certificate,
  UserRole
} from '../../server/src/schema';

// Import components
import { UserManagement } from '@/components/UserManagement';
import { SeminarManagement } from '@/components/SeminarManagement';
import { RegistrationManagement } from '@/components/RegistrationManagement';
import { AttendanceManagement } from '@/components/AttendanceManagement';
import { CertificateManagement } from '@/components/CertificateManagement';
import { ParticipantDashboard } from '@/components/ParticipantDashboard';
import { SpeakerDashboard } from '@/components/SpeakerDashboard';

function App() {
  // User role simulation - in real app would come from authentication
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('admin');
  const [currentUserId] = useState<number>(1); // Current user ID from authentication

  // Main data states
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [seminarsData, usersData, registrationsData, certificatesData] = await Promise.all([
        trpc.getSeminars.query(),
        trpc.getUsers.query(),
        trpc.getRegistrations.query(),
        trpc.getCertificates.query()
      ]);
      
      setSeminars(seminarsData);
      setUsers(usersData);
      setRegistrations(registrationsData);
      setCertificates(certificatesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Role selector for demo purposes
  const RoleSelector = () => (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
      <h3 className="text-lg font-semibold mb-2 text-blue-800">🎭 Demo Role Selector</h3>
      <div className="flex gap-2">
        {(['admin', 'participant', 'speaker'] as UserRole[]).map((role) => (
          <Button
            key={role}
            variant={currentUserRole === role ? 'default' : 'outline'}
            onClick={() => setCurrentUserRole(role)}
            className="capitalize"
          >
            {role === 'admin' && '👑'} 
            {role === 'participant' && '👤'} 
            {role === 'speaker' && '🎤'} 
            {role}
          </Button>
        ))}
      </div>
      <p className="text-sm text-blue-600 mt-2">
        Switch roles to see different interfaces and permissions
      </p>
    </div>
  );

  // Header with stats
  const Header = () => (
    <div className="mb-8">
      <h1 className="text-3xl font-bold mb-4 text-center">
        🎓 Seminar & Workshop Management System
      </h1>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{seminars.length}</div>
            <div className="text-sm text-gray-600">📚 Total Seminars</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === 'participant').length}
            </div>
            <div className="text-sm text-gray-600">👥 Participants</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.role === 'speaker').length}
            </div>
            <div className="text-sm text-gray-600">🎤 Speakers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{registrations.length}</div>
            <div className="text-sm text-gray-600">📝 Registrations</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Admin Interface
  const AdminInterface = () => (
    <Tabs defaultValue="seminars" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="seminars">📚 Seminars</TabsTrigger>
        <TabsTrigger value="users">👥 Users</TabsTrigger>
        <TabsTrigger value="registrations">📝 Registrations</TabsTrigger>
        <TabsTrigger value="attendance">✅ Attendance</TabsTrigger>
        <TabsTrigger value="certificates">🏆 Certificates</TabsTrigger>
      </TabsList>

      <TabsContent value="seminars">
        <SeminarManagement 
          seminars={seminars}
          users={users}
          onSeminarUpdate={loadData}
        />
      </TabsContent>

      <TabsContent value="users">
        <UserManagement 
          users={users}
          onUserUpdate={loadData}
        />
      </TabsContent>

      <TabsContent value="registrations">
        <RegistrationManagement 
          registrations={registrations}
          seminars={seminars}
          users={users}
          onRegistrationUpdate={loadData}
        />
      </TabsContent>

      <TabsContent value="attendance">
        <AttendanceManagement 
          registrations={registrations}
          seminars={seminars}
          users={users}
          onAttendanceUpdate={loadData}
        />
      </TabsContent>

      <TabsContent value="certificates">
        <CertificateManagement 
          certificates={certificates}
          registrations={registrations}
          seminars={seminars}
          users={users}
          onCertificateUpdate={loadData}
        />
      </TabsContent>
    </Tabs>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="text-xl">Loading...</div>
          <div className="mt-2 text-gray-500">Fetching seminar management data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 min-h-screen bg-gray-50">
      <RoleSelector />
      <Header />
      
      {currentUserRole === 'admin' && <AdminInterface />}
      
      {currentUserRole === 'participant' && (
        <ParticipantDashboard 
          userId={currentUserId}
          seminars={seminars}
          registrations={registrations.filter(r => r.participant_id === currentUserId)}
          certificates={certificates}
          onRegistrationUpdate={loadData}
        />
      )}
      
      {currentUserRole === 'speaker' && (
        <SpeakerDashboard 
          userId={currentUserId}
          seminars={seminars.filter(s => s.speaker_id === currentUserId)}
          registrations={registrations}
          users={users}
        />
      )}
    </div>
  );
}

export default App;