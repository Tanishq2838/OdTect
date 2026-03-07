import { PatientDetails } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Calendar, FileText } from 'lucide-react';

interface PatientFormProps {
  details: PatientDetails;
  onChange: (details: PatientDetails) => void;
}

export default function PatientForm({ details, onChange }: PatientFormProps) {
  const handleChange = (field: keyof PatientDetails, value: string) => {
    onChange({ ...details, [field]: value });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Patient Details</h2>
        <span className="ml-auto text-xs text-muted-foreground">Optional</span>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="patientName" className="text-sm font-medium">
            Patient Name
          </Label>
          <Input
            id="patientName"
            placeholder="Enter patient name"
            value={details.patientName}
            onChange={(e) => handleChange('patientName', e.target.value)}
            className="bg-card"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="patientId" className="text-sm font-medium">
            Patient ID
          </Label>
          <Input
            id="patientId"
            placeholder="Enter patient ID"
            value={details.patientId}
            onChange={(e) => handleChange('patientId', e.target.value)}
            className="bg-card"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="age" className="text-sm font-medium">
            Age
          </Label>
          <Input
            id="age"
            type="number"
            placeholder="Enter age"
            value={details.age}
            onChange={(e) => handleChange('age', e.target.value)}
            className="bg-card"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="gender" className="text-sm font-medium">
            Gender
          </Label>
          <Select value={details.gender} onValueChange={(value) => handleChange('gender', value)}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="examinationDate" className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Date of Examination
          </Label>
          <Input
            id="examinationDate"
            type="date"
            value={details.examinationDate}
            onChange={(e) => handleChange('examinationDate', e.target.value)}
            className="bg-card"
          />
        </div>
        
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="clinicalNotes" className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Clinical Notes
          </Label>
          <Textarea
            id="clinicalNotes"
            placeholder="Enter any relevant clinical observations or notes..."
            value={details.clinicalNotes}
            onChange={(e) => handleChange('clinicalNotes', e.target.value)}
            className="min-h-[100px] bg-card resize-none"
          />
        </div>
      </div>
    </div>
  );
}
