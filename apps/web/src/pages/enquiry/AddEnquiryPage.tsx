import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { isDateBefore, todayDateValue } from "@/lib/date";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const enquirySchema = z.object({
  gym_id: z.string().min(1, "Gym is required"),
  name: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email"),
  source: z.string(),
  interest: z.string(),
  assigned_to: z.string(),
  next_followup_date: z.string().refine((value) => !value || !isDateBefore(value, todayDateValue()), "Next follow-up date cannot be in the past"),
  notes: z.string(),
});

function RequiredMark() {
  return <span className="text-destructive">*</span>;
}

export default function AddEnquiryPage() {
  const today = todayDateValue();
  const { admin, gyms, selectedGymId } = useAuth();
  const navigate = useNavigate();
  const availableGyms = gyms.length > 0 ? gyms : [];

  const methods = useForm<z.infer<typeof enquirySchema>>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      gym_id: selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || "",
      name: "",
      phone: "",
      email: "",
      source: "",
      interest: "",
      assigned_to: "",
      next_followup_date: "",
      notes: "",
    },
  });

  const loading = methods.formState.isSubmitting;
  const gymId = methods.watch("gym_id");

  useEffect(() => {
    const nextGymId = selectedGymId !== "all" ? selectedGymId : gymId || gyms[0]?.id || "";
    if (nextGymId && nextGymId !== gymId) {
      methods.setValue("gym_id", nextGymId, { shouldDirty: false });
    }
  }, [gyms, gymId, methods, selectedGymId]);

  const handleSubmit = async (values: z.infer<typeof enquirySchema>) => {
    if (!admin) return;

    try {
      await api.createEnquiry({
        gym_id: values.gym_id,
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim() || undefined,
        source: values.source || undefined,
        interest: values.interest.trim() || undefined,
        assigned_to: values.assigned_to.trim() || undefined,
        next_followup_date: values.next_followup_date || undefined,
        notes: values.notes.trim() || undefined,
      });
      toast.success("Enquiry added!");
      navigate("/enquiry");
    } catch {
      toast.error("Failed to add enquiry");
    }
  };

  return (
    <AppLayout title="Add Enquiry">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Add New Enquiry</h1>
          <p className="mt-1 text-muted-foreground">Register a new lead or prospective member</p>
        </div>
        <Form {...methods}>
          <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-4 rounded-xl border bg-card p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {availableGyms.length > 1 && (
                <FormField
                  control={methods.control}
                  name="gym_id"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Gym <RequiredMark /></FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                          <SelectContent>
                            {availableGyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={methods.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <RequiredMark /></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enquiry name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={methods.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <RequiredMark /></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+91 9876543210" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={methods.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={methods.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="How did they find you?" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="walk_in">Walk In</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                          <SelectItem value="flyer">Flyer / Poster</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={methods.control}
                name="interest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Weight loss, Bodybuilding" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={methods.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Staff member name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={methods.control}
                name="next_followup_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Follow-up Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} placeholder="Select next follow-up" minDate={today} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={methods.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Additional notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/enquiry")}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={loading}>
                {loading ? "Adding..." : "Add Enquiry"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
