'use client';

import { useRef, useState } from 'react';
import { BadgeCheck, ImagePlus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  readApiError,
  updateProfileRequest,
  type AuthUser,
} from '@/features/auth/api';

const MAX_IMAGE_BYTES = 300 * 1024;

interface RecruiterProfileFormProps {
  user: AuthUser;
  onSaved: (user: AuthUser) => void;
}

export function RecruiterProfileForm({ user, onSaved }: RecruiterProfileFormProps) {
  const [companyName, setCompanyName] = useState(user.companyName ?? '');
  const [aboutCompany, setAboutCompany] = useState(user.aboutCompany ?? '');
  const [contactNumber, setContactNumber] = useState(user.contactNumber ?? '');
  const [avatar, setAvatar] = useState<string | null>(user.avatar);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please choose an image file', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: 'Image must be under 300 KB', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (companyName.trim().length < 2) {
      toast({ title: 'Company name is required', variant: 'destructive' });
      return;
    }
    if (!/^[+]?[0-9\s()-]{7,15}$/.test(contactNumber.trim())) {
      toast({ title: 'Enter a valid contact number', variant: 'destructive' });
      return;
    }
    if (!avatar) {
      toast({ title: 'Please upload a profile image', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfileRequest({
        companyName: companyName.trim(),
        aboutCompany: aboutCompany.trim() || null,
        contactNumber: contactNumber.trim(),
        avatar,
      });

      if (!res.ok) {
        toast({ title: await readApiError(res), variant: 'destructive' });
        return;
      }

      const body = await res.json();
      toast({ title: 'Profile saved', variant: 'success' });
      onSaved(body.data.user as AuthUser);
    } catch {
      toast({ title: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted transition-colors hover:border-primary"
          aria-label="Upload profile image"
        >
          {avatar ? (
            <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
        </button>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Profile image</p>
          <p>Company logo works best. PNG/JPG under 300 KB.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImage}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company-name">Company name</Label>
        <Input
          id="company-name"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Acme Pvt. Ltd."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="about-company">About the company</Label>
        <Textarea
          id="about-company"
          value={aboutCompany}
          onChange={(event) => setAboutCompany(event.target.value)}
          placeholder="What your company does, the team, and what it is like to work here. Candidates see this on your job posts."
          rows={4}
          maxLength={600}
        />
        <p className="text-xs text-muted-foreground">
          {aboutCompany.trim().length}/600 characters. Shown to candidates on
          your company profile and job posts.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-number" className="flex items-center gap-1.5">
          Contact number
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
            <BadgeCheck className="h-3 w-3" /> Verified
          </span>
        </Label>
        <Input
          id="contact-number"
          value={contactNumber}
          onChange={(event) => setContactNumber(event.target.value)}
          placeholder="+977 98XXXXXXXX"
        />
        <p className="text-xs text-muted-foreground">
          Verification is static for now and stored with your profile.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
