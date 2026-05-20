'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Badge } from '@/frontend/components/ui/badge';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/frontend/components/ui/table';
import { Loader2, Plus, Calendar, Clock, Users, Trash2 } from 'lucide-react';
import { useToast } from '@/frontend/hooks/use-toast';
import { createTimeSlot, getTimeSlotsForDoctor } from '@/backend/services/mongodb';

const ManageTimeSlots = ({ activeWallet }) => {
    const [timeSlots, setTimeSlots] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newSlot, setNewSlot] = useState({
        date: '',
        startTime: '',
        endTime: '',
        maxPatients: 1
    });
    const { toast } = useToast();

    useEffect(() => {
        if (activeWallet) {
            fetchTimeSlots();
        }
    }, [activeWallet]);

    const fetchTimeSlots = async () => {
        if (!activeWallet) return;
        
        setIsLoading(true);
        try {
            const slots = await getTimeSlotsForDoctor(activeWallet);
            setTimeSlots(slots);
        } catch (error) {
            console.error('Failed to fetch time slots:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load time slots.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSlot = async () => {
        if (!activeWallet) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please connect your wallet first.'
            });
            return;
        }

        if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please fill in all required fields.'
            });
            return;
        }

        setIsCreating(true);
        try {
            const createdSlot = await createTimeSlot({
                doctorId: activeWallet,
                date: newSlot.date,
                startTime: newSlot.startTime,
                endTime: newSlot.endTime,
                maxPatients: parseInt(newSlot.maxPatients)
            });

            toast({
                title: 'Success',
                description: 'Time slot created successfully.'
            });

            // Reset form
            setNewSlot({
                date: '',
                startTime: '',
                endTime: '',
                maxPatients: 1
            });

            // Refresh the list
            await fetchTimeSlots();
        } catch (error) {
            console.error('Failed to create time slot:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to create time slot.'
            });
        } finally {
            setIsCreating(false);
        }
    };

    const formatTime = (time) => {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (slot) => {
        if (slot.status === 'cancelled') {
            return <Badge variant="destructive">Cancelled</Badge>;
        }
        if (slot.currentPatients >= slot.maxPatients) {
            return <Badge variant="secondary">Full</Badge>;
        }
        return <Badge variant="default">Available</Badge>;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Create New Time Slot */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add New Time Slot
                    </CardTitle>
                    <CardDescription>
                        Create available time slots for patients to book appointments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={newSlot.date}
                                onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div>
                            <Label htmlFor="startTime">Start Time</Label>
                            <Input
                                id="startTime"
                                type="time"
                                value={newSlot.startTime}
                                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="endTime">End Time</Label>
                            <Input
                                id="endTime"
                                type="time"
                                value={newSlot.endTime}
                                onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="maxPatients">Max Patients</Label>
                            <Input
                                id="maxPatients"
                                type="number"
                                min="1"
                                max="10"
                                value={newSlot.maxPatients}
                                onChange={(e) => setNewSlot({ ...newSlot, maxPatients: e.target.value })}
                            />
                        </div>
                    </div>
                    <Button 
                        onClick={handleCreateSlot} 
                        disabled={isCreating}
                        className="mt-4"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Time Slot
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Time Slots List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        My Time Slots
                    </CardTitle>
                    <CardDescription>
                        Manage your available appointment slots.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {timeSlots.length === 0 ? (
                        <div className="text-center py-8">
                            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Time Slots</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Create your first time slot to start accepting appointments.
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="h-96">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Patients</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {timeSlots.map((slot) => (
                                        <TableRow key={slot.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {formatDate(slot.date)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    {slot.currentPatients} / {slot.maxPatients}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(slot)}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ManageTimeSlots;
