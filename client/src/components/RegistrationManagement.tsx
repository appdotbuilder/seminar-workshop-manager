import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { trpc } from '@/utils/trpc';
import type { Registration, Seminar, User, RegistrationStatus, CreateRegistrationInput } from '../../../server/src/schema';

interface RegistrationManagementProps {
  registrations: Registration[];
  seminars: Seminar[];
  users: User[];
  onRegistrationUpdate: () => void;
}

export function RegistrationManagement({ registrations, seminars, users, onRegistrationUpdate }: RegistrationManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<RegistrationStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for creating registrations
  const [formData, setFormData] = useState<CreateRegistrationInput>({
    seminar_id: 0,
    participant_id: 0,
    status: 'pending'
  });

  const participants = users.filter((user: User) => user.role === 'participant');

  const resetForm = () => {
    setFormData({
      seminar_id: 0,
      participant_id: 0,
      status: 'pending'
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createRegistration.mutate(formData);
      resetForm();
      setIsCreateDialogOpen(false);
      onRegistrationUpdate();
    } catch (error) {
      console.error('Failed to create registration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (registrationId: number, status: RegistrationStatus) => {
    setIsLoading(true);
    try {
      await trpc.updateRegistrationStatus.mutate({ id: registrationId, status });
      onRegistrationUpdate();
    } catch (error) {
      console.error('Failed to update registration status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (registrationId: number) => {
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

  // Filter registrations
  const filteredRegistrations = registrations.filter((registration: Registration) => {
    const matchesStatus = filterStatus === 'all' || registration.status === filterStatus;
    const participantName = getParticipantName(registration.participant_id).toLowerCase();
    const seminarTitle = getSeminarTitle(registration.seminar_id).toLowerCase();
    const matchesSearch = searchTerm === '' || 
      participantName.includes(searchTerm.toLowerCase()) ||
      seminarTitle.includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusActions = (registration: Registration) => {
    const actions: React.ReactElement[] = [];
    
    if (registration.status === 'pending') {
      actions.push(
        <Button
          key="approve"
          size="sm"
          onClick={() => handleStatusUpdate(registration.id, 'approved')}
          className="bg-green-600 hover:bg-green-700"
        >
          ✅ Approve
        </Button>
      );
      actions.push(
        <Button
          key="reject"
          size="sm"
          variant="destructive"
          onClick={() => handleStatusUpdate(registration.id, 'rejected')}
        >
          ❌ Reject
        </Button>
      );
      
      // Check if seminar requires payment
      const seminar = seminars.find((s: Seminar) => s.id === registration.seminar_id);
      if (seminar?.registration_type === 'payment_required') {
        actions.push(
          <Button
            key="paid"
            size="sm"
            onClick={() => handleStatusUpdate(registration.id, 'paid')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            💳 Mark Paid
          </Button>
        );
      }
    }
    
    if (['approved', 'paid'].includes(registration.status)) {
      actions.push(
        <AlertDialog key="cancel">
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">
              🚫 Cancel
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Registration</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this registration? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Keep It</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleCancel(registration.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    
    return actions;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📝 Registration Management</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ Add Registration</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Registration</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Seminar</label>
                <Select 
                  value={formData.seminar_id.toString()} 
                  onValueChange={(value: string) => 
                    setFormData((prev: CreateRegistrationInput) => ({ ...prev, seminar_id: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a seminar" />
                  </SelectTrigger>
                  <SelectContent>
                    {seminars.map((seminar: Seminar) => (
                      <SelectItem key={seminar.id} value={seminar.id.toString()}>
                        📚 {seminar.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Participant</label>
                <Select 
                  value={formData.participant_id.toString()} 
                  onValueChange={(value: string) => 
                    setFormData((prev: CreateRegistrationInput) => ({ ...prev, participant_id: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a participant" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants.map((participant: User) => (
                      <SelectItem key={participant.id} value={participant.id.toString()}>
                        👤 {participant.name} ({participant.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsCreateDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Registration'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="🔍 Search by participant name or seminar title..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={(value: RegistrationStatus | 'all') => setFilterStatus(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">⏳ Pending</SelectItem>
            <SelectItem value="approved">✅ Approved</SelectItem>
            <SelectItem value="rejected">❌ Rejected</SelectItem>
            <SelectItem value="paid">💳 Paid</SelectItem>
            <SelectItem value="cancelled">🚫 Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Registrations Grid */}
      <div className="grid gap-4">
        {filteredRegistrations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <div>
                  {registrations.length === 0 
                    ? 'No registrations found. Create the first registration!'
                    : 'No registrations match your current filters.'
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredRegistrations.map((registration: Registration) => (
            <Card key={registration.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">
                        📚 {getSeminarTitle(registration.seminar_id)}
                      </h3>
                      {getStatusBadge(registration.status)}
                    </div>
                    <div className="text-gray-600 mb-1">
                      👤 {getParticipantName(registration.participant_id)}
                    </div>
                    <div className="text-gray-500 text-sm">
                      ✉️ {getParticipantEmail(registration.participant_id)}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Registered: {registration.registration_date.toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    {getStatusActions(registration)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Registration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {registrations.filter((r: Registration) => r.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">⏳ Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {registrations.filter((r: Registration) => r.status === 'approved').length}
              </div>
              <div className="text-sm text-gray-600">✅ Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {registrations.filter((r: Registration) => r.status === 'paid').length}
              </div>
              <div className="text-sm text-gray-600">💳 Paid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {registrations.filter((r: Registration) => r.status === 'rejected').length}
              </div>
              <div className="text-sm text-gray-600">❌ Rejected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {registrations.filter((r: Registration) => r.status === 'cancelled').length}
              </div>
              <div className="text-sm text-gray-600">🚫 Cancelled</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}