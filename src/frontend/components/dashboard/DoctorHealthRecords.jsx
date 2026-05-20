'use client';
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { useToast } from "@/frontend/hooks/use-toast";
import { Badge } from '@/frontend/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/frontend/components/ui/table';
import { 
  getDoctorAccessibleRecords,
  canDoctorAccessRecord,
  getRecordIpfsHash
} from '@/frontend/lib/blockchain';
import { 
  Loader2, 
  FileText, 
  Search,
  Copy,
  ExternalLink,
  Shield,
  Eye
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/frontend/components/ui/tooltip';

const DoctorHealthRecords = ({ activeWallet }) => {
  const [accessibleRecords, setAccessibleRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordIpfsHash, setRecordIpfsHash] = useState('');
  const [isLoadingHash, setIsLoadingHash] = useState(false);

  const { toast } = useToast();

  const fetchAccessibleRecords = useCallback(async () => {
    if (!activeWallet) return;
    setIsLoading(true);
    try {
      const records = await getDoctorAccessibleRecords(activeWallet);
      setAccessibleRecords(records);
    } catch (error) {
      console.error("Failed to fetch accessible records:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Could not load accessible health records.' 
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeWallet, toast]);

  useEffect(() => {
    fetchAccessibleRecords();
  }, [fetchAccessibleRecords]);

  const handleSelectRecord = async (record) => {
    setSelectedRecord(record);
    setIsLoadingHash(true);
    try {
      const hash = await getRecordIpfsHash(record.recordId);
      setRecordIpfsHash(hash);
    } catch (error) {
      console.error("Failed to fetch IPFS hash:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Could not retrieve record details.' 
      });
    } finally {
      setIsLoadingHash(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied!', description: 'Text copied to clipboard.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy to clipboard.' });
    }
  };

  const openIpfsLink = (hash) => {
    const ipfsUrl = `https://ipfs.io/ipfs/${hash}`;
    window.open(ipfsUrl, '_blank');
  };

  const filteredRecords = accessibleRecords.filter(record => 
    record.recordId.toLowerCase().includes(searchQuery.toLowerCase())
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
      {/* Accessible Records List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Accessible Health Records
          </CardTitle>
          <CardDescription>
            Health records you have been granted access to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  <TableHead>Patient</TableHead>
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
                        {record.doctor.slice(0, 10)}...
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
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
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
                      No accessible records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Record Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Record Details
          </CardTitle>
          <CardDescription>
            View and access health record information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedRecord ? (
            <>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Record Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Record ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{selectedRecord.recordId.slice(0, 20)}...</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedRecord.recordId)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy Full ID</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient:</span>
                    <span className="font-mono">{selectedRecord.doctor.slice(0, 20)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Block Number:</span>
                    <span>{selectedRecord.blockNumber.toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{selectedRecord.transactionHash.slice(0, 10)}...</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedRecord.transactionHash)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy Transaction Hash</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>

              {/* IPFS Hash */}
              <div className="space-y-2">
                <Label>IPFS Hash</Label>
                {isLoadingHash ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading IPFS hash...</span>
                  </div>
                ) : recordIpfsHash ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={recordIpfsHash}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(recordIpfsHash)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy IPFS Hash</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openIpfsLink(recordIpfsHash)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Open in IPFS</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click the external link icon to view the record on IPFS
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No IPFS hash available</p>
                )}
              </div>

              {/* Access Status */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="font-semibold">Access Status</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Access Granted
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  You have been granted access to this health record by the patient.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Select a record to view details
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorHealthRecords;
