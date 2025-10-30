import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Search, 
  Download, 
  Upload, 
  FileText,
  Calendar,
  User,
  Phone,
  Mail,
  CreditCard
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OfflinePOS } from "@/components/pos/OfflinePOS";

interface PatientRecord {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  medicalHistory: string;
  allergies: string;
  medications: string;
  lastVisit: string;
  nextAppointment: string;
  createdAt: string;
  updatedAt: string;
}

export function EPRDashboard() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPOS, setShowPOS] = useState(false);
  const { toast } = useToast();

  // Load patients from localStorage on component mount
  useEffect(() => {
    const savedPatients = localStorage.getItem("epr-patients");
    if (savedPatients) {
      setPatients(JSON.parse(savedPatients));
    }
  }, []);

  // Save patients to localStorage whenever patients array changes
  useEffect(() => {
    localStorage.setItem("epr-patients", JSON.stringify(patients));
  }, [patients]);

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient =>
    `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddPatient = (patientData: Omit<PatientRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPatient: PatientRecord = {
      ...patientData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setPatients(prev => [...prev, newPatient]);
    setShowAddForm(false);
    toast({
      title: "Patient Added",
      description: `${newPatient.firstName} ${newPatient.lastName} has been added to the records.`,
    });
  };

  const handleUpdatePatient = (updatedPatient: PatientRecord) => {
    setPatients(prev => prev.map(patient => 
      patient.id === updatedPatient.id 
        ? { ...updatedPatient, updatedAt: new Date().toISOString() }
        : patient
    ));
    setIsEditing(false);
    toast({
      title: "Patient Updated",
      description: "Patient record has been successfully updated.",
    });
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(patients, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `epr-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Data Exported",
      description: "Patient records have been exported successfully.",
    });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          setPatients(importedData);
          toast({
            title: "Data Imported",
            description: `${importedData.length} patient records imported successfully.`,
          });
        } else {
          throw new Error("Invalid data format");
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to import data. Please check the file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  if (showPOS) {
    return <OfflinePOS businessType="healthcare" onClose={() => setShowPOS(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Electronic Patient Records</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowPOS(true)}
            className="bg-success hover:bg-success/90 text-white"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Pharmacy POS
          </Button>
          <input
            type="file"
            accept=".json"
            onChange={handleImportData}
            className="hidden"
            id="import-file"
          />
          <Button variant="outline" asChild>
            <label htmlFor="import-file" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </label>
          </Button>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patients ({filteredPatients.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className={`p-4 border-b cursor-pointer hover:bg-accent transition-colors ${
                      selectedPatient?.id === patient.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                    <div className="text-sm text-muted-foreground">{patient.phone}</div>
                    <div className="text-xs text-muted-foreground">
                      Last visit: {patient.lastVisit || 'Never'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient Details */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <PatientDetails 
              patient={selectedPatient}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onSave={handleUpdatePatient}
              onCancel={() => setIsEditing(false)}
            />
          ) : showAddForm ? (
            <AddPatientForm 
              onSave={handleAddPatient}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>Select a patient to view their record</p>
                  <p className="text-sm">or add a new patient to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientDetails({ 
  patient, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel 
}: {
  patient: PatientRecord;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (patient: PatientRecord) => void;
  onCancel: () => void;
}) {
  const [editedPatient, setEditedPatient] = useState(patient);

  useEffect(() => {
    setEditedPatient(patient);
  }, [patient]);

  const handleSave = () => {
    onSave(editedPatient);
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Patient Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={editedPatient.firstName}
                onChange={(e) => setEditedPatient(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                value={editedPatient.lastName}
                onChange={(e) => setEditedPatient(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date of Birth</label>
              <Input
                type="date"
                value={editedPatient.dateOfBirth}
                onChange={(e) => setEditedPatient(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={editedPatient.phone}
                onChange={(e) => setEditedPatient(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={editedPatient.email}
              onChange={(e) => setEditedPatient(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Address</label>
            <Textarea
              value={editedPatient.address}
              onChange={(e) => setEditedPatient(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Medical History</label>
            <Textarea
              value={editedPatient.medicalHistory}
              onChange={(e) => setEditedPatient(prev => ({ ...prev, medicalHistory: e.target.value }))}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Allergies</label>
            <Textarea
              value={editedPatient.allergies}
              onChange={(e) => setEditedPatient(prev => ({ ...prev, allergies: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Current Medications</label>
            <Textarea
              value={editedPatient.medications}
              onChange={(e) => setEditedPatient(prev => ({ ...prev, medications: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Last Visit</label>
              <Input
                type="date"
                value={editedPatient.lastVisit}
                onChange={(e) => setEditedPatient(prev => ({ ...prev, lastVisit: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Next Appointment</label>
              <Input
                type="date"
                value={editedPatient.nextAppointment}
                onChange={(e) => setEditedPatient(prev => ({ ...prev, nextAppointment: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">
              {patient.firstName} {patient.lastName}
            </CardTitle>
            <div className="flex gap-4 text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Born: {patient.dateOfBirth}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {patient.phone}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {patient.email}
              </span>
            </div>
          </div>
          <Button onClick={onEdit} variant="outline">
            Edit Record
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Address</h3>
          <p className="text-muted-foreground">{patient.address || 'Not provided'}</p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Medical History</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {patient.medicalHistory || 'No medical history recorded'}
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Allergies</h3>
          {patient.allergies ? (
            <Badge variant="destructive">{patient.allergies}</Badge>
          ) : (
            <p className="text-muted-foreground">No known allergies</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Current Medications</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {patient.medications || 'No current medications'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Last Visit</h3>
            <p className="text-muted-foreground">{patient.lastVisit || 'No visits recorded'}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Next Appointment</h3>
            <p className="text-muted-foreground">{patient.nextAppointment || 'No appointment scheduled'}</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-4">
          <p>Created: {new Date(patient.createdAt).toLocaleString()}</p>
          <p>Last updated: {new Date(patient.updatedAt).toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AddPatientForm({ 
  onSave, 
  onCancel 
}: {
  onSave: (patient: Omit<PatientRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: '',
    medicalHistory: '',
    allergies: '',
    medications: '',
    lastVisit: '',
    nextAppointment: '',
  });

  const handleSave = () => {
    if (!formData.firstName || !formData.lastName) {
      return;
    }
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Patient</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">First Name *</label>
            <Input
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="Enter first name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Last Name *</label>
            <Input
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Enter last name"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Date of Birth</label>
            <Input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter email address"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Address</label>
          <Textarea
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Enter full address"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Medical History</label>
          <Textarea
            value={formData.medicalHistory}
            onChange={(e) => setFormData(prev => ({ ...prev, medicalHistory: e.target.value }))}
            placeholder="Enter medical history"
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Allergies</label>
          <Textarea
            value={formData.allergies}
            onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
            placeholder="Enter known allergies"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Current Medications</label>
          <Textarea
            value={formData.medications}
            onChange={(e) => setFormData(prev => ({ ...prev, medications: e.target.value }))}
            placeholder="Enter current medications"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Last Visit</label>
            <Input
              type="date"
              value={formData.lastVisit}
              onChange={(e) => setFormData(prev => ({ ...prev, lastVisit: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Next Appointment</label>
            <Input
              type="date"
              value={formData.nextAppointment}
              onChange={(e) => setFormData(prev => ({ ...prev, nextAppointment: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.firstName || !formData.lastName}
          >
            Add Patient
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}