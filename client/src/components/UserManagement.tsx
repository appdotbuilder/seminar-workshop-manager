import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput, UpdateUserInput, UserRole } from '../../../server/src/schema';

interface UserManagementProps {
  users: User[];
  onUserUpdate: () => void;
}

export function UserManagement({ users, onUserUpdate }: UserManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state for creating/editing users
  const [formData, setFormData] = useState<CreateUserInput>({
    name: '',
    email: '',
    role: 'participant',
    password: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'participant',
      password: ''
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createUser.mutate(formData);
      resetForm();
      setIsCreateDialogOpen(false);
      onUserUpdate();
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '' // Don't populate password for security
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsLoading(true);
    try {
      const updateData: UpdateUserInput = {
        id: editingUser.id,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        ...(formData.password && { password: formData.password })
      };
      
      await trpc.updateUser.mutate(updateData);
      resetForm();
      setEditingUser(null);
      onUserUpdate();
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (userId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteUser.mutate({ id: userId });
      onUserUpdate();
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'speaker': return 'bg-purple-100 text-purple-800';
      case 'participant': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return '👑';
      case 'speaker': return '🎤';
      case 'participant': return '👤';
      default: return '❓';
    }
  };

  const UserForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={isEdit ? handleUpdate : handleCreate} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Name</label>
        <Input
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Enter full name"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
          }
          placeholder="Enter email address"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Role</label>
        <Select 
          value={formData.role || 'participant'} 
          onValueChange={(value: UserRole) => 
            setFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="participant">👤 Participant</SelectItem>
            <SelectItem value="speaker">🎤 Speaker</SelectItem>
            <SelectItem value="admin">👑 Administrator</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">
          Password {isEdit && '(leave empty to keep current)'}
        </label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
          }
          placeholder="Enter password"
          required={!isEdit}
          minLength={6}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetForm();
            if (isEdit) setEditingUser(null);
            else setIsCreateDialogOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">👥 User Management</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>➕ Add New User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <UserForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Grid */}
      <div className="grid gap-4">
        {users.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <div className="text-4xl mb-2">👥</div>
                <div>No users found. Create the first user!</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          users.map((user: User) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-semibold">{user.name}</span>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {getRoleIcon(user.role)} {user.role}
                      </Badge>
                    </div>
                    <div className="text-gray-600 mb-2">✉️ {user.email}</div>
                    <div className="text-sm text-gray-500">
                      Created: {user.created_at.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
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
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {user.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(user.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <UserForm isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}