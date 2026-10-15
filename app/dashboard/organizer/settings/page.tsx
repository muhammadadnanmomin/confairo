"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getNames } from "country-list";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/auth/useProfile";
import { useOrganization } from "@/lib/organizations/useOrganization";
import { useOrgRole } from "@/lib/organizations/useOrgRole";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Building2,
  Globe,
  Linkedin,
  Upload,
  Trash2,
  ImageIcon,
  Loader2,
  ExternalLink,
  User,
  CheckCircle2,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell,
  Shield,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants & Helpers                                                */
/* ------------------------------------------------------------------ */

const COUNTRIES = getNames().filter((c) => c !== "Israel").sort();
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];

function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OrganizerSettings() {
  const { profile } = useProfile();
  const { organization, loading: orgLoading, refetch: refetchOrg } = useOrganization();
  const orgRole = useOrgRole();
  const isOwner = orgRole === "owner" || profile?.role === "admin";
  const { toast } = useToast();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Organization Form State ── */
  const [orgName, setOrgName] = useState("");
  const [orgCountry, setOrgCountry] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [orgLinkedin, setOrgLinkedin] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [orgSaving, setOrgSaving] = useState(false);

  /* ── Slug State ── */
  const [orgSlug, setOrgSlug] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const slugDebounceRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Personal Profile State ── */
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  /* ── Populate Organization Form ── */
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || "");
      setOrgSlug(organization.slug || "");
      setOrgCountry(organization.country || "");
      setOrgWebsite(organization.website || "");
      setOrgLinkedin(organization.linkedin_url || "");
      setOrgDescription(organization.description || "");
      setOrgLogoUrl(organization.logo_url || null);
      setLogoFile(null);
      setLogoPreview(null);
      setSlugError(null);
      setSlugAvailable(null);
    }
  }, [organization]);

  /* ── Populate Personal Profile ── */
  useEffect(() => {
    if (profile) {
      setUserName(profile.name || "");
      setUserEmail(profile.email || "");
    }
  }, [profile]);

  /* ── Logo File Selection ── */
  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a PNG or JPEG image.",
      });
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Logo must be smaller than 2 MB.",
      });
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    setOrgLogoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ── Slug Live Change & Debounced Availability Check ── */
  function handleSlugChange(val: string) {
    const sanitized = val
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");

    setOrgSlug(sanitized);

    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);

    if (!sanitized) {
      setSlugAvailable(null);
      setSlugError("Slug is required");
      return;
    }

    if (organization && sanitized === organization.slug) {
      setSlugAvailable(null);
      setSlugError(null);
      return;
    }

    if (sanitized.length < 3) {
      setSlugAvailable(false);
      setSlugError("Slug must be at least 3 characters");
      return;
    }

    if (sanitized.startsWith("-") || sanitized.endsWith("-")) {
      setSlugAvailable(false);
      setSlugError("Slug cannot start or end with a hyphen");
      return;
    }

    setSlugChecking(true);
    setSlugError(null);

    slugDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/organizer/organization/slug-check?slug=${encodeURIComponent(sanitized)}&organizationId=${organization?.id || ""}`
        );
        const data = await res.json();
        setSlugChecking(false);
        if (data.available) {
          setSlugAvailable(true);
          setSlugError(null);
        } else {
          setSlugAvailable(false);
          setSlugError(data.reason || "Slug is not available");
        }
      } catch {
        setSlugChecking(false);
      }
    }, 400);
  }

  /* ── Reset Organization Changes ── */
  function handleCancelOrgEdit() {
    if (organization) {
      setOrgName(organization.name || "");
      setOrgSlug(organization.slug || "");
      setOrgCountry(organization.country || "");
      setOrgWebsite(organization.website || "");
      setOrgLinkedin(organization.linkedin_url || "");
      setOrgDescription(organization.description || "");
      setOrgLogoUrl(organization.logo_url || null);
      setLogoFile(null);
      setLogoPreview(null);
      setSlugError(null);
      setSlugAvailable(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* ── Save Organization ── */
  async function saveOrganization() {
    if (!organization) return;

    const trimmedName = orgName.trim();
    const trimmedCountry = orgCountry.trim();
    const trimmedWebsite = orgWebsite.trim();
    const trimmedLinkedin = orgLinkedin.trim();
    const trimmedDescription = orgDescription.trim();

    /* Validation */
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
      toast({
        variant: "destructive",
        title: "Invalid organization name",
        description: "Name must be between 2 and 100 characters.",
      });
      return;
    }

    if (trimmedWebsite && !isValidUrl(trimmedWebsite)) {
      toast({
        variant: "destructive",
        title: "Invalid website URL",
        description: "Please enter a valid URL (e.g. https://university.edu).",
      });
      return;
    }

    if (trimmedLinkedin && !isValidUrl(trimmedLinkedin)) {
      toast({
        variant: "destructive",
        title: "Invalid LinkedIn URL",
        description: "Please enter a valid URL (e.g. https://linkedin.com/company/your-org).",
      });
      return;
    }

    if (trimmedDescription.length > 1000) {
      toast({
        variant: "destructive",
        title: "Description too long",
        description: "Description must not exceed 1000 characters.",
      });
      return;
    }

    const trimmedSlug = orgSlug.trim().toLowerCase().replace(/^-+|-+$/g, "");
    if (trimmedSlug && (trimmedSlug.length < 3 || trimmedSlug.length > 50)) {
      toast({
        variant: "destructive",
        title: "Invalid URL slug",
        description: "Public URL slug must be between 3 and 50 characters.",
      });
      return;
    }

    if (slugAvailable === false || slugError) {
      toast({
        variant: "destructive",
        title: "Slug unavailable",
        description: slugError || "Please choose an available URL slug.",
      });
      return;
    }

    setOrgSaving(true);
    let uploadedFilePath: string | null = null;

    try {
      let finalLogoUrl = orgLogoUrl;

      // Upload new logo if selected
      if (logoFile) {
        const ext = logoFile.name.split(".").pop()?.toLowerCase() || "png";
        const filePath = `${organization.id}/logo-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("organization-logos")
          .upload(filePath, logoFile, { upsert: false });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          toast({
            variant: "destructive",
            title: "Logo upload failed",
            description: uploadError.message || "Could not upload the logo image. Please try again.",
          });
          setOrgSaving(false);
          return;
        }

        uploadedFilePath = filePath;
        const { data: urlData } = supabase.storage
          .from("organization-logos")
          .getPublicUrl(filePath);

        // Append timestamp cache-buster so browser displays new image immediately
        finalLogoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      // Call secure backend PATCH route
      const res = await fetch("/api/organizer/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: organization.id,
          name: trimmedName,
          slug: trimmedSlug || null,
          country: trimmedCountry || null,
          description: trimmedDescription || null,
          website: trimmedWebsite || null,
          linkedin_url: trimmedLinkedin || null,
          logo_url: finalLogoUrl,
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        // If upload occurred but DB save failed, clean up the orphaned storage file
        if (uploadedFilePath) {
          await supabase.storage.from("organization-logos").remove([uploadedFilePath]).catch(() => {});
        }
        toast({
          variant: "destructive",
          title: "Update failed",
          description: resData.error || "Failed to update organization.",
        });
        setOrgSaving(false);
        return;
      }

      toast({
        title: "Organization updated 🎉",
        description: "Your organization profile changes have been saved.",
      });

      // Refresh global organization state
      await refetchOrg();
      setLogoFile(null);
      setLogoPreview(null);
      setOrgSaving(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast({
        variant: "destructive",
        title: "Error saving organization",
        description: message,
      });
      setOrgSaving(false);
    }
  }

  /* ── Save Personal Profile ── */
  async function saveProfile() {
    if (!profile) return;
    setProfileSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ name: userName })
      .eq("id", profile.id);

    setProfileSaving(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Profile update failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Profile updated",
        description: "Your personal information has been updated.",
      });
    }
  }

  /* ── Logout ── */
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const effectiveLogo = logoPreview || orgLogoUrl;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization & Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization profile and account preferences
        </p>
      </div>

      {/* ============================================================ */}
      {/*  1. ORGANIZATION PROFILE SECTION                             */}
      {/* ============================================================ */}
      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Organization Profile</h2>
              <p className="text-sm text-muted-foreground">
                Public institutional identity, branding, and contact links
              </p>
            </div>
          </div>

          {!orgLoading && organization && (
            <div className="flex items-center gap-2">
              <Badge variant={isOwner ? "default" : "secondary"} className="capitalize">
                {isOwner ? "Owner" : orgRole || "Member"}
              </Badge>
              {!isOwner && (
                <span className="text-xs text-muted-foreground">(Read-Only)</span>
              )}
            </div>
          )}
        </div>

        <Separator />

        {orgLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !organization ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 font-medium">No organization associated with this account</p>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your organization to start creating and hosting academic conferences.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/dashboard/onboarding/organization">Create Organization</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Public Profile URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-primary" />
                  Public Profile URL <span className="text-destructive">*</span>
                </label>
                {organization.slug && (
                  <Button
                    variant="link"
                    size="sm"
                    asChild
                    className="h-auto p-0 text-xs gap-1 text-primary hover:underline"
                  >
                    <Link href={`/org/${organization.slug}`} target="_blank">
                      View Live Profile
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>

              {/* URL Input with prefix */}
              <div className="flex rounded-md border border-input shadow-sm focus-within:ring-1 focus-within:ring-ring bg-background overflow-hidden">
                <span className="inline-flex items-center px-3 text-xs md:text-sm text-muted-foreground bg-muted/50 border-r border-input select-none font-mono">
                  {typeof window !== "undefined" ? `${window.location.host}/org/` : "confairo.com/org/"}
                </span>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  disabled={!isOwner || orgSaving}
                  placeholder="your-org-name"
                  maxLength={50}
                  className="flex-1 px-3 py-2 text-sm bg-transparent border-0 outline-none placeholder:text-muted-foreground font-mono disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex items-center px-2.5">
                  {slugChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : slugAvailable === true ? (
                    <span title="Slug available">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </span>
                  ) : slugAvailable === false ? (
                    <span title="Slug unavailable">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Status & Helper messages */}
              {slugError ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {slugError}
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-1">
                  <span>
                    Lowercase letters, numbers, and hyphens only (3–50 chars).
                  </span>
                  {organization.slug && orgSlug !== organization.slug && (
                    <span className="text-amber-500 font-medium">
                      Previous link /org/{organization.slug} will redirect automatically.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Logo Upload & Preview */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Organization Logo
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {/* Logo Box */}
                <div className="relative h-24 w-24 rounded-xl border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                  {effectiveLogo ? (
                    <img
                      src={effectiveLogo}
                      alt={orgName || "Organization Logo"}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-[10px] mt-1">No Logo</span>
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                {isOwner && (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {effectiveLogo ? "Change Logo" : "Upload Logo"}
                      </Button>

                      {effectiveLogo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="text-destructive hover:bg-destructive/10 gap-1.5"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      PNG, JPEG up to 2 MB. Square or landscape orientation recommended.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info: Name & Country */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Organization Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Indian Institute of Technology Bombay"
                  disabled={!isOwner || orgSaving}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">Country</label>
                <Select
                  value={orgCountry}
                  onValueChange={setOrgCountry}
                  disabled={!isOwner || orgSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Links: Website & LinkedIn */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium block mb-1.5 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Website
                </label>
                <Input
                  value={orgWebsite}
                  onChange={(e) => setOrgWebsite(e.target.value)}
                  placeholder="https://example.edu"
                  disabled={!isOwner || orgSaving}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5 flex items-center gap-1.5">
                  <Linkedin className="h-3.5 w-3.5 text-muted-foreground" />
                  LinkedIn Page
                </label>
                <Input
                  value={orgLinkedin}
                  onChange={(e) => setOrgLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/company/your-org"
                  disabled={!isOwner || orgSaving}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">About / Description</label>
                <span className="text-xs text-muted-foreground">
                  {orgDescription.length}/1000
                </span>
              </div>
              <Textarea
                rows={4}
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
                placeholder="Brief overview of your institution, university, or research department..."
                disabled={!isOwner || orgSaving}
                maxLength={1000}
              />
            </div>

            {/* Actions */}
            {isOwner && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelOrgEdit}
                  disabled={orgSaving}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={saveOrganization}
                  disabled={orgSaving}
                  className="gap-2 bg-primary hover:bg-primary-hover"
                >
                  {orgSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Organization"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ============================================================ */}
      {/*  2. PERSONAL PROFILE INFORMATION                             */}
      {/* ============================================================ */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Profile Information</h2>
        </div>

        <Separator />

        <div className="flex items-center gap-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>{userName?.[0] || "U"}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={profileSaving}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Email</label>
              <Input value={userEmail} disabled className="bg-muted/50" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveProfile} disabled={profileSaving}>
            {profileSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  3. PREFERENCES                                              */}
      {/* ============================================================ */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Preferences</h2>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-muted-foreground">Receive conference updates via email</p>
          </div>

          <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  4. SECURITY & LOGOUT                                        */}
      {/* ============================================================ */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Account Security</h2>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Sign Out</p>
            <p className="text-sm text-muted-foreground">Sign out from your active session</p>
          </div>

          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}
