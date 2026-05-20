'use client';
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { useToast } from "@/frontend/hooks/use-toast";
import { Badge } from '@/frontend/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/frontend/components/ui/table';
import { 
  uploadHealthRecord, 
  approveDoctorForRecord, 
  revokeDoctorForRecord, 
  canDoctorAccessRecord,
  getPatientRecords,
  getApprovedDoctorsForRecord,
  getRecordIpfsHash
} from '@/frontend/lib/blockchain';
import { 
  Loader2, 
  Upload, 
  UserPlus, 
  UserMinus, 
  Shield, 
  ShieldCheck, 
  FileText, 
  Search,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/frontend/components/ui/tooltip';

const HealthRecordAccess = ({ activeWallet, userRole }) => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newRecordHash, setNewRecordHash] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [approvedDoctors, setApprovedDoctors] = useState([]);
  const [newDoctorAddress, setNewDoctorAddress] = useState('');
  const [isManagingAccess, setIsManagingAccess] = useState(false);

  const { toast } = useToast();

  const fetchRecords = useCallback(async () => {
    if (!activeWallet) return;
    setIsLoading(true);
    try {
      const patientRecords = await getPatientRecords(activeWallet);
      setRecords(patientRecords);
    } catch (error) {
      console.error("Failed to fetch records:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Could not load health records from blockchain.' 
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeWallet, toast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleUploadRecord = async () => {
    if (!newRecordHash.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Please enter an IPFS hash.' 
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadHealthRecord(newRecordHash);
      toast({ 
        title: 'Success', 
        description: `Health record uploaded successfully! Record ID: ${result.recordId.slice(0, 10)}...` 
      });
      setNewRecordHash('');
      await fetchRecords();
    } catch (error) {
      console.error("Upload failed:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Upload Failed', 
        description: error.message || 'Could not upload health record.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproveDoctor = async (recordId, doctorAddress) => {
    if (!doctorAddress.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Please enter a doctor address.' 
      });
      return;
    }

    setIsManagingAccess(true);
    try {
      await approveDoctorForRecord(recordId, doctorAddress);
      toast({ 
        title: 'Success', 
        description: `Doctor ${doctorAddress.slice(0, 6)}... approved for record access.` 
      });
      await fetchApprovedDoctors(recordId);
    } catch (error) {
      console.error("Approval failed:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Approval Failed', 
        description: error.message || 'Could not approve doctor access.' 
      });
    } finally {
      setIsManagingAccess(false);
    }
  };

  const handleRevokeDoctor = async (recordId, doctorAddress) => {
    setIsManagingAccess(true);
    try {
      await revokeDoctorForRecord(recordId, doctorAddress);
      toast({ 
        title: 'Success', 
        description: `Doctor ${doctorAddress.slice(0, 6)}... access revoked.` 
      });
      await fetchApprovedDoctors(recordId);
    } catch (error) {
      console.error("Revocation failed:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Revocation Failed', 
        description: error.message || 'Could not revoke doctor access.' 
      });
    } finally {
      setIsManagingAccess(false);
    }
  };

  const fetchApprovedDoctors = async (recordId) => {
    try {
      const doctors = await getApprovedDoctorsForRecord(recordId);
      setApprovedDoctors(doctors);
    } catch (error) {
      console.error("Failed to fetch approved doctors:", error);
    }
  };

  const handleSelectRecord = async (record) => {
    setSelectedRecord(record);
    await fetchApprovedDoctors(record.recordId);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied!', description: 'Address copied to clipboard.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy to clipboard.' });
    }
  };

  const filteredRecords = records.filter(record => 
    record.recordId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.ipfsHash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Records List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Health Records
          </CardTitle>
          <CardDescription>
            Manage your health records stored on the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload New Record */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Upload New Record</h3>
            <div className="space-y-2">
              <Label htmlFor="ipfsHash">IPFS Hash</Label>
              <div className="flex gap-2">
                <Input
                  id="ipfsHash"
                  placeholder="QmYourIpfsHashHere..."
                  value={newRecordHash}
                  onChange={(e) => setNewRecordHash(e.target.value)}
                />
                <Button 
                  onClick={handleUploadRecord} 
                  disabled={isUploading || !newRecordHash.trim()}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Records Table */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record ID</TableHead>
                  <TableHead>IPFS Hash</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.recordId}>
                      <TableCell className="font-mono text-sm">
                        {record.recordId.slice(0, 10)}...
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.ipfsHash.slice(0, 20)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSelectRecord(record)}
                                >
                                  <Shield className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Manage Access</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(record.recordId)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy Record ID</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Access Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Access Management
          </CardTitle>
          <CardDescription>
            Control who can access your health records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedRecord ? (
            <>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Selected Record</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>ID:</strong> {selectedRecord.recordId.slice(0, 20)}...</p>
                  <p><strong>IPFS:</strong> {selectedRecord.ipfsHash.slice(0, 30)}...</p>
                </div>
              </div>

              {/* Add Doctor Access */}
              <div className="space-y-2">
                <Label htmlFor="doctorAddress">Doctor Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="doctorAddress"
                    placeholder="0x..."
                    value={newDoctorAddress}
                    onChange={(e) => setNewDoctorAddress(e.target.value)}
                  />
                  <Button
                    onClick={() => handleApproveDoctor(selectedRecord.recordId, newDoctorAddress)}
                    disabled={isManagingAccess || !newDoctorAddress.trim()}
                  >
                    {isManagingAccess ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Approved Doctors */}
              <div>
                <h3 className="font-semibold mb-2">Approved Doctors</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {approvedDoctors.length > 0 ? (
                    approvedDoctors.map((doctor, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Doctor</Badge>
                          <span className="font-mono text-sm">{doctor.slice(0, 10)}...</span>
                        </div>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(doctor)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy Address</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRevokeDoctor(selectedRecord.recordId, doctor)}
                                  disabled={isManagingAccess}
                                >
                                  <UserMinus className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Revoke Access</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No doctors approved for this record</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Select a record to manage access permissions
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthRecordAccess;
