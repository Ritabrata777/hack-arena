
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/frontend/components/ui/radio-group';
import { Checkbox } from '@/frontend/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/frontend/components/ui/popover';
import { CalendarIcon, Loader2, UploadCloud } from 'lucide-react';
import { Calendar } from '@/frontend/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { cn } from '@/frontend/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/frontend/hooks/use-toast';
import { updateDoctorProfile } from '@/backend/services/mongodb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/frontend/components/ui/card';
import { MEDICAL_SPECIALIZATIONS } from '@/frontend/lib/constants';

const fileSchema = z.any()
  .refine(file => file?.size, `File is required.`)
  .refine(file => file?.size <= 5_000_000, `File size should be less than 5MB.`)
  .refine(file => ["image/jpeg", "image/png", "application/pdf"].includes(file?.type), "Only .jpg, .png, and .pdf formats are supported.");

const registrationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().optional(),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Please select a gender.' }),
  dob: z.date().optional(),
  licenseNumber: z.string().min(5, "Medical license number is required."),
  licenseExpiry: z.date().optional(),
  specialization: z.string({ required_error: 'Please select a specialization.' }),
  yearsOfExperience: z.coerce.number().min(0).optional(),
  clinicName: z.string().optional(),
  practiceLocation: z.string().min(2, "Practice location is required."),
  licenseCertificate: fileSchema,
  govtId: fileSchema.optional(),
  profilePhoto: z.any().optional(),
  confirmAccuracy: z.boolean().refine(val => val === true, { message: "You must confirm the accuracy of the information." }),
});


