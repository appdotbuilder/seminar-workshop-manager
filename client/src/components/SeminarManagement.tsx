import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { trpc } from '@/utils/trpc';
import type { Seminar, User, CreateSeminarInput, UpdateSeminarInput, RegistrationType } from '../../../server/src/schema';

interface SeminarManagementProps {
  seminars: Seminar[];
  users: User[];
  onSeminarUpdate: () => void;
}

export function SeminarManagement({ seminars, users, onSeminarUpdate }: SeminarManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSeminar, setEditingSeminar] = useState<Seminar | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get speakers only
  const speakers = users.filter((user: User) => user.role === 'speaker');

  // Form state for creating/editing seminars
  const [formData, setFormData] = useState<CreateSeminarInput>({
    title: '',
    description: '',
    date: new Date(),
    time: '',
    location: '',
    speaker_id: 0,
    capacity: 0,
    cost: 0,
    registration_type: 'free'
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: new Date(),
      time: '',
      location: '',
      speaker_id: 0,
      capacity: 0,
      cost: 0,
      registration_type: 'free'
    });
    setSelectedDate(new Date());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const createData = {
        ...formData,
        date: selectedDate || new Date(),
        cost: formData.cost || 0
      };
      await trpc.createSeminar.mutate(createData);
      resetForm();
      setIsCreateDialogOpen(false);
      onSeminarUpdate();
    } catch (error) {
      console.error('Failed to create seminar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (seminar: Seminar) => {
    setEditingSeminar(seminar);
    setFormData({
      title: seminar.title,
      description: seminar.description,
      date: seminar.date,
      time: seminar.time,
      location: seminar.location,
      speaker_id: seminar.speaker_id,
      capacity: seminar.capacity,
      cost: seminar.cost || 0,
      registration_type: seminar.registration_type
    });
    setSelectedDate(seminar.date);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeminar) return;
    
    setIsLoading(true);
    try {
      const updateData: UpdateSeminarInput = {
        id: editingSeminar.id,
        title: formData.title,
        description: formData.description,
        date: selectedDate || formData.date,
        time: formData.time,
        location: formData.location,
        speaker_id: formData.speaker_id,
        capacity: formData.capacity,
        cost: formData.cost || 0,
        registration_type: formData.registration_type
      };
      
      await trpc.updateSeminar.mutate(updateData);
      resetForm();
      setEditingSeminar(null);
      onSeminarUpdate();
    } catch (error) {
      console.error('Failed to update seminar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (seminarId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteSeminar.mutate({ id: seminarId });
      onSeminarUpdate();
    } catch (error) {
      console.error('Failed to delete seminar:', error);
    } finally {
      setIsLoading(false);
    }
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

  const getSpeakerName = (speakerId: number) => {
    const speaker = speakers.find((s: User) => s.id === speakerId);
    return speaker ? speaker.name : 'Unknown Speaker';
  };

  const SeminarForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={isEdit ? handleUpdate : handleCreate} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Title</label>
        <Input
          value={formData.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateSeminarInput) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Enter seminar title"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateSeminarInput) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Enter seminar description"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                {selectedDate ? selectedDate.toLocaleDateString() : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="text-sm font-medium">Time</label>
          <Input
            value={formData.time}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateSeminarInput) => ({ ...prev, time: e.target.value }))
            }
            placeholder="e.g., 09:00 - 12:00"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Location</label>
        <Input
          value={formData.location}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateSeminarInput) => ({ ...prev, location: e.target.value }))
          }
          placeholder="Enter location"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Speaker</label>
        <Select 
          value={formData.speaker_id > 0 ? formData.speaker_id.toString() : ''} 
          onValueChange={(value: string) => 
            setFormData((prev: CreateSeminarInput) => ({ ...prev, speaker_id: parseInt(value) }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a speaker" />
          </SelectTrigger>
          <SelectContent>
            {speakers.map((speaker: User) => (
              <SelectItem key={speaker.id} value={speaker.id.toString()}>
                🎤 {speaker.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Capacity</label>
          <Input
            type="number"
            value={formData.capacity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateSeminarInput) => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))
            }
            placeholder="Maximum participants"
            min="1"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Cost ($)</label>
          <Input
            type="number"
            value={formData.cost || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateSeminarInput) => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))
            }
            placeholder="0 for free"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Registration Type</label>
        <Select 
          value={formData.registration_type} 
          onValueChange={(value: RegistrationType) => 
            setFormData((prev: CreateSeminarInput) => ({ ...prev, registration_type: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">🆓 Free Registration</SelectItem>
            <SelectItem value="approval_required">✋ Approval Required</SelectItem>
            <SelectItem value="payment_required">💳 Payment Required</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetForm();
            if (isEdit) setEditingSeminar(null);
            else setIsCreateDialogOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (isEdit ? 'Update Seminar' : 'Create Seminar')}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📚 Seminar Management</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ Add New Seminar</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Seminar</DialogTitle>
            </DialogHeader>
            <SeminarForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Seminars Grid */}
      <div className="grid gap-4">
        {seminars.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <div className="text-4xl mb-2">📚</div>
                <div>No seminars found. Create the first seminar!</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          seminars.map((seminar: Seminar) => (
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(seminar)}
                    >
                      ✏️ Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          🗑️ Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Seminar</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{seminar.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(seminar.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
                    <div className="font-medium text-gray-700">🎤 Speaker</div>
                    <div>{getSpeakerName(seminar.speaker_id)}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Capacity: {seminar.capacity} participants
                  </div>
                  <div className="text-xs text-gray-400">
                    Created: {seminar.created_at.toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSeminar} onOpenChange={() => setEditingSeminar(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Seminar</DialogTitle>
          </DialogHeader>
          <SeminarForm isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}