const DoctorRegistrationForm = ({ activeWallet, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isValid }, control, setValue, watch } = useForm({
    resolver: zodResolver(registrationSchema),
    mode: 'onChange',
  });

  const fileToDataUri = (file) => new Promise((resolve, reject) => {
    if(!file) {
        resolve(null);
        return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
        const [licenseUri, idUri, photoUri] = await Promise.all([
            fileToDataUri(data.licenseCertificate),
            fileToDataUri(data.govtId),
            fileToDataUri(data.profilePhoto)
        ]);

        const profileData = {
            name: data.fullName,
            email: data.email,
            phone: data.phone,
            gender: data.gender,
            dob: data.dob?.toISOString(),
            licenseId: data.licenseNumber,
            licenseExpiry: data.licenseExpiry?.toISOString(),
            specialization: data.specialization,
            experience: data.yearsOfExperience,
            clinic: data.clinicName,
            location: data.practiceLocation,
            documents: {
                license: licenseUri,
                govtId: idUri,
                photo: photoUri,
            },
            verified: false, // Default to not verified
            walletAddress: activeWallet,
        };

        await updateDoctorProfile(activeWallet, profileData);

        toast({
            title: "Registration Successful",
            description: "Your profile has been created. You can now access the dashboard.",
        });
        
        onSuccess();

    } catch (error) {
        console.error("Registration failed:", error);
        toast({
            variant: "destructive",
            title: "Registration Failed",
            description: "An error occurred while saving your profile. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const FileInput = ({ name, label, required, ...props }) => {
    const file = watch(name);
    return (
        <div>
            <Label htmlFor={name}>{label}{required && ' *'}</Label>
            <div className="mt-2 flex items-center gap-4">
                <label
                    htmlFor={name}
                    className="relative cursor-pointer rounded-md bg-background font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:text-primary/80"
                >
                    <div className="flex items-center gap-2 border border-dashed p-4 rounded-lg">
                        <UploadCloud/>
                        <span>{file ? 'Change file' : 'Upload a file'}</span>
                    </div>
                    <input id={name} name={name} type="file" className="sr-only" {...props} onChange={(e) => setValue(name, e.target.files[0], { shouldValidate: true })} />
                </label>
                {file && <span className="text-sm text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>}
            </div>
             {errors[name] && <p className="text-sm text-destructive mt-1">{errors[name].message}</p>}
        </div>
    );
  };
  

  return (
    <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="pt-6">
                <div className="space-y-8">
                    {/* Personal Details */}
                    <div className="space-y-4">
                        <h3 className="font-headline text-lg font-semibold">Personal Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label htmlFor="fullName">Full Name *</Label><Input id="fullName" {...register('fullName')} />{errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}</div>
                            <div><Label htmlFor="email">Email Address *</Label><Input id="email" type="email" {...register('email')} />{errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}</div>
                            <div><Label htmlFor="phone">Phone Number</Label><Input id="phone" type="tel" {...register('phone')} /></div>
                            <div>
                                <Label>Date of Birth</Label>
                                <Popover><PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !watch('dob') && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{watch('dob') ? format(watch('dob'), "PPP") : <span>Pick a date</span>}</Button>
                                </PopoverTrigger><PopoverContent className="w-auto p-0">
                                    <Calendar 
                                        mode="single" 
                                        selected={watch('dob')} 
                                        onSelect={date => setValue('dob', date)}
                                        captionLayout="dropdown-buttons"
                                        fromYear={new Date().getFullYear() - 80}
                                        toYear={new Date().getFullYear() - 18}
                                        initialFocus 
                                    />
                                </PopoverContent></Popover>
                            </div>
                            <div>
                                <Label>Gender *</Label>
                                <RadioGroup onValueChange={val => setValue('gender', val)} className="flex items-center gap-4 pt-2">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Male</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Female</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="other" id="other" /><Label htmlFor="other">Other</Label></div>
                                </RadioGroup>
                                {errors.gender && <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Professional Details */}
                    <div className="space-y-4">
                        <h3 className="font-headline text-lg font-semibold">Professional Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label htmlFor="licenseNumber">Medical License Number *</Label><Input id="licenseNumber" {...register('licenseNumber')} />{errors.licenseNumber && <p className="text-sm text-destructive mt-1">{errors.licenseNumber.message}</p>}</div>
                            <div>
                                <Label>License Expiry Date</Label>
                                <Popover><PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !watch('licenseExpiry') && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{watch('licenseExpiry') ? format(watch('licenseExpiry'), "PPP") : <span>Pick a date</span>}</Button>
                                </PopoverTrigger><PopoverContent className="w-auto p-0">
                                    <Calendar 
                                        mode="single" 
                                        selected={watch('licenseExpiry')} 
                                        onSelect={date => setValue('licenseExpiry', date)} 
                                        captionLayout="dropdown-buttons"
                                        fromYear={new Date().getFullYear()}
                                        toYear={new Date().getFullYear() + 20}
                                        initialFocus
                                    />
                                </PopoverContent></Popover>
                            </div>
                            <div>
                                <Label>Specialization *</Label>
                                <Select onValueChange={val => setValue('specialization', val)}>
                                    <SelectTrigger><SelectValue placeholder="Select a specialization..." /></SelectTrigger>
                                    <SelectContent><SelectItem value={null}>Select...</SelectItem>{MEDICAL_SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select>
                                {errors.specialization && <p className="text-sm text-destructive mt-1">{errors.specialization.message}</p>}
                            </div>
                            <div><Label htmlFor="yearsOfExperience">Years of Experience</Label><Input id="yearsOfExperience" type="number" {...register('yearsOfExperience')} /></div>
                            <div><Label htmlFor="clinicName">Current Hospital or Clinic</Label><Input id="clinicName" {...register('clinicName')} /></div>
                            <div><Label htmlFor="practiceLocation">Country / State of Practice *</Label><Input id="practiceLocation" {...register('practiceLocation')} />{errors.practiceLocation && <p className="text-sm text-destructive mt-1">{errors.practiceLocation.message}</p>}</div>
                        </div>
                    </div>

                    {/* Document Upload */}
                    <div className="space-y-4">
                        <h3 className="font-headline text-lg font-semibold">Document Upload</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FileInput name="licenseCertificate" label="Medical License Certificate" required />
                            <FileInput name="govtId" label="Government ID Proof" />
                            <FileInput name="profilePhoto" label="Profile Photo" accept="image/png, image/jpeg" />
                        </div>
                    </div>

                    {/* Confirmation */}
                    <div className="items-top flex space-x-2">
                        <Checkbox id="confirmAccuracy" onCheckedChange={checked => setValue('confirmAccuracy', checked)} />
                        <div className="grid gap-1.5 leading-none">
                            <label htmlFor="confirmAccuracy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                I confirm that all the information and documents provided are accurate and true to the best of my knowledge. *
                            </label>
                             {errors.confirmAccuracy && <p className="text-sm text-destructive">{errors.confirmAccuracy.message}</p>}
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={!isValid || isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit Registration
                </Button>
            </CardFooter>
        </form>
    </Card>
  );
};

export default DoctorRegistrationForm;
